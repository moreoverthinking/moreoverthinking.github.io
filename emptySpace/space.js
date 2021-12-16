var canvas = document.getElementById("backcanvas");
var ctx = canvas.getContext("2d");

class Vector3 {
  constructor(x,y,z) {
    this.x = x;
    this.y = y;
    this.z = z;
  }
}

class Camera {
  constructor(x,y,z,ax,ay,az) {
    this.x = x;
    this.y = y;
    this.z = z;
    this.ax = ax;
    this.ay = ay;
    this.az = az;
  }
  drawSphere(point3d, radius) {
    let x = point3d.x - this.x;
    let y = point3d.y - this.y;
    let z = point3d.z - this.z;

    let cosx = Math.cos(this.ax);
    let cosy = Math.cos(this.ay);
    let cosz = Math.cos(this.az);
    let sinx = Math.sin(this.ax);
    let siny = Math.sin(this.ay);
    let sinz = Math.sin(this.az);

    let xx = cosy * cosz;
    let xy = -cosy * sinz;
    let xz = siny;

    let yx = cosx * sinz + sinx * siny * cosz;
    let yy = cosx * cosz - sinx * siny * sinz;
    let yz = -sinx * cosy;

    let zx = sinx * sinz - cosx * siny * cosz;
    let zy = sinx * cosz + cosx * siny * sinz;
    let zz = cosx * cosy;

    let nx = x * xx + y * xy + z * xz;
    let ny = x * yx + y * yy + z * yz;
    let nz = x * zx + y * zy + z * zz

    if (nz < 0) {return false};

    let projectionPlaneDist = canvas.width/2 / Math.tan(Math.PI/4);

    let x2D =  nx * (projectionPlaneDist / nz);
    let y2D =  ny * (projectionPlaneDist / nz);

    ctx.beginPath();
    ctx.arc(x2D + canvas.width/2, y2D + canvas.height/2, radius/nz * projectionPlaneDist, 0, 2 * Math.PI);
    ctx.fillStyle = "#F3F3F3";
    ctx.fill();
  }
}

var player = new Camera(500,500,0,0,Math.PI,0);
var keyMap = {};

var points = [new Vector3(500,500,-1000)];
var sizes = [10];
for (let i = 0; i < 3000; i++) {
  points.push(new Vector3(Math.random()*1000,Math.random()*1000,Math.random()*1000))
  sizes.push(Math.random()*2+0.01);
}

function keyEvents(dt) {
  if (keyMap[83] && player.ax <= Math.PI/2) {
    player.ax += Math.PI/2 * dt;
  }
  else if (keyMap[87] && player.ax >= -Math.PI/2) {
    player.ax -= Math.PI/2 * dt;
  }

  if (keyMap[65]) {
    player.ay += Math.PI/2 * dt;
  }
  else if (keyMap[68]) {
    player.ay -= Math.PI/2 * dt;
  }

  if (keyMap[32]) {
    player.z += Math.cos(player.ay) * Math.cos(player.ax) * dt * 100;
    player.x -= Math.sin(player.ay) * Math.cos(player.ax) * dt * 100;
    player.y += Math.sin(player.ax) * dt * 100;
  }
}

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}

var lastUpdate = 0;
function step(timestamp) {
  let dt = (timestamp - lastUpdate)/1000;
  lastUpdate = timestamp;
  keyEvents(dt);
  ctx.clearRect(0,0,canvas.width,canvas.height);
  for (let i = 0; i < points.length; i++) {
    player.drawSphere(points[i],sizes[i]);
  }
  window.requestAnimationFrame(step);
}

function initialize() {
  window.addEventListener('resize', resizeCanvas, false);
  window.addEventListener("keydown", function(e) {
    keyMap[e.keyCode] = true;
  });
  window.addEventListener("keyup", function(e) {
    keyMap[e.keyCode] = false;
  });
  resizeCanvas();
  step();
}

initialize();
