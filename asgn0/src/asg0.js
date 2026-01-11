var g_canvas;
var g_ctx;

function main() {  
  var canvas = document.getElementById('example');  
  if (!canvas) { 
    console.log('Failed to retrieve the <canvas> element');
    return false; 
  } 
  
  g_canvas = canvas;
  g_ctx = canvas.getContext('2d');

  g_ctx.fillStyle = 'rgba(0, 0, 0, 1.0)';
  g_ctx.fillRect(0, 0, 400, 400);
  
  var v1 = new Vector3([2.25, 2.25, 0]);
  drawVector(v1, "red");
  
  document.getElementById('drawButton').addEventListener('click', handleDrawEvent);
  document.getElementById('drawOperationButton').addEventListener('click', handleDrawOperationEvent);
}

function drawVector(v, color) {
  var centerX = 200;
  var centerY = 200;
  
  var scaledX = v.elements[0] * 20;
  var scaledY = v.elements[1] * 20;
  
  var endX = centerX + scaledX;
  var endY = centerY - scaledY;
  
  g_ctx.strokeStyle = color;
  g_ctx.lineWidth = 3;
  
  g_ctx.beginPath();
  g_ctx.moveTo(centerX, centerY);
  g_ctx.lineTo(endX, endY);
  g_ctx.stroke();
}

function handleDrawEvent() {
  g_ctx.fillStyle = 'rgba(0, 0, 0, 1.0)';
  g_ctx.fillRect(0, 0, 400, 400);
  
  var v1x = parseFloat(document.getElementById('v1x').value);
  var v1y = parseFloat(document.getElementById('v1y').value);
  var v1 = new Vector3([v1x, v1y, 0]);
  
  var v2x = parseFloat(document.getElementById('v2x').value);
  var v2y = parseFloat(document.getElementById('v2y').value);
  var v2 = new Vector3([v2x, v2y, 0]);
  
  drawVector(v1, "red");
  drawVector(v2, "blue");
}

function handleDrawOperationEvent() {
  g_ctx.fillStyle = 'rgba(0, 0, 0, 1.0)';
  g_ctx.fillRect(0, 0, 400, 400);
  
  var v1x = parseFloat(document.getElementById('v1x').value);
  var v1y = parseFloat(document.getElementById('v1y').value);
  var v1 = new Vector3([v1x, v1y, 0]);
  
  var v2x = parseFloat(document.getElementById('v2x').value);
  var v2y = parseFloat(document.getElementById('v2y').value);
  var v2 = new Vector3([v2x, v2y, 0]);
  
  drawVector(v1, "red");
  drawVector(v2, "blue");
  
  var operation = document.getElementById('operation').value;
  var scalar = parseFloat(document.getElementById('scalar').value);
  
  if (operation === "add") {
    var v3 = new Vector3(v1.elements);
    v3.add(v2);
    drawVector(v3, "green");
  } else if (operation === "sub") {
    var v3 = new Vector3(v1.elements);
    v3.sub(v2);
    drawVector(v3, "green");
  } else if (operation === "mul") {
    var v3 = new Vector3(v1.elements);
    v3.mul(scalar);
    drawVector(v3, "green");
    
    var v4 = new Vector3(v2.elements);
    v4.mul(scalar);
    drawVector(v4, "green");
  } else if (operation === "div") {
    var v3 = new Vector3(v1.elements);
    v3.div(scalar);
    drawVector(v3, "green");
    
    var v4 = new Vector3(v2.elements);
    v4.div(scalar);
    drawVector(v4, "green");
  } else if (operation === "magnitude") {
    var mag1 = v1.magnitude();
    var mag2 = v2.magnitude();
    console.log("Magnitude v1: " + mag1);
    console.log("Magnitude v2: " + mag2);
    
    var v1Norm = new Vector3(v1.elements);
    v1Norm.normalize();
    drawVector(v1Norm, "green");
    
    var v2Norm = new Vector3(v2.elements);
    v2Norm.normalize();
    drawVector(v2Norm, "green");
  } else if (operation === "normalize") {
    var v1Norm = new Vector3(v1.elements);
    v1Norm.normalize();
    drawVector(v1Norm, "green");
    
    var v2Norm = new Vector3(v2.elements);
    v2Norm.normalize();
    drawVector(v2Norm, "green");
  } else if (operation === "angle") {
    var angle = angleBetween(v1, v2);
    console.log("Angle between v1 and v2: " + angle + " radians (" + (angle * 180 / Math.PI) + " degrees)");
  } else if (operation === "area") {
    var area = areaTriangle(v1, v2);
    console.log("Area of triangle: " + area);
  }
}

function angleBetween(v1, v2) {
  var dotProduct = Vector3.dot(v1, v2);
  var mag1 = v1.magnitude();
  var mag2 = v2.magnitude();
  
  if (mag1 === 0 || mag2 === 0) {
    return 0;
  }
  
  var cosAlpha = dotProduct / (mag1 * mag2);
  cosAlpha = Math.max(-1, Math.min(1, cosAlpha));
  
  return Math.acos(cosAlpha);
}

function areaTriangle(v1, v2) {
  var crossProduct = Vector3.cross(v1, v2);
  var areaParallelogram = crossProduct.magnitude();
  return areaParallelogram / 2;
}
