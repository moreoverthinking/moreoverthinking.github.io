var canvas = document.getElementById("c");
var hud = document.getElementById("hud");
var gl = canvas.getContext("webgl");
var ctx = hud.getContext("2d");

function loadShader(gl, type, sourceCode) {
    var shader = gl.createShader( type );
    gl.shaderSource( shader, sourceCode );
    gl.compileShader( shader );

    if ( !gl.getShaderParameter(shader, gl.COMPILE_STATUS) ) {
    var info = gl.getShaderInfoLog( shader );
        throw "Could not compile WebGL program. \n\n" + info;
    }
    return shader;
}

function isPowerOf2(value) {
    return (value & (value - 1)) == 0;
}

function loadTexture(url) {
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);

    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA,
                1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE,
                new Uint8Array([0, 0, 255, 255]));

    const image = new Image();
    image.onload = function() {
    gl.bindTexture(gl.TEXTURE_2D, texture);

    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);

    if (isPowerOf2(image.width) && isPowerOf2(image.height)) {
       gl.generateMipmap(gl.TEXTURE_2D);
    } else {
       gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
       gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

       gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
       gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    }
  }
  image.crossOrigin = "Anonymous";
  image.src = url;

  return texture;
}


function main() {
    window.game = new Engine(4, 2, 16);
}

function updateCamera(evt) {
    game.player.aY -= evt.movementX / 100;
    game.player.aX = Math.max(Math.min(game.player.aX - evt.movementY / 100, Math.PI/2), -Math.PI/2);
}

function keyDownResponse(evt) {
    if(evt.keyCode == 32  && evt.target == document.body) {
      evt.preventDefault();
    }

    game.keyMap[evt.keyCode] = true;

    if (evt.keyCode == 49) {
        game.buildingType = 1;
        game.updateHUD();
    }
    else if (evt.keyCode == 50) {
        game.buildingType = 2;
        game.updateHUD();
    }
    else if (evt.keyCode == 51) {
        game.buildingType = 3;
        game.updateHUD();
    }
    else if (evt.keyCode == 16) {
        game.buildingMode = !game.buildingMode;
        game.updateHUD();
    }
 }

function keyUpResponse(evt) {
    game.keyMap[evt.keyCode] = false;
}

function lockChangeAlert() {
    if (document.pointerLockElement === hud) {
        document.addEventListener("mousemove", updateCamera, false);
        window.addEventListener("keydown", keyDownResponse);
        window.addEventListener("keyup", keyUpResponse);
    } else {
        document.removeEventListener("mousemove", updateCamera, false);
        window.removeEventListener("keydown", keyDownResponse);
        window.removeEventListener("keyup", keyUpResponse);
    }
}

function mousePressed() {
  if (document.pointerLockElement === hud) {
      //do stuff when scren clicked
    if (game.buildingMode) {
        game.build();
    }
    else {
      game.destroy();
    }
  }
  else {
      hud.requestPointerLock();
      game.updateHUD();
  }
}

function saveGame() {
  for (chunk in game.world) {
    sessionStorage.setItem(chunk, game.world[chunk]);
  }
  ctx.fillStyle = "#F3F3F3";
  ctx.font = "24px Arial";
  ctx.textAlign = "center";
  ctx.fillText("World Saved", 250, 460);
}

class Block {
    constructor(x, y, z) {
        this.x = x;
        this.y = y;
        this.z = z;

        this.type = 0;
    }
}

class Chunk {
    constructor(x, y, z, size) {
        this.x = x;
        this.y = y;
        this.z = z;

        this.vertexPos = [];

        this.blocks = new Object();

        for (let x = 0; x < size; x++) {
            for (let z = 0; z < size; z++) {
                for (let y = 0; y < size; y++) {
                    this.blocks[x + "_" + y + "_" + z] = new Block(x, y, z);
                }
            }
        }
    }

    toString() {
        let string = "";

        let keys = Object.keys(this.blocks);
        for (let key of keys) {
            string += this.blocks[key].type;
        }
        return string;
    }

    parseString(str) {
        if (str === null) {
            //console.log("map data does not exist for given point");
            return false;
        }

        let keys = Object.keys(this.blocks);
        for (let i = 0; i < keys.length; i++) {
            this.blocks[keys[i]].type = Number(str[i]);
        }
    }
}

class Entity {
    constructor(x, y, z) {
        this.x = x;
        this.y = y;
        this.z = z;

        this.vx = 0;
        this.vy = 0;
        this.vz = 0;

        this.aX = 0;
        this.aY = 0;
        this.aZ = 0;

        this.height = 0.7;
    }

    updatePosition(dt) {
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        this.z += this.vz * dt;
    }

    updateGravity(dt) {
        this.vy -= dt * 10;
    }

    setVelocity(x, y, z) {
      this.vx = x;
      this.vy = y;
      this.vz = z;
    }
}


class Point3D {
    constructor(x, y, z) {
        this.x = x;
        this.y = y;
        this.z = z
    }

    setPos(x, y, z) {
        this.x = x;
        this.y = y;
        this.z = z
    }
}

class BlockTexture {
  constructor(sizex, sizey, fx, fy, bx, by, lx, ly, rx, ry, tx, ty, ux, uy) {
      this.f1 = [fx, fy];
      this.f2 = [fx + sizex, fy];
      this.f3 = [fx + sizex, fy + sizey];
      this.f4 = [fx, fy + sizey];

      this.b1 = [bx, by];
      this.b2 = [bx + sizex, by];
      this.b3 = [bx + sizex, by + sizey];
      this.b4 = [bx, by + sizey];

      this.l1 = [lx, ly];
      this.l2 = [lx + sizex, ly];
      this.l3 = [lx + sizex, ly + sizey];
      this.l4 = [lx, ly + sizey];

      this.r1 = [rx, ry];
      this.r2 = [rx + sizex, ry];
      this.r3 = [rx + sizex, ry + sizey];
      this.r4 = [rx, ry + sizey];

      this.t1 = [tx, ty];
      this.t2 = [tx + sizex, ty];
      this.t3 = [tx + sizex, ty + sizey];
      this.t4 = [tx, ty + sizey];

      this.u1 = [ux, uy];
      this.u2 = [ux + sizex, uy];
      this.u3 = [ux + sizex, uy + sizey];
      this.u4 = [ux, uy + sizey];
  }
}

class BlockUV {
  constructor(textureSize, textureCount) {
      this.list = [];
      let width = textureSize*4 + 2*4;
      let height = textureSize*textureCount + 2*textureCount;
      for (let i = 0; i < textureCount; i++) {
        let y = (i*textureSize + (i*2+1)) / height;
        this.list.push(new BlockTexture(textureSize/width, textureSize/height, 1/width,y, 1/width,y, (textureSize + 3)/width,y, (textureSize + 3)/width,y, (2*textureSize + 5)/width,y, (3*textureSize + 7)/width,y));
      }
  }
}

class Vector2 {
	constructor(x, y){
		this.x = x;
		this.y = y;
	}
	dot(other){
		return this.x*other.x + this.y*other.y;
	}
}

function Shuffle(tab){
	for(let e = tab.length-1; e > 0; e--){
		let index = Math.round(Math.random()*(e-1)),
			temp  = tab[e];

		tab[e] = tab[index];
		tab[index] = temp;
	}
}

function MakePermutation(){
	let P = [];
	for(let i = 0; i < 256; i++){
		P.push(i);
	}
	Shuffle(P);
	for(let i = 0; i < 256; i++){
		P.push(P[i]);
	}

	return P;
}
let P = MakePermutation();

function GetConstantVector(v){
	//v is the value from the permutation table
	let h = v & 3;
	if(h == 0)
		return new Vector2(1.0, 1.0);
	else if(h == 1)
		return new Vector2(-1.0, 1.0);
	else if(h == 2)
		return new Vector2(-1.0, -1.0);
	else
		return new Vector2(1.0, -1.0);
}

function Fade(t){
	return ((6*t - 15)*t + 10)*t*t*t;
}

function Lerp(t, a1, a2){
	return a1 + t*(a2-a1);
}

function Noise2D(x, y){
	let X = Math.floor(x) & 255;
	let Y = Math.floor(y) & 255;

	let xf = x-Math.floor(x);
	let yf = y-Math.floor(y);

	let topRight = new Vector2(xf-1.0, yf-1.0);
	let topLeft = new Vector2(xf, yf-1.0);
	let bottomRight = new Vector2(xf-1.0, yf);
	let bottomLeft = new Vector2(xf, yf);

	//Select a value in the array for each of the 4 corners
	let valueTopRight = P[P[X+1]+Y+1];
	let valueTopLeft = P[P[X]+Y+1];
	let valueBottomRight = P[P[X+1]+Y];
	let valueBottomLeft = P[P[X]+Y];

	let dotTopRight = topRight.dot(GetConstantVector(valueTopRight));
	let dotTopLeft = topLeft.dot(GetConstantVector(valueTopLeft));
	let dotBottomRight = bottomRight.dot(GetConstantVector(valueBottomRight));
	let dotBottomLeft = bottomLeft.dot(GetConstantVector(valueBottomLeft));

	let u = Fade(xf);
	let v = Fade(yf);

	return Lerp(u,
		Lerp(v, dotBottomLeft, dotTopLeft),
		Lerp(v, dotBottomRight, dotTopRight)
	);

}

class Engine {
    constructor(worldWidth, worldHeight, chunkSize) {
        this.worldWidth = worldWidth;
        this.worldHeight = worldHeight;
        this.chunkSize = chunkSize;
        this.blockSize = 0.5;
        this.renderDist = 2;

        let pos = this.worldWidth * this.chunkSize * this.blockSize / 2;
        this.player = new Entity(pos, 8, pos);

        this.world = new Object();

        this.keyMap = {};
        this.buildingMode = true;
        this.buildingType = 2;

        //temporary variable to count frames during loading
        this.frameCount = 0;

        this.vertexCount = 0;

        this.blockTextureUv = new BlockUV(128, 4);

        let _this = this;

        this.request = window.indexedDB.open("worldData",1);

        let neededUpgrade = false;
        this.request.onupgradeneeded = function(e) {
          let db = e.target.result;
          db.createObjectStore("chunkSaves",{keyPath:"cID"});
          neededUpgrade = true;
        };

        this.request.onerror = function(e) {
          console.log("Error: " + e.target.errorCode);
        };

        this.request.onsuccess = function(e) {
          //let db = game.request.result;
          //let tx = db.transaction("chunkSaves","readwrite");
          //let store = tx.objectStore("chunkSaves");
          /*tx.onComplete = function() {
            db.close();
          };*/

          if (neededUpgrade) {
              game.loadInterval = setInterval(function(){_this.loadMap();}, 0);
          }
          /*
          else if (sessionStorage.getItem((this.worldWidth-1) + "_" + (this.worldHeight-1) + "_" + (this.worldWidth-1)) === null) {
            console.log("loading was not allowed to complete")
            ctx.fillStyle = "#F3F3F3";
            ctx.font = "24px Arial";
            ctx.textAlign = "center";
            ctx.fillText("Map was not allowed", 250, 450);
            ctx.fillText("to finish loading", 250, 480);
          }
          */
          else {
            console.log("map already loaded")
            game.afterLoadInitialization();
          }
      };
    }

    generateWorld() {
        if (this.frameCount < this.worldWidth * this.worldWidth * this.worldHeight) {
            let x = Math.floor(this.frameCount / (this.worldWidth * this.worldHeight) % this.worldWidth);
            let y = Math.floor(this.frameCount / this.worldWidth % this.worldHeight);
            let z = Math.floor(this.frameCount % this.worldWidth);

            //try {
                //places blocks in map
                let c = new Chunk(x, y, z, this.chunkSize);
                if (y == 0) {
                for (let ix = 0; ix < this.chunkSize; ix++) {
                    for (let iz = 0; iz < this.chunkSize; iz++) {

                      let n = Noise2D((x*this.chunkSize + ix)*0.03,(z*this.chunkSize + iz)*0.03);
                      n += 1.0;
                      n /= 2.0;

                      let iy = Math.floor(this.chunkSize*n);
                      c.blocks[ix + "_" + iy + "_" + iz].type = 1;
                      for (let fy = 0; fy < iy; fy++) {
                        c.blocks[ix + "_" + fy + "_" + iz].type = 2;
                      }
                    }
                }
                }

                //loads map into local storage
                //sessionStorage.setItem(x + "_" + y + "_" + z, c);
                let db = this.request.result;
                let tx = db.transaction("chunkSaves","readwrite");
                let store = tx.objectStore("chunkSaves");
                store.put({cID:x + "_" + y + "_" + z,cData:c.toString()});
            //}
            /*catch {
                console.log("storage maxed out");
                clearInterval(this.loadInterval);
            }*/
        } else {
            console.log("loading done");
            clearInterval(this.loadInterval);
            this.afterLoadInitialization();
        }
    }

    loadMap() {
        if (this.frameCount % 10 == 0) {
            ctx.clearRect(0,0,hud.width,hud.height)
            ctx.fillStyle = "#F3F3F3";
            ctx.font = "30px Arial";
            ctx.textAlign = "center";
            ctx.fillText("Loading " + Math.floor(this.frameCount / (this.worldWidth * this.worldWidth * this.worldHeight) * 100) + "%", 250, 50);
        }
        this.generateWorld();
        this.frameCount++;
    }

    loadChunk(worldX, worldY, worldZ) {
      if (worldX < this.worldWidth && worldZ < this.worldWidth && worldX >= 0 && worldZ >= 0) {
        let db = this.request.result;
        let tx = db.transaction("chunkSaves","readwrite");
        let store = tx.objectStore("chunkSaves");

        let data = store.get(worldX + "_" + worldY + "_" + worldZ);
        data.onerror = function(e) {
          console.log("Error " + e.target.errorCode);
        }
        data.onsuccess = function(e) {
          let str = data.result.cData;

          let part = new Chunk(worldX, worldY, worldZ, game.chunkSize);
          part.parseString(str);
          game.world[worldX + "_" + worldY + "_" + worldZ] = part;

          game.genChunkVertexPos(worldX, worldY, worldZ);
        };
      }
    }

    unloadChunk(worldX, worldY, worldZ) {
        let pos = worldX + "_" + worldY + "_" + worldZ;
        if (this.world.hasOwnProperty(pos)) {
            //sessionStorage.setItem(pos, this.world[pos]);
            let db = this.request.result;
            let tx = db.transaction("chunkSaves","readwrite");
            let store = tx.objectStore("chunkSaves");

            store.put({cID:pos,cData:this.world[pos].toString()});

            delete this.world[pos];
        }
    }

    updateChunkLoading() {
      let size = this.chunkSize*this.blockSize;
      for (let a = 0; a < Math.PI / 2; a += Math.PI / 6) {
        for (let d = 0; d < size * this.renderDist; d += size / 2) {
          let px = this.player.x + Math.cos(this.player.aY + a + 1.178) * d;
          let pz = this.player.z + Math.sin(this.player.aY + a + 1.178) * d;
          let cx = Math.floor(px / size);
          let cz = Math.floor(pz / size);
          if (!this.world.hasOwnProperty(cx + "_0_" + cz)) {
            for (let i = 0; i < this.worldHeight; i++) {
              this.world[cx + "_" + i + "_" + cz] = null;
              this.loadChunk(cx, i, cz);
            }
            this.updateWorldVertexPos();
            return;
          }
        }
      }

    }

    updatechunkUnloading() {
      let size = this.chunkSize*this.blockSize;
      let cx = Math.floor(this.player.x / size);
      let cz = Math.floor(this.player.z / size);

      let cs = Object.keys(this.world);
      for (let c of cs) {
        if (!this.world[c]) {
          continue;
        }
        if (Math.abs(this.world[c].x - cx) > this.renderDis + 1 || Math.abs(this.world[c].z - cz) > this.renderDist + 1) {
          this.unloadChunk(this.world[c].x, this.world[c].y, this.world[c].z);
          return;
        }
      }
    }

    afterLoadInitialization() {
        delete this.frameCount;

        gl.clearColor(0.0, 0.0, 0.0, 1.0);
        gl.clearDepth(1.0);
        gl.enable(gl.DEPTH_TEST);
        gl.depthFunc(gl.LEQUAL);

        gl.enable(gl.CULL_FACE);
        gl.cullFace(gl.BACK);

        //creates shader program
        {
            let vsSource = "precision mediump float; attribute vec4 aVertexPosition; attribute vec2 aTextureCoord; uniform vec3 uCameraPosition; uniform vec3 uCameraAngle; varying vec2 vTextureCoord; void main() {float x = aVertexPosition.x - uCameraPosition.x; float y = aVertexPosition.y - uCameraPosition.y; float z = aVertexPosition.z - uCameraPosition.z; float cosx = cos(uCameraAngle.x); float cosy = cos(uCameraAngle.y); float cosz = cos(uCameraAngle.z); float sinx = sin(uCameraAngle.x); float siny = sin(uCameraAngle.y); float sinz = sin(uCameraAngle.z); float xx = cosy * cosz; float xy = -cosy * sinz; float xz = siny; float yx = cosx * sinz + sinx * siny * cosz; float yy = cosx * cosz - sinx * siny * sinz; float yz = -sinx * cosy; float zx = sinx * sinz - cosx * siny * cosz; float zy = sinx * cosz + cosx * siny * sinz; float zz = cosx * cosy; float nx = x * xx + y * xy + z * xz; float ny = x * yx + y * yy + z * yz; float nz = x * zx + y * zy + z * zz; gl_Position = vec4(nx * 12.0, ny * 12.0, nz, 1.0 + nz * 10.0); vTextureCoord = aTextureCoord;}";
            let fsSource = "precision mediump float; varying vec2 vTextureCoord; varying float vDepth; uniform sampler2D uSampler; void main() {gl_FragColor = texture2D(uSampler, vTextureCoord);}";
            let vertexShader = loadShader(gl, gl.VERTEX_SHADER, vsSource);
            let fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fsSource);
            this.shaderProgram = gl.createProgram();
            gl.attachShader(this.shaderProgram, vertexShader);
            gl.attachShader(this.shaderProgram, fragmentShader);
            gl.linkProgram(this.shaderProgram);
            if (!gl.getProgramParameter(this.shaderProgram, gl.LINK_STATUS)) {
                alert('Unable to initialize the shader program: ' + gl.getProgramInfoLog(this.shaderProgram));
                return null;
            }
        }

        this.vertexPosition = gl.getAttribLocation(this.shaderProgram, 'aVertexPosition');

        this.cameraPosUniform =  gl.getUniformLocation(this.shaderProgram, 'uCameraPosition');
        this.cameraAngleUniform = gl.getUniformLocation(this.shaderProgram, 'uCameraAngle');

        //texture
        this.texture = loadTexture("textures.png");
        this.textureCoord = gl.getAttribLocation(this.shaderProgram, 'aTextureCoord');
        this.samplerUniform = gl.getUniformLocation(this.shaderProgram, 'uSampler');

        this.positionBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, 4 * 5 * 36 * 100000, gl.DYNAMIC_DRAW);

        //Loaded a small patch of chunks around the player at the start of the game
        /*
        let pos = Math.floor(this.worldWidth / 2);
        for (let x = 0; x < 2; x++) {
          for (let z = 0; z < 2; z++) {
            this.loadChunk(pos + x - 1, 0, pos + z - 1);
          }
        }
        */

        this.updateChunkLoading();

        this.updateWorldVertexPos();

        document.addEventListener('pointerlockchange', lockChangeAlert, false);
        hud.addEventListener("mousedown", mousePressed);

        this.updateHUD();

        window.onfocus = function () {
          game.player.setVelocity(0,0,0);
        };

        this.lastUpdate = Date.now();
        this.dt = 0;
        let _this = this;
        this.mainInterval = setInterval(function(){_this.update();}, 0);

    }

    /*
    getTypeof(cx, cy, cz, bx, by, bz) {
      let hc = (this.chunkSize - 1) / 2;
      let dx = Math.trunc((bx - hc) / (hc + 1)) + 0;
      let dy = Math.trunc((by - hc) / (hc + 1)) + 0;
      let dz = Math.trunc((bz - hc) / (hc + 1)) + 0;

      if (typeof this.world[(cx + dx) + "_" + (cy + dy) + "_" + (cz + dz)] !== 'undefined') {
        let ox = dx * (this.chunkSize);
        let oy = dy * (this.chunkSize);
        let oz = dz * (this.chunkSize);
        return this.world[(cx + dx) + "_" + (cy + dy) + "_" + (cz + dz)].blocks[(bx - ox) + "_" + (by - oy) + "_" + (bz - oz)].type;
      }
      return 1;
    }
    */


    genChunkVertexPos(cx, cy, cz) {
          this.world[cx + "_" + cy + "_" + cz].vertexPos.length = 0;

            let bs = Object.keys(this.world[cx + "_" + cy + "_" + cz].blocks);
            for (let b of bs) {
                let bb = this.world[cx + "_" + cy + "_" + cz].blocks[b];
                if (bb.type == 0) {continue;}
                let wx = cx*this.chunkSize*this.blockSize + bb.x*this.blockSize;
                let wy = cy*this.chunkSize*this.blockSize + bb.y*this.blockSize;
                let wz = cz*this.chunkSize*this.blockSize + bb.z*this.blockSize;
                let tex = this.blockTextureUv.list[bb.type - 1];
                {
                  let bbf = this.world[cx + "_" + cy + "_" + cz].blocks[bb.x + "_" + bb.y + "_" + (bb.z - 1)];
                  if (!(typeof bbf !== 'undefined' && bbf.type > 0)) {
                  this.world[cx + "_" + cy + "_" + cz].vertexPos.push(wx, wy, wz, tex.f4[0], tex.f4[1],
                                   wx + this.blockSize, wy, wz, tex.f3[0], tex.f3[1],
                                   wx, wy + this.blockSize, wz, tex.f1[0], tex.f1[1],
                                   wx + this.blockSize, wy, wz, tex.f3[0], tex.f3[1],
                                   wx + this.blockSize, wy + this.blockSize, wz, tex.f2[0], tex.f2[1],
                                   wx, wy + this.blockSize, wz, tex.f1[0], tex.f1[1]
                                 );
                  }
                }
                {
                  let bbb = this.world[cx + "_" + cy + "_" + cz].blocks[bb.x + "_" + bb.y + "_" + (bb.z + 1)];
                  if (!(typeof bbb !== 'undefined' && bbb.type > 0)) {
                    this.world[cx + "_" + cy + "_" + cz].vertexPos.push(wx, wy, wz + this.blockSize, tex.b3[0], tex.b3[1],
                                   wx, wy + this.blockSize, wz + this.blockSize, tex.b2[0], tex.b2[1],
                                   wx + this.blockSize, wy, wz + this.blockSize, tex.b4[0], tex.b4[1],
                                   wx + this.blockSize, wy, wz + this.blockSize, tex.b4[0], tex.b4[1],
                                   wx, wy + this.blockSize, wz + this.blockSize, tex.b2[0], tex.b2[1],
                                   wx + this.blockSize, wy + this.blockSize, wz + this.blockSize, tex.b1[0], tex.b1[1]
                                 );
                  }
                }
                {
                  let bbl = this.world[cx + "_" + cy + "_" + cz].blocks[(bb.x - 1) + "_" + bb.y + "_" + bb.z];
                  if (!(typeof bbl !== 'undefined' && bbl.type > 0)) {
                   this.world[cx + "_" + cy + "_" + cz].vertexPos.push(wx, wy, wz, tex.l3[0], tex.l3[1],
                                   wx, wy  + this.blockSize, wz, tex.l2[0], tex.l2[1],
                                   wx, wy, wz + this.blockSize, tex.l4[0], tex.l4[1],
                                   wx, wy + this.blockSize, wz,  tex.l2[0], tex.l2[1],
                                   wx, wy + this.blockSize, wz + this.blockSize, tex.l1[0], tex.l1[1],
                                   wx, wy, wz + this.blockSize, tex.l4[0], tex.l4[1]
                                 );
                  }
                }
                {
                  let bbr = this.world[cx + "_" + cy + "_" + cz].blocks[(bb.x + 1) + "_" + bb.y + "_" + bb.z];
                  if (!(typeof bbr !== 'undefined' && bbr.type > 0)) {
                    this.world[cx + "_" + cy + "_" + cz].vertexPos.push(wx + this.blockSize, wy, wz,  tex.r4[0], tex.r4[1],
                                   wx + this.blockSize, wy, wz + this.blockSize, tex.r3[0], tex.r3[1],
                                   wx + this.blockSize, wy + this.blockSize, wz, tex.r1[0], tex.r1[1],
                                   wx + this.blockSize, wy + this.blockSize, wz, tex.r1[0], tex.r1[1],
                                   wx + this.blockSize, wy, wz + this.blockSize, tex.r3[0], tex.r3[1],
                                   wx + this.blockSize, wy + this.blockSize, wz + this.blockSize, tex.r2[0], tex.r2[1]
                                 );
                  }
                }
                {
                  let bbt = this.world[cx + "_" + cy + "_" + cz].blocks[bb.x + "_" + (bb.y + 1) + "_" + bb.z];
                  if (!(typeof bbt !== 'undefined' && bbt.type > 0)) {
                    this.world[cx + "_" + cy + "_" + cz].vertexPos.push(wx, wy + this.blockSize, wz, tex.t4[0], tex.t4[1],
                                   wx + this.blockSize, wy + this.blockSize, wz, tex.t3[0], tex.t3[1],
                                   wx, wy + this.blockSize, wz + this.blockSize, tex.t1[0], tex.t1[1],
                                   wx + this.blockSize, wy + this.blockSize, wz, tex.t3[0], tex.t3[1],
                                   wx + this.blockSize, wy + this.blockSize, wz + this.blockSize, tex.t2[0], tex.t2[1],
                                   wx, wy + this.blockSize, wz + this.blockSize, tex.t1[0], tex.t1[1]
                                 );
                    }
                  }
                  {
                    let bbu = this.world[cx + "_" + cy + "_" + cz].blocks[bb.x + "_" + (bb.y - 1) + "_" + bb.z];
                    if (!(typeof bbu !== 'undefined' && bbu.type > 0)) {
                    this.world[cx + "_" + cy + "_" + cz].vertexPos.push(wx, wy, wz, tex.u1[0], tex.u1[1],
                                   wx, wy, wz + this.blockSize, tex.u4[0], tex.u4[1],
                                   wx + this.blockSize, wy, wz, tex.u2[0], tex.u2[1],
                                   wx + this.blockSize, wy, wz, tex.u2[0], tex.u2[1],
                                   wx, wy, wz + this.blockSize, tex.u4[0], tex.u4[1],
                                   wx + this.blockSize, wy, wz + this.blockSize, tex.u3[0], tex.u3[1]
                                  );
                                }
                  }

        }
    }

    updateWorldVertexPos() {
      gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
      let i = 0;
      let cs = Object.keys(this.world);
      for (let c of cs) {
        if (!this.world[c]) {
          continue;
        }
        gl.bufferSubData(gl.ARRAY_BUFFER, i * 4, new Float32Array(this.world[c].vertexPos));
        i += this.world[c].vertexPos.length;
      }

      this.vertexCount = i / 5;
    }


    renderWorld() {
        //let positions = this.generateVertexPositions();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
        //gl.bufferSubData(gl.ARRAY_BUFFER, 0, new Float32Array(positions));

        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        gl.vertexAttribPointer(this.vertexPosition, 3, gl.FLOAT, false, 20, 0);
        gl.enableVertexAttribArray(this.vertexPosition);

        gl.vertexAttribPointer(this.textureCoord, 2, gl.FLOAT, false, 20, 12);
        gl.enableVertexAttribArray(this.textureCoord);

        gl.useProgram(this.shaderProgram);

        gl.uniform3fv(this.cameraPosUniform, [this.player.x, this.player.y, this.player.z]);
        gl.uniform3fv(this.cameraAngleUniform, [this.player.aX, this.player.aY, this.player.aZ]);

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.texture);
        gl.uniform1i(this.samplerUniform, 0);

        gl.drawArrays(gl.TRIANGLES, 0, this.vertexCount);
    }

    updateHUD() {
      ctx.clearRect(0,0,hud.width,hud.height)
      ctx.fillStyle = "#F3F3F3";
      ctx.font = "24px Arial";
      ctx.textAlign = "center";
      ctx.fillText("Building Mode: " + (this.buildingMode ? this.buildingType : this.buildingMode), 250, 50);

      ctx.fillRect(240, 248, 20, 4);
      ctx.fillRect(248, 240, 4, 20);
    }

    keyEvents() {
        if (this.keyMap[87]) {
            this.player.vx = Math.cos(this.player.aY + Math.PI / 2) * 2;
            this.player.vz = Math.sin(this.player.aY + Math.PI / 2) * 2;
        }
        else if (this.keyMap[83]) {
            this.player.vx = -Math.cos(this.player.aY + Math.PI / 2) * 2;
            this.player.vz = -Math.sin(this.player.aY + Math.PI / 2) * 2;
        }
        else {
            this.player.vx = 0;
            this.player.vz = 0;
        }

        if (this.keyMap[32] && this.playerOnGround()) {
            this.player.vy = 4;
        }
    }

    destroy() {
        let vecX = -Math.sin(this.player.aY) * Math.cos(this.player.aX);
        let vecY = Math.sin(this.player.aX);
        let vecZ = Math.cos(this.player.aX) * Math.cos(this.player.aY);

        for (let i = 0; i < 5; i += 0.1) {
            let px = this.player.x + vecX * i;
            let py = this.player.y + vecY * i;
            let pz = this.player.z + vecZ * i;

            let cx = Math.floor(px / (this.chunkSize*this.blockSize));
            let cy = Math.floor(py / (this.chunkSize*this.blockSize));
            let cz = Math.floor(pz / (this.chunkSize*this.blockSize));
            let bx = Math.floor((px - cx*this.chunkSize*this.blockSize) / this.blockSize);
            let by = Math.floor((py - cy*this.chunkSize*this.blockSize) / this.blockSize);
            let bz = Math.floor((pz - cz*this.chunkSize*this.blockSize) / this.blockSize);
            if(this.world[cx + "_" + cy + "_" + cz].blocks[bx + "_" + by + "_" + bz].type != 0) {
                this.world[cx + "_" + cy + "_" + cz].blocks[bx + "_" + by + "_" + bz].type = 0;
                this.genChunkVertexPos(cx, cy, cz);
                this.updateWorldVertexPos();
                return;
            }
        }
    }

    build() {
        let vecX = -Math.sin(this.player.aY) * Math.cos(this.player.aX);
        let vecY = Math.sin(this.player.aX);
        let vecZ = Math.cos(this.player.aX) * Math.cos(this.player.aY);

        for (let i = 0; i < 5; i += 0.1) {
            let px = this.player.x + vecX * i;
            let py = this.player.y + vecY * i;
            let pz = this.player.z + vecZ * i;

            let cx = Math.floor(px / (this.chunkSize*this.blockSize));
            let cy = Math.floor(py / (this.chunkSize*this.blockSize));
            let cz = Math.floor(pz / (this.chunkSize*this.blockSize));
            let bx = Math.floor((px - cx*this.chunkSize*this.blockSize) / this.blockSize);
            let by = Math.floor((py - cy*this.chunkSize*this.blockSize) / this.blockSize);
            let bz = Math.floor((pz - cz*this.chunkSize*this.blockSize) / this.blockSize);
            if(this.world[cx + "_" + cy + "_" + cz].blocks[bx + "_" + by + "_" + bz].type != 0) {
                let px2 = this.player.x + vecX * (i - 0.1);
                let py2 = this.player.y + vecY * (i - 0.1);
                let pz2 = this.player.z + vecZ * (i - 0.1);

                cx = Math.floor(px2 / (this.chunkSize*this.blockSize));
                cy = Math.floor(py2 / (this.chunkSize*this.blockSize));
                cz = Math.floor(pz2 / (this.chunkSize*this.blockSize));
                bx = Math.floor((px2 - cx*this.chunkSize*this.blockSize) / this.blockSize);
                by = Math.floor((py2 - cy*this.chunkSize*this.blockSize) / this.blockSize);
                bz = Math.floor((pz2 - cz*this.chunkSize*this.blockSize) / this.blockSize);

                this.world[cx + "_" + cy + "_" + cz].blocks[bx + "_" + by + "_" + bz].type = this.buildingType;
                this.genChunkVertexPos(cx, cy, cz);
                this.updateWorldVertexPos();
                return;
            }
        }
    }

    playerCollision() {
      let py = this.player.y - this.player.height - 0.1;
      let px = this.player.x + this.player.vx * 0.05;
      let pz = this.player.z + this.player.vz * 0.05;

      let cx = Math.floor(px / (this.chunkSize*this.blockSize));
      let cy = Math.floor(py / (this.chunkSize*this.blockSize));
      let cz = Math.floor(pz / (this.chunkSize*this.blockSize));
      let bx = Math.floor((px - cx*this.chunkSize*this.blockSize) / this.blockSize);
      let by = Math.floor((py - cy*this.chunkSize*this.blockSize) / this.blockSize);
      let bz = Math.floor((pz - cz*this.chunkSize*this.blockSize) / this.blockSize);
      try {
        let b1 = this.world[cx + "_" + cy + "_" + cz].blocks[bx + "_" + by + "_" + bz];
        if (b1.type != 0) {
          this.player.x -= this.player.vx * this.dt;
          //this.player.y -= this.player.vy * this.dt;
          this.player.z -= this.player.vz * this.dt;
        }
      }
      catch {
        return false;
      }

    }

    playerOnGround() {
        try {
            let py = this.player.y - this.player.height - 0.2;

            let cx = Math.floor(this.player.x / (this.chunkSize*this.blockSize));
            let cy = Math.floor(py / (this.chunkSize*this.blockSize));
            let cz = Math.floor(this.player.z / (this.chunkSize*this.blockSize));
            let bx = Math.floor((this.player.x - cx*this.chunkSize*this.blockSize) / this.blockSize);
            let by = Math.floor((py - cy*this.chunkSize*this.blockSize) / this.blockSize);
            let bz = Math.floor((this.player.z - cz*this.chunkSize*this.blockSize) / this.blockSize);

            let bb = this.world[cx + "_" + cy + "_" + cz].blocks[bx + "_" + by + "_" + bz];
            if (bb.type != 0) {
                return true;
            }
            return false;
        }
        catch {
            return false;
        }

    }

    update() {
        let now = Date.now();
        this.dt = (now - this.lastUpdate) / 1000;
        this.lastUpdate = now;

        this.updateChunkLoading();
        this.updatechunkUnloading();

        this.renderWorld();

        if (!this.playerOnGround()) {
            this.player.updateGravity(this.dt);
        }
        else {
          this.player.vy = 0;
        }

        this.keyEvents();

        this.player.updatePosition(this.dt);

        this.playerCollision();
    }


}
