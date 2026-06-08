/* ============================================================
   VERBATIM - App
   Tool state machine + interactions, wired to real Whisper
   transcription running in a Web Worker (transformers.js, WASM).
   Nothing is uploaded: audio is decoded and transcribed in-browser.
   States: idle -> listening | downloading -> processing -> result | error
   ============================================================ */
(function () {
  "use strict";

  const $  = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

  const MODEL_MAP = {
    tiny:  "Xenova/whisper-tiny",
    base:  "Xenova/whisper-base",
    small: "Xenova/whisper-small",
  };
  // transformers.js expects a lowercase language name, or null for auto-detect.
  const LANG_FIX = { mandarin: "chinese" };

  const fmtTime = (s) => {
    s = s || 0;
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = Math.floor(s % 60);
    const pad = (n) => String(n).padStart(2, "0");
    return (h > 0 ? pad(h) + ":" : "") + pad(m) + ":" + pad(sec);
  };
  const srtTime = (s) => {
    s = Math.max(0, s || 0);
    const ms = Math.floor((s % 1) * 1000);
    return String(Math.floor(s / 3600)).padStart(2, "0") + ":" +
      String(Math.floor((s % 3600) / 60)).padStart(2, "0") + ":" +
      String(Math.floor(s % 60)).padStart(2, "0") + "," + String(ms).padStart(3, "0");
  };
  const vttTime = (s) => srtTime(s).replace(",", ".");
  const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));

  /* Decode any audio/video file or recording to mono Float32 at 16 kHz,
     entirely on the main thread. Requesting a 16 kHz context makes the
     browser resample during decode. */
  async function decodeToMono16k(blob) {
    const buffer = await blob.arrayBuffer();
    const AC = window.AudioContext || window.webkitAudioContext;
    const ctx = new AC({ sampleRate: 16000 });
    let decoded;
    try {
      decoded = await ctx.decodeAudioData(buffer);
    } finally {
      ctx.close();
    }
    if (decoded.numberOfChannels === 1) return decoded.getChannelData(0).slice();
    const a = decoded.getChannelData(0), b = decoded.getChannelData(1);
    const out = new Float32Array(a.length);
    for (let i = 0; i < a.length; i++) out[i] = (a[i] + b[i]) / 2;
    return out;
  }

  const App = {
    state: "idle",
    view: "text",
    field: null,
    worker: null,
    busy: false,
    loadedModel: null,   // which model id the worker currently holds
    pendingModel: null,
    chunks: [],
    text: "",
    name: "audio file",
    rec: null,           // live recording context

    init() {
      this.field = window.__voiceField || null;
      this.bindControls();
      this.bindDropzone();
      this.bindFAQ();
      this.bindReveal();
      this.bindHeader();
      this.setState("idle");

      // Failsafe for frozen compositors (background tab / static capture):
      // snap content visible so the page is never stuck pre-animation.
      let rafAlive = false;
      requestAnimationFrame(() => { rafAlive = true; });
      setTimeout(() => {
        if (!rafAlive) {
          document.documentElement.classList.add("anim-static");
          if (this.field) this.field.renderOnce();
        }
      }, 1400);
    },

    /* ---- worker (lazy) ---- */
    getWorker() {
      if (this.worker) return this.worker;
      this.worker = new Worker("worker.js", { type: "module" });
      this.worker.onmessage = (e) => this.onWorker(e);
      this.worker.onerror = (e) => this.fail("The transcription engine failed to start. " + (e.message || ""));
      return this.worker;
    },

    /* ---- state machine ---- */
    setState(state, opts = {}) {
      this.state = state;
      const hero = $(".hero");
      hero.classList.toggle("is-listening", state === "listening");
      $("#orbLabel").textContent = state === "listening" ? "Tap to stop" : "Tap to record";
      $("#recordOrb").setAttribute("aria-label", state === "listening" ? "Stop recording" : "Start recording");

      const panel = $("#toolPanel");
      const show = ["downloading", "processing", "result", "error"].includes(state) ||
        (state === "listening" && opts.live);
      panel.hidden = !show;
      hero.classList.toggle("tool-active", show);

      $$(".panel-stage").forEach((el) => (el.hidden = true));
      if (state === "listening" && opts.live) $("#stageLive").hidden = false;
      if (state === "downloading") $("#stageDownload").hidden = false;
      if (state === "processing")  $("#stageProcessing").hidden = false;
      if (state === "result")      { $("#stageResult").hidden = false; this.renderResult(); }
      if (state === "error")       $("#stageError").hidden = false;

      if (show) {
        panel.classList.remove("fade-swap"); void panel.offsetWidth; panel.classList.add("fade-swap");
        if (!opts.noScroll) this.scrollToPanel();
      }

      if (this.field) {
        if (state === "listening") this.field.setMode("recording");
        else if (state === "processing" || state === "downloading") this.field.setMode("processing");
        else this.field.setMode("idle");
      }
    },

    scrollToPanel() {
      const panel = $("#toolPanel");
      const top = panel.getBoundingClientRect().top + window.scrollY - 110;
      window.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
    },

    /* ---- settings ---- */
    modelId() { return MODEL_MAP[$("#setModel").value] || MODEL_MAP.base; },
    langValue() {
      const sel = $("#setLang");
      const v = (sel.value && sel.value !== "auto") ? sel.value
        : (sel.options[sel.selectedIndex] ? sel.options[sel.selectedIndex].text : "auto");
      if (!v || v === "auto" || v === "Auto-detect") return null;
      const k = v.toLowerCase();
      return LANG_FIX[k] || k;
    },
    task() { return $("#setOut").value === "translate" ? "translate" : "transcribe"; },

    /* ---- controls ---- */
    bindControls() {
      $("#recordOrb").addEventListener("click", () => {
        if (this.state === "listening") this.stopRecording();
        else this.startRecording();
      });
      $$("#segToggle button").forEach((b) =>
        b.addEventListener("click", () => this.setView(b.dataset.view)));
      $("#expCopy").addEventListener("click", (e) => this.copyTranscript(e.currentTarget));
      $("#expTxt").addEventListener("click", () => this.download(this.baseName() + ".txt", this.toTXT(), "text/plain"));
      $("#expSrt").addEventListener("click", () => this.download(this.baseName() + ".srt", this.toSRT(), "text/plain"));
      $("#expVtt").addEventListener("click", () => this.download(this.baseName() + ".vtt", this.toVTT(), "text/vtt"));
      $("#newBtn").addEventListener("click", () => this.reset());
      $("#retryBtn").addEventListener("click", () => this.reset());
      $("#filePick").addEventListener("click", () => $("#fileInput").click());
      $("#fileInput").addEventListener("change", (e) => { if (e.target.files[0]) this.handleFile(e.target.files[0]); });
    },

    baseName() { return (this.name || "transcript").replace(/\.[^.]+$/, "") || "transcript"; },

    /* ---- record in tab ---- */
    async startRecording() {
      if (this.busy) return;
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const AC = window.AudioContext || window.webkitAudioContext;
        const ctx = new AC();
        const src = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 512; analyser.smoothingTimeConstant = 0.8;
        src.connect(analyser);
        const mr = new MediaRecorder(stream);
        const parts = [];
        mr.ondataavailable = (ev) => { if (ev.data && ev.data.size) parts.push(ev.data); };
        mr.start();
        this.rec = { stream, ctx, analyser, data: new Uint8Array(analyser.frequencyBinCount), raf: 0, mr, parts, start: performance.now(), timer: 0 };
        this.setState("listening", { live: true });
        this.startLevelLoop();
        this.startElapsed();
      } catch (err) {
        this.setState("error");
        $("#errText").textContent = "Verbatim needs microphone access to record. No audio leaves your device. Check your browser's mic permission and try again.";
      }
    },

    startLevelLoop() {
      const orbLevel = $("#orbLevel");
      const tick = () => {
        if (!this.rec) return;
        this.rec.analyser.getByteFrequencyData(this.rec.data);
        let sum = 0; const d = this.rec.data;
        for (let i = 0; i < d.length; i++) sum += d[i];
        const level = Math.min(1, (sum / d.length) / 96);
        orbLevel.style.setProperty("--level", level.toFixed(3));
        if (this.field) this.field.setLevel(level);
        this.rec.raf = requestAnimationFrame(tick);
      };
      tick();
    },

    startElapsed() {
      const live = $("#liveText");
      const tick = () => {
        if (this.state !== "listening" || !this.rec) return;
        const sec = (performance.now() - this.rec.start) / 1000;
        live.innerHTML = '<p>Listening on your device. Your transcript appears the moment you stop. ' +
          '<span class="interim">' + fmtTime(sec) + "</span></p>";
        this.rec.timer = setTimeout(tick, 500);
      };
      tick();
    },

    stopRecording() {
      const rec = this.rec;
      if (!rec) return;
      cancelAnimationFrame(rec.raf);
      clearTimeout(rec.timer);
      $("#orbLevel").style.setProperty("--level", 0);
      if (this.field) this.field.setLevel(0);
      rec.mr.onstop = async () => {
        try {
          const type = (rec.parts[0] && rec.parts[0].type) || "audio/webm";
          const blob = new Blob(rec.parts, { type });
          rec.stream.getTracks().forEach((t) => t.stop());
          rec.ctx.close();
          this.rec = null;
          await this.transcribe(blob, "recording.webm");
        } catch (e) {
          this.fail("Could not process the recording. " + (e.message || e));
        }
      };
      // show the panel immediately while the recorder finalizes
      this.setState(this.loadedModel === this.modelId() ? "processing" : "downloading");
      $("#procName").textContent = "recording";
      $("#dlName").textContent = "recording";
      rec.mr.stop();
    },

    /* ---- file ---- */
    handleFile(file) {
      this.name = file.name || "audio file";
      this.transcribe(file, this.name);
    },

    /* ---- shared transcription path ---- */
    async transcribe(blob, name) {
      if (this.busy) return;
      this.busy = true;
      this.name = name;
      this.pendingModel = this.modelId();
      const needsDownload = this.loadedModel !== this.pendingModel;

      this.setState(needsDownload ? "downloading" : "processing");
      $("#procName").textContent = name;
      $("#dlName").textContent = name;
      if (needsDownload) { $("#dlFill").style.width = "0%"; $("#dlPct").textContent = "0%"; }

      try {
        const audio = await decodeToMono16k(blob);
        const w = this.getWorker();
        w.postMessage({
          type: "transcribe",
          audio,
          model: this.pendingModel,
          language: this.langValue(),
          task: this.task(),
        }, [audio.buffer]);
      } catch (err) {
        this.busy = false;
        this.fail("That file could not be read. Verbatim supports common audio and video formats such as MP3, WAV, M4A, MP4, and MOV. Try a different file.");
      }
    },

    onWorker(e) {
      const { type, data } = e.data;
      if (type === "progress") {
        if (data && data.status === "progress" && typeof data.progress === "number") {
          if (this.state !== "downloading") { this.setState("downloading", { noScroll: true }); $("#dlName").textContent = this.name; }
          const p = Math.max(0, Math.min(100, data.progress));
          $("#dlFill").style.width = p + "%";
          $("#dlPct").textContent = Math.round(p) + "%";
          if (data.file) $("#dlLabel").textContent = "Downloading " + String(data.file).split("/").pop();
        }
      } else if (type === "status") {
        if (data === "transcribing") {
          this.loadedModel = this.pendingModel;
          this.setState("processing", { noScroll: true });
          $("#procName").textContent = this.name;
        }
      } else if (type === "result") {
        this.busy = false;
        this.loadedModel = this.pendingModel;
        this.ingest(data);
        this.setState("result");
      } else if (type === "error") {
        this.busy = false;
        this.fail("Transcription failed. " + data);
      }
    },

    ingest(output) {
      this.chunks = Array.isArray(output.chunks) ? output.chunks.filter((c) => c && c.timestamp) : [];
      this.text = (output.text || "").trim();
    },

    fail(msg) {
      this.busy = false;
      this.setState("error");
      $("#errText").textContent = msg;
    },

    /* ---- result ---- */
    setView(v) {
      this.view = v;
      $$("#segToggle button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.view === v)));
      $("#docView").hidden = v !== "text";
      $("#segView").hidden = v !== "segments";
    },

    renderResult() {
      const doc = $("#docView");
      const body = this.text || this.chunks.map((c) => (c.text || "").trim()).join(" ").trim();
      doc.innerHTML = "<p>" + esc(body) + "</p>";

      const seg = $("#segView");
      if (this.chunks.length) {
        seg.innerHTML = this.chunks.map((c) => {
          const t = c.timestamp[0];
          return '<div class="segment"><div class="segment__time">' + fmtTime(t) +
            '</div><div class="segment__text">' + esc((c.text || "").trim()) + "</div></div>";
        }).join("");
      } else {
        seg.innerHTML = '<div class="segment"><div class="segment__text ink-faint">No timestamped segments were returned for this clip.</div></div>';
      }
      this.setView(this.view);
    },

    /* ---- exports (real data) ---- */
    plainText() {
      return (this.state === "result" ? $("#docView").innerText : this.text).trim();
    },
    toTXT() { return this.plainText() + "\n"; },
    toSRT() {
      return this.chunks.map((c, i) => {
        const a = c.timestamp[0], b = c.timestamp[1] != null ? c.timestamp[1] : a + 2;
        return (i + 1) + "\n" + srtTime(a) + " --> " + srtTime(b) + "\n" + (c.text || "").trim() + "\n";
      }).join("\n");
    },
    toVTT() {
      return "WEBVTT\n\n" + this.chunks.map((c) => {
        const a = c.timestamp[0], b = c.timestamp[1] != null ? c.timestamp[1] : a + 2;
        return vttTime(a) + " --> " + vttTime(b) + "\n" + (c.text || "").trim() + "\n";
      }).join("\n");
    },
    copyTranscript(btn) {
      const text = this.view === "segments"
        ? this.chunks.map((c) => fmtTime(c.timestamp[0]) + "  " + (c.text || "").trim()).join("\n")
        : this.plainText();
      (navigator.clipboard ? navigator.clipboard.writeText(text) : Promise.reject()).then(() => {
        const label = btn.querySelector("span");
        const orig = label ? label.textContent : "";
        btn.classList.add("is-confirmed");
        if (label) label.textContent = "Copied";
        this.toast("Transcript copied to clipboard", "ok");
        setTimeout(() => { btn.classList.remove("is-confirmed"); if (label) label.textContent = orig; }, 1800);
      }).catch(() => this.toast("Could not access clipboard", "err"));
    },
    download(name, content, type) {
      const blob = new Blob([content], { type });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = name; document.body.appendChild(a); a.click();
      a.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
      this.toast("Saved " + name, "ok");
    },

    reset() {
      if (this.rec) {
        try {
          cancelAnimationFrame(this.rec.raf); clearTimeout(this.rec.timer);
          this.rec.stream.getTracks().forEach((t) => t.stop()); this.rec.ctx.close();
        } catch (e) {}
        this.rec = null;
      }
      $("#orbLevel").style.setProperty("--level", 0);
      if (this.field) this.field.setLevel(0);
      $("#dlFill").style.width = "0%"; $("#dlPct").textContent = "0%";
      this.chunks = []; this.text = "";
      this.setState("idle");
    },

    /* ---- toast ---- */
    toast(msg, kind = "ok") {
      const zone = $("#toastZone");
      const el = document.createElement("div");
      el.className = "toast toast--" + (kind === "err" ? "err" : "ok");
      el.innerHTML = (kind === "err"
        ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16.5v.01"/></svg>'
        : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6 9 17l-5-5"/></svg>')
        + "<span>" + esc(msg) + "</span>";
      zone.appendChild(el);
      requestAnimationFrame(() => el.classList.add("is-in"));
      setTimeout(() => { el.classList.remove("is-in"); setTimeout(() => el.remove(), 300); }, 2600);
    },

    /* ---- dropzone (whole window) ---- */
    bindDropzone() {
      const overlay = $("#dropOverlay");
      let depth = 0;
      const hasFiles = (e) => e.dataTransfer && Array.from(e.dataTransfer.types || []).includes("Files");
      window.addEventListener("dragenter", (e) => { if (!hasFiles(e)) return; e.preventDefault(); depth++; overlay.classList.add("is-active"); });
      window.addEventListener("dragover", (e) => { if (hasFiles(e)) e.preventDefault(); });
      window.addEventListener("dragleave", (e) => { if (!hasFiles(e)) return; depth = Math.max(0, depth - 1); if (depth === 0) overlay.classList.remove("is-active"); });
      window.addEventListener("drop", (e) => {
        if (!hasFiles(e)) return;
        e.preventDefault(); depth = 0; overlay.classList.remove("is-active");
        const f = e.dataTransfer.files[0]; if (f) this.handleFile(f);
      });
    },

    /* ---- FAQ accordion ---- */
    bindFAQ() {
      $$(".faq__item").forEach((item) => {
        const q = $(".faq__q", item), a = $(".faq__a", item);
        q.addEventListener("click", () => {
          const open = item.classList.toggle("is-open");
          q.setAttribute("aria-expanded", String(open));
          a.style.maxHeight = open ? a.scrollHeight + "px" : 0;
        });
      });
    },

    /* ---- scroll reveal ---- */
    bindReveal() {
      const reveals = $$(".reveal");
      const showInView = () => reveals.forEach((el) => {
        if (el.classList.contains("is-in")) return;
        const r = el.getBoundingClientRect();
        if (r.top < window.innerHeight * 0.92 && r.bottom > 0) el.classList.add("is-in");
      });
      showInView();
      if ("IntersectionObserver" in window) {
        const io = new IntersectionObserver((entries) => {
          entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add("is-in"); io.unobserve(en.target); } });
        }, { threshold: 0.08, rootMargin: "0px 0px -6% 0px" });
        reveals.forEach((el) => io.observe(el));
      } else {
        reveals.forEach((el) => el.classList.add("is-in"));
      }
      window.addEventListener("scroll", showInView, { passive: true });
      window.addEventListener("load", showInView);
    },

    /* ---- sticky header ---- */
    bindHeader() {
      const header = $(".header");
      const onScroll = () => header.classList.toggle("is-stuck", window.scrollY > 24);
      onScroll();
      window.addEventListener("scroll", onScroll, { passive: true });
    },
  };

  window.addEventListener("DOMContentLoaded", () => {
    const canvas = document.getElementById("fieldCanvas");
    const fallback = document.getElementById("fieldFallback");
    if (window.VoiceField && canvas) {
      const vf = new window.VoiceField(canvas);
      if (vf.ok) { window.__voiceField = vf; vf.start(); if (fallback) fallback.style.opacity = "0"; }
      else { canvas.style.display = "none"; } // CSS fallback remains
    }
    App.init();
    window.__VerbatimApp = App;
  });
})();
