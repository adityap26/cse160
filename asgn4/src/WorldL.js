// WorldL.js

const VSHADER_SOURCE =
  'attribute vec4 a_Position;\n' +
  'attribute vec2 a_UV;\n' +
  'attribute vec3 a_Normal;\n' +
  'uniform mat4 u_ModelMatrix;\n' +
  'uniform mat4 u_ViewMatrix;\n' +
  'uniform mat4 u_ProjectionMatrix;\n' +
  'uniform mat4 u_NormalMatrix;\n' +
  'varying vec2 v_UV;\n' +
  'varying vec3 v_Normal;\n' +
  'varying vec3 v_WorldPos;\n' +
  'void main() {\n' +
  '  vec4 worldPos = u_ModelMatrix * a_Position;\n' +
  '  gl_Position = u_ProjectionMatrix * u_ViewMatrix * worldPos;\n' +
  '  v_UV = a_UV;\n' +
  '  v_WorldPos = worldPos.xyz;\n' +
  '  v_Normal = normalize((u_NormalMatrix * vec4(a_Normal, 0.0)).xyz);\n' +
  '}\n';

const FSHADER_SOURCE =
  'precision mediump float;\n' +
  'varying vec2 v_UV;\n' +
  'varying vec3 v_Normal;\n' +
  'varying vec3 v_WorldPos;\n' +
  'uniform vec4 u_FragColor;\n' +
  'uniform sampler2D u_Sampler0;\n' +
  'uniform sampler2D u_Sampler1;\n' +
  'uniform sampler2D u_Sampler2;\n' +
  'uniform sampler2D u_Sampler3;\n' +
  'uniform int u_whichTexture;\n' +
  'uniform float u_texColorWeight;\n' +
  'uniform bool u_showNormals;\n' +
  'uniform bool u_useLighting;\n' +
  'uniform bool u_forceUnlit;\n' +
  'uniform bool u_pointLightOn;\n' +
  'uniform bool u_spotLightOn;\n' +
  'uniform vec3 u_lightPos;\n' +
  'uniform vec3 u_lightColor;\n' +
  'uniform vec3 u_cameraPos;\n' +
  'uniform vec3 u_spotPos;\n' +
  'uniform vec3 u_spotDir;\n' +
  'uniform float u_spotCutoffCos;\n' +
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
  '  vec4 base = mix(u_FragColor, texColor, t);\n' +
  '  vec3 N = normalize(v_Normal);\n' +
  '  if (u_showNormals) {\n' +
  '    gl_FragColor = vec4(N * 0.5 + 0.5, 1.0);\n' +
  '    return;\n' +
  '  }\n' +
  '  if (u_forceUnlit || !u_useLighting) {\n' +
  '    gl_FragColor = base;\n' +
  '    return;\n' +
  '  }\n' +
  '  vec3 V = normalize(u_cameraPos - v_WorldPos);\n' +
  '  vec3 lit = base.rgb * 0.18;\n' +
  '  if (u_pointLightOn) {\n' +
  '    vec3 L = normalize(u_lightPos - v_WorldPos);\n' +
  '    float diff = max(dot(N, L), 0.0);\n' +
  '    vec3 R = reflect(-L, N);\n' +
  '    float spec = pow(max(dot(V, R), 0.0), 24.0);\n' +
  '    lit += (diff * base.rgb + 0.35 * spec * vec3(1.0)) * u_lightColor;\n' +
  '  }\n' +
  '  if (u_spotLightOn) {\n' +
  '    vec3 spotDirN = normalize(u_spotDir);\n' +
  '    vec3 toFrag = normalize(v_WorldPos - u_spotPos);\n' +
  '    float cone = dot(toFrag, spotDirN);\n' +
  '    if (cone > u_spotCutoffCos) {\n' +
  '      float intensity = pow((cone - u_spotCutoffCos) / (1.0 - u_spotCutoffCos), 2.0);\n' +
  '      vec3 Ls = normalize(u_spotPos - v_WorldPos);\n' +
  '      float diffS = max(dot(N, Ls), 0.0);\n' +
  '      vec3 Rs = reflect(-Ls, N);\n' +
  '      float specS = pow(max(dot(V, Rs), 0.0), 28.0);\n' +
  '      lit += intensity * (0.9 * diffS * base.rgb + 0.25 * specS * vec3(1.0));\n' +
  '    }\n' +
  '  }\n' +
  '  gl_FragColor = vec4(clamp(lit, 0.0, 1.0), base.a);\n' +
  '}\n';

const WORLD_SIZE = 32;
const MAX_WALL_HEIGHT = 4;

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
let a_Normal;
let u_ModelMatrix;
let u_ViewMatrix;
let u_ProjectionMatrix;
let u_NormalMatrix;
let u_FragColor;
let u_Sampler0;
let u_Sampler1;
let u_Sampler2;
let u_Sampler3;
let u_whichTexture;
let u_texColorWeight;
let u_showNormals;
let u_useLighting;
let u_forceUnlit;
let u_pointLightOn;
let u_spotLightOn;
let u_lightPos;
let u_lightColor;
let u_cameraPos;
let u_spotPos;
let u_spotDir;
let u_spotCutoffCos;

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

let g_showNormals = false;
let g_useLighting = true;
let g_pointLightOn = true;
let g_spotLightOn = true;
let g_forceUnlit = false;
let g_animatePointLight = true;
let g_lightBase = [4.0, 4.0, 0.0];
let g_lightPos = [4.0, 4.0, 0.0];
let g_lightColor = [1.0, 1.0, 1.0];
let g_spotPos = [0.0, 7.5, 0.0];
let g_spotDir = [0.0, -1.0, 0.0];
let g_spotCutoffDeg = 20.0;
let g_objModel = null;

function main() {
  setupWebGL();
  connectVariablesToGLSL();
  initCubeBuffers(gl);
  initSphereBuffers(gl, 24, 28);
  initOBJModel();
  initWorldMaps();
  initTextures();
  camera = new Camera(canvas);
  registerInputHandlers();
  registerLightControls();
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
  a_Normal = gl.getAttribLocation(gl.program, 'a_Normal');
  u_ModelMatrix = gl.getUniformLocation(gl.program, 'u_ModelMatrix');
  u_ViewMatrix = gl.getUniformLocation(gl.program, 'u_ViewMatrix');
  u_ProjectionMatrix = gl.getUniformLocation(gl.program, 'u_ProjectionMatrix');
  u_NormalMatrix = gl.getUniformLocation(gl.program, 'u_NormalMatrix');
  u_FragColor = gl.getUniformLocation(gl.program, 'u_FragColor');
  u_Sampler0 = gl.getUniformLocation(gl.program, 'u_Sampler0');
  u_Sampler1 = gl.getUniformLocation(gl.program, 'u_Sampler1');
  u_Sampler2 = gl.getUniformLocation(gl.program, 'u_Sampler2');
  u_Sampler3 = gl.getUniformLocation(gl.program, 'u_Sampler3');
  u_whichTexture = gl.getUniformLocation(gl.program, 'u_whichTexture');
  u_texColorWeight = gl.getUniformLocation(gl.program, 'u_texColorWeight');
  u_showNormals = gl.getUniformLocation(gl.program, 'u_showNormals');
  u_useLighting = gl.getUniformLocation(gl.program, 'u_useLighting');
  u_forceUnlit = gl.getUniformLocation(gl.program, 'u_forceUnlit');
  u_pointLightOn = gl.getUniformLocation(gl.program, 'u_pointLightOn');
  u_spotLightOn = gl.getUniformLocation(gl.program, 'u_spotLightOn');
  u_lightPos = gl.getUniformLocation(gl.program, 'u_lightPos');
  u_lightColor = gl.getUniformLocation(gl.program, 'u_lightColor');
  u_cameraPos = gl.getUniformLocation(gl.program, 'u_cameraPos');
  u_spotPos = gl.getUniformLocation(gl.program, 'u_spotPos');
  u_spotDir = gl.getUniformLocation(gl.program, 'u_spotDir');
  u_spotCutoffCos = gl.getUniformLocation(gl.program, 'u_spotCutoffCos');
}

function initOBJModel() {
  fetch('icosphere.obj')
    .then(function (response) {
      return response.text();
    })
    .then(function (objText) {
      g_objModel = createOBJModel(gl, objText);
    })
    .catch(function () {
      g_objModel = null;
    });
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
      if (x >= 14 && x <= 17 && z >= 14 && z <= 17) h = 0;
      if ((x === 16 && z > 5 && z < 28) || (z === 16 && x > 4 && x < 28)) h = 0;
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
    ctx.fillStyle = '#66aa33';
    ctx.fillRect(0, 0, 64, 64);
    for (let i = 0; i < 400; i++) {
      const x = Math.floor(Math.random() * 64);
      const y = Math.floor(Math.random() * 64);
      ctx.fillStyle = (i % 3 === 0) ? '#79c641' : '#4e8a2d';
      ctx.fillRect(x, y, 1, 1);
    }
  } else if (kind === 1) {
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
    ctx.fillStyle = '#777777';
    ctx.fillRect(0, 0, 64, 64);
    for (let j = 0; j < 600; j++) {
      const g = 90 + Math.floor(Math.random() * 90);
      ctx.fillStyle = 'rgb(' + g + ',' + g + ',' + g + ')';
      ctx.fillRect(Math.floor(Math.random() * 64), Math.floor(Math.random() * 64), 1, 1);
    }
  } else {
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
    bindTextureToUnit(createTextureCanvas(fallbackKind), unit, samplerUniform);
  };
  img.src = path;
}

function initTextures() {
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

function registerLightControls() {
  function sliderVal(id) {
    const el = document.getElementById(id);
    return el ? parseFloat(el.value) : 0;
  }
  function updateLightBaseFromSliders() {
    g_lightBase[0] = sliderVal('lightX');
    g_lightBase[1] = sliderVal('lightY');
    g_lightBase[2] = sliderVal('lightZ');
  }
  function updateLightColorFromSliders() {
    g_lightColor[0] = sliderVal('lightR');
    g_lightColor[1] = sliderVal('lightG');
    g_lightColor[2] = sliderVal('lightB');
  }
  ['lightX', 'lightY', 'lightZ'].forEach(function (id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('input', updateLightBaseFromSliders);
  });
  ['lightR', 'lightG', 'lightB'].forEach(function (id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('input', updateLightColorFromSliders);
  });
  const animateChk = document.getElementById('animateLightChk');
  if (animateChk) {
    animateChk.addEventListener('change', function () {
      g_animatePointLight = !!animateChk.checked;
    });
  }
  const toggleLightingBtn = document.getElementById('toggleLightingBtn');
  if (toggleLightingBtn) {
    toggleLightingBtn.addEventListener('click', function () {
      g_useLighting = !g_useLighting;
      toggleLightingBtn.textContent = 'Lighting: ' + (g_useLighting ? 'ON' : 'OFF');
    });
  }
  const toggleNormalsBtn = document.getElementById('toggleNormalsBtn');
  if (toggleNormalsBtn) {
    toggleNormalsBtn.addEventListener('click', function () {
      g_showNormals = !g_showNormals;
      toggleNormalsBtn.textContent = 'Normal Viz: ' + (g_showNormals ? 'ON' : 'OFF');
    });
  }
  const togglePointBtn = document.getElementById('togglePointBtn');
  if (togglePointBtn) {
    togglePointBtn.addEventListener('click', function () {
      g_pointLightOn = !g_pointLightOn;
      togglePointBtn.textContent = 'Point Light: ' + (g_pointLightOn ? 'ON' : 'OFF');
    });
  }
  const toggleSpotBtn = document.getElementById('toggleSpotBtn');
  if (toggleSpotBtn) {
    toggleSpotBtn.addEventListener('click', function () {
      g_spotLightOn = !g_spotLightOn;
      toggleSpotBtn.textContent = 'Spot Light: ' + (g_spotLightOn ? 'ON' : 'OFF');
    });
  }
  updateLightBaseFromSliders();
  updateLightColorFromSliders();
}

function onResize() {
  const w = Math.max(640, window.innerWidth - 40);
  const h = Math.max(420, window.innerHeight - 280);
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
  if (g_animatePointLight) {
    g_lightPos[0] = g_lightBase[0] + 6.0 * Math.cos(t * 0.9);
    g_lightPos[1] = g_lightBase[1] + 0.8 * Math.sin(t * 1.4);
    g_lightPos[2] = g_lightBase[2] + 6.0 * Math.sin(t * 0.9);
  } else {
    g_lightPos[0] = g_lightBase[0];
    g_lightPos[1] = g_lightBase[1];
    g_lightPos[2] = g_lightBase[2];
  }
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
  return worldToMap(ex + f.elements[0] * 2.0, ez + f.elements[2] * 2.0);
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

function setLightingUniforms() {
  gl.uniform1i(u_showNormals, g_showNormals ? 1 : 0);
  gl.uniform1i(u_useLighting, g_useLighting ? 1 : 0);
  gl.uniform1i(u_forceUnlit, g_forceUnlit ? 1 : 0);
  gl.uniform1i(u_pointLightOn, g_pointLightOn ? 1 : 0);
  gl.uniform1i(u_spotLightOn, g_spotLightOn ? 1 : 0);
  gl.uniform3f(u_lightPos, g_lightPos[0], g_lightPos[1], g_lightPos[2]);
  gl.uniform3f(u_lightColor, g_lightColor[0], g_lightColor[1], g_lightColor[2]);
  gl.uniform3f(u_cameraPos, camera.eye.elements[0], camera.eye.elements[1], camera.eye.elements[2]);
  gl.uniform3f(u_spotPos, g_spotPos[0], g_spotPos[1], g_spotPos[2]);
  gl.uniform3f(u_spotDir, g_spotDir[0], g_spotDir[1], g_spotDir[2]);
  gl.uniform1f(u_spotCutoffCos, Math.cos(g_spotCutoffDeg * Math.PI / 180.0));
}

function buildRenderState() {
  return {
    attrs: { a_Position: a_Position, a_UV: a_UV, a_Normal: a_Normal },
    uniforms: {
      u_ModelMatrix: u_ModelMatrix,
      u_NormalMatrix: u_NormalMatrix,
      u_FragColor: u_FragColor,
      u_whichTexture: u_whichTexture,
      u_texColorWeight: u_texColorWeight
    }
  };
}

function drawWorld(state) {
  const m = new Matrix4();
  m.setIdentity();
  m.scale(120, 120, 120);
  drawCube(gl, state.attrs, state.uniforms, m, [0.4, 0.65, 0.95, 1], 3, 0.55);

  const ex = camera.eye.elements[0];
  const ez = camera.eye.elements[2];
  for (let z = 0; z < WORLD_SIZE; z++) {
    for (let x = 0; x < WORLD_SIZE; x++) {
      const wx = x - WORLD_SIZE / 2 + 0.5;
      const wz = z - WORLD_SIZE / 2 + 0.5;
      const dx = wx - ex;
      const dz = wz - ez;
      if (dx * dx + dz * dz > 34 * 34) continue;

      const terrainLevel = g_terrainHeights[z][x];
      const groundH = 0.20 + terrainLevel * 0.08;
      m.setIdentity();
      m.translate(wx, -0.6, wz);
      m.scale(1.0, groundH, 1.0);
      drawCube(gl, state.attrs, state.uniforms, m, [0.75, 0.95, 0.75, 1], 0, 1.0);

      const wallHeight = g_worldHeights[z][x];
      const wallTex = 1 + (g_worldMaterials[z][x] % 2);
      const groundTop = getGroundTopY(x, z);
      for (let y = 0; y < wallHeight; y++) {
        m.setIdentity();
        m.translate(wx, groundTop + 0.5 + y, wz);
        drawCube(gl, state.attrs, state.uniforms, m, [1, 1, 1, 1], wallTex, 1.0);
      }
    }
  }
}

function drawAnimalFriend(state) {
  const body = new Matrix4();
  const baseX = -6.5;
  const baseZ = -6.5;
  body.setIdentity();
  body.translate(baseX, 0.35, baseZ);
  body.scale(1.2, 0.6, 0.6);
  drawCube(gl, state.attrs, state.uniforms, body, [0.60, 0.42, 0.25, 1], -1, 0.0);
  const head = new Matrix4();
  head.setIdentity();
  head.translate(baseX + 0.95, 0.65, baseZ);
  head.scale(0.55, 0.45, 0.45);
  drawCube(gl, state.attrs, state.uniforms, head, [0.65, 0.48, 0.30, 1], -1, 0.0);
  for (let i = 0; i < 4; i++) {
    const lx = (i < 2) ? -0.35 : 0.35;
    const lz = (i % 2 === 0) ? -0.18 : 0.18;
    const leg = new Matrix4();
    leg.setIdentity();
    leg.translate(baseX + lx, 0.0, baseZ + lz);
    leg.scale(0.18, 0.5, 0.18);
    drawCube(gl, state.attrs, state.uniforms, leg, [0.50, 0.35, 0.20, 1], -1, 0.0);
  }
}

function drawCrystals(state) {
  const m = new Matrix4();
  for (let i = 0; i < g_crystals.length; i++) {
    const c = g_crystals[i];
    if (c.collected) continue;
    const bob = 0.25 + 0.08 * Math.sin(g_timeSeconds * 3 + i);
    m.setIdentity();
    m.translate(c.x, 1.0 + bob, c.z);
    m.scale(0.35, 0.55, 0.35);
    drawCube(gl, state.attrs, state.uniforms, m, [0.95, 0.95, 1.0, 1.0], 3, 0.8);
  }
}

function drawSpheres(state) {
  const m = new Matrix4();
  m.setIdentity();
  // Keep feature objects in the cleared center area to avoid wall clipping.
  m.translate(1.1, 0.95, 0.9);
  m.scale(0.95, 0.95, 0.95);
  drawSphere(gl, state.attrs, state.uniforms, m, [0.95, 0.30, 0.25, 1.0], -1, 0.0);

  m.setIdentity();
  m.translate(-1.0, 0.85, -0.9);
  m.scale(0.8, 0.8, 0.8);
  drawSphere(gl, state.attrs, state.uniforms, m, [0.20, 0.45, 0.95, 1.0], -1, 0.0);
}

function drawOBJ(state) {
  if (!g_objModel) return;
  const m = new Matrix4();
  m.setIdentity();
  m.translate(0.0, 1.25, 0.0);
  m.scale(1.2, 1.2, 1.2);
  m.rotate(g_timeSeconds * 24.0, 0, 1, 0);
  drawOBJModel(gl, g_objModel, state.attrs, state.uniforms, m, [0.92, 0.83, 0.62, 1.0], -1, 0.0);
}

function drawLightMarkers(state) {
  const m = new Matrix4();
  g_forceUnlit = true;
  setLightingUniforms();

  m.setIdentity();
  m.translate(g_lightPos[0], g_lightPos[1], g_lightPos[2]);
  m.scale(0.24, 0.24, 0.24);
  drawCube(gl, state.attrs, state.uniforms, m, [1.0, 1.0, 0.2, 1.0], -1, 0.0);

  m.setIdentity();
  m.translate(g_spotPos[0], g_spotPos[1], g_spotPos[2]);
  m.scale(0.20, 0.20, 0.20);
  drawCube(gl, state.attrs, state.uniforms, m, [0.2, 1.0, 1.0, 1.0], -1, 0.0);

  g_forceUnlit = false;
  setLightingUniforms();
}

function renderScene() {
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  gl.uniformMatrix4fv(u_ViewMatrix, false, camera.viewMatrix.elements);
  gl.uniformMatrix4fv(u_ProjectionMatrix, false, camera.projectionMatrix.elements);
  setLightingUniforms();
  const state = buildRenderState();
  drawWorld(state);
  drawSpheres(state);
  drawOBJ(state);
  drawCrystals(state);
  drawAnimalFriend(state);
  drawLightMarkers(state);
}

function updateStoryState() {
  const ex = camera.eye.elements[0];
  const ez = camera.eye.elements[2];
  for (let i = 0; i < g_crystals.length; i++) {
    const c = g_crystals[i];
    if (c.collected) continue;
    const dx = ex - c.x;
    const dz = ez - c.z;
    if (dx * dx + dz * dz < 1.2 * 1.2) c.collected = true;
  }
  const dogDx = ex - (-6.5);
  const dogDz = ez - (-6.5);
  if (dogDx * dogDx + dogDz * dogDz < 2.1 * 2.1) g_dogReached = true;
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
