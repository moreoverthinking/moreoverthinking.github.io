var canvas = document.getElementById("backcanvas");
var ctx =canvas.getContext("2d");
var boxes = document.getElementsByClassName("box");
var bodyColor = window.getComputedStyle(document.body).backgroundColor;
var last_known_scroll_position = 0;
var ticking = false;

function initialize() {
  window.addEventListener('resize', resizeCanvas, false);
  resizeCanvas();
    
    window.addEventListener('scroll', draw);
    for(let i = 0; i < boxes.length; i++) {
        boxes[i].addEventListener('mouseenter', draw);
        boxes[i].addEventListener('mouseout', draw);
    }
    
    draw();
}

function drawCube(x,y,w,h,l,vpx,vpy,bColor,img) {
  let dy = vpy - y;
  let dx = vpx - x;
  let bw = w*l;
  let bh = h*l;
  let fy = dy - l*dy;
  let fx = dx - l*dx;

  ctx.lineWidth = 1;

  var sideFillA = "#625960ff";
  var sideFillB = "#3c333bff";

  ctx.strokeStyle = bColor;

  if (y < vpy-h) {
    //cube bottom
    //let grd = ctx.createLinearGradient(x+w/2, y+bh, x+w/2, y+bh+fy);
    //grd.addColorStop(0, color);
    //grd.addColorStop(1, bodyColor);
    ctx.fillStyle = sideFillB;
    ctx.beginPath();
    ctx.moveTo(x+w,y+h);
    ctx.lineTo(x,y+h);
    ctx.lineTo(x+fx,y+bh+fy);
    ctx.lineTo(x+fx+bw,y+bh+fy);
    ctx.fill();

    ctx.closePath()
    ctx.stroke();
  }
  else if (y > vpy) {
    //cube top
    //let grd = ctx.createLinearGradient(x+w/2, y, x+w/2, y+fy);
    //grd.addColorStop(0, color);
    //grd.addColorStop(1, bodyColor);
    ctx.fillStyle = sideFillA;
    ctx.beginPath();
    ctx.moveTo(x+w,y);
    ctx.lineTo(x,y);
    ctx.lineTo(x+fx,y+fy);
    ctx.lineTo(x+fx+bw,y+fy);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  if (x < vpx-w) {
    //cube right
    //let grd = ctx.createLinearGradient(x+w, y+h/2, x+fx+bw, y+h/2);
    //grd.addColorStop(0, color);
    //grd.addColorStop(1, bodyColor);
    ctx.fillStyle = sideFillA;
    ctx.beginPath();
    ctx.moveTo(x+w,y+h);
    ctx.lineTo(x+w,y);
    ctx.lineTo(x+fx+bw,y+fy);
    ctx.lineTo(x+fx+bw,y+fy+bh);
    ctx.closePath();
    ctx.fill();

    ctx.stroke();
  }
  else if (x > vpx) {
    //cube left
    //let grd = ctx.createLinearGradient(x, y+h/2, x+fx, y+h/2);
    //grd.addColorStop(0, color);
    //grd.addColorStop(1, bodyColor);
    ctx.fillStyle = sideFillB;
    ctx.beginPath();
    ctx.moveTo(x,y+h);
    ctx.lineTo(x,y);
    ctx.lineTo(x+fx,y+fy);
    ctx.lineTo(x+fx,y+fy+bh);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
  ctx.fillStyle = "#554a53ff";
  ctx.fillRect(x,y,w,h);

  ctx.lineWidth = 2;
  ctx.strokeRect(x,y,w,h);
  ctx.drawImage(img, x + 20, y + 20, 198, 198);

  ctx.lineWidth = 4;
  ctx.strokeStyle = "#3c333bff";
  ctx.strokeRect(x + 20, y + 20, 198, 198);
}

function draw() {
  var scroll_pos = window.scrollY;

  let width = window.innerWidth;
  let height = window.innerHeight;
  ctx.clearRect(0,0,width,height);

  for (let i = 0; i < boxes.length; i++) {
    var rect = boxes[i].getBoundingClientRect();
    var boxStyle = getComputedStyle(boxes[i])
    drawCube(rect.left,rect.top,boxes[i].offsetWidth,boxes[i].offsetHeight,0.9,width/2,height/2,boxStyle.borderColor,boxes[i].getElementsByTagName("img")[0]);
  }
}

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  draw();
}