// World.js

const VSHADER_SOURCE =
  'attribute vec4 a_Position;\n' +
  'attribute vec2 a_UV;\n' +
  'uniform mat4 u_ModelMatrix;\n' +
  'uniform mat4 u_ViewMatrix;\n' +
  'uniform mat4 u_ProjectionMatrix;\n' +
  'varying vec2 v_UV;\n' +
  'void main() {\n' +
  '  gl_Position = u_ProjectionMatrix * u_ViewMatrix * u_ModelMatrix * a_Position;\n' +
  '  v_UV = a_UV;\n' +
  '}\n';

const FSHADER_SOURCE =
  'precision mediump float;\n' +
  'varying vec2 v_UV;\n' +
  'uniform vec4 u_FragColor;\n' +
  'uniform sampler2D u_Sampler0;\n' +
  'uniform sampler2D u_Sampler1;\n' +
  'uniform sampler2D u_Sampler2;\n' +
  'uniform sampler2D u_Sampler3;\n' +
  'uniform int u_whichTexture;\n' +
  'uniform float u_texColorWeight;\n' +
  'void main() {\n' +
  '  vec4 texColor = vec4(1.0);\n' +
  '  if (u_whichTexture == 0) {\n' +
  '    texColor = texture2D(u_Sampler0, v_UV);\n' +
  '  } else if (u_whichTexture == 1) {\n' +
  '    texColor = texture2D(u_Sampler1, v_UV);\n' +
  '  } else if (u_whichTexture == 2) {\n' +
  '    texColor = texture2D(u_Sampler2, v_UV);\n' +
  '  } else if (u_whichTexture == 3) {\n' +
  '    texColor = texture2D(u_Sampler3, v_UV);\n' +
  '  }\n' +
  '  float t = clamp(u_texColorWeight, 0.0, 1.0);\n' +
  '  gl_FragColor = mix(u_FragColor, texColor, t);\n' +
  '}\n';

const WORLD_SIZE = 32;
const MAX_WALL_HEIGHT = 4;

// Hardcoded 2D seeds expanded to 32x32.
const HEIGHT_SEED_8 = [
  [4, 4, 4, 4, 4, 4, 4, 4],
  [4, 0, 0, 1, 1, 0, 0, 4],
  [4, 0, 2, 0, 0, 2, 0, 4],
  [4, 1, 0, 3, 3, 0, 1, 4],
  [4, 1, 0, 3, 3, 0, 1, 4],
  [4, 0, 2, 0, 0, 2, 0, 4],
  [4, 0, 0, 1, 1, 0, 0, 4],
  [4, 4, 4, 4, 4, 4, 4, 4]
];

const MATERIAL_SEED_8 = [
  [2, 2, 2, 2, 2, 2, 2, 2],
  [2, 0, 1, 0, 1, 0, 1, 2],
  [2, 1, 2, 1, 0, 1, 2, 2],
  [2, 0, 1, 2, 2, 1, 0, 2],
  [2, 1, 0, 2, 2, 0, 1, 2],
  [2, 0, 1, 0, 1, 2, 0, 2],
  [2, 1, 0, 1, 0, 1, 0, 2],
  [2, 2, 2, 2, 2, 2, 2, 2]
];

const TERRAIN_SEED_8 = [
  [1, 1, 1, 1, 1, 1, 1, 1],
  [1, 2, 2, 1, 1, 2, 2, 1],
  [1, 2, 3, 2, 2, 3, 2, 1],
  [1, 1, 2, 2, 2, 2, 1, 1],
  [1, 1, 2, 3, 3, 2, 1, 1],
  [1, 2, 3, 2, 2, 3, 2, 1],
  [1, 2, 2, 1, 1, 2, 2, 1],
  [1, 1, 1, 1, 1, 1, 1, 1]
];

let gl;
let canvas;
let camera;

let a_Position;
let a_UV;
let u_ModelMatrix;
let u_ViewMatrix;
let u_ProjectionMatrix;
let u_FragColor;
let u_Sampler0;
let u_Sampler1;
let u_Sampler2;
let u_Sampler3;
let u_whichTexture;
let u_texColorWeight;

const g_worldHeights = [];
const g_worldMaterials = [];
const g_terrainHeights = [];

const g_crystals = [
  { x: 5, z: 5, collected: false },
  { x: -9, z: 10, collected: false },
  { x: 11, z: -7, collected: false }
];
let g_storyComplete = false;

let g_lastTime = 0;
let g_fpsEMA = 0;
let g_moveSpeed = 0.16;
let g_panSpeed = 3.5;
let g_mouseSensitivity = 0.18;
let g_timeSeconds = 0;
let g_dogReached = false;

const g_keyDown = {};
let g_dragging = false;
let g_lastMouseX = 0;
let g_lastMouseY = 0;

function main() {
  setupWebGL();
  connectVariablesToGLSL();
  initCubeBuffers(gl);
  initWorldMaps();
  initTextures();

  camera = new Camera(canvas);
  registerInputHandlers();
  onResize();

  requestAnimationFrame(tick);
}

function setupWebGL() {
  canvas = document.getElementById('webgl');
  gl = canvas.getContext('webgl', { preserveDrawingBuffer: false });
  if (!gl) {
    console.log('Failed to get WebGL context.');
    return;
  }

  gl.enable(gl.DEPTH_TEST);
  gl.clearColor(0.6, 0.8, 1.0, 1.0);
}

function connectVariablesToGLSL() {
  if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) {
    console.log('Failed to initialize shaders.');
    return;
  }

  a_Position = gl.getAttribLocation(gl.program, 'a_Position');
  a_UV = gl.getAttribLocation(gl.program, 'a_UV');

  u_ModelMatrix = gl.getUniformLocation(gl.program, 'u_ModelMatrix');
  u_ViewMatrix = gl.getUniformLocation(gl.program, 'u_ViewMatrix');
  u_ProjectionMatrix = gl.getUniformLocation(gl.program, 'u_ProjectionMatrix');
  u_FragColor = gl.getUniformLocation(gl.program, 'u_FragColor');
  u_Sampler0 = gl.getUniformLocation(gl.program, 'u_Sampler0');
  u_Sampler1 = gl.getUniformLocation(gl.program, 'u_Sampler1');
  u_Sampler2 = gl.getUniformLocation(gl.program, 'u_Sampler2');
  u_Sampler3 = gl.getUniformLocation(gl.program, 'u_Sampler3');
  u_whichTexture = gl.getUniformLocation(gl.program, 'u_whichTexture');
  u_texColorWeight = gl.getUniformLocation(gl.program, 'u_texColorWeight');
}

function seedAt(seed8, x, z) {
  return seed8[z % 8][x % 8];
}

function initWorldMaps() {
  for (let z = 0; z < WORLD_SIZE; z++) {
    const heightRow = [];
    const matRow = [];
    const terrainRow = [];
    for (let x = 0; x < WORLD_SIZE; x++) {
      let h = seedAt(HEIGHT_SEED_8, x, z);
      let m = seedAt(MATERIAL_SEED_8, x, z);
      const t = seedAt(TERRAIN_SEED_8, x, z);

      // Keep central spawn area walkable.
      if (x >= 14 && x <= 17 && z >= 14 && z <= 17) h = 0;

      // Make a main path to support the "story" objective.
      if ((x === 16 && z > 5 && z < 28) || (z === 16 && x > 4 && x < 28)) h = 0;

      // Strong outer border walls.
      if (x === 0 || z === 0 || x === WORLD_SIZE - 1 || z === WORLD_SIZE - 1) {
        h = 4;
        m = 2;
      }

      heightRow.push(Math.min(MAX_WALL_HEIGHT, Math.max(0, h)));
      matRow.push(m % 3);
      terrainRow.push(t);
    }
    g_worldHeights.push(heightRow);
    g_worldMaterials.push(matRow);
    g_terrainHeights.push(terrainRow);
  }
}

function createTextureCanvas(kind) {
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 64;
  const ctx = c.getContext('2d');

  if (kind === 0) {
    // Grass-ish
    ctx.fillStyle = '#66aa33';
    ctx.fillRect(0, 0, 64, 64);
    for (let i = 0; i < 400; i++) {
      const x = Math.floor(Math.random() * 64);
      const y = Math.floor(Math.random() * 64);
      ctx.fillStyle = (i % 3 === 0) ? '#79c641' : '#4e8a2d';
      ctx.fillRect(x, y, 1, 1);
    }
  } else if (kind === 1) {
    // Brick
    ctx.fillStyle = '#8a3f2b';
    ctx.fillRect(0, 0, 64, 64);
    ctx.strokeStyle = '#e0b090';
    ctx.lineWidth = 2;
    for (let y = 0; y <= 64; y += 16) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(64, y);
      ctx.stroke();
    }
    for (let y = 0; y < 64; y += 16) {
      const offset = ((y / 16) % 2) ? 8 : 0;
      for (let x = offset; x <= 64; x += 16) {
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x, y + 16);
        ctx.stroke();
      }
    }
  } else if (kind === 2) {
    // Stone
    ctx.fillStyle = '#777777';
    ctx.fillRect(0, 0, 64, 64);
    for (let i = 0; i < 600; i++) {
      const g = 90 + Math.floor(Math.random() * 90);
      ctx.fillStyle = 'rgb(' + g + ',' + g + ',' + g + ')';
      ctx.fillRect(Math.floor(Math.random() * 64), Math.floor(Math.random() * 64), 1, 1);
    }
  } else {
    // Sky
    const grad = ctx.createLinearGradient(0, 0, 0, 64);
    grad.addColorStop(0, '#9ed7ff');
    grad.addColorStop(1, '#4e87ff');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 64, 64);
  }

  return c;
}

function bindTextureToUnit(textureCanvas, unit, samplerUniform) {
  const tex = gl.createTexture();
  gl.activeTexture(gl.TEXTURE0 + unit);
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, textureCanvas);
  gl.uniform1i(samplerUniform, unit);
}

function bindImageToUnit(image, unit, samplerUniform) {
  const tex = gl.createTexture();
  gl.activeTexture(gl.TEXTURE0 + unit);
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
  gl.uniform1i(samplerUniform, unit);
}

function loadTextureFromFileOrFallback(path, unit, samplerUniform, fallbackKind) {
  const img = new Image();
  img.onload = function () {
    bindImageToUnit(img, unit, samplerUniform);
  };
  img.onerror = function () {
    // Keep project runnable even before texture files are added.
    bindTextureToUnit(createTextureCanvas(fallbackKind), unit, samplerUniform);
  };
  img.src = path;
}

function initTextures() {
  // Tries filesystem textures first; falls back to generated textures.
  loadTextureFromFileOrFallback('../textures/ground.jpg', 0, u_Sampler0, 0);
  loadTextureFromFileOrFallback('../textures/brick.jpg', 1, u_Sampler1, 1);
  loadTextureFromFileOrFallback('../textures/stone.jpg', 2, u_Sampler2, 2);
  loadTextureFromFileOrFallback('../textures/sky.jpg', 3, u_Sampler3, 3);
}

function registerInputHandlers() {
  document.addEventListener('keydown', function (ev) {
    g_keyDown[ev.key.toLowerCase()] = true;

    const key = ev.key.toLowerCase();
    if (key === 'f') addBlockInFront();
    if (key === 'g') removeBlockInFront();
  });

  document.addEventListener('keyup', function (ev) {
    g_keyDown[ev.key.toLowerCase()] = false;
  });

  canvas.addEventListener('click', function () {
    canvas.requestPointerLock();
  });

  canvas.addEventListener('mousedown', function (ev) {
    g_dragging = true;
    g_lastMouseX = ev.clientX;
    g_lastMouseY = ev.clientY;
  });
  window.addEventListener('mouseup', function () {
    g_dragging = false;
  });

  window.addEventListener('mousemove', function (ev) {
    if (document.pointerLockElement === canvas) {
      camera.panRight(ev.movementX * g_mouseSensitivity);
      camera.panVertical(-ev.movementY * g_mouseSensitivity);
      return;
    }
    if (!g_dragging) return;
    const dx = ev.clientX - g_lastMouseX;
    const dy = ev.clientY - g_lastMouseY;
    g_lastMouseX = ev.clientX;
    g_lastMouseY = ev.clientY;
    camera.panRight(dx * 0.25);
    camera.panVertical(-dy * 0.2);
  });

  window.addEventListener('resize', onResize);
}

function onResize() {
  const w = Math.max(640, window.innerWidth - 40);
  const h = Math.max(420, window.innerHeight - 220);
  canvas.width = w;
  canvas.height = h;
  gl.viewport(0, 0, canvas.width, canvas.height);
  if (camera) camera.updateProjectionMatrix(canvas.width / canvas.height);
}

function tick(timestampMs) {
  const t = timestampMs * 0.001;
  const dt = g_lastTime ? (t - g_lastTime) : 0;
  g_lastTime = t;
  g_timeSeconds = t;

  handleContinuousInput();
  updateStoryState();
  renderScene();
  updateHUD(dt);

  requestAnimationFrame(tick);
}

function handleContinuousInput() {
  if (g_keyDown.w) camera.moveForward(g_moveSpeed);
  if (g_keyDown.s) camera.moveBackwards(g_moveSpeed);
  if (g_keyDown.a) camera.moveLeft(g_moveSpeed);
  if (g_keyDown.d) camera.moveRight(g_moveSpeed);
  if (g_keyDown.q) camera.panLeft(g_panSpeed);
  if (g_keyDown.e) camera.panRight(g_panSpeed);
}

function worldToMap(x, z) {
  const mx = Math.floor(x + WORLD_SIZE / 2);
  const mz = Math.floor(z + WORLD_SIZE / 2);
  return { mx: mx, mz: mz };
}

function getGroundTopY(mx, mz) {
  const terrainLevel = g_terrainHeights[mz][mx];
  const h = 0.20 + terrainLevel * 0.08;
  return -0.6 + h / 2;
}

function sampleFrontCell() {
  const f = camera.getForward();
  const ex = camera.eye.elements[0];
  const ez = camera.eye.elements[2];

  const tx = ex + f.elements[0] * 2.0;
  const tz = ez + f.elements[2] * 2.0;
  const hit = worldToMap(tx, tz);
  return hit;
}

function addBlockInFront() {
  const hit = sampleFrontCell();
  if (!isValidCell(hit.mx, hit.mz)) return;
  g_worldHeights[hit.mz][hit.mx] = Math.min(MAX_WALL_HEIGHT, g_worldHeights[hit.mz][hit.mx] + 1);
}

function removeBlockInFront() {
  const hit = sampleFrontCell();
  if (!isValidCell(hit.mx, hit.mz)) return;
  g_worldHeights[hit.mz][hit.mx] = Math.max(0, g_worldHeights[hit.mz][hit.mx] - 1);
}

function isValidCell(mx, mz) {
  return mx >= 0 && mx < WORLD_SIZE && mz >= 0 && mz < WORLD_SIZE;
}

function drawWorld() {
  const attrs = { a_Position: a_Position, a_UV: a_UV };
  const uniforms = {
    u_ModelMatrix: u_ModelMatrix,
    u_FragColor: u_FragColor,
    u_whichTexture: u_whichTexture,
    u_texColorWeight: u_texColorWeight
  };
  const m = new Matrix4();

  // Sky box.
  m.setIdentity();
  m.scale(120, 120, 120);
  drawCube(gl, attrs, uniforms, m, [0.4, 0.65, 0.95, 1], 3, 0.55);

  const ex = camera.eye.elements[0];
  const ez = camera.eye.elements[2];

  for (let z = 0; z < WORLD_SIZE; z++) {
    for (let x = 0; x < WORLD_SIZE; x++) {
      const wx = x - WORLD_SIZE / 2 + 0.5;
      const wz = z - WORLD_SIZE / 2 + 0.5;

      const dx = wx - ex;
      const dz = wz - ez;
      if (dx * dx + dz * dz > 34 * 34) continue; // distance culling

      // Terrain ground cube (terrain map requirement).
      const terrainLevel = g_terrainHeights[z][x];
      const groundH = 0.20 + terrainLevel * 0.08;
      m.setIdentity();
      m.translate(wx, -0.6, wz);
      m.scale(1.0, groundH, 1.0);
      drawCube(gl, attrs, uniforms, m, [0.75, 0.95, 0.75, 1], 0, 1.0);

      // Walls from hardcoded map.
      const wallHeight = g_worldHeights[z][x];
      const wallTex = 1 + (g_worldMaterials[z][x] % 2); // 1 or 2
      const groundTop = getGroundTopY(x, z);

      for (let y = 0; y < wallHeight; y++) {
        m.setIdentity();
        m.translate(wx, groundTop + 0.5 + y, wz);
        drawCube(gl, attrs, uniforms, m, [1, 1, 1, 1], wallTex, 1.0);
      }
    }
  }
}

function drawAnimalFriend() {
  // Simple blocky dog in-world.
  const attrs = { a_Position: a_Position, a_UV: a_UV };
  const uniforms = {
    u_ModelMatrix: u_ModelMatrix,
    u_FragColor: u_FragColor,
    u_whichTexture: u_whichTexture,
    u_texColorWeight: u_texColorWeight
  };
  const body = new Matrix4();
  const baseX = -6.5;
  const baseZ = -6.5;

  body.setIdentity();
  body.translate(baseX, 0.35, baseZ);
  body.scale(1.2, 0.6, 0.6);
  drawCube(gl, attrs, uniforms, body, [0.60, 0.42, 0.25, 1], -1, 0.0);

  const head = new Matrix4();
  head.setIdentity();
  head.translate(baseX + 0.95, 0.65, baseZ);
  head.scale(0.55, 0.45, 0.45);
  drawCube(gl, attrs, uniforms, head, [0.65, 0.48, 0.30, 1], -1, 0.0);

  for (let i = 0; i < 4; i++) {
    const lx = (i < 2) ? -0.35 : 0.35;
    const lz = (i % 2 === 0) ? -0.18 : 0.18;
    const leg = new Matrix4();
    leg.setIdentity();
    leg.translate(baseX + lx, 0.0, baseZ + lz);
    leg.scale(0.18, 0.5, 0.18);
    drawCube(gl, attrs, uniforms, leg, [0.50, 0.35, 0.20, 1], -1, 0.0);
  }
}

function drawCrystals() {
  const attrs = { a_Position: a_Position, a_UV: a_UV };
  const uniforms = {
    u_ModelMatrix: u_ModelMatrix,
    u_FragColor: u_FragColor,
    u_whichTexture: u_whichTexture,
    u_texColorWeight: u_texColorWeight
  };
  const m = new Matrix4();

  for (let i = 0; i < g_crystals.length; i++) {
    const c = g_crystals[i];
    if (c.collected) continue;
    const bob = 0.25 + 0.08 * Math.sin(g_timeSeconds * 3 + i);
    m.setIdentity();
    m.translate(c.x, 1.0 + bob, c.z);
    m.scale(0.35, 0.55, 0.35);
    drawCube(gl, attrs, uniforms, m, [0.95, 0.95, 1.0, 1.0], 3, 0.8);
  }
}

function renderScene() {
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  gl.uniformMatrix4fv(u_ViewMatrix, false, camera.viewMatrix.elements);
  gl.uniformMatrix4fv(u_ProjectionMatrix, false, camera.projectionMatrix.elements);

  drawWorld();
  drawCrystals();
  drawAnimalFriend();
}

function updateStoryState() {
  const ex = camera.eye.elements[0];
  const ez = camera.eye.elements[2];

  for (let i = 0; i < g_crystals.length; i++) {
    const c = g_crystals[i];
    if (c.collected) continue;
    const dx = ex - c.x;
    const dz = ez - c.z;
    if (dx * dx + dz * dz < 1.2 * 1.2) {
      c.collected = true;
    }
  }

  const dogDx = ex - (-6.5);
  const dogDz = ez - (-6.5);
  if (dogDx * dogDx + dogDz * dogDz < 2.1 * 2.1) {
    g_dogReached = true;
  }

  const collectedCount = g_crystals.filter(function (c) { return c.collected; }).length;
  g_storyComplete = collectedCount === g_crystals.length && g_dogReached;

  const storyEl = document.getElementById('storyText');
  if (!storyEl) return;

  if (!g_storyComplete) {
    const dogPart = g_dogReached ? 'Dog visited!' : 'Visit your dog friend.';
    storyEl.textContent = 'Story: crystals ' + collectedCount + '/3 collected. ' + dogPart;
  } else {
    storyEl.textContent = 'Story complete: You found all crystals and reached your dog. Nice!';
  }
}

function updateHUD(dt) {
  if (dt > 0) {
    const fps = 1 / dt;
    g_fpsEMA = (g_fpsEMA === 0) ? fps : 0.9 * g_fpsEMA + 0.1 * fps;
  }

  const fpsEl = document.getElementById('fps');
  if (fpsEl) fpsEl.textContent = g_fpsEMA ? g_fpsEMA.toFixed(1) : '--';

  const hit = sampleFrontCell();
  const frontEl = document.getElementById('frontCell');
  if (!frontEl) return;
  if (isValidCell(hit.mx, hit.mz)) {
    frontEl.textContent = '' + g_worldHeights[hit.mz][hit.mx];
  } else {
    frontEl.textContent = 'out of bounds';
  }
}
