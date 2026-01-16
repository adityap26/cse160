// ColoredPoints.js
// Aditya Patil - CSE 160 Assignment 1
// Main drawing app file

// vertex shader - handles position and size of points
var VSHADER_SOURCE =
  'attribute vec4 a_Position;\n' +
  'uniform float u_PointSize;\n' +
  'void main() {\n' +
  '  gl_Position = a_Position;\n' +
  '  gl_PointSize = u_PointSize;\n' +
  '}\n';

// fragment shader - handles the color
var FSHADER_SOURCE =
  'precision mediump float;\n' +
  'uniform vec4 u_FragColor;\n' +
  'void main() {\n' +
  '  gl_FragColor = u_FragColor;\n' +
  '}\n';

// globals - need these to be accessible everywhere
var gl;
var canvas;
var a_Position;
var u_FragColor;
var u_PointSize;
var shapesList = []; // all the shapes we draw go here
var g_selectedColor = [1.0, 1.0, 1.0, 1.0]; // default white
var g_selectedSize = 10.0;
var g_selectedType = 'point'; // can be point, triangle, or circle
var g_selectedSegments = 20; // for circles

function main() {
  setupWebGL();
  connectVariablesToGLSL();
  addUIListeners();
  renderAllShapes();
}

// sets up the canvas and gl context
function setupWebGL() {
  canvas = document.getElementById('webgl');

  // preserveDrawingBuffer keeps the drawing on screen
  gl = canvas.getContext("webgl", { preserveDrawingBuffer: true });
  if (!gl) {
    console.log('Failed to get the rendering context for WebGL');
    return;
  }

  // black background
  gl.clearColor(0.0, 0.0, 0.0, 1.0);
}

// connect our js variables to the shader variables
function connectVariablesToGLSL() {
  if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) {
    console.log('Failed to initialize shaders.');
    return;
  }

  // get position attribute
  a_Position = gl.getAttribLocation(gl.program, 'a_Position');
  if (a_Position < 0) {
    console.log('Failed to get a_Position');
    return;
  }

  // get color uniform
  u_FragColor = gl.getUniformLocation(gl.program, 'u_FragColor');
  if (!u_FragColor) {
    console.log('Failed to get u_FragColor');
    return;
  }

  // get size uniform
  u_PointSize = gl.getUniformLocation(gl.program, 'u_PointSize');
  if (!u_PointSize) {
    console.log('Failed to get u_PointSize');
    return;
  }
}

// loops through and draws everything
function renderAllShapes() {
  gl.clear(gl.COLOR_BUFFER_BIT);

  for (var i = 0; i < shapesList.length; i++) {
    shapesList[i].render(gl, a_Position, u_FragColor, u_PointSize);
  }
}

// handles clicking on the canvas
function click(ev) {
  var x = ev.clientX;
  var y = ev.clientY;
  var rect = ev.target.getBoundingClientRect();

  // convert from screen coords to webgl coords (-1 to 1)
  x = ((x - rect.left) - canvas.width/2)/(canvas.width/2);
  y = (canvas.height/2 - (y - rect.top))/(canvas.height/2);

  if (g_selectedType === 'point') {
    var newPoint = new Point(x, y, g_selectedColor.slice(), g_selectedSize);
    shapesList.push(newPoint);
  } else if (g_selectedType === 'triangle') {
    // size scaled down so triangles arent huge
    var size = g_selectedSize / 200.0;
    var newTriangle = new Triangle(
      x, y + size,           // top
      x - size, y - size,    // bottom left
      x + size, y - size,    // bottom right
      g_selectedColor.slice()
    );
    shapesList.push(newTriangle);
  } else if (g_selectedType === 'circle') {
    var radius = g_selectedSize / 200.0;
    var newCircle = new Circle(x, y, radius, g_selectedColor.slice(), g_selectedSegments);
    shapesList.push(newCircle);
  }

  renderAllShapes();
}

// for drawing when dragging mouse
function handleMouseMove(ev) {
  if (ev.buttons === 1) { // left mouse button held
    click(ev);
  }
}

// hook up mouse events
function addUIListeners() {
  canvas.onmousedown = click;
  canvas.onmousemove = handleMouseMove;
}

// changes the current shape type and updates button styling
function setShapeType(type) {
  g_selectedType = type;
  
  // remove active from all buttons first
  document.getElementById('btnPoint').classList.remove('active');
  document.getElementById('btnTriangle').classList.remove('active');
  document.getElementById('btnCircle').classList.remove('active');
  
  // add active to the selected one
  if (type === 'point') {
    document.getElementById('btnPoint').classList.add('active');
  } else if (type === 'triangle') {
    document.getElementById('btnTriangle').classList.add('active');
  } else if (type === 'circle') {
    document.getElementById('btnCircle').classList.add('active');
  }
}

// reads slider values and updates the color
function updateColor() {
  var r = document.getElementById('redSlider').value / 100.0;
  var g = document.getElementById('greenSlider').value / 100.0;
  var b = document.getElementById('blueSlider').value / 100.0;
  
  g_selectedColor = [r, g, b, 1.0];
  
  // update the display values next to sliders
  document.getElementById('redValue').textContent = r.toFixed(2);
  document.getElementById('greenValue').textContent = g.toFixed(2);
  document.getElementById('blueValue').textContent = b.toFixed(2);
}

function updateSize() {
  g_selectedSize = parseFloat(document.getElementById('sizeSlider').value);
  document.getElementById('sizeValue').textContent = g_selectedSize;
}

function updateSegments() {
  g_selectedSegments = parseInt(document.getElementById('segmentsSlider').value);
  document.getElementById('segmentsValue').textContent = g_selectedSegments;
}

// clears everything
function clearCanvas() {
  shapesList = [];
  renderAllShapes();
}

// removes the last shape drawn
function undoLastShape() {
  if (shapesList.length > 0) {
    shapesList.pop();
    renderAllShapes();
  }
}

// preset color buttons - also updates sliders to match
function setPresetColor(color) {
  g_selectedColor = color;
  document.getElementById('redSlider').value = Math.round(color[0] * 100);
  document.getElementById('greenSlider').value = Math.round(color[1] * 100);
  document.getElementById('blueSlider').value = Math.round(color[2] * 100);
  updateColor();
}

// helper to make a circle out of triangles (for the picture)
function createCircleTriangles(centerX, centerY, radius, color, segments) {
  var triangles = [];
  for (var i = 0; i < segments; i++) {
    var angle1 = (i * 2 * Math.PI) / segments;
    var angle2 = ((i + 1) * 2 * Math.PI) / segments;
    var x1 = centerX + radius * Math.cos(angle1);
    var y1 = centerY + radius * Math.sin(angle1);
    var x2 = centerX + radius * Math.cos(angle2);
    var y2 = centerY + radius * Math.sin(angle2);
    triangles.push(new Triangle(centerX, centerY, x1, y1, x2, y2, color));
  }
  return triangles;
}

// draws a winter picture with a snowman and a little home - my initials are the snowflakes
function drawPicture() {
  var allShapes = [];
  
  // dark blue background for winter vibes
  var sky1 = new Triangle(-1.0, 1.0, 1.0, 1.0, 1.0, -0.3, [0.1, 0.15, 0.3, 1.0]);
  var sky2 = new Triangle(-1.0, 1.0, -1.0, -0.3, 1.0, -0.3, [0.1, 0.15, 0.3, 1.0]);
  allShapes.push(sky1, sky2);
  
  // --- snowy ground ---
  var snowGround1 = new Triangle(-1.0, -0.3, 1.0, -0.3, 1.0, -1.0, [0.95, 0.95, 1.0, 1.0]);
  var snowGround2 = new Triangle(-1.0, -0.3, -1.0, -1.0, 1.0, -1.0, [0.95, 0.95, 1.0, 1.0]);
  allShapes.push(snowGround1, snowGround2);
  
  // --- snowman ---
  var snowmanX = 0.0;
  var snowmanBaseY = -0.45;
  
  // bottom part (biggest ball)
  var bottomRadius = 0.18;
  var bottomTriangles = createCircleTriangles(snowmanX, snowmanBaseY, bottomRadius, [1.0, 1.0, 1.0, 1.0], 24);
  allShapes = allShapes.concat(bottomTriangles);
  
  // middle part
  var middleY = snowmanBaseY + 0.28;
  var middleRadius = 0.14;
  var middleTriangles = createCircleTriangles(snowmanX, middleY, middleRadius, [1.0, 1.0, 1.0, 1.0], 24);
  allShapes = allShapes.concat(middleTriangles);
  
  // head
  var headY = middleY + 0.22;
  var headRadius = 0.1;
  var headTriangles = createCircleTriangles(snowmanX, headY, headRadius, [1.0, 1.0, 1.0, 1.0], 24);
  allShapes = allShapes.concat(headTriangles);
  
  // eyes
  var eye1 = new Triangle(snowmanX - 0.04, headY + 0.03, snowmanX - 0.025, headY + 0.045, snowmanX - 0.01, headY + 0.03, [0.0, 0.0, 0.0, 1.0]);
  var eye2 = new Triangle(snowmanX + 0.01, headY + 0.03, snowmanX + 0.025, headY + 0.045, snowmanX + 0.04, headY + 0.03, [0.0, 0.0, 0.0, 1.0]);
  
  // carrot nose
  var nose1 = new Triangle(snowmanX, headY + 0.01, snowmanX + 0.08, headY - 0.02, snowmanX + 0.06, headY - 0.04, [1.0, 0.5, 0.0, 1.0]);
  var nose2 = new Triangle(snowmanX, headY + 0.01, snowmanX + 0.06, headY - 0.04, snowmanX + 0.04, headY - 0.05, [1.0, 0.5, 0.0, 1.0]);
  
  // smile
  var mouth1 = new Triangle(snowmanX - 0.04, headY - 0.02, snowmanX - 0.03, headY - 0.03, snowmanX - 0.02, headY - 0.02, [0.0, 0.0, 0.0, 1.0]);
  var mouth2 = new Triangle(snowmanX - 0.015, headY - 0.03, snowmanX - 0.005, headY - 0.04, snowmanX + 0.005, headY - 0.03, [0.0, 0.0, 0.0, 1.0]);
  var mouth3 = new Triangle(snowmanX + 0.02, headY - 0.02, snowmanX + 0.03, headY - 0.03, snowmanX + 0.04, headY - 0.02, [0.0, 0.0, 0.0, 1.0]);
  
  // buttons on body
  var button1 = new Triangle(snowmanX - 0.015, middleY + 0.06, snowmanX + 0.015, middleY + 0.06, snowmanX, middleY + 0.08, [0.0, 0.0, 0.0, 1.0]);
  var button2 = new Triangle(snowmanX - 0.015, middleY, snowmanX + 0.015, middleY, snowmanX, middleY + 0.02, [0.0, 0.0, 0.0, 1.0]);
  var button3 = new Triangle(snowmanX - 0.015, middleY - 0.06, snowmanX + 0.015, middleY - 0.06, snowmanX, middleY - 0.04, [0.0, 0.0, 0.0, 1.0]);
  
  // stick arms
  var arm1 = new Triangle(snowmanX - middleRadius, middleY, snowmanX - 0.2, middleY + 0.1, snowmanX - 0.35, middleY - 0.1, [0.50, 0.25, 0.15, 1.0]);
  var arm2 = new Triangle(snowmanX + middleRadius, middleY, snowmanX + 0.2, middleY + 0.1, snowmanX + 0.35, middleY - 0.1, [0.50, 0.25, 0.15, 1.0]);
  
  // decided to add a top hat to the snowman
  var hatBrim1 = new Triangle(snowmanX - 0.12, headY + headRadius, snowmanX + 0.12, headY + headRadius, snowmanX + 0.12, headY + headRadius + 0.025, [0.0, 0.0, 0.0, 1.0]);
  var hatBrim2 = new Triangle(snowmanX - 0.12, headY + headRadius, snowmanX - 0.12, headY + headRadius + 0.025, snowmanX + 0.12, headY + headRadius + 0.025, [0.0, 0.0, 0.0, 1.0]);
  var hatTop1 = new Triangle(snowmanX - 0.07, headY + headRadius + 0.025, snowmanX + 0.07, headY + headRadius + 0.025, snowmanX + 0.07, headY + headRadius + 0.15, [0.0, 0.0, 0.0, 1.0]);
  var hatTop2 = new Triangle(snowmanX - 0.07, headY + headRadius + 0.025, snowmanX - 0.07, headY + headRadius + 0.15, snowmanX + 0.07, headY + headRadius + 0.15, [0.0, 0.0, 0.0, 1.0]);
  
  // red scarf
  var scarf1 = new Triangle(snowmanX - 0.12, middleY + middleRadius - 0.02, snowmanX + 0.12, middleY + middleRadius - 0.02, snowmanX + 0.12, middleY + middleRadius - 0.06, [0.8, 0.1, 0.1, 1.0]);
  var scarf2 = new Triangle(snowmanX - 0.12, middleY + middleRadius - 0.02, snowmanX - 0.12, middleY + middleRadius - 0.06, snowmanX + 0.12, middleY + middleRadius - 0.06, [0.8, 0.1, 0.1, 1.0]);
  var scarfTail1 = new Triangle(snowmanX + 0.08, middleY + middleRadius - 0.06, snowmanX + 0.15, middleY + middleRadius - 0.1, snowmanX + 0.12, middleY + middleRadius - 0.18, [0.8, 0.1, 0.1, 1.0]);
  
  allShapes.push(eye1, eye2, nose1, nose2, mouth1, mouth2, mouth3);
  allShapes.push(button1, button2, button3, arm1, arm2);
  allShapes.push(hatBrim1, hatBrim2, hatTop1, hatTop2);
  allShapes.push(scarf1, scarf2, scarfTail1);
  
  // --- house on the right ---
  var houseX = 0.6;
  var houseY = -0.1;
  var houseScale = 1.2;
  
  // main body
  var house1 = new Triangle(houseX - 0.2*houseScale, houseY, houseX + 0.2*houseScale, houseY, houseX + 0.2*houseScale, houseY - 0.35*houseScale, [0.5, 0.35, 0.2, 1.0]);
  var house2 = new Triangle(houseX - 0.2*houseScale, houseY, houseX - 0.2*houseScale, houseY - 0.35*houseScale, houseX + 0.2*houseScale, houseY - 0.35*houseScale, [0.5, 0.35, 0.2, 1.0]);
  // roof
  var roof1 = new Triangle(houseX - 0.25*houseScale, houseY, houseX, houseY + 0.2*houseScale, houseX + 0.25*houseScale, houseY, [0.6, 0.2, 0.2, 1.0]);
  // snow on roof
  var roofSnow = new Triangle(houseX - 0.22*houseScale, houseY + 0.02, houseX, houseY + 0.18*houseScale, houseX + 0.22*houseScale, houseY + 0.02, [1.0, 1.0, 1.0, 1.0]);
  // windows with light
  var windowSize = 0.05 * houseScale;
  var win1 = new Triangle(houseX - 0.1*houseScale, houseY - 0.08*houseScale, houseX - 0.1*houseScale + windowSize, houseY - 0.08*houseScale, houseX - 0.1*houseScale + windowSize, houseY - 0.08*houseScale - windowSize, [1.0, 0.9, 0.5, 1.0]);
  var win1b = new Triangle(houseX - 0.1*houseScale, houseY - 0.08*houseScale, houseX - 0.1*houseScale, houseY - 0.08*houseScale - windowSize, houseX - 0.1*houseScale + windowSize, houseY - 0.08*houseScale - windowSize, [1.0, 0.9, 0.5, 1.0]);
  var win2 = new Triangle(houseX + 0.05*houseScale, houseY - 0.08*houseScale, houseX + 0.05*houseScale + windowSize, houseY - 0.08*houseScale, houseX + 0.05*houseScale + windowSize, houseY - 0.08*houseScale - windowSize, [1.0, 0.9, 0.5, 1.0]);
  var win2b = new Triangle(houseX + 0.05*houseScale, houseY - 0.08*houseScale, houseX + 0.05*houseScale, houseY - 0.08*houseScale - windowSize, houseX + 0.05*houseScale + windowSize, houseY - 0.08*houseScale - windowSize, [1.0, 0.9, 0.5, 1.0]);
  // door
  var doorWidth = 0.06 * houseScale;
  var doorHeight = 0.12 * houseScale;
  var door1 = new Triangle(houseX - doorWidth/2, houseY - 0.35*houseScale, houseX + doorWidth/2, houseY - 0.35*houseScale, houseX + doorWidth/2, houseY - 0.35*houseScale + doorHeight, [0.3, 0.15, 0.1, 1.0]);
  var door2 = new Triangle(houseX - doorWidth/2, houseY - 0.35*houseScale, houseX - doorWidth/2, houseY - 0.35*houseScale + doorHeight, houseX + doorWidth/2, houseY - 0.35*houseScale + doorHeight, [0.3, 0.15, 0.1, 1.0]);
  allShapes.push(house1, house2, roof1, roofSnow, win1, win1b, win2, win2b, door1, door2);
  
  // --- pine tree on the left ---
  var treeX = -0.7;
  var treeY = -0.15;
  var treeScale = 1.5;
  
  // trunk
  var trunk1 = new Triangle(treeX - 0.04*treeScale, treeY - 0.2*treeScale, treeX + 0.04*treeScale, treeY - 0.2*treeScale, treeX + 0.04*treeScale, treeY, [0.4, 0.25, 0.1, 1.0]);
  var trunk2 = new Triangle(treeX - 0.04*treeScale, treeY - 0.2*treeScale, treeX - 0.04*treeScale, treeY, treeX + 0.04*treeScale, treeY, [0.4, 0.25, 0.1, 1.0]);
  // tree layers
  var tree1 = new Triangle(treeX - 0.18*treeScale, treeY, treeX + 0.18*treeScale, treeY, treeX, treeY + 0.18*treeScale, [0.15, 0.4, 0.2, 1.0]);
  var tree2 = new Triangle(treeX - 0.14*treeScale, treeY + 0.12*treeScale, treeX + 0.14*treeScale, treeY + 0.12*treeScale, treeX, treeY + 0.28*treeScale, [0.15, 0.4, 0.2, 1.0]);
  var tree3 = new Triangle(treeX - 0.1*treeScale, treeY + 0.22*treeScale, treeX + 0.1*treeScale, treeY + 0.22*treeScale, treeX, treeY + 0.38*treeScale, [0.15, 0.4, 0.2, 1.0]);
  // snow on branches
  var treeSnow1 = new Triangle(treeX - 0.12*treeScale, treeY + 0.03*treeScale, treeX + 0.12*treeScale, treeY + 0.03*treeScale, treeX, treeY + 0.12*treeScale, [1.0, 1.0, 1.0, 1.0]);
  var treeSnow2 = new Triangle(treeX - 0.09*treeScale, treeY + 0.15*treeScale, treeX + 0.09*treeScale, treeY + 0.15*treeScale, treeX, treeY + 0.22*treeScale, [1.0, 1.0, 1.0, 1.0]);
  var treeSnow3 = new Triangle(treeX - 0.06*treeScale, treeY + 0.25*treeScale, treeX + 0.06*treeScale, treeY + 0.25*treeScale, treeX, treeY + 0.32*treeScale, [1.0, 1.0, 1.0, 1.0]);
  allShapes.push(trunk1, trunk2, tree1, tree2, tree3, treeSnow1, treeSnow2, treeSnow3);
  
  // these are my initials, made to look like falling snow
  var apSnowPositions = [
    {x: -0.85, y: 0.8}, {x: -0.55, y: 0.92}, {x: -0.25, y: 0.78}, {x: 0.05, y: 0.88},
    {x: -0.7, y: 0.55}, {x: -0.35, y: 0.48}, {x: 0.15, y: 0.62}, {x: 0.45, y: 0.75},
    {x: -0.9, y: 0.25}, {x: -0.5, y: 0.18}, {x: -0.1, y: 0.35}, {x: 0.35, y: 0.42},
    {x: 0.7, y: 0.85}, {x: 0.85, y: 0.55}, {x: 0.55, y: 0.28}
  ];
  
  // draws a tiny AP at the given position
  function addTinyAP(cx, cy) {
    var s = 0.012; // size of each block
    var white = [1.0, 1.0, 1.0, 1.0];
    
    // letter A
    var ax = cx - 4*s;
    var ay = cy + 2.5*s;
    // top of A
    allShapes.push(new Triangle(ax + s, ay, ax + 2*s, ay, ax + 1.5*s, ay - s, white));
    // left leg
    allShapes.push(new Triangle(ax, ay - s, ax + s, ay - s, ax + 0.5*s, ay - 4*s, white));
    allShapes.push(new Triangle(ax, ay - s, ax + 0.5*s, ay - 4*s, ax - 0.5*s, ay - 4*s, white));
    // right leg
    allShapes.push(new Triangle(ax + 2*s, ay - s, ax + 3*s, ay - s, ax + 3.5*s, ay - 4*s, white));
    allShapes.push(new Triangle(ax + 2*s, ay - s, ax + 2.5*s, ay - 4*s, ax + 3.5*s, ay - 4*s, white));
    // crossbar
    allShapes.push(new Triangle(ax + 0.5*s, ay - 2*s, ax + 2.5*s, ay - 2*s, ax + 2.3*s, ay - 2.5*s, white));
    allShapes.push(new Triangle(ax + 0.5*s, ay - 2*s, ax + 0.7*s, ay - 2.5*s, ax + 2.3*s, ay - 2.5*s, white));
    
    // letter P
    var px = cx + 0.5*s;
    var py = cy + 2.5*s;
    // vertical part
    allShapes.push(new Triangle(px, py, px + s, py, px + s, py - 4*s, white));
    allShapes.push(new Triangle(px, py, px, py - 4*s, px + s, py - 4*s, white));
    // top curve
    allShapes.push(new Triangle(px + s, py, px + 3*s, py, px + 3*s, py - s, white));
    allShapes.push(new Triangle(px + s, py, px + s, py - s, px + 3*s, py - s, white));
    // right side curve
    allShapes.push(new Triangle(px + 2.5*s, py - s, px + 3*s, py - s, px + 3*s, py - 2*s, white));
    // middle bar
    allShapes.push(new Triangle(px + s, py - 2*s, px + 2.5*s, py - 2*s, px + 2.5*s, py - 2.5*s, white));
    allShapes.push(new Triangle(px + s, py - 2*s, px + s, py - 2.5*s, px + 2.5*s, py - 2.5*s, white));
  }
  
  // add all the snowflakes
  for (var i = 0; i < apSnowPositions.length; i++) {
    addTinyAP(apSnowPositions[i].x, apSnowPositions[i].y);
  }
  
  // finally add everything to the main list and render
  for (var i = 0; i < allShapes.length; i++) {
    shapesList.push(allShapes[i]);
  }
  
  renderAllShapes();
}
