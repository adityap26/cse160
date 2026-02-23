// Sphere.js

let g_sphereInterleavedVBO = null;
let g_sphereVertexCount = 0;

function initSphereBuffers(gl, latBands, lonBands) {
  const latSteps = latBands || 20;
  const lonSteps = lonBands || 24;
  const data = [];

  function pushVertex(px, py, pz, u, v) {
    // For a unit sphere centered at the origin, position is the normal.
    const len = Math.sqrt(px * px + py * py + pz * pz) || 1.0;
    data.push(px, py, pz, u, v, px / len, py / len, pz / len);
  }

  function spherePoint(theta, phi) {
    const sinT = Math.sin(theta);
    const cosT = Math.cos(theta);
    const sinP = Math.sin(phi);
    const cosP = Math.cos(phi);
    return [sinT * cosP * 0.5, cosT * 0.5, sinT * sinP * 0.5];
  }

  for (let i = 0; i < latSteps; i++) {
    const t0 = (i / latSteps) * Math.PI;
    const t1 = ((i + 1) / latSteps) * Math.PI;
    const v0 = 1.0 - (i / latSteps);
    const v1 = 1.0 - ((i + 1) / latSteps);

    for (let j = 0; j < lonSteps; j++) {
      const p0 = (j / lonSteps) * Math.PI * 2.0;
      const p1 = ((j + 1) / lonSteps) * Math.PI * 2.0;
      const u0 = j / lonSteps;
      const u1 = (j + 1) / lonSteps;

      const a = spherePoint(t0, p0);
      const b = spherePoint(t1, p0);
      const c = spherePoint(t1, p1);
      const d = spherePoint(t0, p1);

      pushVertex(a[0], a[1], a[2], u0, v0);
      pushVertex(b[0], b[1], b[2], u0, v1);
      pushVertex(c[0], c[1], c[2], u1, v1);

      pushVertex(a[0], a[1], a[2], u0, v0);
      pushVertex(c[0], c[1], c[2], u1, v1);
      pushVertex(d[0], d[1], d[2], u1, v0);
    }
  }

  g_sphereVertexCount = data.length / 8;
  g_sphereInterleavedVBO = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, g_sphereInterleavedVBO);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW);
}

function drawSphere(gl, attrs, uniforms, modelMatrix, baseColor, textureNum, texColorWeight) {
  if (!g_sphereInterleavedVBO || g_sphereVertexCount === 0) return;

  gl.uniformMatrix4fv(uniforms.u_ModelMatrix, false, modelMatrix.elements);
  const normalMatrix = new Matrix4();
  normalMatrix.setInverseOf(modelMatrix);
  normalMatrix.transpose();
  gl.uniformMatrix4fv(uniforms.u_NormalMatrix, false, normalMatrix.elements);
  gl.uniform4f(uniforms.u_FragColor, baseColor[0], baseColor[1], baseColor[2], baseColor[3]);
  gl.uniform1i(uniforms.u_whichTexture, textureNum);
  gl.uniform1f(uniforms.u_texColorWeight, texColorWeight);

  gl.bindBuffer(gl.ARRAY_BUFFER, g_sphereInterleavedVBO);
  gl.vertexAttribPointer(attrs.a_Position, 3, gl.FLOAT, false, 8 * 4, 0);
  gl.enableVertexAttribArray(attrs.a_Position);
  gl.vertexAttribPointer(attrs.a_UV, 2, gl.FLOAT, false, 8 * 4, 3 * 4);
  gl.enableVertexAttribArray(attrs.a_UV);
  gl.vertexAttribPointer(attrs.a_Normal, 3, gl.FLOAT, false, 8 * 4, 5 * 4);
  gl.enableVertexAttribArray(attrs.a_Normal);

  gl.drawArrays(gl.TRIANGLES, 0, g_sphereVertexCount);
}
