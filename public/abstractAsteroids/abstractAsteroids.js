var canvas = document.getElementById("c");
var ctx = canvas.getContext("2d");

function dist(x1, y1, x2, y2) {
    let dx = x1 - x2;
    let dy = y1 - y2;
    return Math.sqrt(dx*dx + dy*dy);
}

function lineLine(x1,y1,x2,y2, x3,y3,x4,y4) {
    let uA = ((x4-x3)*(y1-y3) - (y4-y3)*(x1-x3)) / ((y4-y3)*(x2-x1) - (x4-x3)*(y2-y1));
    let uB = ((x2-x1)*(y1-y3) - (y2-y1)*(x1-x3)) / ((y4-y3)*(x2-x1) - (x4-x3)*(y2-y1));

    if (uA >= 0 && uA <= 1 && uB >= 0 && uB <= 1) {
        return true;
    }
    return false;
}

class point {
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }

    normalize() {
        let magnitude = Math.sqrt(this.x * this.x + this.y * this.y);
        if (magnitude == 0) return 0;
        this.x /= magnitude;
        this.y /= magnitude;
    }

    copy() {
        let x = this.x;
        let y = this.y;
        return new point(x,y);
    }

    draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, 4, 0, 2 * Math.PI);
        ctx.fill();
    }
}

class polygon {
    constructor(points, limit, color) {
        this.points = points;
        this.pieces = [];
        this.vector = new point(0,0);
        this.color = color; //random color
        this.area = this.getArea();
        this.limit = limit;

        //bullet counting update
        this.minParts = Math.ceil(this.area / limit);

        if (this.area < this.limit) {
            this.color = "black"
        }
        this.life = 100;
    }

    getFollowingPoint() {
        if (this.pieces.length == 0) {
            return this.points[0];
        }
        else {
            return this.pieces[0].getFollowingPoint();
        }
    }

    changePosRelative(x, y) {
        for (let i = 0; i < this.points.length; i++) {
            this.points[i].x += x;
            this.points[i].y += y;
        }
    }

    isFading() {
        if (this.pieces.length == 0) {
            if (this.life < 100 && this.life > 0) {
                return true;
            }
            return false;
        }
        else {
            for (let i = 0; i < this.pieces.length; i++) {
                return this.pieces[i].isFading();
            }
        }
    }

    fadeOut() {
        if (this.color == "black" && this.pieces.length == 0 && this.life > 0) {
            this.life -= 1;
        }
        else {
            for (let i = 0; i < this.pieces.length; i++) {
                if (this.pieces[i].pieces.length == 0 && this.pieces[i].life == 0) {
                    this.pieces.splice(i,1);
                    if (this.pieces == 0) {
                        this.color = "black";
                        this.life = 0;
                    }
                    continue;
                }
                this.pieces[i].fadeOut();
            }
        }

    }

    getArea() {
        let sum = 0;
        for (let i = 0; i < this.points.length; i++) {
            let n = i == this.points.length - 1? 0 : i+1;
            sum += (this.points[i].x*this.points[n].y) - (this.points[n].x*this.points[i].y);
        }
        return Math.abs(sum / 2);
    }

    collision(poly) {
        if (this.pieces.length == 0) {
            if (this.color != "black" && poly.polyPoly(this) && this.polyPoly(poly)) {
                poly.color = this.color; //sets colliding bodies to the same color
                return true;
            }
            return false;
        }
        for (let i = 0; i < this.pieces.length; i++) {
            if (this.pieces[i].collision(poly)) {
                return true;
            };
        }
    }

    polyPoint(x,y) {
        let collision = false;

        let next = 0;
        for (let current=0; current<this.points.length; current++) {

            next = current+1;
            if (next == this.points.length) next = 0;

            let vc = this.points[current];
            let vn = this.points[next];

            if (((vc.y > y && vn.y < y) || (vc.y < y && vn.y > y)) &&
            (x < (vn.x-vc.x)*(y-vc.y) / (vn.y-vc.y)+vc.x)) {
                collision = !collision;
            }
        }
        return collision;
    }

    polyLine(x1,y1, x2,y2) {
        let next = 0;
        for (let current=0; current<this.points.length; current++) {

            next = current+1;
            if (next == this.points.length) next = 0;

            let x3 = this.points[current].x;
            let y3 = this.points[current].y;
            let x4 = this.points[next].x;
            let y4 = this.points[next].y;

            let hit = lineLine(x1, y1, x2, y2, x3, y3, x4, y4);
            if (hit) {
                return true;
            }
        }
        return false;
    }

    polyPoly(poly) {
        let next = 0;
        for (let current=0; current<this.points.length; current++) {

            next = current+1;
            if (next == this.points.length) next = 0;

            let vc = this.points[current];
            let vn = this.points[next];

            let collision = poly.polyLine(vc.x,vc.y,vn.x,vn.y);
            if (collision) return true;

            collision = this.polyPoint(poly.points[0].x, poly.points[0].y);
            if (collision) return true;
        }

        return false;
    }



    updatePosition(dt) {
        if (this.pieces.length == 0) {
            for (let i = 0; i < this.points.length; i++) {
                this.points[i].x += this.vector.x * dt;
                this.points[i].y += this.vector.y * dt;
            }
        }
        else {
            for (let i = 0; i < this.pieces.length; i++) {
                this.pieces[i].updatePosition(dt);
            }
        }
    }

    draw() {
        if (this.pieces.length == 0) {
            ctx.beginPath();
            ctx.moveTo(this.points[0].x, this.points[0].y);
            for (let i = 0; i < this.points.length; i++) {
                ctx.lineTo(this.points[i].x, this.points[i].y);
            }
            ctx.closePath();
            //ctx.fillStyle = this.color;
            ctx.fillStyle = this.color == "black" ? "rgba(0,0,0," + this.life/100 + ")" : this.color; //adds color
            ctx.fill();
            //ctx.stroke();
        }
        else {
            for (let i = 0; i < this.pieces.length; i++) {
                this.pieces[i].draw();
            }
        }
    }

    lineIntersect(x1,y1,x2,y2, px,py,vec) {
        let a1 = y2 - y1;
        let b1 = x1 - x2;
        let c1 = a1*x1 + b1*y1;

        let px1 = px + vec.x * 1000;
        let py1 = py + vec.y * 1000;

        let a2 = py1 - py;
        let b2 = px - px1;
        let c2 = a2*px+ b2*py;

        let determinant = a1*b2 - a2*b1;

        if (determinant == 0) {
            return false;
        }
        else {
            let x = (b2*c1 - b1*c2)/determinant;
            let y = (a1*c2 - a2*c1)/determinant;

            let d1 = dist(x,y, x1,y1);
            let d2 = dist(x,y, x2,y2);
            let lineLen = dist(x1,y1, x2,y2);

            let _d1 = dist(x,y, px,py);
            let _d2 = dist(x,y, px1,py1);
            let _lineLen = dist(px,py, px1,py1);

            let buffer = 0.1;

            if (d1+d2 >= lineLen-buffer && d1+d2 <= lineLen+buffer &&
                _d1+_d2 >= _lineLen-buffer && _d1+_d2 <= _lineLen+buffer) {
                return new point(x, y);
            }
            else {return false;}
        }
    }

    getIntersections(x, y, vec) {
        let intersections = [];
        for (let i = 0; i < this.points.length; i++) {
            let n = i == this.points.length - 1? 0 : i+1;
            let x1 = this.points[i].x;
            let y1 = this.points[i].y;
            let x2 = this.points[n].x;
            let y2 = this.points[n].y;
            let determinant = this.lineIntersect(x1,y1,x2,y2,x,y,vec);
            if (determinant) {
                intersections.push([determinant,i,n]);
            }
        }
        return intersections;
    }

    cut(x, y, vec) {
        if (this.pieces.length == 0 && this.color != "black") {
            let intersections = this.getIntersections(x, y, vec);
            if (intersections.length > 1) {
                let points1 = this.points.slice();
                let points2 = points1.splice(intersections[0][2], Math.abs((intersections[1][2] == 0 ? this.points.length : intersections[1][2]) - intersections[0][2]), intersections[0][0], intersections[1][0]);
                points2.unshift(intersections[0][0]);
                points2.push(intersections[1][0]);

                for (let i = 0; i < points1.length; i++) {
                    points1[i] = points1[i].copy();
                }
                for (let i = 0; i < points2.length; i++) {
                    points2[i] = points2[i].copy();
                }
                this.pieces.push(new polygon(points1, this.limit, this.color));
                this.pieces.push(new polygon(points2, this.limit, this.color));

                let addedX = vec.y;
                let addedY = -vec.x;
                let sign = 1;
                if (this.pieces[0].polyLine(x + addedX * 2, y + addedY * 2, x + addedX * 2 + vec.x * 1000, y + addedY * 2 + vec.y * 1000)) {
                    sign = -1;
                }
                this.pieces[0].vector.x = -sign * addedX * 80;
                this.pieces[0].vector.y = -sign *  addedY * 80;
                this.pieces[1].vector.x = sign * addedX * 80;
                this.pieces[1].vector.y = sign * addedY * 80;
            }
        }
        else {
            for (let i = 0; i < this.pieces.length; i++) {
                this.pieces[i].cut(x, y, vec);
            }
        }
    }

    onOutside() {
        if (this.pieces.length == 0) {
            for (let i = 0; i < this.points.length; i++) {
                    if (this.points[i].x < 0) {
                        this.vector.x *= -1;
                        this.changePosRelative(1, 0);
                    }
                    else if (this.points[i].y < 0) {
                        this.vector.y *= -1;
                        this.changePosRelative(0, 1);
                    }
                    else if (this.points[i].x > canvas.width) {
                        this.vector.x *= -1;
                        this.changePosRelative(-1, 0);
                    }
                    else if (this.points[i].y > canvas.height) {
                        this.vector.y *= -1;
                        this.changePosRelative(0, -1);
                    }
            }

        }
        else {
            for (let i = 0; i < this.pieces.length; i++) {
                this.pieces[i].onOutside();
            }
        }
    }

    lifeLeft() {
        if (this.pieces.length == 0) {
            return this.life;
        }
        else {
            let value = 0;
            for (let i = 0; i < this.pieces.length; i++) {
                value += this.pieces[i].lifeLeft();
            }
            return value;
        }
    }

}

class laser {
    constructor(x1,y1,x2,y2) {
        this.x1 = x1;
        this.y1 = y1;
        this.x2 = x2;
        this.y2 = y2;
        this.color = "black";
        this.duration = 0;
    }

    shoot(time, x, y, vec) {
        this.x1 = x;
        this.y1 = y;
        this.x2 = x + vec.x * 1000;
        this.y2 = y + vec.y * 1000;
        this.duration = time;
    }

    draw() {
        if (this.duration > 0) {
            this.duration--;
            ctx.strokeStyle = this.color;
            ctx.beginPath();
            ctx.moveTo(this.x1, this.y1);
            ctx.lineTo(this.x2, this.y2);
            ctx.stroke();
        }
    }
}

class character {
    constructor(x, y, size) {
        this.x = x;
        this.y = y;
        this.vector = new point(0,0);
        this.rotationVelocity = 0;
        this.size = size;
        this.angles = [0, 5 * Math.PI / 6, 7 * Math.PI / 6];
        this.body = new polygon([
            new point(0 * size + x,1 * size + y),
            new point(-0.5 * size + x,-Math.sqrt(3) / 2 * size + y),
            new point(0.5 * size + x,-Math.sqrt(3) / 2 * size + y)
        ]);
        this.dead = false;
        this.body.color = "black";
        this.laser = new laser(0,0,0,0);
    }

    updatePosition(dt) {
        this.vector.x /= dt + 1;
        this.vector.y /= dt + 1;

        for (let i = 0; i < this.angles.length; i++) {
            this.angles[i] += this.rotationVelocity * dt;
        }

        this.x += this.vector.x * dt;
        this.y += this.vector.y * dt;
    }

    updateBody() {
        for (let i = 0; i < this.angles.length; i++) {
            this.body.points[i].x = Math.cos(this.angles[i]) * this.size + this.x;
            this.body.points[i].y = Math.sin(this.angles[i]) * this.size + this.y;
        }
    }

    onOutside() {
        for (let i = 0; i < this.body.points.length; i++) {
            if (this.body.points[i].x < 0) {
                this.vector.x *= -1;
                this.x += 1;
            }
            else if (this.body.points[i].x > canvas.width) {
                this.vector.x *= -1;
                this.x -= 1;
            }
            else if (this.body.points[i].y < 0) {
                this.vector.y *= -1;
                this.y += 1;
            }
            else if (this.body.points[i].y > canvas.height) {
                this.vector.y *= -1;
                this.y -= 1;
            }
        }
    }

    rotate(dt, angle) {
        if (this.dead) {return;}
        this.rotationVelocity += angle * dt;
        /*
        this.angle += angle;
        for (let i = 0; i < this.angles.length; i++) {
            this.angles[i] += angle * dt;
        }
        */
    }

    forward(dt, speed) {
        if (this.dead) {return;}
        this.vector.x += Math.cos(this.angles[0]) * speed * dt;
        this.vector.y += Math.sin(this.angles[0]) * speed * dt;
    }

    pewpew(game) {
        if (this.dead) {return;}
        let x = this.body.points[0].x;
        let y = this.body.points[0].y;
        let midx = (this.body.points[1].x + this.body.points[2].x) / 2;
        let midy = (this.body.points[1].y + this.body.points[2].y) / 2;
        let vec = new point(x - midx, y - midy);
        vec.normalize();
        this.laser.shoot(7,x,y,vec);
        game.cutAll(x,y,vec);
    }

}


class simulation {
    constructor(player) {
        this.polygons = [];
        this.player = player;

        //bullet counting update
        this.bullets = 10;

        this.limit = 1000;
        this.currentLevel = 1;

        this.currentTitle = "";
        this.textColor = "black";

        this.keyMap = {};

        this.lastUpdate = Date.now();
        this.dt = 0;

        var _this = this;
        this.interval = setInterval(function(){_this.update();}, 10);
    }

    addPolygon(poly) {
        this.polygons.push(poly);
    }

    addRectangle(x, y, w, h) {
        let square = new polygon([
            new point(x,y),
            new point(x + w,y),
            new point(x + w,y + h),
            new point(x,y + h)
        ], this.limit, "hsl(" + (Math.random()*357) + ",50%,50%)");
        this.addPolygon(square);
    }

    drawText() {
        ctx.font = "2em Righteous";
        ctx.fillStyle = this.textColor;

        ctx.textAlign = "center";
        ctx.textBaseline = "hanging";
        ctx.fillText(this.currentTitle, canvas.width / 2, 70);

        ctx.textAlign = "right";
        ctx.textBaseline = "bottom";
        ctx.fillText(this.bullets, canvas.width - 10, canvas.height - 10);

        for (let i = 0; i < this.polygons.length; i++) {
            if (this.polygons[i].minParts == 0) {continue;}
            ctx.textAlign = "right";
            ctx.textBaseline = "bottom";
            let p = this.polygons[i].getFollowingPoint();
            ctx.fillText(this.polygons[i].minParts, p.x, p.y);
        }
    }

    keyEvents() {
        if (this.keyMap[39]) {
            this.player.rotate(this.dt, Math.PI * 8);
        }
        else if (this.keyMap[37]) {
            this.player.rotate(this.dt, -Math.PI * 8);
        }
        else if(!(this.keyMap[39] && this.keyMap[37])) {
            this.player.rotationVelocity = 0;
        }

        if (this.keyMap[38]) {
            this.player.forward(this.dt, 300);
        }

        if (this.keyMap[32] && !this.keyMap["check"]) {
            this.player.pewpew(this);
            if (this.bullets > 0 && this.player.body.color != "white") {
                this.bullets--;
            }

            this.keyMap["check"] = true;
        }
        else if (!this.keyMap[32] && this.keyMap["check"]) {
             this.keyMap["check"] = false;
        }

        if (this.keyMap[13] && this.currentTitle != "") {
            if (this.player.body.color == "white") {
                this.continue();
            }
            else {
                this.restart();
            }
        }
    }

    update() {
        let now = Date.now();
        this.dt = (now - this.lastUpdate) / 1000;
        this.lastUpdate = now;

        ctx.clearRect(0,0,canvas.width,canvas.height);

        this.keyEvents();

        this.player.updateBody();
        for (let i = 0; i < this.polygons.length; i++) {
            if (this.player.body.color == "black" && this.polygons[i].collision(this.player.body)) {
                this.gameOver();
            }
        }

        for (let i = 0; i < this.polygons.length; i++) {
            this.polygons[i].onOutside();
            this.polygons[i].updatePosition(this.dt);
            this.polygons[i].fadeOut();
            this.polygons[i].draw();
        }

        this.player.onOutside();
        this.player.updatePosition(this.dt);
        this.player.laser.draw();
        this.player.body.draw();

        this.drawText();

        let total = 0;
        let bulletCheck = true;
        for (let i = 0; i < this.polygons.length; i++) {
            let life = this.polygons[i].lifeLeft();

            if (life < 100 && this.polygons[i].minParts > 0) {
                this.bullets += this.polygons[i].minParts;
                this.polygons[i].minParts = 0;
            }

            if (this.polygons[i].isFading()) {
                bulletCheck = false;
            }

            total += life;
        }
        if (total == 0 && this.player.body.color == "black") {
            this.nextLevel();
        }

        if (bulletCheck && this.bullets == 0 && !this.player.dead) {
                this.gameOver();
        }

    }

    cutAll(x, y, vec) {
        for (let i = 0; i < this.polygons.length; i++) {
            this.polygons[i].cut(x,y,vec);
        }
    }

    spawnShapes(numberOfCubes, minSize, maxSize) {
        for (let i = 0; i < numberOfCubes;) {
            let w1 = Math.floor(Math.random() * maxSize + minSize);
            let h1 = Math.floor(Math.random() * maxSize + minSize);
            let x1 = Math.random() * (canvas.width - w1);
            let y1 = Math.random() * (canvas.height - h1);

            let x2 = this.player.x - 100;
            let y2 = this.player.y - 100;
            if (x1 >= x2 + 200 ||
                x1 + w1 <= x2 ||
                y1 >= y2 + 200 ||
                y1 + h1 <= y2) {
                this.addRectangle(x1,y1,w1,h1);
                i++;
            }
        }
    }

    gameOver() {
        this.player.dead = true;

        this.textColor = "black";
        this.currentTitle = "PRESS ENTER TO RESTART AT ROUND 1";
    }

    nextLevel() {
        this.currentLevel++;
        canvas.style = "background-color: #000000";
        this.player.body.color = "white";
        this.player.laser.color = "white";

        this.polygons = [];

        this.textColor = "white";
        this.currentTitle = "PRESS ENTER TO CONTINUE TO ROUND " + this.currentLevel;
    }

    continue() {
        canvas.style = "background-color: #FFFFFF";
        this.player.body.color = "black";
        this.player.laser.color = "black";

        this.currentTitle = "";
        this.textColor = "black";

        let step = Math.floor((this.currentLevel - 6) / 12) + 2;
        let num = (step * Math.cos((Math.PI / 2) * this.currentLevel)) + (2 * step);
        let change = Math.floor((this.currentLevel - 2) / 4) + 1;
        this.limit = Math.max(3000 - change * 500, 100);
        this.spawnShapes(Math.round(num), 80, 100);
    }

    restart() {
        this.currentLevel = 1;
        canvas.style = "background-color: #FFFFFF";
        this.player.body.color = "black";
        this.player.laser.color = "black";

        this.currentTitle = "";
        this.textColor = "black";

        this.bullets = 10;

        this.polygons = [];
        this.player.dead = false;
        this.continue();
    }
}

//=======================================================================
//=======================================================================
//=======================================================================


function main() {
    let player = new character(400,250,30);
    window.game = new simulation(player);
    game.continue();
    //game.addRectangle(100,100,300,300);
}

window.addEventListener("keydown", function(e) {
    if(e.keyCode == 32 || e.keyCode == 38  && e.target == document.body) {
      e.preventDefault();
    }

    game.keyMap[e.keyCode] = true;
});

window.addEventListener("keyup", function(e) {
    game.keyMap[e.keyCode] = false;
});
