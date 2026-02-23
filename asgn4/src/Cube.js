// Cube.js

let g_cubeInterleavedVBO = null;
let g_cubeVertexCount = 0;

function initCubeBuffers(gl) {
  const data = new Float32Array([
    // +X
    0.5, -0.5, -0.5, 0, 0,  1, 0, 0,  0.5,  0.5, -0.5, 1, 0,  1, 0, 0,  0.5,  0.5,  0.5, 1, 1,  1, 0, 0,
    0.5, -0.5, -0.5, 0, 0,  1, 0, 0,  0.5,  0.5,  0.5, 1, 1,  1, 0, 0,  0.5, -0.5,  0.5, 0, 1,  1, 0, 0,
    // -X
   -0.5, -0.5,  0.5, 0, 0, -1, 0, 0, -0.5,  0.5,  0.5, 1, 0, -1, 0, 0, -0.5,  0.5, -0.5, 1, 1, -1, 0, 0,
   -0.5, -0.5,  0.5, 0, 0, -1, 0, 0, -0.5,  0.5, -0.5, 1, 1, -1, 0, 0, -0.5, -0.5, -0.5, 0, 1, -1, 0, 0,
    // +Y
   -0.5,  0.5, -0.5, 0, 0,  0, 1, 0, -0.5,  0.5,  0.5, 0, 1,  0, 1, 0,  0.5,  0.5,  0.5, 1, 1,  0, 1, 0,
   -0.5,  0.5, -0.5, 0, 0,  0, 1, 0,  0.5,  0.5,  0.5, 1, 1,  0, 1, 0,  0.5,  0.5, -0.5, 1, 0,  0, 1, 0,
    // -Y
   -0.5, -0.5,  0.5, 0, 0,  0, -1, 0, -0.5, -0.5, -0.5, 0, 1,  0, -1, 0,  0.5, -0.5, -0.5, 1, 1,  0, -1, 0,
   -0.5, -0.5,  0.5, 0, 0,  0, -1, 0,  0.5, -0.5, -0.5, 1, 1,  0, -1, 0,  0.5, -0.5,  0.5, 1, 0,  0, -1, 0,
    // +Z
   -0.5, -0.5,  0.5, 0, 0,  0, 0, 1,  0.5, -0.5,  0.5, 1, 0,  0, 0, 1,  0.5,  0.5,  0.5, 1, 1,  0, 0, 1,
   -0.5, -0.5,  0.5, 0, 0,  0, 0, 1,  0.5,  0.5,  0.5, 1, 1,  0, 0, 1, -0.5,  0.5,  0.5, 0, 1,  0, 0, 1,
    // -Z
    0.5, -0.5, -0.5, 0, 0,  0, 0, -1, -0.5, -0.5, -0.5, 1, 0,  0, 0, -1, -0.5,  0.5, -0.5, 1, 1,  0, 0, -1,
    0.5, -0.5, -0.5, 0, 0,  0, 0, -1, -0.5,  0.5, -0.5, 1, 1,  0, 0, -1,  0.5,  0.5, -0.5, 0, 1,  0, 0, -1
  ]);

  g_cubeVertexCount = 36;
  g_cubeInterleavedVBO = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, g_cubeInterleavedVBO);
  gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
}

function drawCube(gl, attrs, uniforms, modelMatrix, baseColor, textureNum, texColorWeight) {
  gl.uniformMatrix4fv(uniforms.u_ModelMatrix, false, modelMatrix.elements);
  const normalMatrix = new Matrix4();
  normalMatrix.setInverseOf(modelMatrix);
  normalMatrix.transpose();
  gl.uniformMatrix4fv(uniforms.u_NormalMatrix, false, normalMatrix.elements);
  gl.uniform4f(uniforms.u_FragColor, baseColor[0], baseColor[1], baseColor[2], baseColor[3]);
  gl.uniform1i(uniforms.u_whichTexture, textureNum);
  gl.uniform1f(uniforms.u_texColorWeight, texColorWeight);

  gl.bindBuffer(gl.ARRAY_BUFFER, g_cubeInterleavedVBO);
  gl.vertexAttribPointer(attrs.a_Position, 3, gl.FLOAT, false, 8 * 4, 0);
  gl.enableVertexAttribArray(attrs.a_Position);
  gl.vertexAttribPointer(attrs.a_UV, 2, gl.FLOAT, false, 8 * 4, 3 * 4);
  gl.enableVertexAttribArray(attrs.a_UV);
  gl.vertexAttribPointer(attrs.a_Normal, 3, gl.FLOAT, false, 8 * 4, 5 * 4);
  gl.enableVertexAttribArray(attrs.a_Normal);

  gl.drawArrays(gl.TRIANGLES, 0, g_cubeVertexCount);
}
  