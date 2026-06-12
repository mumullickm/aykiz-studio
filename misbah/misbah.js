import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const isMobile = window.matchMedia('(max-width: 760px)').matches;

/* Section reveals: content is visible by default; the .anim class arms the
   CSS-hidden state only once JS is alive, so nothing can stay lost if any of
   this fails to run. */
if (!reduceMotion) {
  let pending = [...document.querySelectorAll('.reveal')];
  const sweep = () => {
    pending = pending.filter((el) => {
      if (el.getBoundingClientRect().top < innerHeight * 0.92) { el.classList.add('in'); return false; }
      return true;
    });
    if (!pending.length) {
      removeEventListener('scroll', sweep);
      removeEventListener('resize', sweep);
    }
  };
  /* anything already on screen is revealed BEFORE the hidden state is armed,
     so the first paint can never lose content */
  sweep();
  document.body.classList.add('anim');
  addEventListener('scroll', sweep, { passive: true });
  addEventListener('resize', sweep, { passive: true });
}

/* ───────────────────────── scene ───────────────────────── */
const canvas = document.getElementById('scene');
const easeOut = (x) => 1 - Math.pow(1 - Math.min(Math.max(x, 0), 1), 3);

let renderer;
try {
  if (location.search.includes('nogl')) throw new Error('forced off');
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
} catch (_) {
  document.body.classList.add('no-webgl');
}

if (renderer) {
  document.body.classList.add('webgl-on');
  renderer.setClearColor(0x06080f, 1);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 60);
  const CAM_Z = isMobile ? 7.8 : 6.4;
  camera.position.set(0, 0, CAM_Z);

  const radialTexture = (stops, size = 256) => {
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const g = c.getContext('2d');
    const grad = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    for (const [p, col] of stops) grad.addColorStop(p, col);
    g.fillStyle = grad;
    g.fillRect(0, 0, size, size);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  };

  /* In-scene night sky, so the composer never has to blend with the page. */
  const sky = new THREE.Sprite(new THREE.SpriteMaterial({
    map: radialTexture([[0, 'rgba(26,33,71,1)'], [0.55, 'rgba(10,13,31,0.6)'], [1, 'rgba(10,13,31,0)']], 512),
    depthWrite: false,
  }));
  sky.scale.set(34, 34, 1);
  sky.position.set(0, 5, -12);
  scene.add(sky);

  /* ── the Radiant Star: brand geometry, two pairs of counter-rotating squares ── */
  const star = new THREE.Group();

  const squareLoop = (half, color, opacity, turn) => {
    const pts = [
      new THREE.Vector3(-half, -half, 0), new THREE.Vector3(half, -half, 0),
      new THREE.Vector3(half, half, 0), new THREE.Vector3(-half, half, 0),
    ];
    const geo = new THREE.BufferGeometry().setFromPoints(pts);
    const mat = new THREE.LineBasicMaterial({ color, transparent: true, opacity });
    const loop = new THREE.LineLoop(geo, mat);
    loop.rotation.z = turn;
    return loop;
  };

  const outer = new THREE.Group();
  outer.add(squareLoop(1.5, 0xebb732, 0.38, 0), squareLoop(1.5, 0xebb732, 0.38, Math.PI / 4));
  const inner = new THREE.Group();
  inner.add(squareLoop(0.85, 0xf4c95d, 0.7, 0), squareLoop(0.85, 0xf4c95d, 0.7, Math.PI / 4));
  star.add(outer, inner);

  const flame = new THREE.Sprite(new THREE.SpriteMaterial({
    map: radialTexture([[0, 'rgba(255,243,214,1)'], [0.25, 'rgba(244,201,93,0.95)'], [0.55, 'rgba(235,183,50,0.4)'], [1, 'rgba(235,183,50,0)']]),
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  }));
  flame.scale.set(0.001, 0.001, 1);
  star.add(flame);

  const pool = new THREE.Sprite(new THREE.SpriteMaterial({
    map: radialTexture([[0, 'rgba(244,201,93,0.34)'], [0.45, 'rgba(235,183,50,0.1)'], [1, 'rgba(235,183,50,0)']], 512),
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  }));
  pool.scale.set(5.5, 5.5, 1);
  pool.position.z = -0.4;
  star.add(pool);

  const STAR_Y = isMobile ? 1.7 : 1.45;
  star.position.y = STAR_Y;
  star.scale.setScalar(0.88);
  scene.add(star);

  /* ── gold dust: the dark is full of motes, and the pointer is the lamp ── */
  const COUNT = isMobile ? 1200 : 2400;
  const pos = new Float32Array(COUNT * 3);
  const aSize = new Float32Array(COUNT);
  const aPhase = new Float32Array(COUNT);
  for (let i = 0; i < COUNT; i++) {
    pos[i * 3] = (Math.random() - 0.5) * 26;
    pos[i * 3 + 1] = -18 + Math.random() * 28;
    pos[i * 3 + 2] = -9 + Math.random() * 12;
    aSize[i] = 0.5 + Math.random() * 1.2;
    aPhase[i] = Math.random();
  }
  const dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  dustGeo.setAttribute('aSize', new THREE.BufferAttribute(aSize, 1));
  dustGeo.setAttribute('aPhase', new THREE.BufferAttribute(aPhase, 1));

  const dustUniforms = {
    uTime: { value: 0 },
    uPixelRatio: { value: 1 },
    uPointer: { value: new THREE.Vector3(999, 999, 0) },
  };
  const dust = new THREE.Points(dustGeo, new THREE.ShaderMaterial({
    uniforms: dustUniforms,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexShader: `
      attribute float aSize;
      attribute float aPhase;
      uniform float uTime, uPixelRatio;
      uniform vec3 uPointer;
      varying float vGlow, vTw;
      void main() {
        vec3 p = position;
        p.x += sin(uTime * 0.12 + aPhase * 6.2832) * 0.4;
        p.y += sin(uTime * 0.08 + aPhase * 12.566) * 0.3;
        vGlow = smoothstep(2.8, 0.0, distance(p.xy, uPointer.xy));
        vTw = 0.55 + 0.45 * sin(uTime * (0.5 + aPhase) + aPhase * 40.0);
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_PointSize = min(aSize * uPixelRatio * (1.0 + vGlow * 1.8) * (30.0 / -mv.z), 24.0 * uPixelRatio);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `
      varying float vGlow, vTw;
      void main() {
        float a = smoothstep(0.5, 0.05, length(gl_PointCoord - 0.5));
        vec3 dim = vec3(0.36, 0.31, 0.21);
        vec3 gold = vec3(0.957, 0.788, 0.365);
        vec3 c = mix(dim, gold, clamp(vGlow * 1.25 + 0.12, 0.0, 1.0));
        gl_FragColor = vec4(c, a * (0.12 + 0.55 * vGlow) * vTw);
      }`,
  }));
  scene.add(dust);

  /* ── post: bloom is what makes the gold burn ── */
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  composer.addPass(new UnrealBloomPass(new THREE.Vector2(1, 1), 0.85, 0.7, 0.18));

  /* ── pointer: project to the z=0 plane so the lamp lives among the dust ── */
  const ndc = new THREE.Vector2(-99, -99);
  let pointerLive = false;
  const onPoint = (x, y) => {
    ndc.set((x / innerWidth) * 2 - 1, -(y / innerHeight) * 2 + 1);
    pointerLive = true;
  };
  addEventListener('mousemove', (e) => onPoint(e.clientX, e.clientY), { passive: true });
  addEventListener('touchmove', (e) => { const t = e.touches[0]; if (t) onPoint(t.clientX, t.clientY); }, { passive: true });
  addEventListener('touchend', () => { pointerLive = false; }, { passive: true });

  const v3 = new THREE.Vector3();
  const updatePointerWorld = () => {
    if (!pointerLive) { dustUniforms.uPointer.value.set(999, 999, 0); return; }
    v3.set(ndc.x, ndc.y, 0.5).unproject(camera);
    const dir = v3.sub(camera.position).normalize();
    const t = -camera.position.z / dir.z;
    dustUniforms.uPointer.value.copy(camera.position).addScaledVector(dir, t);
  };

  /* ── resize ── */
  const resize = () => {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    renderer.setPixelRatio(dpr);
    renderer.setSize(innerWidth, innerHeight);
    composer.setSize(innerWidth, innerHeight);
    dustUniforms.uPixelRatio.value = dpr;
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
  };
  addEventListener('resize', resize);
  resize();

  /* ── frame loop ── */
  const clock = new THREE.Clock();
  const maxScroll = () => Math.max(1, document.documentElement.scrollHeight - innerHeight);
  let camX = 0, camYOff = 0;
  let smooth = scrollY;
  let running = true;
  document.addEventListener('visibilitychange', () => {
    running = !document.hidden;
    if (running) { clock.getDelta(); tick(); }
  });

  function tick() {
    if (!running) return;
    requestAnimationFrame(tick);
    const t = clock.getElapsedTime();
    dustUniforms.uTime.value = t;

    /* the scene runs its own scroll smoothing; the page scroll stays native */
    smooth += (scrollY - smooth) * (reduceMotion ? 1 : 0.07);
    const p = Math.min(1, smooth / maxScroll());

    const ignite = reduceMotion ? 1 : easeOut(t / 2.2);
    const flameUp = reduceMotion ? 1 : easeOut((t - 0.35) / 1.8);

    if (!reduceMotion) {
      outer.rotation.z = t * 0.05 + p * 1.2;
      inner.rotation.z = -t * 0.075 - p * 1.6;
    }
    const breathe = 0.85 * (1 + (reduceMotion ? 0 : Math.sin(t * 1.15) * 0.06));
    flame.scale.set(breathe * flameUp, breathe * flameUp, 1);
    pool.material.opacity = 0.8 + (reduceMotion ? 0 : Math.sin(t * 1.15) * 0.2);

    /* the journey: the camera sinks through the dust, the star stays behind */
    camera.position.z = CAM_Z + (reduceMotion ? 0 : 2.6 * (1 - ignite));
    camera.position.y = -p * 9 + camYOff;
    star.position.y = STAR_Y - p * 3.6;
    star.position.z = -p * 3.0;

    if (!reduceMotion) {
      camX += ((pointerLive ? ndc.x * 0.4 : 0) - camX) * 0.04;
      camYOff += ((pointerLive ? ndc.y * 0.25 : 0) - camYOff) * 0.04;
      camera.position.x = camX;
      camera.lookAt(0, camera.position.y, 0);
    }

    updatePointerWorld();
    composer.render();
  }
  tick();
}
