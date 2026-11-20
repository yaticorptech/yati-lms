FROM python:3.11-slim
RUN apt-get update && apt-get install -y --no-install-recommends git libsndfile1 && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY requirements.txt .
# CPU-only torch and torchaudio first (no GPU here; the CUDA builds need libcudart and are ~2 GB larger).
RUN pip install --no-cache-dir torch==2.2.2 torchaudio==2.2.2 --index-url https://download.pytorch.org/whl/cpu
RUN pip install --no-cache-dir -r requirements.txt
COPY app.py .
ENV HF_HOME=/models
EXPOSE 8008
# Railway and similar hosts give the port in $PORT.
CMD uvicorn app:app --host 0.0.0.0 --port ${PORT:-8008}
