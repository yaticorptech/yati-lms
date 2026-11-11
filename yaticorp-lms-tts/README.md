# yaticorp-lms-tts — Indic Parler-TTS

Multilingual speech for the Linguistic section, using AI4Bharat's open-source
[Indic Parler-TTS](https://huggingface.co/ai4bharat/indic-parler-tts) (Apache-2.0).
It covers Kannada, Hindi, Tamil, Telugu, Malayalam, Marathi, Bengali, Gujarati,
Punjabi, Odia, Urdu, Assamese, Nepali, Sanskrit, English and more.

## Run

```bash
python3 -m venv .venv
# GIT_LFS_SKIP_SMUDGE: one dependency (audiotools) is cloned from git and needs no LFS files
GIT_LFS_SKIP_SMUDGE=1 .venv/bin/pip install -r requirements.txt
.venv/bin/uvicorn app:app --host 127.0.0.1 --port 8008
```

The first start downloads the model (about 3.7 GB) into `~/.cache/huggingface`.
A GPU is strongly recommended. On CPU a short sentence takes several seconds.
The LMS server caches every clip, so each sentence is only generated once.

Docker (GPU): `docker build -t lms-tts . && docker run --gpus all -p 8008:8008 -v hf:/models lms-tts`

## Wire it to the LMS server

In `yaticorp-lms-server/.env`:

```
INDIC_TTS_URL=http://127.0.0.1:8008
# optional shared secret (set TTS_TOKEN to the same value here)
INDIC_TTS_TOKEN=
```

Test: `curl -s -X POST localhost:8008/tts -H 'content-type: application/json' -d '{"text":"ನಮಸ್ಕಾರ","lang":"kn"}' -o out.wav`
