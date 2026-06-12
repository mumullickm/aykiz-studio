/* Hero night field. Gold motes drifting over a deep indigo sky with a
   breathing lamp-glow, in a single fragment shader. Enhancement only: if
   WebGL is missing, motion is reduced, or data is metered, the canvas stays
   hidden and the CSS sky behind it carries the hero. */
(function () {
  var canvas = document.querySelector('.hero-webgl');
  if (!canvas) return;

  var conn = navigator.connection || navigator.webkitConnection;
  if (conn && conn.saveData) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var gl = canvas.getContext('webgl', { antialias: false, alpha: false, powerPreference: 'low-power' });
  if (!gl) return;

  var small = window.matchMedia('(max-width: 720px)').matches;

  var vsrc =
    'attribute vec2 p; varying vec2 vUv;' +
    'void main(){ vUv = p * 0.5 + 0.5; gl_Position = vec4(p, 0.0, 1.0); }';

  var fsrc = [
    'precision highp float;',
    'varying vec2 vUv;',
    'uniform vec2 uRes;',
    'uniform float uTime;',
    'float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }',
    'float motes(vec2 uv, float scale, float drift, float tw){',
    '  vec2 g = uv * scale + vec2(uTime * drift, uTime * drift * 0.4);',
    '  vec2 id = floor(g);',
    '  vec2 f = fract(g);',
    '  float h = hash(id);',
    '  vec2 star = vec2(hash(id + 1.7), hash(id + 4.2));',
    '  float d = length(f - star);',
    '  float size = 0.04 + h * 0.05;',
    '  float m = smoothstep(size, 0.0, d);',
    '  float twinkle = 0.55 + 0.45 * sin(uTime * (0.4 + h * tw) + h * 40.0);',
    '  return m * twinkle * step(0.45, h);',
    '}',
    'void main(){',
    '  vec2 uv = vUv;',
    '  vec2 ar = vec2(uRes.x / uRes.y, 1.0);',
    '  vec3 deep = vec3(0.024, 0.031, 0.059);',
    '  vec3 raised = vec3(0.102, 0.129, 0.278);',
    '  vec3 gold = vec3(0.922, 0.718, 0.196);',
    '  vec3 goldWarm = vec3(0.957, 0.788, 0.365);',
    '  float skyd = distance(uv * ar, vec2(0.5 * ar.x, 1.05));',
    '  vec3 col = mix(raised, deep, smoothstep(0.0, 1.15, skyd));',
    '  float breathe = 0.5 + 0.5 * sin(uTime * 0.45);',
    '  float halo = distance(uv * ar, vec2(0.5 * ar.x, 0.62));',
    '  col += goldWarm * (0.10 + 0.05 * breathe) * smoothstep(0.55, 0.0, halo);',
    '  col += goldWarm * motes(uv * ar, 7.0, 0.006, 1.2) * 0.55;',
    '  col += gold * motes(uv * ar + 31.0, 13.0, 0.012, 2.0) * 0.35;',
    '  col += vec3(0.93, 0.92, 0.88) * motes(uv * ar + 77.0, 22.0, 0.003, 1.5) * 0.18;',
    '  float vig = smoothstep(1.5, 0.45, distance(uv * ar, vec2(0.5 * ar.x, 0.5)));',
    '  col *= 0.82 + 0.18 * vig;',
    '  gl_FragColor = vec4(col, 1.0);',
    '}'
  ].join('\n');

  function compile(type, src) {
    var s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) return null;
    return s;
  }

  var vs = compile(gl.VERTEX_SHADER, vsrc);
  var fs = compile(gl.FRAGMENT_SHADER, fsrc);
  if (!vs || !fs) return;

  var prog = gl.createProgram();
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
  gl.useProgram(prog);

  var buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  var loc = gl.getAttribLocation(prog, 'p');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

  var uRes = gl.getUniformLocation(prog, 'uRes');
  var uTime = gl.getUniformLocation(prog, 'uTime');

  function resize() {
    var dpr = Math.min(window.devicePixelRatio || 1, small ? 1.5 : 2);
    var w = Math.round(canvas.clientWidth * dpr);
    var h = Math.round(canvas.clientHeight * dpr);
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
      gl.viewport(0, 0, w, h);
    }
  }
  window.addEventListener('resize', resize);

  var start = performance.now();
  var running = true;
  document.addEventListener('visibilitychange', function () {
    running = !document.hidden;
    if (running) frame();
  });

  /* only animate while the hero is on screen */
  var visible = true;
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      visible = entries[0].isIntersecting;
      if (visible) frame();
    }).observe(canvas);
  }

  var pending = false;
  function frame() {
    if (pending || !running || !visible) return;
    pending = true;
    requestAnimationFrame(function () {
      pending = false;
      resize();
      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.uniform1f(uTime, (performance.now() - start) / 1000);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      if (running && visible) frame();
    });
  }

  canvas.classList.add('is-live');
  frame();
})();
