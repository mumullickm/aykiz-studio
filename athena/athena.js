import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

(function () {
  var canvas = document.getElementById('athena-canvas');
  var frameEl = document.querySelector('.neural-frame');
  var feed = document.getElementById('feed');
  var feedForm = document.getElementById('feedForm');
  var feedText = document.getElementById('feedText');
  var hubDetail = document.getElementById('hubDetail');
  var hdName = document.getElementById('hdName');
  var hdDesc = document.getElementById('hdDesc');
  var hdNeurons = document.getElementById('hdNeurons');
  var hdClose = document.getElementById('hdClose');

  var FILES = [
    'auth/session.ts', 'api/routes.py', 'components/Chart.tsx',
    'db/migrations/003_index.sql', 'lib/cache.rs', 'workers/queue.go',
    'styles/tokens.css', 'tests/agent.spec.ts', 'scripts/deploy.sh',
    'lib/parser.rs', 'components/Feed.tsx', 'api/webhook.ts',
    'utils/retry.ts', 'db/seed.sql', 'workers/notify.go', 'lib/logger.ts'
  ];

  var HUBS = [
    { key: 'prefrontal', name: 'Prefrontal', color: 0xFFA53D,
      desc: "Decides what matters first. Reads the request, weighs the options, sets the plan before a single line changes.",
      neurons: ['prioritize the auth fix', 'should this wait for review', 'plan: refactor before extending'],
      count: 142, rate: 2.4 },
    { key: 'language', name: 'Language', color: 0xFF3D5C,
      desc: "Turns intent into syntax. Every variable name, every branch, every string is a small translation from thought to code.",
      neurons: ['const or let', 'name this handleSubmit', 'docstring for parseConfig'],
      count: 210, rate: 3.4 },
    { key: 'hippocampus', name: 'Hippocampus', color: 0x3D7DFF,
      desc: "Holds what came before. Past files touched, past decisions made, the context that lets a session pick up where the last one left off.",
      neurons: ['recall the schema from migration 003', 'this pattern was rejected last week', 'remembers the naming convention'],
      count: 88, rate: 1.2 },
    { key: 'sensory', name: 'Sensory Cortex', color: 0x2DF3FF,
      desc: "Reads before it writes. Every file, every error message, every diff is data flowing in before anything flows back out.",
      neurons: ['reading auth/session.ts', 'parsing the stack trace', 'scanning for existing tests'],
      count: 104, rate: 1.8 },
    { key: 'motor', name: 'Motor Cortex', color: 0x3DFF7A,
      desc: "Where thought becomes action. The actual edit, the actual commit, the keystrokes that leave the mind and land in the repo.",
      neurons: ['writing the fix', 'running the test suite', 'git commit -m'],
      count: 132, rate: 2.0 },
    { key: 'cerebellum', name: 'Cerebellum', color: 0xFF3DE0,
      desc: "Fine-tunes the motion. Catches the awkward line, smooths the edge case, coordinates small corrections into one clean change.",
      neurons: ['tightening the diff', 'removing a stray console.log', 'aligning indentation'],
      count: 76, rate: 1.1 },
    { key: 'feature', name: 'Feature Layer', color: 0xFFEE3D,
      desc: "Extracts what's actually being asked for, underneath the words. A request is rarely as simple as it first sounds.",
      neurons: ['unpacking the requirement', 'spotting the missing edge case', 'scoping the smallest honest version'],
      count: 96, rate: 1.6 },
    { key: 'association', name: 'Association', color: 0xA53DFF,
      desc: "Connects this to everything else. Why this file, why this pattern, why now, reasoning is mostly finding the right thread to pull.",
      neurons: ['relates to the auth refactor', 'similar bug fixed in v1.2', 'because the tests expect this shape'],
      count: 154, rate: 2.8 },
    { key: 'concept', name: 'Concept Layer', color: 0x3DFFD3,
      desc: "Understands the request before touching anything. What is actually being asked, stripped of how it was phrased.",
      neurons: ["the real ask is caching, not speed", 'this is a naming problem, not a logic bug', "defining 'done' for this task"],
      count: 128, rate: 2.1 }
  ];

  var KEYWORDS = {
    prefrontal:  ['plan', 'decide', 'should', 'goal', 'priority', 'strategy', 'choice', 'choose'],
    language:    ['write', 'code', 'say', 'word', 'text', 'translate', 'name', 'call', 'speak'],
    hippocampus: ['remember', 'recall', 'forget', 'note', 'memory', 'birthday', 'before', 'history'],
    sensory:     ['read', 'see', 'look', 'file', 'watch', 'listen', 'image', 'screenshot', 'hear'],
    motor:       ['fix', 'run', 'deploy', 'build', 'execute', 'click', 'move', 'do', 'ship'],
    cerebellum:  ['balance', 'refine', 'polish', 'adjust', 'tune', 'coordinate', 'smooth', 'clean'],
    feature:     ['add', 'feature', 'new', 'create', 'want', 'need', 'idea', 'wish'],
    association: ['because', 'why', 'connect', 'relate', 'link', 'similar', 'pattern', 'since'],
    concept:     ['understand', 'concept', 'meaning', 'explain', 'define', 'what is', 'think']
  };

  function colorCss(hex) { return '#' + hex.toString(16).padStart(6, '0').toUpperCase(); }

  function fibonacciSphere(n, radius) {
    var pts = [];
    var offset = 2 / n;
    var increment = Math.PI * (3 - Math.sqrt(5));
    for (var i = 0; i < n; i++) {
      var y = ((i * offset) - 1) + (offset / 2);
      var r = Math.sqrt(Math.max(0, 1 - y * y));
      var phi = i * increment;
      var x = Math.cos(phi) * r;
      var z = Math.sin(phi) * r;
      pts.push(new THREE.Vector3(x, y, z).multiplyScalar(radius));
    }
    return pts;
  }

  var CORE_R = 0.9;
  var HUB_R = 2.9;
  var positions = fibonacciSphere(HUBS.length, HUB_R);
  HUBS.forEach(function (hub, i) { hub.anchor = positions[i]; });

  // ---------- renderer / scene ----------
  var renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(0x000000, 0);

  var scene = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
  camera.position.set(0, 0.4, 7.2);

  var controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.07;
  controls.enablePan = false;
  controls.minDistance = 3.6;
  controls.maxDistance = 11;
  controls.autoRotate = true;
  controls.autoRotateSpeed = 0.35;
  var desiredTarget = new THREE.Vector3(0, 0, 0);

  var composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  var bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.85, 0.45, 0.22);
  composer.addPass(bloom);

  function resize() {
    var rect = frameEl.getBoundingClientRect();
    var w = Math.max(1, rect.width), h = Math.max(1, rect.height);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
    composer.setSize(w, h);
    bloom.setSize(w, h);
  }
  window.addEventListener('resize', resize);

  // ---------- starfield ----------
  (function starfield() {
    var n = 500;
    var geo = new THREE.BufferGeometry();
    var pos = new Float32Array(n * 3);
    for (var i = 0; i < n; i++) {
      var r = 20 + Math.random() * 18;
      var theta = Math.random() * Math.PI * 2;
      var phi = Math.acos(2 * Math.random() - 1);
      pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      pos[i * 3 + 2] = r * Math.cos(phi);
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    var mat = new THREE.PointsMaterial({ color: 0xdce6f5, size: 0.05, transparent: true, opacity: 0.55, depthWrite: false });
    scene.add(new THREE.Points(geo, mat));
  })();

  // ---------- particle sprite texture (used by both dust and hub clouds) ----------
  var dotTexture = (function () {
    var c = document.createElement('canvas'); c.width = c.height = 32;
    var x = c.getContext('2d');
    var g = x.createRadialGradient(16, 16, 0, 16, 16, 16);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = g; x.fillRect(0, 0, 32, 32);
    return new THREE.CanvasTexture(c);
  })();

  // ---------- ambient dust: fills the void between core and clusters so the
  // whole frame reads as one dense field instead of separated islands ----------
  (function ambientDust() {
    var n = 900;
    var geo = new THREE.BufferGeometry();
    var pos = new Float32Array(n * 3);
    var col = new Float32Array(n * 3);
    var palette = HUBS.map(function (h) { return new THREE.Color(h.color); });
    for (var i = 0; i < n; i++) {
      var r = 0.8 + Math.random() * (HUB_R * 1.5);
      var theta = Math.random() * Math.PI * 2;
      var phi = Math.acos(2 * Math.random() - 1);
      pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      pos[i * 3 + 2] = r * Math.cos(phi) * 0.6;
      var c = palette[Math.floor(Math.random() * palette.length)];
      col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    var mat = new THREE.PointsMaterial({
      size: 0.045, map: dotTexture, vertexColors: true, transparent: true,
      opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true
    });
    scene.add(new THREE.Points(geo, mat));
  })();

  // ---------- core blob ----------
  var coreUniforms = {
    uTime: { value: 0 },
    uColorA: { value: new THREE.Color(0x5f92e8) },
    uColorB: { value: new THREE.Color(0xffffff) }
  };
  var coreMat = new THREE.ShaderMaterial({
    uniforms: coreUniforms,
    vertexShader: [
      'uniform float uTime;',
      'varying vec3 vNormal;',
      'varying float vDisp;',
      'float hash(vec3 p){ return fract(sin(dot(p, vec3(41.3,289.1,127.1)))*43758.5453); }',
      'float vnoise(vec3 p){',
      '  vec3 i = floor(p); vec3 f = fract(p); f = f*f*(3.0-2.0*f);',
      '  float n000=hash(i+vec3(0,0,0)); float n100=hash(i+vec3(1,0,0));',
      '  float n010=hash(i+vec3(0,1,0)); float n110=hash(i+vec3(1,1,0));',
      '  float n001=hash(i+vec3(0,0,1)); float n101=hash(i+vec3(1,0,1));',
      '  float n011=hash(i+vec3(0,1,1)); float n111=hash(i+vec3(1,1,1));',
      '  return mix(mix(mix(n000,n100,f.x),mix(n010,n110,f.x),f.y),',
      '             mix(mix(n001,n101,f.x),mix(n011,n111,f.x),f.y), f.z);',
      '}',
      'void main(){',
      '  vNormal = normalize(normalMatrix * normal);',
      '  float n = vnoise(position * 1.7 + uTime * 0.10) - 0.5;',
      '  float disp = n * 0.34;',
      '  vDisp = n;',
      '  vec3 newPos = position + normal * disp;',
      '  gl_Position = projectionMatrix * modelViewMatrix * vec4(newPos, 1.0);',
      '}'
    ].join('\n'),
    fragmentShader: [
      'uniform vec3 uColorA;',
      'uniform vec3 uColorB;',
      'varying vec3 vNormal;',
      'varying float vDisp;',
      'void main(){',
      '  float fres = pow(1.0 - abs(vNormal.z), 2.2);',
      '  vec3 col = mix(uColorA, uColorB, clamp(vDisp * 1.4 + 0.30, 0.0, 1.0));',
      '  col += fres * 0.32;',
      '  gl_FragColor = vec4(col, 1.0);',
      '}'
    ].join('\n')
  });
  var coreMesh = new THREE.Mesh(new THREE.IcosahedronGeometry(CORE_R, 5), coreMat);
  scene.add(coreMesh);

  var haloMat = new THREE.SpriteMaterial({
    map: (function () {
      var c = document.createElement('canvas'); c.width = c.height = 128;
      var x = c.getContext('2d');
      var g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
      g.addColorStop(0, 'rgba(150,190,255,0.5)');
      g.addColorStop(1, 'rgba(150,190,255,0)');
      x.fillStyle = g; x.fillRect(0, 0, 128, 128);
      return new THREE.CanvasTexture(c);
    })(),
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending
  });
  var halo = new THREE.Sprite(haloMat);
  halo.scale.set(CORE_R * 2.6, CORE_R * 2.6, 1);
  scene.add(halo);

  // ---------- per-hub geometry: mesh network + spine strands + particle cloud + hitbox ----------
  var SPINE_PER_HUB = 6;
  var NODES_PER_HUB = 60;
  var NEIGHBORS_PER_NODE = 4;

  HUBS.forEach(function (hub) {
    var css = colorCss(hub.color);
    var el = document.querySelector('.hub[data-hub="' + hub.key + '"]');
    hub.el = el;
    if (el) el.style.setProperty('--hc', css);

    var originDir = hub.anchor.clone().normalize();
    hub.origin = originDir.clone().multiplyScalar(CORE_R);

    // scattered "thought nodes" for this region, LOCAL to the hub anchor (so the
    // whole cluster can scale in place on burst instead of flying outward).
    var nodes = [];
    for (var n = 0; n < NODES_PER_HUB; n++) {
      nodes.push(new THREE.Vector3(
        (Math.random() - 0.5) * 1.9,
        (Math.random() - 0.5) * 1.9,
        (Math.random() - 0.5) * 1.9
      ));
    }
    hub.nodes = nodes;

    // dense nearest-neighbor mesh: each node wires to its closest few siblings,
    // this is what actually reads as a "mind" web instead of clean spokes.
    var edgeSeen = {};
    var meshPositions = [];
    nodes.forEach(function (p, i) {
      var ranked = nodes
        .map(function (q, j) { return { j: j, d: p.distanceToSquared(q) }; })
        .filter(function (o) { return o.j !== i; })
        .sort(function (a, b) { return a.d - b.d; })
        .slice(0, NEIGHBORS_PER_NODE);
      ranked.forEach(function (o) {
        var key = Math.min(i, o.j) + '_' + Math.max(i, o.j);
        if (edgeSeen[key]) return;
        edgeSeen[key] = true;
        var q = nodes[o.j];
        meshPositions.push(p.x, p.y, p.z, q.x, q.y, q.z);
      });
    });
    var meshGeo = new THREE.BufferGeometry();
    meshGeo.setAttribute('position', new THREE.Float32BufferAttribute(meshPositions, 3));
    var meshMat = new THREE.LineBasicMaterial({ color: hub.color, transparent: true, opacity: 0.42, blending: THREE.AdditiveBlending });
    var meshLines = new THREE.LineSegments(meshGeo, meshMat);
    meshLines.position.copy(hub.anchor);
    scene.add(meshLines);
    hub.meshLines = meshLines;
    hub.meshMat = meshMat;
    hub.meshPhase = Math.random() * Math.PI * 2;
    hub.meshSpeed = 0.35 + Math.random() * 0.4;

    // a few longer curved "spine" strands reaching back toward the core
    hub.strands = [];
    var strandGroup = new THREE.Group();
    for (var i = 0; i < SPINE_PER_HUB; i++) {
      var target = hub.anchor.clone().add(nodes[Math.floor(Math.random() * nodes.length)]);
      var mid = hub.origin.clone().lerp(target, 0.5).add(
        new THREE.Vector3((Math.random() - 0.5) * 1.1, (Math.random() - 0.5) * 1.1, (Math.random() - 0.5) * 1.1)
      );
      var curve = new THREE.QuadraticBezierCurve3(hub.origin, mid, target);
      var pts = curve.getPoints(24);
      var geo = new THREE.BufferGeometry().setFromPoints(pts);
      var mat = new THREE.LineBasicMaterial({ color: hub.color, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending });
      var line = new THREE.Line(geo, mat);
      strandGroup.add(line);
      hub.strands.push({ curve: curve, mat: mat, phase: Math.random() * Math.PI * 2, speed: 0.5 + Math.random() * 0.6 });
    }
    scene.add(strandGroup);

    var pPos = new Float32Array(NODES_PER_HUB * 3);
    nodes.forEach(function (p, j) { pPos[j * 3] = p.x; pPos[j * 3 + 1] = p.y; pPos[j * 3 + 2] = p.z; });
    var pGeo = new THREE.BufferGeometry();
    pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
    var pMat = new THREE.PointsMaterial({
      color: hub.color, size: 0.13, map: dotTexture, transparent: true,
      opacity: 1, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true
    });
    var points = new THREE.Points(pGeo, pMat);
    points.position.copy(hub.anchor);
    scene.add(points);
    hub.points = points;
    hub.burstT = 0;

    var hitGeo = new THREE.SphereGeometry(1.25, 12, 12);
    var hitMat = new THREE.MeshBasicMaterial({ visible: false });
    var hitMesh = new THREE.Mesh(hitGeo, hitMat);
    hitMesh.position.copy(hub.anchor);
    hitMesh.userData.hub = hub;
    scene.add(hitMesh);
    hub.hitMesh = hitMesh;
  });

  // ---------- pulses (traveling sparks) ----------
  var pulses = [];
  var pulseGeo = new THREE.SphereGeometry(0.05, 8, 8);

  function spawnPulse(hub, manual) {
    var mat = new THREE.MeshBasicMaterial({ color: manual ? 0xffffff : hub.color, transparent: true, opacity: 1 });
    var mesh = new THREE.Mesh(pulseGeo, mat);
    mesh.scale.setScalar(manual ? 1.8 : 1);
    scene.add(mesh);
    var strand = hub.strands[Math.floor(Math.random() * hub.strands.length)];
    pulses.push({ hub: hub, strand: strand, mesh: mesh, start: performance.now(), duration: manual ? 1100 : 750 });
  }

  // ---------- feed log + hub stats ----------
  var startedAt = performance.now();
  function fmtTime(ms) {
    var s = Math.floor(ms / 1000), m = Math.floor(s / 60); s = s % 60;
    return (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
  }
  function buildFeedLine(keyword, keywordColor, restText) {
    var el = document.createElement('div');
    el.className = 'line';
    var t = document.createElement('span'); t.className = 't'; t.textContent = fmtTime(performance.now() - startedAt);
    var k = document.createElement('span'); k.className = 'k'; k.style.color = keywordColor; k.textContent = keyword;
    el.appendChild(t); el.appendChild(k); el.appendChild(document.createTextNode(' ' + restText));
    return el;
  }
  function pushFeed(el) {
    feed.insertBefore(el, feed.firstChild);
    while (feed.children.length > 8) feed.removeChild(feed.lastChild);
  }
  function bumpHub(hub, boost) {
    hub.count += Math.random() < (boost ? 0.9 : 0.5) ? (boost ? 2 : 1) : 0;
    hub.rate = Math.max(0.4, hub.rate + (Math.random() - 0.45) * (boost ? 0.4 : 0.15));
    if (!hub.el) return;
    hub.el.querySelector('.hub-stat .n').textContent = hub.count;
    hub.el.querySelector('.hub-stat .rate').textContent = hub.rate.toFixed(1) + 'k';
  }

  var lastSpawn = 0, spawnGap = 550;
  function ambientTick(now) {
    if (now - lastSpawn > spawnGap) {
      lastSpawn = now;
      spawnGap = 450 + Math.random() * 500;
      var hub = HUBS[Math.floor(Math.random() * HUBS.length)];
      spawnPulse(hub, false);
      bumpHub(hub, false);
      var file = FILES[Math.floor(Math.random() * FILES.length)];
      pushFeed(buildFeedLine(hub.name.toLowerCase(), colorCss(hub.color), '→ ' + file));
    }
  }

  function matchHub(text) {
    var t = text.toLowerCase(), best = null, bestScore = 0;
    HUBS.forEach(function (hub) {
      var kws = KEYWORDS[hub.key] || [], score = 0;
      kws.forEach(function (kw) { if (t.indexOf(kw) !== -1) score++; });
      if (score > bestScore) { bestScore = score; best = hub; }
    });
    return best || HUBS[Math.floor(Math.random() * HUBS.length)];
  }

  function feedBrain(text) {
    var hub = matchHub(text);
    spawnPulse(hub, true);
    bumpHub(hub, true);
    burst(hub);
    pushFeed(buildFeedLine('you fed', colorCss(hub.color), '"' + text + '" → ' + hub.name.toLowerCase()));
  }
  if (feedForm) {
    feedForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var text = feedText.value.trim().slice(0, 80);
      if (!text) return;
      feedBrain(text);
      feedText.value = '';
    });
  }

  // ---------- burst + detail panel ----------
  var activeHub = null;

  function burst(hub) { hub.burstT = 1; }

  function openHub(hub) {
    if (activeHub && activeHub.el) activeHub.el.classList.remove('is-active');
    activeHub = hub;
    if (hub.el) hub.el.classList.add('is-active');
    burst(hub);
    desiredTarget.copy(hub.anchor).multiplyScalar(0.45);
    hdName.textContent = hub.name;
    hdName.style.color = colorCss(hub.color);
    hdDesc.textContent = hub.desc;
    hdNeurons.innerHTML = '';
    hub.neurons.forEach(function (n) {
      var li = document.createElement('li');
      li.style.borderColor = colorCss(hub.color);
      li.textContent = n;
      hdNeurons.appendChild(li);
    });
    hubDetail.style.setProperty('--hc', colorCss(hub.color));
    hubDetail.classList.add('is-open');
  }
  function closeHub() {
    if (activeHub && activeHub.el) activeHub.el.classList.remove('is-active');
    activeHub = null;
    hubDetail.classList.remove('is-open');
    desiredTarget.set(0, 0, 0);
  }
  hdClose.addEventListener('click', closeHub);
  HUBS.forEach(function (hub) {
    if (!hub.el) return;
    hub.el.addEventListener('click', function () { openHub(hub); });
  });

  // ---------- pointer click-vs-drag on canvas ----------
  var raycaster = new THREE.Raycaster();
  var pointerNDC = new THREE.Vector2();
  var downX = 0, downY = 0;
  canvas.addEventListener('pointerdown', function (e) { downX = e.clientX; downY = e.clientY; });
  canvas.addEventListener('pointerup', function (e) {
    var dist = Math.hypot(e.clientX - downX, e.clientY - downY);
    if (dist > 6) return;
    var rect = canvas.getBoundingClientRect();
    pointerNDC.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    pointerNDC.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointerNDC, camera);
    var hits = raycaster.intersectObjects(HUBS.map(function (h) { return h.hitMesh; }));
    if (hits.length) openHub(hits[0].object.userData.hub);
    else closeHub();
  });

  // ---------- label projection ----------
  var tmpV = new THREE.Vector3();
  function updateLabels() {
    HUBS.forEach(function (hub) {
      if (!hub.el) return;
      tmpV.copy(hub.anchor).project(camera);
      if (tmpV.z > 1) { hub.el.style.display = 'none'; return; }
      var rect = frameEl.getBoundingClientRect();
      var x = (tmpV.x * 0.5 + 0.5) * rect.width;
      var y = (-tmpV.y * 0.5 + 0.5) * rect.height;
      hub.el.style.display = '';
      hub.el.style.transform = 'translate3d(' + x + 'px,' + y + 'px,0) translate(-50%,-50%)';
    });
  }

  // ---------- render loop ----------
  function animate(now) {
    coreUniforms.uTime.value = now / 1000;

    HUBS.forEach(function (hub) {
      hub.strands.forEach(function (s) {
        s.mat.opacity = 0.42 + 0.18 * Math.sin(now / 900 * s.speed + s.phase);
      });
      hub.meshMat.opacity = 0.38 + 0.16 * Math.sin(now / 1000 * hub.meshSpeed + hub.meshPhase);
      if (hub.burstT > 0) {
        hub.burstT = Math.max(0, hub.burstT - 0.02);
        var s = 1 + hub.burstT * 0.9;
        hub.points.scale.setScalar(s);
        hub.points.material.opacity = 1;
        hub.meshLines.scale.setScalar(s);
        hub.meshMat.opacity = Math.min(0.95, hub.meshMat.opacity + hub.burstT * 0.5);
      } else {
        hub.points.scale.setScalar(1);
        hub.meshLines.scale.setScalar(1);
      }
    });

    for (var i = pulses.length - 1; i >= 0; i--) {
      var p = pulses[i];
      var t = (now - p.start) / p.duration;
      if (t >= 1) {
        scene.remove(p.mesh);
        pulses.splice(i, 1);
        continue;
      }
      var pos = p.strand.curve.getPoint(Math.min(1, t));
      p.mesh.position.copy(pos);
      p.mesh.material.opacity = 1 - t;
    }

    ambientTick(now);
    controls.target.lerp(desiredTarget, 0.05);
    controls.update();
    updateLabels();
    composer.render();
    if (running) requestAnimationFrame(animate);
  }

  var running = false;
  function start() { if (!running) { running = true; requestAnimationFrame(animate); } }
  function stop() { running = false; }

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) start(); else stop(); });
    }, { threshold: 0.05 }).observe(frameEl);
  } else {
    start();
  }

  resize();
})();
