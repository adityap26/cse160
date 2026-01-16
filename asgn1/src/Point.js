// Point.js
// class for drawing individual points

class Point {
  constructor(x, y, color, size) {
    this.x = x;
    this.y = y;
    this.color = color;
    this.size = size;
  }

  render(gl, a_Position, u_FragColor, u_PointSize) {
    gl.disableVertexAttribArray(a_Position);
    
    // set position
    gl.vertexAttrib3f(a_Position, this.x, this.y, 0.0);
    
    // set color
    gl.uniform4f(u_FragColor, this.color[0], this.color[1], this.color[2], this.color[3]);
    
    // set size
    gl.uniform1f(u_PointSize, this.size);
    
    // draw the point
    gl.drawArrays(gl.POINTS, 0, 1);
  }
}
