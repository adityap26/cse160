// BlockyAnimal.js
// CSE 160 Asgn 2 - Blocky Animal (Dog)

var VSHADER_SOURCE =
  'attribute vec4 a_Position;\n' +
  'uniform mat4 u_ModelMatrix;\n' +
  'uniform mat4 u_GlobalRotation;\n' +
  'void main() {\n' +
  '  gl_Position = u_GlobalRotation * u_ModelMatrix * a_Position;\n' +
  '}\n';

var FSHADER_SOURCE =
  'precision mediump float;\n' +
  'uniform vec4 u_FragColor;\n' +
  'void main() {\n' +
  '  gl_FragColor = u_FragColor;\n' +
  '}\n';

var gl;
var canvas;
var a_Position;
var u_FragColor;
var u_ModelMatrix;
var u_GlobalRotation;

var g_cubeVBO = null;
var g_cubeVertexCount = 0;

var g_cylVBO = null;
var g_cylVertexCount = 0;

var gAnimalGlobalRotation = 0;
var g_mouseRotX = 0;
var g_mouseRotY = 0;

var g_flShoulder = 20;
var g_flElbow = -40;
var g_flPaw = 10;
var g_headNod = 0;
var g_tailWagAmp = 25;

var g_animate = false;
var g_seconds = 0;
var g_lastTimestamp = 0;

var g_pokeStart = -1;
var g_pokeDuration = 1.0;

var g_fpsEma = 0;
var g_lastRenderPerfMs = 0;

var g_matrixStack = [];
function pushMatrix(m) {
  g_matrixStack.push(new Matrix4(m));
}
function popMatrix() {
  return g_matrixStack.pop();
}

function main() {
  setupWebGL();
  connectVariablesToGLSL();
  initCubeBuffer();
  initCylinderBuffer(16);
  addUIListeners();

  renderScene();
  requestAnimationFrame(tick);
}

function setupWebGL() {
  canvas = document.getElementById('webgl');
  gl = canvas.getContext('webgl', { preserveDrawingBuffer: false });
  if (!gl) {
    console.log('Failed to get the rendering context for WebGL');
    return;
  }

  gl.clearColor(0.92, 0.96, 1.0, 1.0);

  gl.enable(gl.DEPTH_TEST);
}

function connectVariablesToGLSL() {
  if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) {
    console.log('Failed to initialize shaders.');
    return;
  }

  a_Position = gl.getAttribLocation(gl.program, 'a_Position');
  if (a_Position < 0) {
    console.log('Failed to get a_Position');
    return;
  }

  u_FragColor = gl.getUniformLocation(gl.program, 'u_FragColor');
  if (!u_FragColor) {
    console.log('Failed to get u_FragColor');
    return;
  }

  u_ModelMatrix = gl.getUniformLocation(gl.program, 'u_ModelMatrix');
  if (!u_ModelMatrix) {
    console.log('Failed to get u_ModelMatrix');
    return;
  }

  u_GlobalRotation = gl.getUniformLocation(gl.program, 'u_GlobalRotation');
  if (!u_GlobalRotation) {
    console.log('Failed to get u_GlobalRotation');
    return;
  }
}

function initCubeBuffer() {
  var v = new Float32Array([
    // +X face
    0.5, -0.5, -0.5,   0.5,  0.5, -0.5,   0.5,  0.5,  0.5,
    0.5, -0.5, -0.5,   0.5,  0.5,  0.5,   0.5, -0.5,  0.5,
    // -X face
   -0.5, -0.5,  0.5,  -0.5,  0.5,  0.5,  -0.5,  0.5, -0.5,
   -0.5, -0.5,  0.5,  -0.5,  0.5, -0.5,  -0.5, -0.5, -0.5,
    // +Y face
   -0.5,  0.5, -0.5,  -0.5,  0.5,  0.5,   0.5,  0.5,  0.5,
   -0.5,  0.5, -0.5,   0.5,  0.5,  0.5,   0.5,  0.5, -0.5,
    // -Y face
   -0.5, -0.5,  0.5,  -0.5, -0.5, -0.5,   0.5, -0.5, -0.5,
   -0.5, -0.5,  0.5,   0.5, -0.5, -0.5,   0.5, -0.5,  0.5,
    // +Z face
   -0.5, -0.5,  0.5,   0.5, -0.5,  0.5,   0.5,  0.5,  0.5,
   -0.5, -0.5,  0.5,   0.5,  0.5,  0.5,  -0.5,  0.5,  0.5,
    // -Z face
    0.5, -0.5, -0.5,  -0.5, -0.5, -0.5,  -0.5,  0.5, -0.5,
    0.5, -0.5, -0.5,  -0.5,  0.5, -0.5,   0.5,  0.5, -0.5,
  ]);

  g_cubeVertexCount = 36;
  g_cubeVBO = gl.createBuffer();
  if (!g_cubeVBO) {
    console.log('Failed to create cube VBO');
    return;
  }
  gl.bindBuffer(gl.ARRAY_BUFFER, g_cubeVBO);
  gl.bufferData(gl.ARRAY_BUFFER, v, gl.STATIC_DRAW);
}

function initCylinderBuffer(segments) {
  segments = segments || 16;
  var verts = [];
  var r = 0.5;
  var y0 = -0.5;
  var y1 = 0.5;
  for (var i = 0; i < segments; i++) {
    var a0 = (i / segments) * Math.PI * 2;
    var a1 = ((i + 1) / segments) * Math.PI * 2;
    var x0 = r * Math.cos(a0);
    var z0 = r * Math.sin(a0);
    var x1 = r * Math.cos(a1);
    var z1 = r * Math.sin(a1);

    verts.push(x0, y0, z0,  x0, y1, z0,  x1, y1, z1);
    verts.push(x0, y0, z0,  x1, y1, z1,  x1, y0, z1);

    verts.push(0, y1, 0,  x0, y1, z0,  x1, y1, z1);
    verts.push(0, y0, 0,  x1, y0, z1,  x0, y0, z0);
  }

  g_cylVertexCount = verts.length / 3;
  g_cylVBO = gl.createBuffer();
  if (!g_cylVBO) {
    console.log('Failed to create cylinder VBO');
    return;
  }
  gl.bindBuffer(gl.ARRAY_BUFFER, g_cylVBO);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(verts), gl.STATIC_DRAW);
}

function drawCube(M, color) {
  gl.uniformMatrix4fv(u_ModelMatrix, false, M.elements);
  gl.uniform4f(u_FragColor, color[0], color[1], color[2], color[3]);

  gl.bindBuffer(gl.ARRAY_BUFFER, g_cubeVBO);
  gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(a_Position);

  gl.drawArrays(gl.TRIANGLES, 0, g_cubeVertexCount);
}

function drawCylinder(M, color) {
  gl.uniformMatrix4fv(u_ModelMatrix, false, M.elements);
  gl.uniform4f(u_FragColor, color[0], color[1], color[2], color[3]);

  gl.bindBuffer(gl.ARRAY_BUFFER, g_cylVBO);
  gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(a_Position);

  gl.drawArrays(gl.TRIANGLES, 0, g_cylVertexCount);
}

function addUIListeners() {
  var globalRotSlider = document.getElementById('globalRotSlider');
  var flShoulderSlider = document.getElementById('flShoulderSlider');
  var flElbowSlider = document.getElementById('flElbowSlider');
  var flPawSlider = document.getElementById('flPawSlider');
  var headNodSlider = document.getElementById('headNodSlider');
  var tailWagSlider = document.getElementById('tailWagSlider');
  var animBtn = document.getElementById('animToggleBtn');

  function hookSlider(sliderEl, valueElId, setter) {
    var valEl = document.getElementById(valueElId);
    sliderEl.addEventListener('input', function () {
      var v = parseFloat(sliderEl.value);
      valEl.textContent = '' + v;
      setter(v);
      renderScene();
    });
    document.getElementById(valueElId).textContent = '' + sliderEl.value;
  }

  hookSlider(globalRotSlider, 'globalRotValue', function (v) { gAnimalGlobalRotation = v; });
  hookSlider(flShoulderSlider, 'flShoulderValue', function (v) { g_flShoulder = v; });
  hookSlider(flElbowSlider, 'flElbowValue', function (v) { g_flElbow = v; });
  hookSlider(flPawSlider, 'flPawValue', function (v) { g_flPaw = v; });
  hookSlider(headNodSlider, 'headNodValue', function (v) { g_headNod = v; });
  hookSlider(tailWagSlider, 'tailWagValue', function (v) { g_tailWagAmp = v; });

  animBtn.addEventListener('click', function () {
    g_animate = !g_animate;
    animBtn.textContent = g_animate ? 'Animation: On' : 'Animation: Off';
    animBtn.classList.toggle('active', g_animate);
  });

  var dragging = false;
  var lastX = 0;
  var lastY = 0;
  canvas.addEventListener('mousedown', function (ev) {
    if (ev.shiftKey) {
      g_pokeStart = g_seconds;
      return;
    }
    dragging = true;
    lastX = ev.clientX;
    lastY = ev.clientY;
  });
  window.addEventListener('mouseup', function () {
    dragging = false;
  });
  window.addEventListener('mousemove', function (ev) {
    if (!dragging) return;
    var dx = ev.clientX - lastX;
    var dy = ev.clientY - lastY;
    lastX = ev.clientX;
    lastY = ev.clientY;
    g_mouseRotY += dx * 0.6;
    g_mouseRotX += dy * 0.6;
    if (g_mouseRotX > 89) g_mouseRotX = 89;
    if (g_mouseRotX < -89) g_mouseRotX = -89;
    renderScene();
  });
}

function updateAnimationAngles() {
  var t = g_seconds;
  var walk = Math.sin(t * 6.0);
  var walk2 = Math.sin(t * 6.0 + Math.PI);

  if (g_animate) {
    g_flShoulder = 20 + 25 * walk;
    g_flElbow = -40 + 25 * Math.max(0, -walk);
    g_flPaw = 10 + 15 * Math.max(0, walk);
  }

  // Poke: quick “flinch” + extra tail wag for a moment.
  var poke = 0;
  if (g_pokeStart >= 0) {
    var dt = t - g_pokeStart;
    if (dt <= g_pokeDuration) {
      poke = Math.sin((dt / g_pokeDuration) * Math.PI) * (1.0 - dt / g_pokeDuration);
    } else {
      g_pokeStart = -1;
    }
  }

  if (g_animate) {
    g_headNod = 8 * Math.sin(t * 2.0) - 18 * poke;
  }

  g_tailWagAmp = Math.max(0, g_tailWagAmp);
  g_tailWagAnimated = (g_tailWagAmp + 25 * poke) * Math.sin(t * 10.0);

  g_brShoulder = -10 + 18 * walk2;
  g_brKnee = -40 + 18 * Math.max(0, -walk2);
  g_brPaw = 5 + 12 * Math.max(0, walk2);
}

var g_tailWagAnimated = 0;
var g_brShoulder = 0;
var g_brKnee = 0;
var g_brPaw = 0;

function tick(timestampMs) {
  var t = timestampMs / 1000.0;
  g_seconds = t;

  var dt = (g_lastTimestamp === 0) ? 0 : (t - g_lastTimestamp);
  g_lastTimestamp = t;

  if (g_animate || g_pokeStart >= 0) {
    updateAnimationAngles();
    renderScene();
  }

  if (dt > 0) {
    var fps = 1.0 / dt;
    g_fpsEma = (g_fpsEma === 0) ? fps : (0.9 * g_fpsEma + 0.1 * fps);
  }

  requestAnimationFrame(tick);
}

function setGlobalRotationUniform() {
  var R = new Matrix4();
  R.setIdentity();
  R.rotate(gAnimalGlobalRotation, 0, 1, 0);
  R.rotate(g_mouseRotY, 0, 1, 0);
  R.rotate(g_mouseRotX, 1, 0, 0);
  gl.uniformMatrix4fv(u_GlobalRotation, false, R.elements);
}

function renderScene() {
  if (!gl) return;
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  setGlobalRotationUniform();

  var fur = [0.62, 0.44, 0.28, 1.0];
  var furDark = [0.45, 0.32, 0.20, 1.0];
  var furLight = [0.80, 0.68, 0.52, 1.0];
  var nose = [0.08, 0.08, 0.08, 1.0];
  var eye = [0.05, 0.05, 0.05, 1.0];
  var tongue = [0.85, 0.25, 0.35, 1.0];
  var ground = [0.80, 0.90, 0.82, 1.0];

  var M = new Matrix4();
  M.setIdentity();
  M.translate(0, -0.75, 0);
  M.scale(2.2, 0.05, 2.2);
  drawCube(M, ground);

  var body = new Matrix4();
  body.setIdentity();
  body.translate(0.0, -0.25, 0.0);
  pushMatrix(body);
  body.scale(0.85, 0.35, 0.42);
  drawCube(body, fur);
  body = popMatrix();

  var chest = new Matrix4(body);
  chest.translate(0.15, -0.04, 0.0);
  chest.scale(0.55, 0.28, 0.34);
  drawCube(chest, furLight);

  var headBase = new Matrix4(body);
  headBase.translate(0.55, 0.10, 0.0);
  headBase.rotate(g_headNod, 0, 0, 1);
  pushMatrix(headBase);
  var head = new Matrix4(headBase);
  head.translate(0.12, 0.05, 0.0);
  head.scale(0.35, 0.28, 0.28);
  drawCube(head, fur);

  var snout = new Matrix4(headBase);
  snout.translate(0.28, -0.02, 0.0);
  snout.scale(0.22, 0.16, 0.18);
  drawCube(snout, furLight);

  var noseM = new Matrix4(headBase);
  noseM.translate(0.40, -0.03, 0.0);
  noseM.scale(0.07, 0.07, 0.07);
  drawCube(noseM, nose);

  var eyeL = new Matrix4(headBase);
  eyeL.translate(0.22, 0.10, 0.09);
  eyeL.scale(0.05, 0.05, 0.05);
  drawCube(eyeL, eye);
  var eyeR = new Matrix4(headBase);
  eyeR.translate(0.22, 0.10, -0.09);
  eyeR.scale(0.05, 0.05, 0.05);
  drawCube(eyeR, eye);

  var earFlop = 0;
  if (g_pokeStart >= 0) earFlop = -20;
  var earL = new Matrix4(headBase);
  earL.translate(0.07, 0.18, 0.14);
  earL.rotate(earFlop, 1, 0, 0);
  earL.scale(0.08, 0.18, 0.07);
  drawCube(earL, furDark);
  var earR = new Matrix4(headBase);
  earR.translate(0.07, 0.18, -0.14);
  earR.rotate(-earFlop, 1, 0, 0);
  earR.scale(0.08, 0.18, 0.07);
  drawCube(earR, furDark);

  if (g_pokeStart >= 0) {
    var tongueM = new Matrix4(headBase);
    tongueM.translate(0.35, -0.10, 0.0);
    tongueM.scale(0.06, 0.10, 0.05);
    drawCube(tongueM, tongue);
  }

  headBase = popMatrix();

  var tailBase = new Matrix4(body);
  tailBase.translate(-0.50, 0.05, 0.0);
  tailBase.rotate(g_tailWagAnimated, 0, 0, 1);
  var tail1 = new Matrix4(tailBase);
  tail1.translate(-0.12, 0.05, 0.0);
  tail1.scale(0.26, 0.08, 0.08);
  drawCube(tail1, furDark);
  var tail2Base = new Matrix4(tailBase);
  tail2Base.translate(-0.26, 0.08, 0.0);
  tail2Base.rotate(g_tailWagAnimated * 0.7, 0, 0, 1);
  var tailTip = new Matrix4(tail2Base);
  tailTip.translate(-0.12, 0.02, 0.0);
  tailTip.scale(0.16, 0.08, 0.16);
  drawCylinder(tailTip, furDark);

  drawLegFrontLeft(body, 0.32, -0.10, 0.18);
  drawLegFrontRight(body, 0.32, -0.10, -0.18);
  drawLegBackLeft(body, -0.28, -0.12, 0.18);
  drawLegBackRight(body, -0.28, -0.12, -0.18);

  var msEl = document.getElementById('msValue');
  var fpsEl = document.getElementById('fpsValue');
  if (msEl && fpsEl) {
    fpsEl.textContent = (g_fpsEma ? g_fpsEma.toFixed(1) : '--');
    var nowMs = performance.now();
    if (g_lastRenderPerfMs) {
      msEl.textContent = (nowMs - g_lastRenderPerfMs).toFixed(1);
    }
    g_lastRenderPerfMs = nowMs;
  }
}

function drawLegFrontLeft(bodyBase, x, y, z) {
  var upperLen = 0.24;
  var lowerLen = 0.22;
  var thick = 0.10;

  var S = new Matrix4(bodyBase);
  S.translate(x, y, z);
  S.rotate(g_flShoulder, 0, 0, 1);

  var upper = new Matrix4(S);
  upper.translate(0, -upperLen / 2, 0);
  upper.scale(thick, upperLen, thick);
  drawCube(upper, [0.55, 0.38, 0.24, 1.0]);

  var E = new Matrix4(S);
  E.translate(0, -upperLen, 0);
  E.rotate(g_flElbow, 0, 0, 1);

  var lower = new Matrix4(E);
  lower.translate(0, -lowerLen / 2, 0);
  lower.scale(thick * 0.9, lowerLen, thick * 0.9);
  drawCube(lower, [0.50, 0.35, 0.22, 1.0]);

  var P = new Matrix4(E);
  P.translate(0, -lowerLen, 0);
  P.rotate(g_flPaw, 0, 0, 1);

  var paw = new Matrix4(P);
  paw.translate(0.05, -0.04, 0);
  paw.scale(0.16, 0.07, 0.14);
  drawCube(paw, [0.20, 0.16, 0.12, 1.0]);
}

function drawLegFrontRight(bodyBase, x, y, z) {
  var upperLen = 0.24;
  var lowerLen = 0.22;
  var thick = 0.10;

  var t = g_seconds;
  var shoulder = g_animate ? (15 + 20 * Math.sin(t * 6.0 + Math.PI)) : 15;
  var elbow = g_animate ? (-35 + 20 * Math.max(0, -Math.sin(t * 6.0 + Math.PI))) : -35;

  var S = new Matrix4(bodyBase);
  S.translate(x, y, z);
  S.rotate(shoulder, 0, 0, 1);

  var upper = new Matrix4(S);
  upper.translate(0, -upperLen / 2, 0);
  upper.scale(thick, upperLen, thick);
  drawCube(upper, [0.55, 0.38, 0.24, 1.0]);

  var E = new Matrix4(S);
  E.translate(0, -upperLen, 0);
  E.rotate(elbow, 0, 0, 1);

  var lower = new Matrix4(E);
  lower.translate(0, -lowerLen / 2, 0);
  lower.scale(thick * 0.9, lowerLen, thick * 0.9);
  drawCube(lower, [0.50, 0.35, 0.22, 1.0]);

  var paw = new Matrix4(E);
  paw.translate(0.06, -lowerLen - 0.04, 0);
  paw.scale(0.16, 0.07, 0.14);
  drawCube(paw, [0.20, 0.16, 0.12, 1.0]);
}

function drawLegBackLeft(bodyBase, x, y, z) {
  var upperLen = 0.22;
  var lowerLen = 0.22;
  var thick = 0.11;

  var shoulder = g_animate ? g_brShoulder : -10;
  var knee = g_animate ? g_brKnee : -35;
  var pawA = g_animate ? g_brPaw : 5;

  var S = new Matrix4(bodyBase);
  S.translate(x, y, z);
  S.rotate(shoulder, 0, 0, 1);

  var upper = new Matrix4(S);
  upper.translate(0, -upperLen / 2, 0);
  upper.scale(thick, upperLen, thick);
  drawCube(upper, [0.52, 0.36, 0.23, 1.0]);

  var K = new Matrix4(S);
  K.translate(0, -upperLen, 0);
  K.rotate(knee, 0, 0, 1);

  var lower = new Matrix4(K);
  lower.translate(0, -lowerLen / 2, 0);
  lower.scale(thick * 0.9, lowerLen, thick * 0.9);
  drawCube(lower, [0.47, 0.33, 0.21, 1.0]);

  var P = new Matrix4(K);
  P.translate(0, -lowerLen, 0);
  P.rotate(pawA, 0, 0, 1);

  var paw = new Matrix4(P);
  paw.translate(0.05, -0.04, 0);
  paw.scale(0.17, 0.07, 0.15);
  drawCube(paw, [0.20, 0.16, 0.12, 1.0]);
}

function drawLegBackRight(bodyBase, x, y, z) {
  var upperLen = 0.22;
  var lowerLen = 0.22;
  var thick = 0.11;

  var t = g_seconds;
  var walk = Math.sin(t * 6.0);
  var shoulder = g_animate ? (-10 + 18 * walk) : -10;
  var knee = g_animate ? (-35 + 18 * Math.max(0, -walk)) : -35;
  var pawA = g_animate ? (5 + 12 * Math.max(0, walk)) : 5;

  var S = new Matrix4(bodyBase);
  S.translate(x, y, z);
  S.rotate(shoulder, 0, 0, 1);

  var upper = new Matrix4(S);
  upper.translate(0, -upperLen / 2, 0);
  upper.scale(thick, upperLen, thick);
  drawCube(upper, [0.52, 0.36, 0.23, 1.0]);

  var K = new Matrix4(S);
  K.translate(0, -upperLen, 0);
  K.rotate(knee, 0, 0, 1);

  var lower = new Matrix4(K);
  lower.translate(0, -lowerLen / 2, 0);
  lower.scale(thick * 0.9, lowerLen, thick * 0.9);
  drawCube(lower, [0.47, 0.33, 0.21, 1.0]);

  var P = new Matrix4(K);
  P.translate(0, -lowerLen, 0);
  P.rotate(pawA, 0, 0, 1);

  var paw = new Matrix4(P);
  paw.translate(0.05, -0.04, 0);
  paw.scale(0.17, 0.07, 0.15);
  drawCube(paw, [0.20, 0.16, 0.12, 1.0]);
}
