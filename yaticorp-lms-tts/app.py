"""
Indic TTS — a small HTTP service around AI4Bharat's open-source Indic Parler-TTS
(https://huggingface.co/ai4bharat/indic-parler-tts, Apache-2.0).

    GET  /health                       → { ok, device, model, languages }
    POST /tts  { text, lang, voice }   → audio/wav

`lang` is a code like 'kn' or 'kn-IN'; `voice` is 'f' or 'm' (default 'f').
The model reads the script it is given, so the language is chosen by the text;
the description names one of the model's recommended speakers for that language
so each language sounds like a native speaker.

Only the LMS server calls this (it caches every clip), so keep it on a private
network. Optional shared secret: set TTS_TOKEN here and INDIC_TTS_TOKEN there.
"""
import io
import os
import queue
import threading
import time

import numpy as np
import soundfile as sf
import torch
from fastapi import FastAPI, Header, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel
from parler_tts import ParlerTTSForConditionalGeneration
from transformers import AutoTokenizer

MODEL_ID = os.environ.get("TTS_MODEL", "ai4bharat/indic-parler-tts")
TOKEN = os.environ.get("TTS_TOKEN", "")
MAX_CHARS = int(os.environ.get("TTS_MAX_CHARS", "600"))

if torch.cuda.is_available():
    DEVICE = "cuda:0"
elif torch.backends.mps.is_available() and os.environ.get("TTS_USE_MPS", "0") == "1":
    DEVICE = "mps"
else:
    DEVICE = "cpu"
DTYPE = torch.float16 if DEVICE.startswith("cuda") else torch.float32

# The model card's recommended speakers: (female, male).
SPEAKERS = {
    "as": ("Sita", "Amit"),
    "bn": ("Aditi", "Arjun"),
    "brx": ("Maya", "Bikram"),
    "doi": ("Karan", "Karan"),
    "en": ("Mary", "Thoma"),
    "gu": ("Neha", "Yash"),
    "hi": ("Divya", "Rohit"),
    "kn": ("Anu", "Suresh"),
    "ml": ("Anjali", "Harish"),
    "mni": ("Ranjit", "Laishram"),
    "mr": ("Sunita", "Sanjay"),
    "ne": ("Amrita", "Amrita"),
    "or": ("Debjani", "Manas"),
    "pa": ("Gurpreet", "Divjot"),
    "sa": ("Aryan", "Aryan"),
    "ta": ("Jaya", "Jaya"),
    "te": ("Lalitha", "Prakash"),
    # Supported by the model without a named speaker.
    "ur": (None, None),
    "kok": (None, None),
    "mai": (None, None),
    "sat": (None, None),
    "sd": (None, None),
}

print(f"Loading {MODEL_ID} on {DEVICE}…", flush=True)
model = ParlerTTSForConditionalGeneration.from_pretrained(MODEL_ID, torch_dtype=DTYPE).to(DEVICE)
model.eval()
tokenizer = AutoTokenizer.from_pretrained(MODEL_ID)
description_tokenizer = AutoTokenizer.from_pretrained(model.config.text_encoder._name_or_path)
SAMPLE_RATE = model.config.sampling_rate
print("Ready.", flush=True)


def describe(lang: str, voice: str, slow: bool) -> str:
    female, male = SPEAKERS.get(lang, (None, None))
    name = female if voice != "m" else male
    pace = "slightly slow" if slow else "moderate"
    who = name if name else ("A female speaker" if voice != "m" else "A male speaker")
    return (f"{who} speaks at a {pace} pace with a clear, expressive and friendly voice, "
            "in a close-sounding environment with very clear audio quality and no background noise.")


FRAME_RATE = getattr(model.config.audio_encoder, "frame_rate", 86) or 86


def max_tokens(text: str) -> int:
    """Audio frames allowed: 1.4 s for a letter, then about 0.12 s a character, at most 30 s."""
    seconds = 1.4 if len(text) <= 3 else min(30.0, 1.2 + 0.12 * len(text))
    return int(seconds * FRAME_RATE)


class Req(BaseModel):
    text: str
    lang: str = "hi"
    voice: str = "f"
    slow: bool = False


app = FastAPI(title="Indic Parler-TTS")


@app.get("/health")
def health():
    return {"ok": True, "device": DEVICE, "model": MODEL_ID, "languages": sorted(SPEAKERS)}


# ── Batching (2026-11-06) ─────────────────────────────────────────────────
# One sentence at a time leaves most of the CPU idle. Requests that arrive
# together are generated in one pass (up to BATCH_MAX, collected for
# BATCH_WAIT seconds), which makes several clips in about the time of one.
BATCH_MAX = int(os.environ.get("TTS_BATCH_MAX", "8"))
BATCH_WAIT = float(os.environ.get("TTS_BATCH_WAIT", "0.25"))
jobs: "queue.Queue[dict]" = queue.Queue()


def _generate(batch):
    """Generate a batch of jobs in one pass; each job gets its audio (or None)."""
    descs = [describe(j["lang"], j["voice"], j["slow"]) for j in batch]
    prompts = [j["spoken"] for j in batch]
    d = description_tokenizer(descs, return_tensors="pt", padding=True).to(DEVICE)
    p = tokenizer(prompts, return_tensors="pt", padding=True).to(DEVICE)
    with torch.inference_mode():
        out = model.generate(
            input_ids=d.input_ids, attention_mask=d.attention_mask,
            prompt_input_ids=p.input_ids, prompt_attention_mask=p.attention_mask,
            max_new_tokens=max(max_tokens(j["text"]) for j in batch),
            return_dict_in_generate=True,
        )
    seqs = out.sequences.to(torch.float32).cpu().numpy()
    lengths = getattr(out, "audios_length", None) or [seqs.shape[-1]] * len(batch)
    return [_fit(np.atleast_1d(seqs[i].squeeze()[: int(lengths[i])]), batch[i]["text"]) for i in range(len(batch))]


def _fit(audio, text):
    """A clip cut to its own text's length (2026-11-11: a short word made in a batch with a long sentence got
    the sentence's length, and the model filled it with made-up speech: ಮಳೆ said as something else)."""
    cap = int(max_tokens(text) / FRAME_RATE * SAMPLE_RATE)
    if audio.size <= cap:
        return audio
    audio = audio[:cap].copy()
    fade = min(int(0.04 * SAMPLE_RATE), cap)
    audio[-fade:] *= np.linspace(1.0, 0.0, fade, dtype=audio.dtype)
    return audio


def _worker():
    while True:
        batch = [jobs.get()]
        deadline = time.time() + BATCH_WAIT
        while len(batch) < BATCH_MAX:
            left = deadline - time.time()
            if left <= 0:
                break
            try:
                batch.append(jobs.get(timeout=left))
            except queue.Empty:
                break
        try:
            audios = _generate(batch)
        except Exception as e:  # noqa: BLE001 — every waiting request must be answered
            print("batch failed:", e, flush=True)
            audios = [None] * len(batch)
        for job, audio in zip(batch, audios):
            ok = audio is not None and audio.size >= SAMPLE_RATE * 0.25
            # The model samples, so now and then a clip comes out silent: tried again, up to three times.
            if not ok and job["tries"] < 3:
                job["tries"] += 1
                jobs.put(job)
                continue
            job["audio"] = audio if ok else None
            job["done"].set()


threading.Thread(target=_worker, daemon=True).start()


@app.post("/tts")
def tts(req: Req, authorization: str = Header(default="")):
    if TOKEN and authorization != f"Bearer {TOKEN}":
        raise HTTPException(401, "bad token")
    text = (req.text or "").strip()
    lang = (req.lang or "").lower().replace("_", "-").split("-")[0]
    if not text:
        raise HTTPException(400, "text is required")
    if len(text) > MAX_CHARS:
        raise HTTPException(413, f"text longer than {MAX_CHARS} characters")
    if lang not in SPEAKERS:
        raise HTTPException(422, f"language '{lang}' is not supported")

    short = len(text) <= 3
    # A full stop at the end helps the model end there.
    spoken = text if text[-1] in ".?!।॥" else text + "."
    job = {"text": text, "spoken": spoken, "lang": lang, "voice": req.voice, "slow": req.slow or short,
           "tries": 1, "done": threading.Event(), "audio": None}
    jobs.put(job)
    job["done"].wait()
    audio = job["audio"]
    if audio is None:
        raise HTTPException(500, "no speech was made")
    buf = io.BytesIO()
    sf.write(buf, audio, SAMPLE_RATE, format="WAV", subtype="PCM_16")
    return Response(buf.getvalue(), media_type="audio/wav")
