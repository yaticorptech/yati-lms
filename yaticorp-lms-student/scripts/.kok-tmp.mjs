import { KokoroTTS } from 'kokoro-js';
import { pipeline } from '@huggingface/transformers';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
const tts = await KokoroTTS.from_pretrained('onnx-community/Kokoro-82M-v1.0-ONNX', { dtype: 'fp32', device: 'cpu' });
const asr = await pipeline('automatic-speech-recognition', 'onnx-community/whisper-small', { dtype: 'q8', device: 'cpu' });
const dir = process.argv[3];
const tests = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
for (const [name, ph, voice = 'hf_alpha'] of tests) {
  const { input_ids } = tts.tokenizer(ph, { truncation: true });
  const audio = await tts.generate_from_ids(input_ids, { voice, speed: 0.96 });
  const wav = `${dir}/${name}.wav`; await audio.save(wav);
  const w16 = `${dir}/${name}.16k.wav`;
  execFileSync('afconvert', ['-f', 'WAVE', '-d', 'LEF32@16000', '-c', '1', wav, w16]);
  const b = fs.readFileSync(w16); const i = b.indexOf('data');
  const out = await asr(new Float32Array(b.buffer.slice(b.byteOffset + i + 8)), { language: 'hindi', task: 'transcribe' });
  console.log(name.padEnd(10), ph.padEnd(48), '→', out.text.trim());
}
