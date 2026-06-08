/* ============================================================
   VERBATIM - Liquid cursor
   A pointer-driven dye field that smears and drifts like oil paint.
   Curl-noise advection + slow dissipation give the flowing, viscous
   trail; brand aurora hues; "screen" blend keeps text readable.
   Lightweight on purpose (Whisper + the hero voice field already use
   the GPU). Off on touch and reduced-motion; pauses on hidden tabs.
   ============================================================ */
(function () {
  "use strict";

  if (typeof window === "undefined") return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  if (window.matchMedia("(hover: none), (pointer: coarse)").matches) return;

  const canvas = document.createElement("canvas");
  canvas.id = "liquidCursor";
  canvas.setAttribute("aria-hidden", "true");
  Object.assign(canvas.style, {
    position: "fixed", inset: "0", width: "100%", height: "100%",
    pointerEvents: "none", zIndex: "45", mixBlendMode: "screen",
    opacity: "0.25",
  });

  const gl = canvas.getContext("webgl", {
    alpha: false, antialias: false, depth: false, stencil: false,
    preserveDrawingBuffer: false, powerPreference: "low-power",
  });
  if (!gl) return;

  const VERT = "attribute vec2 aPos; varying vec2 vUv; void main(){ vUv = aPos*0.5+0.5; gl_Position = vec4(aPos,0.0,1.0); }";

  const UPDATE = `
  precision highp float;
  varying vec2 vUv;
  uniform sampler2D uPrev;
  uniform float uTime, uDt, uAspect, uStrength;
  uniform vec2 uMouse, uMousePrev;
  uniform vec3 uColor;

  float hash(vec2 p){ p=fract(p*vec2(123.34,456.21)); p+=dot(p,p+45.32); return fract(p.x*p.y); }
  float noise(vec2 p){ vec2 i=floor(p),f=fract(p);
    float a=hash(i),b=hash(i+vec2(1.,0.)),c=hash(i+vec2(0.,1.)),d=hash(i+vec2(1.,1.));
    vec2 u=f*f*(3.-2.*f); return mix(mix(a,b,u.x),mix(c,d,u.x),u.y); }
  float fbm(vec2 p){ float v=0.,a=0.5; for(int i=0;i<4;i++){ v+=a*noise(p); p=p*2.02+5.1; a*=0.5; } return v; }
  vec2 curl(vec2 p){
    float e=0.06;
    float n1=fbm(p+vec2(0.,e)), n2=fbm(p-vec2(0.,e));
    float n3=fbm(p+vec2(e,0.)), n4=fbm(p-vec2(e,0.));
    return vec2(n1-n2, n4-n3)/(2.0*e);
  }

  void main(){
    vec2 uv = vUv;
    vec2 p = vec2(uv.x*uAspect, uv.y);

    // procedural flow field — the source of the "oil" drift
    vec2 flow = curl(p*2.6 + uTime*0.05);
    vec2 off = flow * uDt * 0.11;
    off.x /= uAspect;

    // semi-Lagrangian advection + slow dissipation
    vec3 prev = texture2D(uPrev, uv - off).rgb * 0.972;

    // splat along the pointer's path this frame (continuous stroke)
    vec2 a = vec2(uMousePrev.x*uAspect, uMousePrev.y);
    vec2 b = vec2(uMouse.x*uAspect, uMouse.y);
    vec2 pt = vec2(uv.x*uAspect, uv.y);
    vec2 pa = pt - a, ba = b - a;
    float h = clamp(dot(pa,ba)/max(dot(ba,ba),1e-5), 0.0, 1.0);
    float dist = length(pa - ba*h);
    float r = 0.052;
    float amt = exp(-(dist*dist)/(r*r)) * uStrength;

    vec3 col = prev + uColor * amt;
    col = min(col, vec3(1.25));
    gl_FragColor = vec4(col, 1.0);
  }`;

  const COPY = "precision highp float; varying vec2 vUv; uniform sampler2D uTex; void main(){ gl_FragColor = texture2D(uTex, vUv); }";

  function sh(type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { console.warn("liquid-cursor shader:", gl.getShaderInfoLog(s)); return null; }
    return s;
  }
  function prog(vs, fs) {
    const vsh = sh(gl.VERTEX_SHADER, vs), fsh = sh(gl.FRAGMENT_SHADER, fs);
    if (!vsh || !fsh) return null;
    const p = gl.createProgram();
    gl.attachShader(p, vsh); gl.attachShader(p, fsh); gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) { console.warn("liquid-cursor link:", gl.getProgramInfoLog(p)); return null; }
    return p;
  }

  const updateProg = prog(VERT, UPDATE);
  const copyProg = prog(VERT, COPY);
  if (!updateProg || !copyProg) return;

  const quad = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, quad);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  function bindQuad(p) {
    const loc = gl.getAttribLocation(p, "aPos");
    gl.bindBuffer(gl.ARRAY_BUFFER, quad);
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  }

  const SIM_SCALE = 0.75;
  let A, B, simW, simH;

  function makeTarget(w, h) {
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    const fb = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    gl.clearColor(0, 0, 0, 1); gl.clear(gl.COLOR_BUFFER_BIT);
    return { tex, fb };
  }

  function resize() {
    const cssW = window.innerWidth, cssH = window.innerHeight;
    simW = Math.max(2, Math.floor(cssW * SIM_SCALE));
    simH = Math.max(2, Math.floor(cssH * SIM_SCALE));
    canvas.width = simW; canvas.height = simH;
    A = makeTarget(simW, simH);
    B = makeTarget(simW, simH);
  }

  // aurora hues (linear-ish, used for the dye)
  const HUES = [
    [0.373, 0.878, 0.769], // mint  #5FE0C4
    [0.329, 0.663, 0.839], // blue  #54A9D6
    [0.604, 0.573, 0.894], // violet #9A92E4
  ];
  function colorAt(t) {
    const f = (t * 0.12) % HUES.length;
    const i = Math.floor(f), j = (i + 1) % HUES.length, k = f - i;
    const a = HUES[i], b = HUES[j];
    return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
  }

  const mouse = { x: -1, y: -1 };
  const prevMouse = { x: -1, y: -1 };     // last frame's position (stroke start)
  let lastSeen = { x: -1, y: -1 };
  function onMove(e) {
    mouse.x = e.clientX / window.innerWidth;
    mouse.y = 1.0 - e.clientY / window.innerHeight;
    if (lastSeen.x < 0) { lastSeen = { x: mouse.x, y: mouse.y }; prevMouse.x = mouse.x; prevMouse.y = mouse.y; }
  }
  window.addEventListener("mousemove", onMove, { passive: true });
  window.addEventListener("mousedown", onMove, { passive: true });

  let running = true;
  document.addEventListener("visibilitychange", () => {
    running = !document.hidden;
    if (running) { last = performance.now(); requestAnimationFrame(loop); }
  });
  let resizeT;
  window.addEventListener("resize", () => { clearTimeout(resizeT); resizeT = setTimeout(resize, 150); }, { passive: true });

  const uU = {
    prev: gl.getUniformLocation(updateProg, "uPrev"),
    time: gl.getUniformLocation(updateProg, "uTime"),
    dt: gl.getUniformLocation(updateProg, "uDt"),
    aspect: gl.getUniformLocation(updateProg, "uAspect"),
    strength: gl.getUniformLocation(updateProg, "uStrength"),
    mouse: gl.getUniformLocation(updateProg, "uMouse"),
    mousePrev: gl.getUniformLocation(updateProg, "uMousePrev"),
    color: gl.getUniformLocation(updateProg, "uColor"),
  };
  const uC = { tex: gl.getUniformLocation(copyProg, "uTex") };

  let last = performance.now();
  let time = 0;

  function loop(now) {
    if (!running) return;
    const dt = Math.min(0.033, Math.max(0.001, (now - last) / 1000));
    last = now; time += dt;

    // stroke + strength from this frame's movement
    const dx = mouse.x - prevMouse.x, dy = mouse.y - prevMouse.y;
    const speed = Math.hypot(dx, dy);
    const strength = mouse.x < 0 ? 0 : Math.min(1.0, speed * 7.0);
    const col = colorAt(time);

    // --- simulate: read A, write B ---
    gl.bindFramebuffer(gl.FRAMEBUFFER, B.fb);
    gl.viewport(0, 0, simW, simH);
    gl.useProgram(updateProg);
    bindQuad(updateProg);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, A.tex);
    gl.uniform1i(uU.prev, 0);
    gl.uniform1f(uU.time, time);
    gl.uniform1f(uU.dt, dt);
    gl.uniform1f(uU.aspect, simW / simH);
    gl.uniform1f(uU.strength, strength);
    gl.uniform2f(uU.mouse, mouse.x, mouse.y);
    gl.uniform2f(uU.mousePrev, prevMouse.x < 0 ? mouse.x : prevMouse.x, prevMouse.y < 0 ? mouse.y : prevMouse.y);
    gl.uniform3f(uU.color, col[0], col[1], col[2]);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    // --- present B to screen ---
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.useProgram(copyProg);
    bindQuad(copyProg);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, B.tex);
    gl.uniform1i(uC.tex, 0);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    // swap + carry pointer
    const t = A; A = B; B = t;
    prevMouse.x = mouse.x; prevMouse.y = mouse.y;

    requestAnimationFrame(loop);
  }

  function start() {
    if (!document.body) { document.addEventListener("DOMContentLoaded", start); return; }
    document.body.appendChild(canvas);
    resize();
    last = performance.now();
    requestAnimationFrame(loop);
    window.__liquidCursor = {
      canvas, gl,
      // verification aid: count lit pixels in the live dye texture
      peek() {
        const px = new Uint8Array(simW * simH * 4);
        gl.bindFramebuffer(gl.FRAMEBUFFER, A.fb);
        gl.readPixels(0, 0, simW, simH, gl.RGBA, gl.UNSIGNED_BYTE, px);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        let max = 0, lit = 0;
        for (let i = 0; i < px.length; i += 4) {
          const m = Math.max(px[i], px[i + 1], px[i + 2]);
          if (m > 8) lit++;
          if (m > max) max = m;
        }
        return { max, lit };
      },
    };
  }
  start();
})();
