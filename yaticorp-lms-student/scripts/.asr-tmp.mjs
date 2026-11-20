import { pipeline } from '@huggingface/transformers';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
const asr = await pipeline('automatic-speech-recognition', 'onnx-community/whisper-small', { dtype: 'q8', device: 'cpu' });
const read = (f) => {
  const wav = f.replace(/\.(m4a|wav)$/, '.16k.wav');
  execFileSync('afconvert', ['-f', 'WAVE', '-d', 'LEF32@16000', '-c', '1', f, wav]);
  const b = fs.readFileSync(wav); const i = b.indexOf('data');
  return new Float32Array(b.buffer.slice(b.byteOffset + i + 8, b.byteOffset + b.length));
};
for (const f of process.argv.slice(2)) {
  const out = await asr(read(f), { language: 'hindi', task: 'transcribe' });
  console.log(f.split('/').pop(), '→', out.text.trim());
}
