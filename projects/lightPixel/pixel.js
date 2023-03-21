function embedPixelData(x, y, z, alpha, beta, material) {
  var r = x | ((material & 1) << 7);
  var g = y | ((material & 2) << 6);
  var b = z | ((material & 4) << 5);
  var a = alpha | (beta << 5);

  return {r, g, b, a};
}
function decodePixelData(r, g, b, a) {
  let x = r & 127;
  let y = g & 127;
  let z = b & 127;
  let alpha = a & 31;
  let beta = (a & 224) >> 5;
  let material = ((r & 128) >> 7) | ((g & 128) >> 6) | ((b & 128) >> 5);
  return {x, y, z, alpha, beta, material};
}

function createShader(gl, type, source) {
  var shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  var success = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
  if (success) {
    return shader;
  }
  console.log(gl.getShaderInfoLog(shader));
  gl.deleteShader(shader);
}
function createProgram(gl, vertexShader, fragmentShader) {
  var program = gl.createProgram();
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  var success = gl.getProgramParameter(program, gl.LINK_STATUS);
  if (success) {
    return program;
  }

  console.log(gl.getProgramInfoLog(program));
  gl.deleteProgram(program);
}
//data length needs to be 65536 and organized like r,g,b,a,r,g,b,a,r...
function imageDataToWebgl(canvas, data) {
  var gl = canvas.getContext("webgl", {premultipliedAlpha: false});
  if (!gl) {
    return;
  }

  gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, gl.NONE);

  var vertexShaderSource = document.getElementById("gridVertShader").text;
  var fragmentShaderSource = document.getElementById("gridFragShader").text;
  var vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
  var fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
  var program = createProgram(gl, vertexShader, fragmentShader);

  var positionAttributeLocation = gl.getAttribLocation(program, "a_position");
  var colorAttributeLocation = gl.getAttribLocation(program, "a_color");

  var resUniformLocation = gl.getUniformLocation(program, "u_res");

  var buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);

  var arr = [];
  var i = 0;
  for (let pz = 0.0; pz < canvas.height; pz += 1.0) {
    for (let px = 0.0; px < canvas.width; px += 1.0) {
      arr.push(px);
      arr.push(pz);

      arr.push(data[i + 0] / 255.0);
      arr.push(data[i + 1] / 255.0);
      arr.push(data[i + 2] / 255.0);
      arr.push(data[i + 3] / 255.0);

      i += 4;
    }
  }
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(arr), gl.STATIC_DRAW);

  gl.viewport(0, 0, canvas.width, canvas.height);

  gl.clearColor(0, 0, 0, 0);
  gl.clear(gl.COLOR_BUFFER_BIT);

  gl.useProgram(program);

  gl.enableVertexAttribArray(positionAttributeLocation);
  gl.enableVertexAttribArray(colorAttributeLocation);

  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);

  gl.uniform2fv(resUniformLocation, [canvas.width, canvas.height]);

  gl.vertexAttribPointer(positionAttributeLocation, 2, gl.FLOAT, false, 24, 0);
  gl.vertexAttribPointer(colorAttributeLocation, 4, gl.FLOAT, false, 24, 8);

  gl.drawArrays(gl.POINTS, 0, canvas.width * canvas.height);
}




class Tool {
  constructor(cursorRadius, continuousOutput, modifierSettings, description) {
    this.cursorRadius = cursorRadius; //size of brush
    this.continuousOutput = continuousOutput; //should the output be tested every time the mouse moves?
    this.settings = modifierSettings; //an array of ID strings linked to html inputs that will be visible/used
    this.description = description; //a string describing the tool

    this.inputArray = [];
    this.oX = 0;
    this.oY = 0;
    this.mX = 0;
    this.mY = 0;
  }

  outputCondition(data) {
    //abstract method
    return false;
  }
  output() {
    //abstract method
    return [];
  }


  moveInput(x, y) {
    this.oX = this.mX;
    this.oY = this.mY;
    this.mX = x;
    this.mY = y;

    if (this.continuousOutput) {
      if (this.outputCondition()) {
        return this.output();
      }
      else {
        this.inputArray = [];
      }
    }
  }
  clickInput(data) {
    this.inputArray.push(data);

    if (this.outputCondition()) {
      let out = this.output();
      if (!this.continuousOutput) {
        this.inputArray = [];
      }
      return out;
    }
  }
}
class FlatPlaneBrush extends Tool {
 constructor(height, material) {
   super(0.5, true, ["brushSize", "positionY", "material"], "Draws a flat base");
   this.height = height;
   this.material = material;
 }

 outputCondition() {
   let p = this.inputArray.length - 1;
   return this.inputArray.length && this.inputArray[p].buttonType == 0 && this.inputArray[p].buttonState;
 }
 output() {
   var arr = [];

   //interp between brush gaps
   let vx = this.mX - this.oX;
   let vy = this.mY - this.oY;
   let interp = [];
   if (Math.abs(vx) > 1 || Math.abs(vy) > 1) {
     let mag = Math.ceil(Math.sqrt(vx*vx + vy*vy));
     let sx = vx / mag;
     let sy = vy / mag;
     for (let i = 0; i <= mag; i++) {
       interp.push({
         x: Math.floor(this.oX + sx * i),
         y: Math.floor(this.oY + sy * i)
       });
     }
   }
   else {
     interp.push({
       x: this.mX,
       y: this.mY
     });
   }

   for (let i = 0; i < interp.length; i++) {
     for (let py = 0; py < this.cursorRadius*2; py += 1) {
       for (let px = 0; px < this.cursorRadius*2; px += 1) {
         let nx = interp[i].x + px;
         let ny = interp[i].y + py;
         let color = embedPixelData(nx, this.height, ny, 0, 2, this.material);
         arr.push({
           x: nx,
           y: ny,
           r: color.r,
           g: color.g,
           b: color.b,
           a: color.a
         });
       }
     }
   }
   return arr;
 }
}
class ManuelBrush extends Tool {
 constructor(posX, posY, posZ, alpha, beta, material) {
   super(0.5, true, ["brushSize", "positionX", "positionY", "positionZ", "alpha", "beta", "material"], "Draws based on manuel input");
   this.posX = posX;
   this.posY = posY;
   this.posZ = posZ;
   this.alpha = alpha;
   this.beta = beta;
   this.material = material;
 }

 outputCondition() {
   let p = this.inputArray.length - 1;
   return this.inputArray.length && this.inputArray[p].buttonType == 0 && this.inputArray[p].buttonState;
 }
 output() {
   var arr = [];

   //interp between brush gaps
   let vx = this.mX - this.oX;
   let vy = this.mY - this.oY;
   let interp = [];
   if (Math.abs(vx) > 1 || Math.abs(vy) > 1) {
     let mag = Math.ceil(Math.sqrt(vx*vx + vy*vy));
     let sx = vx / mag;
     let sy = vy / mag;
     for (let i = 0; i <= mag; i++) {
       interp.push({
         x: Math.floor(this.oX + sx * i),
         y: Math.floor(this.oY + sy * i)
       });
     }
   }
   else {
     interp.push({
       x: this.mX,
       y: this.mY
     });
   }

   for (let i = 0; i < interp.length; i++) {
     for (let py = 0; py < this.cursorRadius*2; py += 1) {
       for (let px = 0; px < this.cursorRadius*2; px += 1) {
         let nx = interp[i].x + px;
         let ny = interp[i].y + py
         let color = embedPixelData(this.posX, this.posY, this.posZ, this.alpha, this.beta, this.material);
         arr.push({
           x: nx,
           y: ny,
           r: color.r,
           g: color.g,
           b: color.b,
           a: color.a
         });
       }
     }
   }
   return arr;
 }
}
class TowerBrush extends Tool {
 constructor(alpha, material) {
   super(0.5, false, ["alpha", "material"], "Creates a vertical tower");
   this.alpha = alpha;
   this.material = material;
 }

 outputCondition() {
   let l = this.inputArray.length;
   if (this.inputArray.length > 1) {
     let p1 = this.inputArray[l - 1];
     let p2 = this.inputArray[l - 2];
     return p1.buttonType == 0 && p2.buttonType == 0 && !p1.buttonState && p2.buttonState;
   }
   return false;
 }
 output() {
  let fIn;
  for (let i = this.inputArray.length - 1; i >= 0; i--) {
    fIn = this.inputArray[i];
    if (fIn.buttonType == 0 && fIn.buttonState) {
      break;
    }
  }
  let lIn = this.inputArray[this.inputArray.length - 1];
  if (fIn.y - lIn.y < 0) {
    return;
  }

  let data = decodePixelData(fIn.r, fIn.g, fIn.b, fIn.a);
  let dist = fIn.y - lIn.y;
  var arr = [];
  for (let i = 0; i <= dist; i++) {
    let color = embedPixelData(data.x, data.y + i + 1, data.z, this.alpha, 0, this.material);
    arr.push({
      x: fIn.x,
      y: fIn.y - i,
      r: color.r,
      g: color.g,
      b: color.b,
      a: color.a
    });
  }
  return arr;
 }
}
class LineConnector extends Tool {
 constructor(alpha, beta, material) {
   super(0.5, false, ["alpha", "beta", "material"], "Connects two points with a line");
   this.alpha = alpha;
   this.beta = beta;
   this.material = material;
 }

 outputCondition() {
   let l = this.inputArray.length;
   if (this.inputArray.length > 1) {
     let p1 = this.inputArray[l - 1];
     let p2 = this.inputArray[l - 2];
     return p1.buttonType == 0 && p2.buttonType == 0 && !p1.buttonState && p2.buttonState;
   }
   return false;
 }
 output() {
  let fIn;
  for (let i = this.inputArray.length - 1; i >= 0; i--) {
    fIn = this.inputArray[i];
    if (fIn.buttonType == 0 && fIn.buttonState) {
      break;
    }
  }
  let lIn = this.inputArray[this.inputArray.length - 1];

  let fdata = decodePixelData(fIn.r, fIn.g, fIn.b, fIn.a);
  let ldata = decodePixelData(lIn.r, lIn.g, lIn.b, lIn.a);

  let mdx = lIn.x - fIn.x;
  let mdy = lIn.y - fIn.y;
  let mdist = Math.sqrt(mdx*mdx + mdy*mdy);
  mdx /= mdist;
  mdy /= mdist;

  let dx = ldata.x - fdata.x;
  let dy = ldata.y - fdata.y;
  let dz = ldata.z - fdata.z;
  let dist = Math.sqrt(dx*dx + dy*dy + dz*dz);
  dx /= dist;
  dy /= dist;
  dz /= dist;

  var arr = [];
  for (let i = 1; i <= mdist; i++) {
    let idist = (i / mdist) * dist;
    let color = embedPixelData(Math.ceil(fdata.x + dx * idist), Math.ceil(fdata.y + dy * idist), Math.ceil(fdata.z + dz * idist), this.alpha, this.beta, this.material);
    arr.push({
      x: Math.ceil(fIn.x + mdx * i),
      y: Math.ceil(fIn.y + mdy * i),
      r: color.r,
      g: color.g,
      b: color.b,
      a: color.a
    });
  }
  return arr;
 }
}
class TriConnector extends Tool {
 constructor(alpha, beta, material) {
   super(0.5, false, ["alpha", "beta", "material"], "Connects three points with a triangle");
   this.alpha = alpha;
   this.beta = beta;
   this.material = material;

   this.pressPoint = [];
 }

 edgetest(ax, ay, bx, by, cx, cy) {
   return (cx - ax) * (by - ay) - (cy - ay) * (bx - ax);
 }

 outputCondition() {
   let l = this.inputArray.length;
   if (this.inputArray.length > 1) {
     let p1 = this.inputArray[l - 1];
     let p2 = this.inputArray[l - 2];
     if (p1.buttonType == 0 && p2.buttonType == 0 && !p1.buttonState && p2.buttonState) {
       this.pressPoint.push(p1);
     }
     return (this.pressPoint.length > 2);
   }
   return false;
 }
 output() {
   let x0 = this.pressPoint[0].x;
   let y0 = this.pressPoint[0].y;
   let x1 = this.pressPoint[1].x;
   let y1 = this.pressPoint[1].y;
   let x2 = this.pressPoint[2].x;
   let y2 = this.pressPoint[2].y;

    let xmin = Math.min(Math.min(x0, x1), x2);
    let xmax = Math.max(Math.max(x0, x1), x2);
    let ymin = Math.min(Math.min(y0, y1), y2);
    let ymax = Math.max(Math.max(y0, y1), y2);

    let dir = ((x1-x0)*(y1+y0) + (x2-x1)*(y2+y1) + (x0-x2)*(y0+y2)) >= 0;

    let d0 = decodePixelData(this.pressPoint[0].r, this.pressPoint[0].g, this.pressPoint[0].b, this.pressPoint[0].a);
    let d1 = decodePixelData(this.pressPoint[1].r, this.pressPoint[1].g, this.pressPoint[1].b, this.pressPoint[1].a);
    let d2 = decodePixelData(this.pressPoint[2].r, this.pressPoint[2].g, this.pressPoint[2].b, this.pressPoint[2].a);

    var arr = [];
    for (let py = ymin; py <= ymax; py++) {
      for (let px = xmin; px <= xmax; px++) {

        let area = 1;
        let w0 = 1;
        let w1 = 1;
        let w2 = 1;
        if (dir) {
          area = this.edgetest(x0, y0, x1, y1, x2, y2);
          w2 = this.edgetest(x0, y0, x1, y1, px, py);
          w0 = this.edgetest(x1, y1, x2, y2, px, py);
          w1 =  this.edgetest(x2, y2, x0, y0, px, py);
        }
        else {
          area = this.edgetest(x2, y2, x1, y1, x0, y0);
          w0 = this.edgetest(x2, y2, x1, y1, px, py);
          w2 = this.edgetest(x1, y1, x0, y0, px, py);
          w1 = this.edgetest(x0, y0, x2, y2, px, py);
        }

        if (w0 >= 0 && w1 >= 0 && w2 >= 0) {
          w0 /= area;
          w1 /= area;
          w2 /= area;

          let color;
          if (dir) {
            color = embedPixelData(Math.round(d0.x*w0 + d1.x*w1 + d2.x*w2), Math.round(d0.y*w0 + d1.y*w1 + d2.y*w2), Math.round(d0.z*w0 + d1.z*w1 + d2.z*w2), this.alpha, this.beta, this.material);
          }
          else {
            color = embedPixelData(Math.round(d0.x*w0 + d1.x*w1 + d2.x*w2), Math.round(d0.y*w0 + d1.y*w1 + d2.y*w2), Math.round(d0.z*w0 + d1.z*w1 + d2.z*w2), this.alpha, this.beta, this.material);
          }
          arr.push({
            x: px,
            y: py,
            r: color.r,
            g: color.g,
            b: color.b,
            a: color.a
          });
        }
      }
    }
   this.pressPoint = [];
   return arr;
 }

}

class SketchPad {
  constructor(canvas, textout, defaultTool, width, height, length) {
    let that = this;
    this.canvas = canvas;
    this.ctx = this.canvas.getContext("2d", {antialias: false, premultipliedAlpha: false});
    this.canvas.style.cursor = "crosshair";

    this.resX = width;
    this.resY = height;
    this.resZ = length;
    this.pixelS = this.canvas.width / this.resX;

    this.zoom = 1.0;
    this.viewX = 0.0;
    this.viewY = 0.0;

    this.canvas.addEventListener("mousemove", function(evt){that.mouseMove(evt);});
    this.canvas.addEventListener("mousedown", function(evt){that.mouseDown(evt)});
    this.canvas.addEventListener("mouseup", function(evt){that.mouseUp(evt)});
    this.canvas.addEventListener("wheel", function(evt){that.mouseWheel(evt)});
    this.canvas.addEventListener("contextmenu", event => event.preventDefault());
    this.click = [];
    this.mX = 0;
    this.my = 0;

    this.imgData = new Uint8ClampedArray(this.resX * this.resZ * 4);
    for (let i = 0; i < this.imgData.length; i += 4) {
      this.imgData[i + 0] = 0;    // R value
      this.imgData[i + 1] = 0;  // G value
      this.imgData[i + 2] = 0;    // B value
      this.imgData[i + 3] = 0;  // A value
    }

    this.brush = defaultTool;
    this.textout = textout;

    this.viewmode = 1;

    this.interval = setInterval(function(){that.sketchRefresh();}, 0);
  }

  setSettings(resW, resH, resL) {
    this.resX = resW;
    this.resY = resH;
    this.resZ = resL;

    this.pixelS = this.canvas.width / this.resX;
    this.imgData = new Uint8ClampedArray(this.resX * this.resZ * 4);
    for (let i = 0; i < this.imgData.length; i += 4) {
      this.imgData[i + 0] = 0;    // R value
      this.imgData[i + 1] = 0;  // G value
      this.imgData[i + 2] = 0;    // B value
      this.imgData[i + 3] = 0;  // A value
    }
  }

  setImageData(x, y, r, g, b, a) {
    if (x < 0 || y < 0 || x >= this.resX || y >= this.resZ) {
      return;
    }

    let i = (x + y * this.resX) * 4;
    this.imgData[i + 0] = r;
    this.imgData[i + 1] = g;
    this.imgData[i + 2] = b;
    this.imgData[i + 3] = a;
  }
  getImageData(x, y) {
    let i = (x + y * this.resX) * 4;
    return {
      r: this.imgData[i + 0],
      g: this.imgData[i + 1],
      b: this.imgData[i + 2],
      a: this.imgData[i + 3]
    };
  }

  handleToolOutput(output) {
    if (!output) {
      return
    }
    for (let i = 0; i < output.length; i++) {
      this.setImageData(output[i].x, output[i].y, output[i].r, output[i].g, output[i].b, output[i].a);
    }
  }
  handleToolInput(type, state) {
    let g = this.screenToGrid(this.mX, this.mY);
    let color = this.getImageData(g.x, g.y);
    return {
      buttonType: type,
      buttonState: state,
      x: g.x,
      y: g.y,
      r: color.r,
      g: color.g,
      b: color.b,
      a: color.a
    };
  }

  updateTextout() {
    let g = this.screenToGrid(this.mX, this.mY);
    let color = this.getImageData(g.x, g.y);
    let data = decodePixelData(color.r, color.g, color.b, color.a);
    let mstr = "Mouse(" + g.x + ", " + g.y + ")";
    let pstr = "Pixel(x: " + data.x + ", y: " + data.y + ", z: "  + data.z + ", h: "  + data.alpha + ", v: "  + data.beta + ", m: "  + data.material + ")";
    this.textout.innerHTML = mstr.padEnd(20, " ") + pstr;
  }

  //input handeling
  mouseMove(evt) {
    this.mX = evt.offsetX;
    this.mY = evt.offsetY;
    this.updateTextout();

    let r = (this.brush.cursorRadius - 0.5) * this.pixelS;
    let w = this.screenToWorld(this.mX, this.mY);
    let g = this.worldToGrid(w.x - r, w.y - r);
    this.handleToolOutput(this.brush.moveInput(g.x, g.y));

    if (this.click[1]) {
      this.viewX -= evt.movementX / this.zoom;
      this.viewY -= evt.movementY / this.zoom;
    }
  }
  mouseDown(evt) {
    this.click[evt.button] = true;
    this.handleToolOutput(this.brush.clickInput(this.handleToolInput(evt.button, true)));

    if (this.click[1]) {
      this.canvas.style.cursor = "grabbing";
    }
  }
  mouseUp(evt) {
    this.click[evt.button] = false;
    this.handleToolOutput(this.brush.clickInput(this.handleToolInput(evt.button, false)));

    if (!this.click[1]) {
      this.canvas.style.cursor = "crosshair";
    }
  }
  mouseWheel(evt) {
    let preZoom = this.screenToWorld(this.mX, this.mY);
    this.zoom = Math.min(Math.max(this.zoom - 20.0/evt.deltaY, 0.5), 8.0);
    let postZoom = this.screenToWorld(this.mX, this.mY);
    this.viewX += preZoom.x - postZoom.x;
    this.viewY += preZoom.y - postZoom.y;
  }

  screenToWorld(sX, sY) {
    return {
      x: sX / this.zoom + this.viewX,
      y: sY / this.zoom + this.viewY
    };
  }
  worldToScreen(wX, wY) {
    return {
      x: (wX - this.viewX) * this.zoom,
      y: (wY - this.viewY) * this.zoom
    };
  }
  screenToGrid(sX, sY) {
    let w = this.screenToWorld(sX, sY);
    return {
      x: Math.floor((w.x) / this.pixelS),
      y: Math.floor((w.y) / this.pixelS)
    }
  }
  worldToGrid(wX, wY) {
    return {
      x: Math.floor((wX) / this.pixelS),
      y: Math.floor((wY) / this.pixelS)
    }
  }



  renderRect(x, y, w, h, fill) {
    let s = this.worldToScreen(x, y);
    if (fill) {
      this.ctx.fillRect(s.x - 1, s.y - 1, w * this.zoom + 1, h * this.zoom + 1);
    }
    else {
      this.ctx.strokeRect(s.x, s.y, w * this.zoom, h * this.zoom);
    }
  }

  renderFilteredImgData() {
    for (let py = 0; py < this.resZ; py++) {
      for (let px = 0; px < this.resX; px++) {
        let color = this.getImageData(px, py);
        let data = decodePixelData(color.r, color.g, color.b, color.a);

        switch (this.viewmode) {
          case 1:
            this.ctx.fillStyle = "rgb("+ data.x / this.resX * 255 + ", 0," + data.z / this.resZ * 255 + ")";
            break;
          case 2:
            this.ctx.fillStyle = "rgb(0," + data.y / this.resY * 255 + ",0)";
            break;
          case 3:
            let nx =  Math.sin(data.alpha * 0.524) * Math.cos(data.beta * 0.785);
            let ny =  Math.sin(data.beta * 0.785);
            let nz = Math.cos(data.alpha * 0.524) * Math.cos(data.beta * 0.785);
            nx = (nx + 1.0) / 2.0;
            ny = (ny + 1.0) / 2.0;
            nz = (nz + 1.0) / 2.0;
            this.ctx.fillStyle = "rgb(" + nx * 255 + "," + ny * 255 + "," + nz * 255 + ")";
            break;
          case 4:
            let val = data.material / 7 * 255;
            this.ctx.fillStyle = "rgb(" + val + "," + val + "," + val + ")";
        }


        this.renderRect(px * this.pixelS, py * this.pixelS, this.pixelS, this.pixelS, true);
      }
    }
  }
  renderToolCursor() {
    if (this.click[1]) {
      return
    }
    //square brush shape
    let d = (this.brush.cursorRadius * 2) * this.pixelS;
    let r = (this.brush.cursorRadius - 0.5) * this.pixelS;
    let w = this.screenToWorld(this.mX, this.mY);
    let g = this.worldToGrid(w.x - r, w.y - r);

    this.ctx.fillStyle = "white";
    this.ctx.strokeStyle = "white";
    this.renderRect(g.x * this.pixelS, g.y * this.pixelS, d, d, this.click[0]);
  }
  sketchRefresh() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height); //clears screen

    this.renderFilteredImgData();

    this.ctx.strokeStyle = "white";
    this.renderRect(0, 0, this.resX * this.pixelS, this.resZ * this.pixelS, false); //draws sketch frame

    this.renderToolCursor();
  }

}

var sketch = new SketchPad(document.getElementById("viewspace"), document.getElementById("readout"), new FlatPlaneBrush(0, 0), 128, 128, 128);

function applySettings() {
  let w = document.getElementById("resW").value;
  let h = document.getElementById("resH").value;
  let l = document.getElementById("resL").value;
  sketch.setSettings(w, h, l);

  let expt = document.getElementById("export");
  expt.width = w;
  expt.height = l;

  let px = document.getElementById("posX");
  let pxn = document.getElementById("pxn");
  px.max = w - 1;
  pxn.max = w - 1;
  px.value = Math.min(Math.max(px.value, px.min), px.max);
  pxn.value = Math.min(Math.max(px.value, pxn.min), pxn.max);
  let py = document.getElementById("posY");
  let pyn = document.getElementById("pyn");
  py.max = h - 1;
  pyn.max = h - 1;
  py.value = Math.min(Math.max(py.value, py.min), py.max);
  pyn.value = Math.min(Math.max(py.value, pyn.min), pyn.max);
  let pz = document.getElementById("posZ");
  let pzn = document.getElementById("pzn");
  pz.max = l - 1;
  pzn.max = l - 1;
  pz.value = Math.min(Math.max(pz.value, pz.min), pz.max);
  pzn.value = Math.min(Math.max(pz.value, pzn.min), pzn.max);
}
function toolChange() {
  let e = document.getElementById("tools");
  switch (parseInt(e.value)) {
    case 0:
      sketch.brush = new FlatPlaneBrush(0, 0);
      break;
    case 1:
      sketch.brush = new ManuelBrush(0, 0, 0, 0, 0, 0);
      break;
    case 2:
      sketch.brush = new TowerBrush(0, 0);
      break;
    case 3:
      sketch.brush = new LineConnector(0, 0, 0);
      break;
    case 4:
      sketch.brush = new TriConnector(0, 0, 0);
      break;
  }

  let modifiers = document.getElementById("modifiers");
  for (const child of modifiers.children) {
    child.style.display = "none";
  }
  for (let i = 0; i < sketch.brush.settings.length; i++) {
    document.getElementById(sketch.brush.settings[i]).style.display = "block";
  }

  document.getElementById("description").innerHTML = sketch.brush.description;

  applyToolSettings();
}
function applyToolSettings() {
  let e = document.getElementById("tools");
  switch (parseInt(e.value)) {
    case 0:
      sketch.brush.cursorRadius = document.getElementById("bs").value;
      sketch.brush.height = document.getElementById("posY").value;
      sketch.brush.material = document.getElementById("m").value;
      break;
    case 1:
      sketch.brush.cursorRadius = document.getElementById("bs").value;
      sketch.brush.posX = document.getElementById("posX").value;
      sketch.brush.posY = document.getElementById("posY").value;
      sketch.brush.posZ = document.getElementById("posZ").value;
      sketch.brush.alpha = document.getElementById("aa").value;
      sketch.brush.beta = document.getElementById("ba").value;
      sketch.brush.material = document.getElementById("m").value;
      break;
    case 2:
      sketch.brush.alpha = document.getElementById("aa").value;
      sketch.brush.material = document.getElementById("m").value;
      break;
    case 3:
      sketch.brush.alpha = document.getElementById("aa").value;
      sketch.brush.beta = document.getElementById("ba").value;
      sketch.brush.material = document.getElementById("m").value;
      break;
    case 4:
      sketch.brush.alpha = document.getElementById("aa").value;
      sketch.brush.beta = document.getElementById("ba").value;
      sketch.brush.material = document.getElementById("m").value;
      break;
  }
}
function genFinalImage() {
  let expt = document.getElementById("export");
  imageDataToWebgl(expt, sketch.imgData);
}

function changeViewMode() {
  let xzMode = document.getElementById("xzMode");
  let yMode = document.getElementById("yMode");
  let nMode = document.getElementById("nMode");
  let mMode = document.getElementById("mMode");
  sketch.viewmode = xzMode.checked * xzMode.value + yMode.checked * yMode.value + nMode.checked * nMode.value + mMode.checked * mMode.value;
}

function updateBrushSize(evt) {
  let val = evt.target.value;

  let b = document.getElementById("bs");
  let bn = document.getElementById("bsn");
  b.value = Math.min(Math.max(val, b.min), b.max);
  bn.value = Math.min(Math.max(val, bn.min), bn.max);
  applyToolSettings();
}
function updatePosX(evt) {
  let val = evt.target.value;

  let px = document.getElementById("posX");
  let pxn = document.getElementById("pxn");
  px.value = Math.min(Math.max(val, px.min), px.max);
  pxn.value = Math.min(Math.max(val, pxn.min), pxn.max);
  applyToolSettings();
}
function updatePosY(evt) {
  let val = evt.target.value;

  let py = document.getElementById("posY");
  let pyn = document.getElementById("pyn");
  py.value = Math.min(Math.max(val, py.min), py.max);
  pyn.value = Math.min(Math.max(val, pyn.min), pyn.max);
  applyToolSettings();
}
function updatePosZ(evt) {
  let val = evt.target.value;

  let pz = document.getElementById("posZ");
  let pzn = document.getElementById("pzn");
  pz.value = Math.min(Math.max(val, pz.min), pz.max);
  pzn.value = Math.min(Math.max(val, pzn.min), pzn.max);
  applyToolSettings();
}
function updateAlpha(evt) {
  let val = evt.target.value;
  document.getElementById("aan").innerHTML = val * 15;
  applyToolSettings();
}
function updateBeta(evt) {
  let val = evt.target.value;
  document.getElementById("ban").innerHTML = val * 45;
  applyToolSettings();
}
function updateMaterial(evt) {
  let val = evt.target.value;

  let m = document.getElementById("m");
  let mn = document.getElementById("mn");
  m.value = Math.min(Math.max(val, m.min), m.max);
  mn.value = Math.min(Math.max(val, mn.min), mn.max);
  applyToolSettings();
}


function main() {
  toolChange();

  document.getElementById("bs").addEventListener("change",updateBrushSize);
  document.getElementById("bsn").addEventListener("change",updateBrushSize);

  document.getElementById("posX").addEventListener("change",updatePosX);
  document.getElementById("pxn").addEventListener("change",updatePosX);
  document.getElementById("posY").addEventListener("change",updatePosY);
  document.getElementById("pyn").addEventListener("change",updatePosY);
  document.getElementById("posZ").addEventListener("change",updatePosZ);
  document.getElementById("pzn").addEventListener("change",updatePosZ);

  document.getElementById("aa").addEventListener("change",updateAlpha);
  document.getElementById("ba").addEventListener("change",updateBeta);

  document.getElementById("m").addEventListener("change",updateMaterial);
  document.getElementById("mn").addEventListener("change",updateMaterial);
}

main();
