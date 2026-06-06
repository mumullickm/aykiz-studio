// Blueprint background. A living drafting-table grid rendered in WebGL2:
// receding grid, drifting major lines, amber survey nodes, a slow scan sweep,
// faint ghost finder-eyes, vignette and a touch of grain. Pointer parallax.
(function () {
  const canvas = document.getElementById('bp');
  if (!canvas) return;

  const gl = canvas.getContext('webgl2', {
    antialias: true,
    alpha: false,
    preserveDrawingBuffer: true, // lets the page be screenshotted; cheap at one quad
    powerPreference: 'high-performance',
  });

  // No WebGL2 (very old device): fall back to the static CSS blueprint underneath.
  if (!gl) {
    canvas.style.display = 'none';
    document.documentElement.classList.add('no-webgl');
    return;
  }

  const VERT = `#version 300 es
  in vec2 p;
  void main(){ gl_Position = vec4(p, 0.0, 1.0); }`;

  const FRAG = `#version 300 es
  precision highp float;
  out vec4 frag;
  uniform vec2  uRes;
  uniform float uTime;
  uniform vec2  uMouse;
  uniform float uReduce;

  const vec3 BG1   = vec3(0.031, 0.118, 0.227); // deep blueprint
  const vec3 BG2   = vec3(0.055, 0.165, 0.290); // #0E2A4A
  const vec3 INK   = vec3(0.918, 0.945, 0.984); // #EAF1FB
  const vec3 AMBER = vec3(1.000, 0.702, 0.278); // #FFB347

  // anti-aliased grid: returns line intensity for a given cell scale
  float gridMask(vec2 uv, float cells, float weight){
    vec2 g = uv * cells;
    vec2 d = abs(fract(g) - 0.5);
    vec2 w = fwidth(g) * weight;
    vec2 lines = smoothstep(w, vec2(0.0), d);
    return clamp(max(lines.x, lines.y), 0.0, 1.0);
  }

  // concentric square ring (a ghosted QR finder-eye)
  float finderEye(vec2 uv, vec2 c, float s){
    vec2 q = abs(uv - c) / s;
    float box = max(q.x, q.y);
    float ring1 = smoothstep(0.03, 0.0, abs(box - 1.0));
    float ring2 = smoothstep(0.03, 0.0, abs(box - 0.62));
    float core  = smoothstep(0.30, 0.27, box);
    return ring1 + ring2 + core;
  }

  float hash(vec2 p){ return fract(sin(dot(p, vec2(41.3, 289.1))) * 43758.5453); }

  void main(){
    vec2 uv = gl_FragCoord.xy / uRes.xy;
    float aspect = uRes.x / uRes.y;
    vec2 sp = uv;
    sp.x *= aspect;

    // pointer + slow auto drift -> the table breathes
    vec2 par = (uMouse - 0.5) * vec2(0.06, 0.045) * (1.0 - uReduce);
    vec2 drift = vec2(uTime * 0.006, uTime * 0.010) * (1.0 - uReduce);
    vec2 guv = sp + par + drift;

    // gentle perspective: cells widen toward the bottom (a draft table receding)
    float depth = mix(1.18, 0.86, uv.y);
    guv *= depth;

    // base paper gradient with a soft top glow
    float vgrad = smoothstep(-0.2, 1.15, uv.y);
    vec3 col = mix(BG1, BG2, vgrad);
    col += AMBER * 0.020 * smoothstep(0.75, 0.0, distance(uv, vec2(0.5, 1.05)));

    // fine + major grid
    float fine  = gridMask(guv, 26.0, 1.0) * 0.10;
    float major = gridMask(guv, 26.0 / 5.0, 1.2) * 0.18;
    float gridFade = mix(0.55, 1.0, smoothstep(0.0, 0.7, uv.y)); // dimmer up top
    col += INK * (fine + major) * gridFade;

    // survey nodes: amber pulses parked on the major lattice
    vec2 cell = guv * (26.0 / 5.0);
    vec2 id = floor(cell);
    vec2 f  = fract(cell) - 0.5;
    float lit = step(0.86, hash(id));                 // only a few cells glow
    float ph  = hash(id + 7.0) * 6.2831;
    float pulse = 0.5 + 0.5 * sin(uTime * 1.2 + ph);
    float node = smoothstep(0.16, 0.0, length(f)) * lit * (0.25 + 0.75 * pulse);
    col += AMBER * node * 0.9;

    // ghost finder-eyes drifting behind everything
    float ghosts = 0.0;
    ghosts += finderEye(guv, vec2(0.6 * aspect, 0.30) + drift * 1.4, 0.16);
    ghosts += finderEye(guv, vec2(0.18 * aspect, 0.78) - drift * 1.1, 0.12);
    col += INK * ghosts * 0.018;

    // slow scan sweep
    float scan = smoothstep(0.02, 0.0, abs(fract(uv.y * 0.5 - uTime * 0.05) - 0.5) - 0.005);
    col += AMBER * scan * 0.05 * (1.0 - uReduce);

    // crosshair tick at the pointer (a draftsman's cursor)
    vec2 m = vec2(uMouse.x * aspect, uMouse.y);
    float cd = distance(sp, m);
    float cross = smoothstep(0.004, 0.0, abs(sp.x - m.x) ) + smoothstep(0.004, 0.0, abs(sp.y - m.y));
    cross *= smoothstep(0.12, 0.0, cd);
    col += AMBER * cross * 0.18 * (1.0 - uReduce);

    // vignette + faint grain
    float vig = smoothstep(1.25, 0.35, distance(uv, vec2(0.5)));
    col *= mix(0.78, 1.0, vig);
    col += (hash(gl_FragCoord.xy + uTime) - 0.5) * 0.015;

    frag = vec4(col, 1.0);
  }`;

  function compile(type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      console.error(gl.getShaderInfoLog(s));
    }
    return s;
  }

  const prog = gl.createProgram();
  gl.attachShader(prog, compile(gl.VERTEX_SHADER, VERT));
  gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FRAG));
  gl.linkProgram(prog);
  gl.useProgram(prog);

  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, 'p');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

  const uRes = gl.getUniformLocation(prog, 'uRes');
  const uTime = gl.getUniformLocation(prog, 'uTime');
  const uMouse = gl.getUniformLocation(prog, 'uMouse');
  const uReduce = gl.getUniformLocation(prog, 'uReduce');

  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches ? 1 : 0;
  gl.uniform1f(uReduce, reduce);

  const mouse = { x: 0.5, y: 0.5, tx: 0.5, ty: 0.5 };
  addEventListener('pointermove', (e) => {
    mouse.tx = e.clientX / innerWidth;
    mouse.ty = 1 - e.clientY / innerHeight;
  }, { passive: true });

  let dpr = Math.min(devicePixelRatio || 1, 2);
  function resize() {
    dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.floor(innerWidth * dpr);
    canvas.height = Math.floor(innerHeight * dpr);
    canvas.style.width = innerWidth + 'px';
    canvas.style.height = innerHeight + 'px';
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.uniform2f(uRes, canvas.width, canvas.height);
  }
  addEventListener('resize', resize);
  resize();

  const start = performance.now();
  let running = true;
  document.addEventListener('visibilitychange', () => {
    running = !document.hidden;
    if (running) requestAnimationFrame(frame);
  });

  function frame(now) {
    if (!running) return;
    mouse.x += (mouse.tx - mouse.x) * 0.06;
    mouse.y += (mouse.ty - mouse.y) * 0.06;
    gl.uniform1f(uTime, (now - start) / 1000);
    gl.uniform2f(uMouse, mouse.x, mouse.y);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
