// Model.js

function parseOBJ(objText) {
  const positions = [];
  const texcoords = [];
  const normals = [];
  const interleaved = [];

  function parseVertexToken(token) {
    const parts = token.split('/');
    return {
      v: parts[0] ? parseInt(parts[0], 10) : 0,
      vt: parts[1] ? parseInt(parts[1], 10) : 0,
      vn: parts[2] ? parseInt(parts[2], 10) : 0
    };
  }

  function getSafePosition(idx) {
    const i = idx > 0 ? idx - 1 : positions.length + idx;
    return positions[i] || [0, 0, 0];
  }

  function getSafeTexcoord(idx) {
    const i = idx > 0 ? idx - 1 : texcoords.length + idx;
    return texcoords[i] || [0, 0];
  }

  function getSafeNormal(idx) {
    const i = idx > 0 ? idx - 1 : normals.length + idx;
    return normals[i] || null;
  }

  function computeFaceNormal(p0, p1, p2) {
    const ux = p1[0] - p0[0];
    const uy = p1[1] - p0[1];
    const uz = p1[2] - p0[2];
    const vx = p2[0] - p0[0];
    const vy = p2[1] - p0[1];
    const vz = p2[2] - p0[2];
    let nx = uy * vz - uz * vy;
    let ny = uz * vx - ux * vz;
    let nz = ux * vy - uy * vx;
    const len = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1.0;
    nx /= len;
    ny /= len;
    nz /= len;
    return [nx, ny, nz];
  }

  const lines = objText.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || line.startsWith('#')) continue;

    const parts = line.split(/\s+/);
    const tag = parts[0];

    if (tag === 'v' && parts.length >= 4) {
      positions.push([parseFloat(parts[1]), parseFloat(parts[2]), parseFloat(parts[3])]);
    } else if (tag === 'vt' && parts.length >= 3) {
      texcoords.push([parseFloat(parts[1]), parseFloat(parts[2])]);
    } else if (tag === 'vn' && parts.length >= 4) {
      normals.push([parseFloat(parts[1]), parseFloat(parts[2]), parseFloat(parts[3])]);
    } else if (tag === 'f' && parts.length >= 4) {
      const verts = parts.slice(1).map(parseVertexToken);
      for (let t = 1; t < verts.length - 1; t++) {
        const tri = [verts[0], verts[t], verts[t + 1]];
        const p0 = getSafePosition(tri[0].v);
        const p1 = getSafePosition(tri[1].v);
        const p2 = getSafePosition(tri[2].v);
        const fallbackNormal = computeFaceNormal(p0, p1, p2);

        for (let k = 0; k < 3; k++) {
          const tk = tri[k];
          const p = getSafePosition(tk.v);
          const uv = getSafeTexcoord(tk.vt);
          const n = getSafeNormal(tk.vn) || fallbackNormal;
          interleaved.push(p[0], p[1], p[2], uv[0], uv[1], n[0], n[1], n[2]);
        }
      }
    }
  }

  return new Float32Array(interleaved);
}

function createOBJModel(gl, objText) {
  const data = parseOBJ(objText);
  if (!data || data.length === 0) return null;
  const vbo = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
  gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
  return {
    vbo: vbo,
    vertexCount: data.length / 8
  };
}

function drawOBJModel(gl, model, attrs, uniforms, modelMatrix, baseColor, textureNum, texColorWeight) {
  if (!model || !model.vbo || model.vertexCount <= 0) return;
  gl.uniformMatrix4fv(uniforms.u_ModelMatrix, false, modelMatrix.elements);

  const normalMatrix = new Matrix4();
  normalMatrix.setInverseOf(modelMatrix);
  normalMatrix.transpose();
  gl.uniformMatrix4fv(uniforms.u_NormalMatrix, false, normalMatrix.elements);
  gl.uniform4f(uniforms.u_FragColor, baseColor[0], baseColor[1], baseColor[2], baseColor[3]);
  gl.uniform1i(uniforms.u_whichTexture, textureNum);
  gl.uniform1f(uniforms.u_texColorWeight, texColorWeight);

  gl.bindBuffer(gl.ARRAY_BUFFER, model.vbo);
  gl.vertexAttribPointer(attrs.a_Position, 3, gl.FLOAT, false, 8 * 4, 0);
  gl.enableVertexAttribArray(attrs.a_Position);
  gl.vertexAttribPointer(attrs.a_UV, 2, gl.FLOAT, false, 8 * 4, 3 * 4);
  gl.enableVertexAttribArray(attrs.a_UV);
  gl.vertexAttribPointer(attrs.a_Normal, 3, gl.FLOAT, false, 8 * 4, 5 * 4);
  gl.enableVertexAttribArray(attrs.a_Normal);

  gl.drawArrays(gl.TRIANGLES, 0, model.vertexCount);
}
