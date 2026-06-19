import * as THREE from 'three';

/* The floating Hirra cat. A glossy teal clay head, coral inner ears, that
   drifts like a cloud and turns to watch the cursor. If the model is later
   replaced with a real GLTF from the brand pipeline, swap buildCat() for a
   loader and keep the same float + look-at rig. */

const stage = document.getElementById('cat-stage');
const canvas = document.getElementById('cat-canvas');

if (stage && canvas) {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let renderer = null;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'low-power' });
  } catch (e) { renderer = null; }
  if (renderer && renderer.getContext()) start(renderer, reduce);
}

function start(renderer, reduce) {
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
  camera.position.set(0, 0.05, 6.5);

  scene.add(new THREE.HemisphereLight(0xffffff, 0xc6e0e4, 1.0));
  const key = new THREE.DirectionalLight(0xffffff, 1.7);
  key.position.set(-3.5, 4.5, 5);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xc4ecff, 0.55);
  fill.position.set(4, -1.5, 3);
  scene.add(fill);
  const rim = new THREE.DirectionalLight(0xffffff, 0.9);
  rim.position.set(1, 3, -4);
  scene.add(rim);

  const cat = buildCat();
  scene.add(cat);

  const pointer = { x: 0, y: 0, tx: 0, ty: 0, active: false };
  window.addEventListener('mousemove', (e) => {
    const r = stage.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    pointer.tx = clamp((e.clientX - cx) / (window.innerWidth / 2), -1.6, 1.6);
    pointer.ty = clamp((e.clientY - cy) / (window.innerHeight / 2), -1.6, 1.6);
    pointer.active = true;
  }, { passive: true });

  function resize() {
    const w = stage.clientWidth, h = stage.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize);
  resize();

  let visible = true, running = true, raf = null;
  if ('IntersectionObserver' in window) {
    new IntersectionObserver((es) => { visible = es[0].isIntersecting; if (visible) loop(); }).observe(stage);
  }
  document.addEventListener('visibilitychange', () => { running = !document.hidden; if (running) loop(); });

  stage.classList.add('live');

  const clock = new THREE.Clock();
  function frame() {
    raf = null;
    const t = clock.getElapsedTime();
    pointer.x += (pointer.tx - pointer.x) * 0.06;
    pointer.y += (pointer.ty - pointer.y) * 0.06;

    cat.position.y = reduce ? 0 : Math.sin(t * 0.7) * 0.14;
    cat.rotation.z = reduce ? 0 : Math.sin(t * 0.45) * 0.035;

    const ry = pointer.x * 0.42;
    const rx = pointer.y * 0.3;
    cat.rotation.y += (ry - cat.rotation.y) * 0.07;
    cat.rotation.x += (rx - cat.rotation.x) * 0.07;

    const px = pointer.x * 0.12, py = -pointer.y * 0.1;
    cat.userData.pupils.forEach((p) => {
      p.position.x += (px - p.position.x) * 0.12;
      p.position.y += (py + p.userData.baseY - p.position.y) * 0.12;
    });

    renderer.render(scene, camera);
    if (running && visible) raf = requestAnimationFrame(frame);
  }
  function loop() { if (!raf && running && visible) raf = requestAnimationFrame(frame); }
  loop();
}

function buildCat() {
  const teal = new THREE.MeshPhysicalMaterial({ color: 0x12a294, roughness: 0.46, metalness: 0, clearcoat: 0.6, clearcoatRoughness: 0.35, sheen: 0.4, sheenColor: 0x5be0cf });
  const coral = new THREE.MeshPhysicalMaterial({ color: 0xff8fa3, roughness: 0.5, clearcoat: 0.4 });
  const cream = new THREE.MeshStandardMaterial({ color: 0xf4fbfb, roughness: 0.32 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x0c2429, roughness: 0.3 });
  const white = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.2 });
  const whisker = new THREE.MeshStandardMaterial({ color: 0xbcd6d9, roughness: 0.6 });

  const cat = new THREE.Group();

  const head = new THREE.Mesh(new THREE.SphereGeometry(1.5, 56, 56), teal);
  head.scale.set(1.14, 1.0, 0.92);
  cat.add(head);

  const ear = (side) => {
    const g = new THREE.Group();
    const outer = new THREE.Mesh(new THREE.ConeGeometry(0.66, 1.05, 40), teal);
    const inner = new THREE.Mesh(new THREE.ConeGeometry(0.36, 0.66, 40), coral);
    inner.position.set(0, -0.05, 0.16);
    g.add(outer, inner);
    g.position.set(side * 0.95, 1.2, 0.04);
    g.rotation.z = side * -0.3;
    g.rotation.x = -0.16;
    return g;
  };
  cat.add(ear(-1), ear(1));

  const pupils = [];
  const eye = (side) => {
    const g = new THREE.Group();
    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.44, 40, 40), cream);
    ball.scale.set(1, 1.16, 0.68);
    const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.23, 36, 36), dark);
    pupil.userData.baseY = 0.02;
    pupil.position.set(0, 0.02, 0.36);
    const glint = new THREE.Mesh(new THREE.SphereGeometry(0.06, 16, 16), white);
    glint.position.set(0.08, 0.09, 0.18);
    pupil.add(glint);
    g.add(ball, pupil);
    g.position.set(side * 0.53, 0.14, 1.16);
    pupils.push(pupil);
    return g;
  };
  cat.add(eye(-1), eye(1));

  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.13, 28, 28), coral);
  nose.scale.set(1.35, 0.85, 0.9);
  nose.position.set(0, -0.36, 1.46);
  cat.add(nose);

  const w = (side, y, tilt) => {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(0.013, 0.013, 1.05, 8), whisker);
    m.position.set(side * 1.02, y, 1.2);
    m.rotation.z = Math.PI / 2 + side * tilt;
    return m;
  };
  cat.add(w(-1, -0.28, 0.14), w(-1, -0.46, -0.02), w(1, -0.28, -0.14), w(1, -0.46, 0.02));

  cat.userData.pupils = pupils;
  cat.position.y = 0;
  cat.scale.setScalar(0.92);
  return cat;
}

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
