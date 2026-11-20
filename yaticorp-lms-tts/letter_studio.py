"""
The letters, recorded with care (2026-11-19, the owner: "the Kannada letters' voice is not correct … 'aa' still sounds
odd — it should be the first sound of ಆನೆ").

A letter alone is the hardest thing for the voice model: it samples, so the same letter comes out differently every
time — sometimes a plain "aa", sometimes a long sliding "aaah" like a sigh, sometimes another sound altogether. The
service (app.py) takes whatever comes first. Here every letter is given several takes and the best is kept:

  * the pitch of each take is measured — a letter said plainly holds its pitch; a sigh slides (several semitones);
  * a Kannada speech recogniser listens to each take, and one it hears as another letter is passed over;
  * the plainest take that is heard right is kept, as the clip the LMS server serves (its cache, tts/store.js).

    .venv/bin/python letter_studio.py letters.json

`letters.json` is written by yaticorp-lms-server/scripts/recordLetters.js (which runs this): { lang, speaker, cache,
manifest, letters: [{ text, file }] }. Letters already in the manifest are passed over, so it can be stopped and run
again; a letter no take of which was heard right is kept as the plainest take and marked "unverified" there, for a
person to listen to. No service needs to be running: the model is loaded here.
"""
import json
import os
import sys
import time
import warnings

warnings.filterwarnings("ignore")
import numpy as np
import soundfile as sf

TAKES = int(os.environ.get("STUDIO_TAKES", "6"))        # at a time
ROUNDS = int(os.environ.get("STUDIO_ROUNDS", "3"))      # at most
# How it is asked for, a round each: plainly; plainly and a little quicker; as the service asks.
WAYS = [
    "{who} speaks in a very monotone, flat and neutral tone at a moderate pace with a clear voice, in a close-sounding environment with very clear audio quality and no background noise.",
    "{who} speaks in a very monotone, flat and neutral tone at a slightly fast pace with a clear voice, in a close-sounding environment with very clear audio quality and no background noise.",
    "{who} speaks in a natural, conversational tone at a moderate pace with a clear voice, in a close-sounding environment with very clear audio quality and no background noise.",
]


def pitch_track(a, sr, frame=0.04, hop=0.01, lo=90, hi=420):
    """The pitch (Hz) every 10 ms, 0 where nothing is voiced: by autocorrelation."""
    n, h = int(frame * sr), int(hop * sr)
    out = []
    level = float(np.sqrt(np.mean(a ** 2))) or 1.0
    for i in range(0, len(a) - n, h):
        x = a[i:i + n] * np.hanning(n)
        if np.sqrt(np.mean(x ** 2)) < 0.15 * level:
            out.append(0.0)
            continue
        ac = np.correlate(x, x, "full")[n - 1:]
        ac = ac / (ac[0] or 1.0)
        a0, a1 = int(sr / hi), int(sr / lo)
        k = a0 + int(np.argmax(ac[a0:a1]))
        out.append(sr / k if ac[k] > 0.45 else 0.0)
    return np.array(out)


def glide_of(a, sr):
    """How far the pitch moves while the letter is said, in semitones (5th to 95th percentile). 99: no voice found."""
    f = pitch_track(a, sr)
    v = f[f > 0]
    if len(v) < 4:
        return 99.0
    semis = 12 * np.log2(v / np.median(v))
    return float(np.percentile(semis, 95) - np.percentile(semis, 5))


# A sign that changes the letter before it (a vowel sign, the virama, anusvara, visarga) in the scripts of India.
def _is_sign(ch):
    o = ord(ch) & 0x7F if 0x0900 <= ord(ch) <= 0x0D7F else -1
    return o in (0x01, 0x02, 0x03) or 0x3E <= o <= 0x4D


# Letters a recogniser cannot tell apart when each is said alone: the short and the long of a vowel, and a consonant
# with and without its breath (ka, kha). By their place in a script's block, which the scripts of India share.
_TWINS = [(0x05, 0x06), (0x07, 0x08), (0x09, 0x0A), (0x0E, 0x0F), (0x12, 0x13), (0x15, 0x16), (0x17, 0x18), (0x1A, 0x1B),
          (0x1C, 0x1D), (0x1F, 0x20), (0x21, 0x22), (0x24, 0x25), (0x26, 0x27), (0x2A, 0x2B), (0x2C, 0x2D)]
_SHORT = {0x05, 0x07, 0x09, 0x0B, 0x0E, 0x12}
_LONG = {0x06, 0x08, 0x0A, 0x0F, 0x10, 0x13, 0x14}


def _place(letter):
    """A single letter's place in its script's block (0–127), or -1."""
    return ord(letter) & 0x7F if len(letter) == 1 and 0x0900 <= ord(letter) <= 0x0D7F else -1


def twin_of(letter):
    o = _place(letter)
    for a, b in _TWINS:
        if o in (a, b):
            return chr((ord(letter) & ~0x7F) | (b if o == a else a))
    return ""


def _begins(heard, letter):
    return bool(letter) and heard.startswith(letter) and not (len(heard) > len(letter) and _is_sign(heard[len(letter)]))


def heard_right(letter, heard):
    """3: heard as exactly the letter; 2: what was heard begins with it (the recogniser goes on to make a word of
    it); 1: heard as its twin (see _TWINS) — close, but not proof; 0: another sound."""
    heard = (heard or "").strip(" .,।")
    if heard == letter:
        return 3
    if _begins(heard, letter):
        return 2
    return 1 if _begins(heard, twin_of(letter)) else 0


def length_cost(letter, secs):
    """A long vowel is held, a short one is not: a take the wrong length for its vowel costs."""
    o = _place(letter)
    if o in _LONG:
        return max(0.0, 0.42 - secs) * 20
    if o in _SHORT:
        return max(0.0, secs - 0.42) * 20
    return 0.0


def load_listener():
    try:
        import torch
        import torchaudio
        from transformers import GenerationConfig, WhisperForConditionalGeneration, WhisperProcessor
        name = os.environ.get("STUDIO_LISTENER", "vasista22/whisper-kannada-small")
        proc = WhisperProcessor.from_pretrained(name)
        model = WhisperForConditionalGeneration.from_pretrained(name)
        model.eval()
        # The fine-tuned model's own generation settings are too old for this transformers: the base model's are used.
        model.generation_config = GenerationConfig.from_pretrained("openai/whisper-small")

        def hear(a, sr, lang):
            x = np.asarray(a, dtype="float32")
            if sr != 16000:
                x = torchaudio.functional.resample(torch.from_numpy(x), sr, 16000).numpy()
            feats = proc(x, sampling_rate=16000, return_tensors="pt").input_features
            with torch.inference_mode():
                ids = model.generate(feats, language=lang, task="transcribe", max_new_tokens=24)
            return proc.batch_decode(ids, skip_special_tokens=True)[0].strip()
        return hear
    except Exception as e:  # noqa: BLE001 — without a listener the plainest take is still chosen
        print(f"No listener ({e}): takes are chosen by their pitch alone.", flush=True)
        return None


def main():
    job = json.load(open(sys.argv[1], encoding="utf8"))
    lang, who = job["lang"], job.get("speaker") or "A female speaker"
    manifest_path = job["manifest"]
    manifest = json.load(open(manifest_path, encoding="utf8")) if os.path.exists(manifest_path) else {}
    # --again: every letter; --unverified: those no take of which was heard right last time.
    todo = [l for l in job["letters"] if l["text"] not in manifest or "--again" in sys.argv
            or ("--unverified" in sys.argv and not manifest[l["text"]].get("verified"))]
    print(f"{lang}: {len(job['letters'])} letters, {len(todo)} to record.", flush=True)
    if not todo:
        return
    listen = None if lang != "kn" and not os.environ.get("STUDIO_LISTENER") else load_listener()
    os.environ.setdefault("HF_HUB_OFFLINE", "1")
    import app  # the voice service's own model, batching and letter trimming (first_burst)

    way = {"text": WAYS[0]}
    app.describe = lambda _lang, _voice, _slow, _style="": way["text"].format(who=who)
    sr = app.SAMPLE_RATE
    for n, item in enumerate(todo, 1):
        letter, best, t0, tried = item["text"], None, time.time(), 0
        for r in range(ROUNDS):
            way["text"] = WAYS[r % len(WAYS)]
            batch = [dict(text=letter, spoken=letter + ".", lang=lang, voice="f", slow=False, style="") for _ in range(TAKES)]
            try:
                audios = app._generate(batch)
            except Exception as e:  # noqa: BLE001
                print(f"  {letter}: a round failed ({e})", flush=True)
                continue
            for a in audios:
                a = np.asarray(a, dtype="float32")
                secs = len(a) / sr
                tried += 1
                if secs < 0.18 or secs > 0.85:
                    continue
                glide = glide_of(a, sr)
                heard = listen(a, sr, lang) if listen else ""
                right = heard_right(letter, heard) if listen else 2
                # Lower is better: the pitch held, heard as the letter, the right length, and not drawn out.
                score = glide + {3: 0, 2: 2, 1: 6, 0: 12}[right] + max(0.0, secs - 0.6) * 10 + length_cost(letter, secs)
                if best is None or score < best["score"]:
                    best = dict(score=score, audio=a, secs=secs, glide=glide, heard=heard, right=right)
            if best and best["right"] >= 2 and best["glide"] <= 5:
                break
        if not best:
            print(f"[{n}/{len(todo)}] {letter}: no usable take; the clip is left as it was.", flush=True)
            continue
        peak = float(np.max(np.abs(best["audio"]))) or 1.0
        out = best["audio"] * (0.85 / peak)                   # every letter as loud as the next
        tmp = item["file"] + ".studio.tmp"
        sf.write(tmp, out, sr, format="WAV", subtype="PCM_16")
        os.replace(tmp, item["file"])
        manifest[letter] = dict(secs=round(best["secs"], 2), glide=round(best["glide"], 1), heard=best["heard"],
                                verified=bool(listen and best["right"] >= 2), takes=tried)
        with open(manifest_path + ".tmp", "w", encoding="utf8") as f:
            json.dump(manifest, f, ensure_ascii=False, indent=1)
        os.replace(manifest_path + ".tmp", manifest_path)
        mark = "✓" if manifest[letter]["verified"] else "?"
        print(f"[{n}/{len(todo)}] {letter} {mark} {best['secs']:.2f}s, pitch moves {best['glide']:.1f} st, heard “{best['heard']}” "
              f"({tried} takes, {time.time() - t0:.0f}s)", flush=True)


if __name__ == "__main__":
    main()
