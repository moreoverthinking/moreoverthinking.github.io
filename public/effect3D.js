var canvas = document.getElementById("backcanvas");
var ctx =canvas.getContext("2d");
var boxes = document.getElementsByClassName("box");
var bodyColor = window.getComputedStyle(document.body).backgroundColor;
var last_known_scroll_position = 0;
var ticking = false;
initialize();

function initialize() {
  window.addEventListener('resize', function(){updatePage();resizeCanvas();}, false);
  window.addEventListener('scroll', updatePage);
  resizeCanvas();
  updatePage();
}

function drawCube(x,y,w,h,l,vpx,vpy,color) {
  let dy = vpy - y;
  let dx = vpx - x;
  let bw = w*l;
  let bh = h*l;
  let fy = dy - l*dy;
  let fx = dx - l*dx;

  if (y < vpy-h) {
    //cube bottom
    let grd = ctx.createLinearGradient(x+w/2, y+bh, x+w/2, y+bh+fy);
    grd.addColorStop(0, color);
    grd.addColorStop(1, bodyColor);
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.moveTo(x+w,y+h);
    ctx.lineTo(x,y+h);
    ctx.lineTo(x+fx,y+bh+fy);
    ctx.lineTo(x+fx+bw,y+bh+fy);
    ctx.fill();
  }
  else if (y > vpy) {
    //cube top
    let grd = ctx.createLinearGradient(x+w/2, y, x+w/2, y+fy);
    grd.addColorStop(0, color);
    grd.addColorStop(1, bodyColor);
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.moveTo(x+w,y);
    ctx.lineTo(x,y);
    ctx.lineTo(x+fx,y+fy);
    ctx.lineTo(x+fx+bw,y+fy);
    ctx.closePath();
    ctx.fill();
  }

  if (x < vpx-w) {
    //cube right
    let grd = ctx.createLinearGradient(x+w, y+h/2, x+fx+bw, y+h/2);
    grd.addColorStop(0, color);
    grd.addColorStop(1, bodyColor);
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.moveTo(x+w,y+h);
    ctx.lineTo(x+w,y);
    ctx.lineTo(x+fx+bw,y+fy);
    ctx.lineTo(x+fx+bw,y+fy+bh);
    ctx.closePath();
    ctx.fill();
  }
  else if (x > vpx) {
    //cube left
    let grd = ctx.createLinearGradient(x, y+h/2, x+fx, y+h/2);
    grd.addColorStop(0, color);
    grd.addColorStop(1, bodyColor);
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.moveTo(x,y+h);
    ctx.lineTo(x,y);
    ctx.lineTo(x+fx,y+fy);
    ctx.lineTo(x+fx,y+fy+bh);
    ctx.closePath();
    ctx.fill();
  }
  ctx.fillStyle = color;
  ctx.fillRect(x,y,w,h);
}

function draw(scroll_pos) {
  let width = window.innerWidth;
  let height = window.innerHeight;
  ctx.clearRect(0,0,width,height);

  for (let i = 0; i < boxes.length; i++) {
    var rect = boxes[i].getBoundingClientRect();
    drawCube(rect.left,rect.top,boxes[i].offsetWidth,boxes[i].offsetHeight,0.8,width/2,height/2,window.getComputedStyle(boxes[i]).backgroundColor);
  }
}

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}

function updatePage() {
  last_known_scroll_position = window.scrollY;
  if (!ticking) {
    window.requestAnimationFrame(function() {
      draw(last_known_scroll_position);
      ticking = false;
    });
    ticking = true;
  }
}
