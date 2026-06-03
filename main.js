import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

const gsap = window.gsap;
const ScrollTrigger = window.ScrollTrigger;
gsap?.registerPlugin(ScrollTrigger);

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* Pointer is "armed" only after a genuine move, so nothing reacts to a pointer
   that is merely resting over the page on load (no parked circle, no carve). */
let _armed = false, _seenPointer = false, _px0 = 0, _py0 = 0;
function pointerArmed(e) {
  if (!_seenPointer) { _seenPointer = true; _px0 = e.clientX; _py0 = e.clientY; return false; }
  if (!_armed && (Math.abs(e.clientX - _px0) > 3 || Math.abs(e.clientY - _py0) > 3)) _armed = true;
  return _armed;
}

/* ───────────────────────── Custom cursor ───────────────────────── */
(function cursor() {
  const ring = document.querySelector('.cursor-ring');
  if (!ring) return;
  let mx = -9999, my = -9999, rx = -9999, ry = -9999;
  addEventListener('mousemove', (e) => {
    if (!pointerArmed(e)) return;
    mx = e.clientX; my = e.clientY;
    document.body.classList.add('cursor-on');
  });
  addEventListener('mouseleave', () => document.body.classList.remove('cursor-on'));
  // touch: the black hole follows the finger and fades on release
  const onTouch = (e) => {
    const t = e.touches[0]; if (!t) return;
    if (mx < -9000) { rx = t.clientX; ry = t.clientY; } // snap on first contact, no streak
    mx = t.clientX; my = t.clientY;
    document.body.classList.add('cursor-on');
  };
  addEventListener('touchstart', onTouch, { passive: true });
  addEventListener('touchmove', onTouch, { passive: true });
  addEventListener('touchend', () => document.body.classList.remove('cursor-on'), { passive: true });
  const tick = () => {
    rx += (mx - rx) * 0.18; ry += (my - ry) * 0.18;
    ring.style.transform = `translate(${rx}px,${ry}px) translate(-50%,-50%)`;
    requestAnimationFrame(tick);
  };
  tick();
  document.querySelectorAll('[data-cursor], a, button').forEach((el) => {
    el.addEventListener('mouseenter', () => ring.classList.add('hover'));
    el.addEventListener('mouseleave', () => ring.classList.remove('hover'));
  });
})();

/* ───────────────────────── Smooth scroll ───────────────────────── */
let lenis = null;
if (window.Lenis && !reduceMotion) {
  lenis = new window.Lenis({ lerp: 0.09, smoothWheel: true, wheelMultiplier: 1 });
  lenis.on('scroll', () => ScrollTrigger?.update());
  gsap.ticker.add((t) => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
}

/* ───────────────────────── Scene ───────────────────────── */
// 48k grains on desktop for a denser mark; phones and low-memory devices stay
// at 24k so the curl-noise vertex work never costs them frames.
const lowPower = window.matchMedia('(hover: none), (pointer: coarse)').matches
  || (navigator.deviceMemory && navigator.deviceMemory <= 4);
const COUNT = lowPower ? 24000 : 48000;
const canvas = document.getElementById('scene');
let renderer, composer, scene, camera, points, material, uniforms;
let webgl = true;

try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: 'high-performance' });
  renderer.setClearColor(new THREE.Color('#02030A'), 1);
} catch (e) { webgl = false; }

const cStarA = new THREE.Color('#F2F6FF'); // moonlight white
const cStarB = new THREE.Color('#A9BDD8'); // cool silver
const cTeal = new THREE.Color('#6BC5BD');  // aurora accent

const snoise = `
vec4 permute(vec4 x){return mod(((x*34.0)+1.0)*x,289.0);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}
float snoise(vec3 v){
  const vec2 C=vec2(1.0/6.0,1.0/3.0); const vec4 D=vec4(0.0,0.5,1.0,2.0);
  vec3 i=floor(v+dot(v,C.yyy)); vec3 x0=v-i+dot(i,C.xxx);
  vec3 g=step(x0.yzx,x0.xyz); vec3 l=1.0-g; vec3 i1=min(g.xyz,l.zxy); vec3 i2=max(g.xyz,l.zxy);
  vec3 x1=x0-i1+1.0*C.xxx; vec3 x2=x0-i2+2.0*C.xxx; vec3 x3=x0-1.0+3.0*C.xxx;
  i=mod(i,289.0);
  vec4 p=permute(permute(permute(i.z+vec4(0.0,i1.z,i2.z,1.0))+i.y+vec4(0.0,i1.y,i2.y,1.0))+i.x+vec4(0.0,i1.x,i2.x,1.0));
  float n_=1.0/7.0; vec3 ns=n_*D.wyz-D.xzx;
  vec4 j=p-49.0*floor(p*ns.z*ns.z);
  vec4 x_=floor(j*ns.z); vec4 y_=floor(j-7.0*x_);
  vec4 x=x_*ns.x+ns.yyyy; vec4 y=y_*ns.x+ns.yyyy; vec4 h=1.0-abs(x)-abs(y);
  vec4 b0=vec4(x.xy,y.xy); vec4 b1=vec4(x.zw,y.zw);
  vec4 s0=floor(b0)*2.0+1.0; vec4 s1=floor(b1)*2.0+1.0; vec4 sh=-step(h,vec4(0.0));
  vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy; vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
  vec3 p0=vec3(a0.xy,h.x); vec3 p1=vec3(a0.zw,h.y); vec3 p2=vec3(a1.xy,h.z); vec3 p3=vec3(a1.zw,h.w);
  vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
  p0*=norm.x; p1*=norm.y; p2*=norm.z; p3*=norm.w;
  vec4 m=max(0.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0); m=m*m;
  return 42.0*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
}
vec3 snoiseVec3(vec3 x){
  return vec3(snoise(x),snoise(vec3(x.y-19.1,x.z+33.4,x.x+47.2)),snoise(vec3(x.z+74.2,x.x-124.5,x.y+99.4)));
}
vec3 curlNoise(vec3 p){
  const float e=0.1; vec3 dx=vec3(e,0.,0.),dy=vec3(0.,e,0.),dz=vec3(0.,0.,e);
  vec3 px0=snoiseVec3(p-dx),px1=snoiseVec3(p+dx);
  vec3 py0=snoiseVec3(p-dy),py1=snoiseVec3(p+dy);
  vec3 pz0=snoiseVec3(p-dz),pz1=snoiseVec3(p+dz);
  float x=py1.z-py0.z-pz1.y+pz0.y;
  float y=pz1.x-pz0.x-px1.z+px0.z;
  float z=px1.y-px0.y-py1.x+py0.x;
  return normalize(vec3(x,y,z)*(1.0/(2.0*e)));
}`;

const vert = `
uniform float uTime, uMorph, uSize, uMouseR, uMouseStr, uPR, uFade, uHoleR, uSwirl, uScale;
uniform vec2 uMouse, uOffset;
attribute vec3 aTarget; attribute float aSeed;
varying float vSeed, vMix, vTwinkle, vBurst;
${snoise}
void main(){
  vSeed=aSeed; vMix=uMorph;
  vTwinkle=0.5+0.5*sin(uTime*1.6+aSeed*44.0);
  float t=uTime*0.05;
  // wandering flow field (the deep, dispersed rest state)
  vec3 flow=position + curlNoise(position*0.20+vec3(0.,0.,t))*1.35;
  flow += curlNoise(position*0.5 - t*0.6)*0.25;
  // assembled mark, gently breathing
  vec3 mark=aTarget + curlNoise(aTarget*0.7+t*0.6)*0.045;
  float m=smoothstep(0.0,1.0,uMorph);

  // ── Shatter: as the morph drops (scrolling down) the mark doesn't crossfade,
  // it bursts apart. Each grain gets a per-seed outward direction + speed, an
  // overshoot bulge mid-flight, and a curl tumble, so the logo looks like it
  // detonated and the pieces drift off. Scrolling back up sucks them home.
  float burst = 1.0 - m;                                   // 0 assembled → 1 gone
  vec3 jitter = vec3(aSeed - 0.5, fract(aSeed*7.3) - 0.5, fract(aSeed*13.7) - 0.5);
  vec3 outDir = normalize(mark + jitter*0.7 + 1e-4);
  float speed = 1.1 + aSeed*1.9;
  float overshoot = sin(clamp(burst, 0.0, 1.0) * 3.14159);  // bulge that peaks mid-burst
  vec3 shattered = mark
    + outDir * (burst*speed + overshoot*0.9)
    + curlNoise(mark*0.55 + t*0.5) * burst * 0.8;
  vBurst = overshoot * burst;                               // hand the flash to the frag

  // at m=1 → mark (burst is 0, shattered==mark); at m=0 → the wandering flow
  vec3 pos = mix(flow, shattered, m);
  // black hole: bend the stardust around the cursor, measured in the mark's
  // on-screen space (account for the object's scale + offset, else it carves off-target)
  vec2 worldXY = pos.xy*uScale + uOffset;
  vec2 toM = worldXY - uMouse; float d=length(toM);
  float infl=smoothstep(uMouseR,0.0,d);
  vec2 dir=normalize(toM+1e-4);
  vec2 perp=vec2(-dir.y,dir.x);
  vec2 disp = dir*(uHoleR-d)*infl*uMouseStr + perp*infl*uSwirl;
  pos.xy += disp/uScale;
  pos.z += infl*0.25;
  vec4 mv=modelViewMatrix*vec4(pos,1.0);
  gl_Position=projectionMatrix*mv;
  float ps=uSize*(0.55+aSeed*0.9);
  gl_PointSize=ps*uPR*(6.0/-mv.z);
}`;

const frag = `
precision highp float;
uniform vec3 cA,cB,cC;
uniform float uFade, uDensity;
varying float vSeed, vMix, vTwinkle, vBurst;
void main(){
  vec2 uv=gl_PointCoord-0.5; float d=length(uv);
  float a=smoothstep(0.5,0.0,d);
  if(a<0.012) discard;
  vec3 col=mix(cA,cB,smoothstep(0.0,0.85,vSeed));   // moonlight white to cool silver
  col=mix(col,cC,smoothstep(0.93,1.0,vSeed));         // rare teal star
  // grains flung loose in the burst lift just slightly, no bright spark flash
  float bright=(0.42+vMix*0.5)*(0.5+0.5*vTwinkle) + vBurst*0.12;
  // additive blending sums every grain, so scale each one down as the count
  // goes up - 48k then reads as dense, not as a brighter navy wash
  float alpha=a*(0.42+vMix*0.5 + vBurst*0.12)*uFade*uDensity;
  gl_FragColor=vec4(col*bright, alpha);
}`;

/* Sample the real Ai mark into target positions */
function sampleMark(img) {
  const S = 220;
  const c = document.createElement('canvas'); c.width = S; c.height = S;
  const ctx = c.getContext('2d');
  ctx.drawImage(img, 0, 0, S, S);
  const data = ctx.getImageData(0, 0, S, S).data;
  const pts = [];
  for (let y = 0; y < S; y += 1) {
    for (let x = 0; x < S; x += 1) {
      const i = (y * S + x) * 4;
      if (data[i + 3] > 90 && (data[i] + data[i + 1] + data[i + 2]) > 120) {
        pts.push([x, y]);
      }
    }
  }
  return pts;
}

function buildPoints(markPts) {
  const targets = new Float32Array(COUNT * 3);
  const start = new Float32Array(COUNT * 3);
  const seeds = new Float32Array(COUNT);
  const S = 220, scale = 4.5 / S;
  const has = markPts.length > 0;
  for (let i = 0; i < COUNT; i++) {
    // target = a random mark pixel, jittered
    if (has) {
      const p = markPts[(Math.random() * markPts.length) | 0];
      const jx = (Math.random() - 0.5), jy = (Math.random() - 0.5);
      targets[i * 3]     = (p[0] - S / 2 + jx) * scale;
      targets[i * 3 + 1] = -(p[1] - S / 2 + jy) * scale;
      targets[i * 3 + 2] = (Math.random() - 0.5) * 0.18;
    } else {
      targets[i * 3] = (Math.random() - 0.5) * 4;
      targets[i * 3 + 1] = (Math.random() - 0.5) * 4;
      targets[i * 3 + 2] = (Math.random() - 0.5) * 0.4;
    }
    // start = random in a contained, slightly flattened cloud
    const r = 1.7 + Math.random() * 2.4, th = Math.random() * 6.2832, ph = Math.acos(2 * Math.random() - 1);
    start[i * 3]     = r * Math.sin(ph) * Math.cos(th) * 1.15;
    start[i * 3 + 1] = r * Math.sin(ph) * Math.sin(th) * 0.78;
    start[i * 3 + 2] = r * Math.cos(ph) * 0.45;
    seeds[i] = Math.random();
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(start, 3));
  geo.setAttribute('aTarget', new THREE.BufferAttribute(targets, 3));
  geo.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1));

  uniforms = {
    uTime: { value: 0 }, uMorph: { value: 1 }, uSize: { value: 1.5 },
    uMouse: { value: new THREE.Vector2(999, 999) }, uMouseR: { value: 1.4 }, uMouseStr: { value: 0.85 },
    uHoleR: { value: 0.45 }, uSwirl: { value: 0.22 },
    uScale: { value: 1 }, uOffset: { value: new THREE.Vector2(0, 1.35) },
    uPR: { value: Math.min(devicePixelRatio, 2) }, uFade: { value: 1 },
    uDensity: { value: 24000 / COUNT },
    cA: { value: cStarA }, cB: { value: cStarB }, cC: { value: cTeal },
  };
  material = new THREE.ShaderMaterial({
    uniforms, vertexShader: vert, fragmentShader: frag,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  });
  points = new THREE.Points(geo, material);
  scene.add(points);
}

function buildCosmos() {
  // distant static starfield for depth
  const N = 1500;
  const pos = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    pos[i * 3] = (Math.random() - 0.5) * 30;
    pos[i * 3 + 1] = (Math.random() - 0.5) * 20;
    pos[i * 3 + 2] = -2 - Math.random() * 8;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const stars = new THREE.Points(g, new THREE.PointsMaterial({
    size: 0.035, color: 0xD8E3F5, transparent: true, opacity: 0.7,
    depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true,
  }));
  scene.add(stars);
  starField = stars;

  // soft moon glow behind the logo
  const cv = document.createElement('canvas'); cv.width = cv.height = 128;
  const cx = cv.getContext('2d');
  const grad = cx.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, 'rgba(220,232,248,0.5)');
  grad.addColorStop(0.22, 'rgba(160,198,230,0.22)');
  grad.addColorStop(0.55, 'rgba(110,155,195,0.06)');
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  cx.fillStyle = grad; cx.fillRect(0, 0, 128, 128);
  const moon = new THREE.Sprite(new THREE.SpriteMaterial({
    map: new THREE.CanvasTexture(cv), color: 0xffffff,
    transparent: true, opacity: 0.4, depthWrite: false, blending: THREE.AdditiveBlending,
  }));
  moon.scale.set(5, 5, 1);
  moon.position.set(1.1, 2.5, -3);
  scene.add(moon);
}

/* ── Shooting stars ──────────────────────────────────────────────────────
   Occasional meteors, not a shower. Each is a tapered streak (bright head,
   fading tail) placed at a depth: near ones sit in front of the mark and read
   big/fast/bright, far ones sit deep behind and read small/slow/faint - the
   perspective camera does the size falloff for free. They fade out as the hero
   scrolls away so the content sections stay on clean black. */
let starField = null;
let meteors = [], meteorNext = 2.8;

function makeStreakTexture() {
  const W = 256, H = 64;
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const x = c.getContext('2d');
  // brightness along the length, head at the right end
  const g = x.createLinearGradient(0, 0, W, 0);
  g.addColorStop(0.0, 'rgba(255,255,255,0)');
  g.addColorStop(0.55, 'rgba(255,255,255,0.06)');
  g.addColorStop(0.85, 'rgba(255,255,255,0.35)');
  g.addColorStop(0.97, 'rgba(255,255,255,0.95)');
  g.addColorStop(1.0, 'rgba(255,255,255,1)');
  x.fillStyle = g; x.fillRect(0, 0, W, H);
  // a round bloom at the head
  const hg = x.createRadialGradient(W - 12, H / 2, 0, W - 12, H / 2, H * 0.62);
  hg.addColorStop(0, 'rgba(255,255,255,0.85)');
  hg.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = hg; x.fillRect(0, 0, W, H);
  // carve a thin soft vertical profile so it reads as a line, not a band
  x.globalCompositeOperation = 'destination-in';
  const v = x.createLinearGradient(0, 0, 0, H);
  v.addColorStop(0, 'rgba(0,0,0,0)');
  v.addColorStop(0.5, 'rgba(0,0,0,1)');
  v.addColorStop(1, 'rgba(0,0,0,0)');
  x.fillStyle = v; x.fillRect(0, 0, W, H);
  return new THREE.CanvasTexture(c);
}

function buildShootingStars() {
  const tex = makeStreakTexture();
  const geo = new THREE.PlaneGeometry(1, 1);
  for (let i = 0; i < 8; i++) {
    const mat = new THREE.MeshBasicMaterial({
      map: tex, transparent: true, opacity: 0,
      depthWrite: false, blending: THREE.AdditiveBlending,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.visible = false;
    scene.add(mesh);
    meteors.push({ mesh, mat, active: false, hx: 0, hy: 0, dx: 0, dy: -1, speed: 4, len: 1, thick: 0.04, peak: 0.7, life: 1, age: 0 });
  }
}

function spawnMeteor(M) {
  const near = Math.random() < 0.12;   // most are far and faint; a near one is a treat
  const z = near ? (1.5 + Math.random() * 2.2) : (-3 - Math.random() * 6);
  const dist = camera.position.z - z;
  const vH = 2 * Math.tan((camera.fov * Math.PI / 180) / 2) * dist;
  const vW = vH * camera.aspect;
  const sign = Math.random() < 0.5 ? -1 : 1;
  const ang = -Math.PI / 2 + sign * (0.35 + Math.random() * 0.5);  // mostly downward, tilted
  M.dx = Math.cos(ang); M.dy = Math.sin(ang);
  M.hx = (Math.random() - 0.5) * vW * 0.8;
  M.hy = vH / 2 + 0.6;
  M.speed = near ? (7 + Math.random() * 3) : (3.4 + Math.random() * 2);
  M.len = near ? (1.4 + Math.random() * 1.0) : (0.7 + Math.random() * 0.6);
  M.thick = near ? (0.05 + Math.random() * 0.03) : (0.02 + Math.random() * 0.015);
  M.peak = near ? (0.85 + Math.random() * 0.15) : (0.32 + Math.random() * 0.22);
  const r = Math.random();
  M.mat.color.setHex(r < 0.85 ? 0xF2F6FF : (r < 0.97 ? 0xA9BDD8 : 0x6BC5BD));
  M.life = (vH + M.len * 2 + 1.2) / (M.speed * Math.max(0.25, Math.abs(M.dy)));
  M.age = 0;
  M.active = true;
  M.mesh.visible = true;
  M.mesh.position.z = z;
  M.mesh.rotation.z = ang;
  M.mesh.scale.set(M.len, M.thick, 1);
}

function updateShootingStars(dt, skyFade) {
  if (!meteors.length) return;
  if (!intro && skyFade > 0.06) {
    meteorNext -= dt;
    if (meteorNext <= 0) {
      const M = meteors.find((m) => !m.active);
      if (M) spawnMeteor(M);
      meteorNext = 4 + Math.random() * 5;   // well spaced, never a shower
    }
  }
  for (const M of meteors) {
    if (!M.active) continue;
    M.age += dt;
    const f = M.age / M.life;
    if (f >= 1) { M.active = false; M.mesh.visible = false; continue; }
    M.hx += M.dx * M.speed * dt;
    M.hy += M.dy * M.speed * dt;
    M.mesh.position.x = M.hx - M.dx * M.len * 0.5;   // center trails half a length behind the head
    M.mesh.position.y = M.hy - M.dy * M.len * 0.5;
    const env = Math.min(1, f / 0.12) * Math.min(1, (1 - f) / 0.3);  // quick fade in, longer fade out
    M.mat.opacity = M.peak * Math.max(0, env) * skyFade;
  }
}

function initScene() {
  if (!webgl) return;
  renderer.setSize(innerWidth, innerHeight);
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.1, 100);
  camera.position.set(0, 0, 7);
  buildCosmos();
  if (!reduceMotion) buildShootingStars();

  composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  // higher threshold so only bright star cores bloom; the dim dust no longer
  // hazes the whole field into navy, which keeps the background reading black
  const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.3, 0.3, 0.32);
  composer.addPass(bloom);
}

/* pointer (mouse or touch) → world coords on z=0 plane */
const mouse = new THREE.Vector2(999, 999);
const mouseTarget = new THREE.Vector2(999, 999);
function setMouseWorld(cx, cy) {
  if (!camera) return;
  const ndcx = (cx / innerWidth) * 2 - 1;
  const ndcy = -((cy / innerHeight) * 2 - 1);
  const vH = 2 * Math.tan((camera.fov * Math.PI / 180) / 2) * camera.position.z;
  const vW = vH * camera.aspect;
  mouseTarget.set(ndcx * vW / 2, ndcy * vH / 2);
}
addEventListener('mousemove', (e) => { if (camera && pointerArmed(e)) setMouseWorld(e.clientX, e.clientY); });
addEventListener('mouseleave', () => mouseTarget.set(999, 999));
addEventListener('touchstart', (e) => { const t = e.touches[0]; if (t) setMouseWorld(t.clientX, t.clientY); }, { passive: true });
addEventListener('touchmove', (e) => { const t = e.touches[0]; if (t) setMouseWorld(t.clientX, t.clientY); }, { passive: true });
addEventListener('touchend', () => mouseTarget.set(999, 999), { passive: true });

/* The loader and the hero are one continuous shot: the dust starts as a loose
   cloud (morph 0) and gathers into the mark as the load bar fills (introProgress
   0→1). Only once it's assembled does scroll take over the morph. */
let morph = 0, morphTarget = 0, tilt = { x: 0, y: 0 };
let intro = true, introProgress = 0;
addEventListener('mousemove', (e) => {
  if (!pointerArmed(e)) return;
  tilt.x = (e.clientY / innerHeight - 0.5);
  tilt.y = (e.clientX / innerWidth - 0.5);
});

/* device tilt drives the parallax on mobile. Android and older iOS attach
   directly; iOS 13+ gates this behind a permission prompt, so we skip the
   prompt and let the rich touch interaction carry those devices. */
if (typeof DeviceOrientationEvent !== 'undefined' &&
    typeof DeviceOrientationEvent.requestPermission !== 'function') {
  addEventListener('deviceorientation', (e) => {
    if (e.gamma == null || e.beta == null) return;
    tilt.y = Math.max(-0.5, Math.min(0.5, e.gamma / 45));
    tilt.x = Math.max(-0.5, Math.min(0.5, (e.beta - 45) / 45));
  });
}

const clock = new THREE.Clock();
function fitMark(p) {
  const vH = 2 * Math.tan((camera.fov * Math.PI / 180) / 2) * camera.position.z;
  const vW = vH * camera.aspect;
  const fit = Math.min(0.9, (0.82 * vW) / 5.4);
  points.scale.setScalar(fit);
  points.position.y = 1.35 + p * 1.2;
  uniforms.uScale.value = fit;
  uniforms.uOffset.value.set(points.position.x, points.position.y);
}

let lastRenderSy = -1;
function renderFrame() {
  if (!webgl || !points) return;
  // dormant: once deep past the hero the dust has faded out, so freeze the frame.
  // Still render one frame whenever the scroll position changes (covers instant
  // anchor jumps), then skip while it sits idle down there.
  const sy = lenis ? lenis.animatedScroll : window.scrollY;
  if (sy > innerHeight * 2.6 && Math.abs(sy - lastRenderSy) < 1.5) return;
  lastRenderSy = sy;

  const dt = Math.min(clock.getDelta(), 0.05);
  uniforms.uTime.value += dt;

  // morph: during the intro the load bar gathers the dust into the mark; after
  // that, scroll disperses it (mark at top → shatter/flow down the hero)
  let p = 0;
  if (intro) {
    morph += (introProgress - morph) * 0.08;
  } else {
    const heroEnd = innerHeight * 0.85;
    p = Math.min(Math.max(sy / heroEnd, 0), 1);
    morphTarget = 1 - p;
    morph += (morphTarget - morph) * 0.06;
  }
  uniforms.uMorph.value = morph;

  // fade particles out as content takes over, so deep sections sit on clean ink
  const fadeStart = innerHeight * 0.9, fadeEnd = innerHeight * 2.4;
  const fp = Math.min(Math.max((sy - fadeStart) / (fadeEnd - fadeStart), 0), 1);
  uniforms.uFade.value = 1 - fp * 0.9;

  mouse.x += (mouseTarget.x - mouse.x) * 0.12;
  mouse.y += (mouseTarget.y - mouse.y) * 0.12;
  uniforms.uMouse.value.copy(mouse);

  // life: gentle rotation + mouse parallax tilt
  points.rotation.y += (tilt.y * 0.35 - points.rotation.y) * 0.04 + 0.0006;
  points.rotation.x += (tilt.x * 0.30 - points.rotation.x) * 0.04;
  fitMark(p);

  // the distant sky is not dead: a slow bounded sway over the horizon (kept
  // small so a star never swings toward the camera) plus a faint lean toward
  // the pointer, so the far stars read as real depth
  if (starField) {
    starField.rotation.y = Math.sin(uniforms.uTime.value * 0.02) * 0.12;
    starField.rotation.x += (tilt.x * 0.05 - starField.rotation.x) * 0.03;
  }

  // shooting stars, faded with the hero so they don't streak over content
  const skyFade = Math.max(0, Math.min(1, 1 - sy / (innerHeight * 1.4)));
  updateShootingStars(dt, skyFade);

  composer.render();
}

let rafId = null;
function loop() { rafId = requestAnimationFrame(loop); renderFrame(); }
function startLoop() {
  if (rafId != null || !webgl || !points) return;
  if (reduceMotion) { renderStatic(); return; } // no motion: paint one assembled frame
  clock.getDelta();
  loop();
}
function stopLoop() { if (rafId != null) { cancelAnimationFrame(rafId); rafId = null; } }
function renderStatic() {
  morph = 1; uniforms.uMorph.value = 1; uniforms.uFade.value = 1;
  uniforms.uMouse.value.set(999, 999);
  fitMark(0);
  composer.render();
}
document.addEventListener('visibilitychange', () => {
  if (document.hidden) stopLoop(); else startLoop();
});

/* ───────────────────────── Boot + loader ───────────────────────── */
function revealHero() {
  if (!gsap) return;
  const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
  tl.to('#heroEyebrow', { opacity: 0.85, y: 0, duration: 0.9 })
    .from('#hero h1', { opacity: 0, y: 40, duration: 1.1 }, '-=0.5')
    .from('#hero .lede', { opacity: 0, y: 24, duration: 0.9 }, '-=0.7')
    .from('.hero .scroll-cue', { opacity: 0, duration: 0.8 }, '-=0.4');
}

function setupScrollReveals() {
  if (!gsap || !ScrollTrigger) {
    document.querySelectorAll('.reveal').forEach((el) => (el.style.opacity = 1));
    return;
  }
  gsap.utils.toArray('.reveal').forEach((el) => {
    if (el.closest('#hero')) return; // hero handled separately
    gsap.from(el, {
      opacity: 0, y: 36, duration: 1, ease: 'power3.out',
      scrollTrigger: { trigger: el, start: 'top 85%' },
    });
  });
  // work card glow follows cursor
  document.querySelectorAll('.work-card').forEach((card) => {
    card.addEventListener('mousemove', (e) => {
      const r = card.getBoundingClientRect();
      card.style.setProperty('--mx', `${((e.clientX - r.left) / r.width) * 100}%`);
      card.style.setProperty('--my', `${((e.clientY - r.top) / r.height) * 100}%`);
    });
  });
}

/* Gravitational letters: every display glyph bends around the cursor with the
   same ring + swirl + smoothstep the stardust shader uses, just measured in px. */
function setupLetterField() {
  if (reduceMotion) return;
  const els = document.querySelectorAll(
    '.hero h1, .manifesto p:not(.sig), .work-head h2, .closer h2'
  );
  if (!els.length) return;

  // Split into per-letter spans, but keep each WORD in its own wrapper so a line
  // never breaks in the middle of a word (the .gl letters are inline-block, which
  // would otherwise wrap mid-word on narrow screens).
  const wrap = (node) => {
    [...node.childNodes].forEach((child) => {
      if (child.nodeType === 3) {
        const frag = document.createDocumentFragment();
        let word = null;
        for (const c of child.textContent) {
          if (c === ' ') { word = null; frag.appendChild(document.createTextNode(' ')); continue; }
          if (!word) { word = document.createElement('span'); word.className = 'gl-word'; frag.appendChild(word); }
          const s = document.createElement('span');
          s.className = 'gl'; s.textContent = c;
          word.appendChild(s);
        }
        child.replaceWith(frag);
      } else if (child.nodeType === 1 && child.tagName !== 'BR') {
        wrap(child);
      }
    });
  };
  els.forEach(wrap);

  const letters = [...document.querySelectorAll('.gl')].map((el) => ({ el, cx: 0, cy: 0, x: 0, y: 0 }));

  const measure = () => {
    const ox = window.scrollX, oy = window.scrollY;
    letters.forEach((L) => {
      const prev = L.el.style.transform;
      L.el.style.transform = 'none';
      const r = L.el.getBoundingClientRect();
      L.cx = r.left + r.width / 2 + ox;
      L.cy = r.top + r.height / 2 + oy;
      L.el.style.transform = prev;
    });
  };

  let px = -9999, py = -9999;
  addEventListener('mousemove', (e) => { if (!pointerArmed(e)) return; px = e.clientX; py = e.clientY; });
  addEventListener('mouseleave', () => { px = -9999; py = -9999; });
  const onTouch = (e) => { const t = e.touches[0]; if (t) { px = t.clientX; py = t.clientY; } };
  addEventListener('touchstart', onTouch, { passive: true });
  addEventListener('touchmove', onTouch, { passive: true });
  addEventListener('touchend', () => { px = -9999; py = -9999; }, { passive: true });

  const R = 220, holePx = 36, strength = 0.12, swirl = 6, cap = 18;
  const tick = () => {
    requestAnimationFrame(tick);
    const top = lenis ? lenis.animatedScroll : window.scrollY;
    for (let i = 0; i < letters.length; i++) {
      const L = letters[i];
      const sy = L.cy - top, sx = L.cx - window.scrollX;
      let tx = 0, ty = 0;
      if (sy > -80 && sy < innerHeight + 80) {
        const dx = sx - px, dy = sy - py;
        const d = Math.hypot(dx, dy) || 1e-4;
        if (d < R) {
          const lin = 1 - d / R;
          const s = lin * lin * (3 - 2 * lin);   // smoothstep, like the shader
          const nx = dx / d, ny = dy / d;
          const ring = (holePx - d) * s * strength; // pull toward the ring radius
          tx = nx * ring - ny * s * swirl;          // ring + tangential swirl
          ty = ny * ring + nx * s * swirl;
          const m = Math.hypot(tx, ty);
          if (m > cap) { tx = tx / m * cap; ty = ty / m * cap; }
        }
      }
      L.x += (tx - L.x) * 0.15;
      L.y += (ty - L.y) * 0.15;
      L.el.style.transform =
        (Math.abs(L.x) < 0.06 && Math.abs(L.y) < 0.06) ? '' : `translate3d(${L.x.toFixed(2)}px,${L.y.toFixed(2)}px,0)`;
    }
  };

  measure();
  tick();
  let rt;
  addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(measure, 200); });
  setTimeout(measure, 1700);            // after the hero intro settles
  if (document.fonts?.ready) document.fonts.ready.then(measure);
}

function finishLoad() {
  const loader = document.getElementById('loader');
  const fill = document.getElementById('loaderFill');
  const pct = document.getElementById('loaderPct');
  let v = 0;
  const iv = setInterval(() => {
    v = Math.min(100, v + Math.random() * 18);
    if (fill) fill.style.right = `${100 - v}%`;
    if (pct) pct.textContent = Math.floor(v);
    introProgress = v / 100;            // the bar literally pulls the dust together
    if (v >= 100) {
      clearInterval(iv);
      introProgress = 1;
      // let the grains finish gathering, then hand the same assembled mark to the hero
      setTimeout(() => {
        intro = false;                  // assembled at p=0; scroll now owns the morph
        loader?.classList.add('done');
        revealHero();
        setupScrollReveals();
        setupLetterField();
        ScrollTrigger?.refresh();
      }, 620);
    }
  }, 90);
}

function boot() {
  initScene();
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = () => {
    let pts = [];
    try { pts = sampleMark(img); } catch (e) { pts = []; }
    if (webgl) { buildPoints(pts); startLoop(); }
    finishLoad();
  };
  img.onerror = () => { if (webgl) { buildPoints([]); startLoop(); } finishLoad(); };
  img.src = 'assets/mark-white.png';
}

addEventListener('resize', () => {
  if (!webgl || !camera) return;
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  composer.setSize(innerWidth, innerHeight);
  if (reduceMotion) renderStatic();
});

// safety: never trap the user behind the loader
setTimeout(() => document.getElementById('loader')?.classList.add('done'), 7000);

boot();
