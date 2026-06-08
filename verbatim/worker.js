import { pipeline, env } from "https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.5.1";

// Pull weights straight from the Hugging Face CDN. Nothing is sent back.
env.allowLocalModels = false;

let transcriber = null;
let loadedKey = null;

async function build(model, progress_callback) {
  const key = model;
  if (transcriber && loadedKey === key) return transcriber;

  // Free any previous model before swapping.
  if (transcriber) {
    try { await transcriber.dispose(); } catch (_) {}
    transcriber = null;
    loadedKey = null;
  }

  // q8 on the WASM backend is the most reliable Whisper config across browsers.
  // fp16 on WebGPU is faster but degenerates on these weights, so we keep the
  // accurate path here and revisit GPU acceleration with WebGPU-tuned weights.
  transcriber = await pipeline("automatic-speech-recognition", model, {
    device: "wasm",
    dtype: "q8",
    progress_callback,
  });
  loadedKey = key;
  self.postMessage({ type: "backend", data: "wasm" });
  return transcriber;
}

self.onmessage = async (e) => {
  const { type } = e.data;
  if (type !== "transcribe") return;

  const { audio, model, language, task } = e.data;
  try {
    const run = await build(model, (p) => self.postMessage({ type: "progress", data: p }));

    self.postMessage({ type: "status", data: "transcribing" });

    const output = await run(audio, {
      chunk_length_s: 30,
      stride_length_s: 5,
      return_timestamps: true,
      language: language === "auto" ? null : language,
      task,
    });

    self.postMessage({ type: "result", data: output });
  } catch (err) {
    self.postMessage({ type: "error", data: err?.message || String(err) });
  }
};
