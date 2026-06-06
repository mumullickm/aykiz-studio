// Blueprint background. ONE static blueprint grid that never moves. The only
// motion: every so often a run of 7-10 individual grid lines lights up thin and
// white, one line at a time in sequence - once across the horizontals, once down
// the verticals - then it goes quiet again. Nothing else animates.
(function () {
  const canvas = document.getElementById('bp');
  if (!canvas) return;

  const gl = canvas.getContext('webgl2', {
    antialias: true,
    alpha: false,
    preserveDrawingBuffer: true,
    powerPreference: 'high-performance',
  });

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
  uniform float uReduce;

  const vec3 BG1   = vec3(0.031, 0.118, 0.227);
  const vec3 BG2   = vec3(0.055, 0.165, 0.290);
  const vec3 INK   = vec3(0.918, 0.945, 0.984);
  const vec3 AMBER = vec3(1.000, 0.702, 0.278);

  const float CELL  = 40.0;  // px per fine cell -> square cells, fixed
  const float MAJOR = 5.0;   // every 5th line is a major line
  const float LW    = 1.1;   // line half-width in px

  // distance (px) to the nearest grid line on one axis
  float lineDistPx(float t, float cellPx){
    float fr = fract(t);
    float dCells = min(fr, 1.0 - fr); // 0 at a line, 0.5 mid-cell
    return dCells * cellPx;
  }
  float lineMask(float t, float cellPx){
    return 1.0 - smoothstep(0.0, LW, lineDistPx(t, cellPx));
  }

  float h11(float n){ return fract(sin(n * 12.9898) * 43758.5453); }

  // brightness for line li during a sequential run of count lines starting at
  // startIdx. Each line gets a sharp attack then a short fade, stepped by dwell,
  // so the lines read as lighting up one at a time.
  float cascade(float li, float startIdx, float count, float lt, float dwell, float fade){
    if (li < startIdx || li >= startIdx + count) return 0.0;
    float age = lt - (li - startIdx) * dwell;
    if (age < 0.0) return 0.0;
    float atk = smoothstep(0.0, 0.035, age);
    float dec = 1.0 - smoothstep(0.0, fade, age);
    return atk * dec;
  }

  void main(){
    vec2 fc = gl_FragCoord.xy;
    vec2 uv = fc / uRes.xy;

    // static paper gradient (no motion)
    vec3 col = mix(BG1, BG2, smoothstep(-0.15, 1.1, uv.y));

    // grid coordinates in cell units (square, fixed)
    vec2 g = fc / CELL;
    float vFine = lineMask(g.x, CELL);          // vertical lines (constant x)
    float hFine = lineMask(g.y, CELL);          // horizontal lines (constant y)
    float vMaj  = lineMask(g.x / MAJOR, CELL * MAJOR);
    float hMaj  = lineMask(g.y / MAJOR, CELL * MAJOR);

    // static base grid (the blueprint itself - visible, calm)
    col += INK * (vFine + hFine) * 0.11;
    col += INK * (vMaj + hMaj) * 0.17;

    if (uReduce < 0.5) {
      float dwell = 0.12, fade = 0.5;
      float T = 13.0;                 // long period: mostly quiet, lights "sometimes"
      float ph = mod(uTime, T);
      float cyc = floor(uTime / T);

      // horizontal run: 7-10 lines light one at a time, top to bottom
      float countH = 7.0 + floor(h11(cyc) * 4.0);
      float winH = countH * dwell + fade;
      float ltH = ph - 1.0;
      if (ltH >= 0.0 && ltH < winH) {
        float ny = uRes.y / CELL;
        float L0 = floor(h11(cyc + 1.3) * max(1.0, ny - countH));
        float li = floor(g.y + 0.5);
        col += INK * cascade(li, L0, countH, ltH, dwell, fade) * hFine * 1.15;
      }

      // vertical run: same idea a couple of seconds later, left to right
      float countV = 7.0 + floor(h11(cyc + 5.0) * 4.0);
      float winV = countV * dwell + fade;
      float ltV = ph - (2.0 + winH);
      if (ltV >= 0.0 && ltV < winV) {
        float nx = uRes.x / CELL;
        float C0 = floor(h11(cyc + 7.7) * max(1.0, nx - countV));
        float ci = floor(g.x + 0.5);
        col += INK * cascade(ci, C0, countV, ltV, dwell, fade) * vFine * 1.15;
      }
    }

    // static vignette for a touch of depth (no animated grain)
    float vig = smoothstep(1.3, 0.4, distance(uv, vec2(0.5)));
    col *= mix(0.82, 1.0, vig);

    frag = vec4(col, 1.0);
  }`;

  function compile(type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) console.error(gl.getShaderInfoLog(s));
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
  const uReduce = gl.getUniformLocation(prog, 'uReduce');
  gl.uniform1f(uReduce, matchMedia('(prefers-reduced-motion: reduce)').matches ? 1 : 0);

  function resize() {
    const dpr = Math.min(devicePixelRatio || 1, 2);
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
    gl.uniform1f(uTime, (now - start) / 1000);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
