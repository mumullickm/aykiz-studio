/* ============================================================
   VERBATIM - Voice field
   A WebGL aurora flow field. Domain-warped fbm noise mapped to
   three desaturated aurora hues, concentrated upper-center where
   the record orb lives.
     idle       -> slow breathing
     recording  -> mic amplitude brightens + ripples (uLevel)
     processing -> gentle indeterminate flow, throttled to spare
                   the CPU/GPU for Whisper inference
   Falls back to the CSS gradient if WebGL is unavailable, and
   nearly stills itself under prefers-reduced-motion.
   ============================================================ */
(function () {
  "use strict";

  const FRAG = `
  precision highp float;
  uniform vec2  uRes;
  uniform float uTime;
  uniform float uLevel;    // 0..1 live mic amplitude
  uniform float uActive;   // 0 idle .. 1 recording
  uniform float uProc;     // 0..1 processing flow
  uniform float uReduced;  // 1 = reduced motion
  uniform vec3  uA1;       // aurora hues
  uniform vec3  uA2;
  uniform vec3  uA3;
  uniform vec3  uBg;

  // hash / value noise
  float hash(vec2 p){ p = fract(p*vec2(123.34,456.21)); p += dot(p, p+45.32); return fract(p.x*p.y); }
  float noise(vec2 p){
    vec2 i = floor(p), f = fract(p);
    float a = hash(i), b = hash(i+vec2(1.,0.)), c = hash(i+vec2(0.,1.)), d = hash(i+vec2(1.,1.));
    vec2 u = f*f*(3.-2.*f);
    return mix(mix(a,b,u.x), mix(c,d,u.x), u.y);
  }
  float fbm(vec2 p){
    float v = 0.0, amp = 0.5;
    for(int i=0;i<5;i++){ v += amp*noise(p); p = p*2.02 + 7.1; amp *= 0.5; }
    return v;
  }

  void main(){
    vec2 uv = gl_FragCoord.xy / uRes.xy;
    float aspect = uRes.x / uRes.y;
    vec2 p = uv; p.x *= aspect;

    // slow time, frozen under reduced motion
    float t = uTime * mix(1.0, 0.06, uReduced);
    float speed = mix(0.05, 0.16, uActive) + uProc*0.10;

    // domain warp
    vec2 q = vec2(fbm(p*1.6 + t*speed), fbm(p*1.6 - t*speed + 3.1));
    vec2 r = vec2(fbm(p*1.6 + q*1.8 + t*speed*0.7 + 1.7),
                  fbm(p*1.6 + q*1.8 - t*speed*0.7 + 9.2));
    float f = fbm(p*1.7 + r*1.9);

    // ripple driven by live level (recording)
    float center = distance(uv, vec2(0.5, 0.62));
    float ripple = sin(center*24.0 - uTime*3.0) * uLevel * 0.12;
    f += ripple;

    // map noise bands to the three aurora hues
    vec3 col = mix(uA1, uA2, smoothstep(0.25, 0.7, f + r.x*0.3));
    col = mix(col, uA3, smoothstep(0.55, 0.95, r.y));

    // concentrate the field upper-center, behind the orb
    float field = smoothstep(1.05, 0.12, center);
    field *= (0.45 + 0.55*f);

    // intensity: calm idle, brighter while listening
    float intensity = mix(0.32, 0.46, uActive) + uLevel*0.42 + uProc*0.05;
    col *= field * intensity;

    // settle onto the deep background
    col = uBg + col;

    // subtle grain to avoid banding
    float g = (hash(uv*uRes.xy*0.5 + t) - 0.5) * 0.012;
    col += g;

    gl_FragColor = vec4(col, 1.0);
  }`;

  const VERT = `attribute vec2 aPos; void main(){ gl_Position = vec4(aPos,0.,1.); }`;

  function hexToRGB(hex){
    const h = hex.replace('#','');
    return [parseInt(h.slice(0,2),16)/255, parseInt(h.slice(2,4),16)/255, parseInt(h.slice(4,6),16)/255];
  }

  class VoiceField {
    constructor(canvas){
      this.canvas = canvas;
      this.mode = 'idle';
      this.level = 0;
      this.targetLevel = 0;
      this.active = 0;      // smoothed
      this.targetActive = 0;
      this.proc = 0; this.targetProc = 0;
      this.time = 9.0;      // start mid-flow so the very first paint looks alive
      this.frames = 0;      // how many real rAF frames have rendered
      this.running = false;
      this.lastFrame = 0;
      this.reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      this.dprCap = (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4) ? 1 : 1.5;
      this.ok = this.init();
    }

    init(){
      const gl = this.canvas.getContext('webgl', { antialias:false, alpha:false, powerPreference:'low-power' })
              || this.canvas.getContext('experimental-webgl');
      if(!gl) return false;
      this.gl = gl;
      const vs = this.compile(gl.VERTEX_SHADER, VERT);
      const fs = this.compile(gl.FRAGMENT_SHADER, FRAG);
      if(!vs || !fs) return false;
      const prog = gl.createProgram();
      gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog);
      if(!gl.getProgramParameter(prog, gl.LINK_STATUS)) return false;
      gl.useProgram(prog); this.prog = prog;
      const buf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 3,-1, -1,3]), gl.STATIC_DRAW);
      const loc = gl.getAttribLocation(prog, 'aPos');
      gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
      this.u = {
        res: gl.getUniformLocation(prog,'uRes'), time: gl.getUniformLocation(prog,'uTime'),
        level: gl.getUniformLocation(prog,'uLevel'), active: gl.getUniformLocation(prog,'uActive'),
        proc: gl.getUniformLocation(prog,'uProc'), reduced: gl.getUniformLocation(prog,'uReduced'),
        a1: gl.getUniformLocation(prog,'uA1'), a2: gl.getUniformLocation(prog,'uA2'),
        a3: gl.getUniformLocation(prog,'uA3'), bg: gl.getUniformLocation(prog,'uBg')
      };
      const css = getComputedStyle(document.documentElement);
      gl.uniform3fv(this.u.a1, hexToRGB((css.getPropertyValue('--aurora-1')||'#5FE0C4').trim()));
      gl.uniform3fv(this.u.a2, hexToRGB((css.getPropertyValue('--aurora-2')||'#54A9D6').trim()));
      gl.uniform3fv(this.u.a3, hexToRGB((css.getPropertyValue('--aurora-3')||'#9A92E4').trim()));
      gl.uniform3fv(this.u.bg, hexToRGB('#080B0E'));
      gl.uniform1f(this.u.reduced, this.reduced ? 1 : 0);
      this.resize();
      window.addEventListener('resize', () => this.resize(), { passive:true });
      return true;
    }

    compile(type, src){
      const gl = this.gl, s = gl.createShader(type);
      gl.shaderSource(s, src); gl.compileShader(s);
      if(!gl.getShaderParameter(s, gl.COMPILE_STATUS)){ console.warn(gl.getShaderInfoLog(s)); return null; }
      return s;
    }

    resize(){
      if(!this.gl) return;
      const dpr = Math.min(window.devicePixelRatio || 1, this.dprCap);
      const w = this.canvas.clientWidth || window.innerWidth;
      const h = this.canvas.clientHeight || window.innerHeight;
      this.canvas.width = Math.max(1, Math.floor(w*dpr));
      this.canvas.height = Math.max(1, Math.floor(h*dpr));
      this.gl.viewport(0,0,this.canvas.width,this.canvas.height);
      this.gl.uniform2f(this.u.res, this.canvas.width, this.canvas.height);
    }

    setMode(mode){
      this.mode = mode;
      this.targetActive = mode === 'recording' ? 1 : 0;
      this.targetProc   = mode === 'processing' ? 1 : 0;
      if(mode !== 'recording'){ this.targetLevel = 0; }
    }
    setLevel(v){ this.targetLevel = Math.min(1, Math.max(0, v)); }

    start(){ if(this.running || !this.ok) return; this.running = true; this.lastFrame = 0; this.renderOnce(); requestAnimationFrame(this.loop.bind(this)); }
    stop(){ this.running = false; }

    /* draw a single frame synchronously - keeps the field from being black
       even where requestAnimationFrame is throttled (background tab, capture) */
    renderOnce(){
      if(!this.ok) return;
      const gl = this.gl;
      gl.uniform1f(this.u.time, this.time);
      gl.uniform1f(this.u.level, this.level);
      gl.uniform1f(this.u.active, this.active);
      gl.uniform1f(this.u.proc, this.proc);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }

    loop(ts){
      if(!this.running) return;
      // Throttle hard while processing so Whisper gets the cycles. ~20fps idle, ~12fps processing.
      const minDelta = this.mode === 'processing' ? 80 : (this.reduced ? 120 : 1000/30);
      if(ts - this.lastFrame < minDelta){ requestAnimationFrame(this.loop.bind(this)); return; }
      const dt = Math.min(0.05, (ts - this.lastFrame)/1000 || 0.016);
      this.lastFrame = ts;
      this.time += dt;
      this.frames++;
      // smooth uniforms
      this.level  += (this.targetLevel  - this.level)  * 0.18;
      this.active += (this.targetActive - this.active) * 0.06;
      this.proc   += (this.targetProc   - this.proc)   * 0.06;
      const gl = this.gl;
      gl.uniform1f(this.u.time, this.time);
      gl.uniform1f(this.u.level, this.level);
      gl.uniform1f(this.u.active, this.active);
      gl.uniform1f(this.u.proc, this.proc);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      requestAnimationFrame(this.loop.bind(this));
    }
  }

  window.VoiceField = VoiceField;
})();
