#!/bin/bash
# Makes every Linguistic lesson's audio in advance, overnight (2026-11-13: "can I do it the day before, so nobody
# waits for the download?"). Run it before leaving; by morning every clip is made, and the in-app "Download" screen
# only copies finished clips to the device, which takes seconds.
#
#   bash scripts/overnightAudio.sh            the Kannada course (the default)
#   bash scripts/overnightAudio.sh kn,hi      those courses
#   bash scripts/overnightAudio.sh all        every course
#
# It starts the voice service (yaticorp-lms-tts) if it is not already running, keeps the Mac awake while it works
# (caffeinate), makes only the clips that are missing (safe to run again; Ctrl+C stops it and the next run carries
# on), and stops the voice service afterwards if it started it. A log is kept in logs/overnight-audio.log.
# The backend server does not need to be running; the database (MONGO_URI in .env) must be reachable.

set -u
cd "$(dirname "$0")/.." || exit 1
SERVER_DIR="$(pwd)"
TTS_DIR="$SERVER_DIR/../yaticorp-lms-tts"
COURSES="${1:-kn}"
LOG="$SERVER_DIR/logs/overnight-audio.log"
mkdir -p "$SERVER_DIR/logs"

say() { echo "[$(date '+%H:%M:%S')] $*" | tee -a "$LOG"; }

started_tts=""
if curl -s -m 3 http://127.0.0.1:8008/health >/dev/null; then
  say "Voice service already running."
else
  say "Starting the voice service (about a minute to load)…"
  (cd "$TTS_DIR" && HF_HUB_OFFLINE=1 nohup .venv/bin/uvicorn app:app --host 127.0.0.1 --port 8008 >>"$SERVER_DIR/logs/tts.log" 2>&1 &)
  started_tts=1
  for _ in $(seq 1 120); do
    curl -s -m 2 http://127.0.0.1:8008/health >/dev/null && break
    sleep 5
  done
  if ! curl -s -m 3 http://127.0.0.1:8008/health >/dev/null; then
    say "The voice service did not start. See logs/tts.log."
    exit 1
  fi
  say "Voice service ready."
fi

ARGS=()
[ "$COURSES" != "all" ] && ARGS=(--courses "$COURSES")
say "Making the missing clips for: $COURSES"
# caffeinate -i: the Mac does not sleep while this runs (the screen may still turn off).
caffeinate -i node scripts/makeIndicAudio.js "${ARGS[@]}" 2>&1 | grep -v dotenv | tee -a "$LOG"

if [ -n "$started_tts" ]; then
  say "Stopping the voice service."
  pkill -f "uvicorn app:app --host 127.0.0.1 --port 8008"
fi
say "Finished."
