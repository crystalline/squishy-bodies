//C-elegans-like worm model contructor
//Author: Crystalline Emerald (crystalline.emerald@gmail.com)

function rotatePoints(axis, phi, body) {
    var i;
    for (i=0; i<body.points.length; i++) {
        body.points[i].pos = rotateAxisAngle(axis, phi, body.points[i].pos);
    }
    return body;
}

function translatePoints(vec, body) {
    var i;
    for (i=0; i<body.points.length; i++) {
        addVecs(body.points[i].pos, vec, body.points[i].pos);
    }
    return body;
}

//Make ring of point masses connected with springs, last point is central
function makeRingZ(R, N, mass, k) {
    var points = [];
    var springs = [];
    var phi = 2*Math.PI/N;
    var rvec = makeVec3(R, 0, 0);
    var axis = makeVec3(0, 0, 1);
    var dist = 2*R*Math.sin(phi/2);
    var i;
    
    for (i=0; i<N; i++) {
        points.push(makePoint(rotateAxisAngle(axis, phi*i, makeVec3(R,0,0)), mass));
    }
    
    for (i=0; i<N-1; i++) {
        springs.push(makeSpring(points[i], points[i+1], dist, k));
    }
    
    points.push(makePoint(makeVec3(0,0,0), mass));
    
    for (i=0; i<N-1; i++) {
        springs.push(makeSpring(points[points.length-1], points[i], R, k));
    }
    
    return {points: points, springs: springs};
}

function getRingRadius(ring) {
    return distVec3(ring.points[ring.points.length-1].pos, ring.points[0].pos);
}

//Returns list of springs and muscles
//Sets anisotropic friction pairs
function linkRings(A, B, dist, k) {
    if (A.points.length == B.points.length) {
        var springs = [];
        var muscles = [];
        var Ra = getRingRadius(A);
        var Rb = getRingRadius(B);
        var diagonalA = Math.sqrt(dist*dist + Ra*Ra);
        var diagonalB = Math.sqrt(dist*dist + Rb*Rb);
        var i;
        
        for (i=0; i<A.points.length; i++) {
            //Create parallel spring
            var spr = makeSpring( A.points[i], B.points[i], dist, k);
            //Add corresponding point as anisotropic friction pair
            A.points[i].afpair = B.points[i];
            //Create muscle if not in central fiber
            if (i < A.points.length-1) {
                muscles.push({pa: A.points[i], pb: B.points[i], d: dist, spr: spr});
            }
        }
        
        for (i=0; i<A.points.length-1; i++) {
            var spA = makeSpring(A.points[A.points.length-1], B.points[i], diagonalA, k);
            var spB = makeSpring(A.points[i], B.points[B.points.length-1], diagonalB, k); 
            springs.push(spA);
            springs.push(spB);
            muscles[i].spa = spA;
            muscles[i].da = diagonalA;
            muscles[i].spB = spB;
            muscles[i].db = diagonalB;
        }
        
        return {springs: springs, muscles: muscles};
    } else {
        console.log("error: incompatible rings!");
    }
}

//L is the number of rings, N is a number of sections per ring R is radius of ring, dist is distance between rings	   
function makeWormModel(L, N, dist, k, mass, radialProfile) {
    
    var rings = [];
    var axialSprings = [];
    var lines = new Array(N);
    var i,j;
    
    var points = [];
    var springs = [];
    
    for (i=0; i<L; i++) {
        var R = radialProfile(i/L);
        var ring = makeRingZ(R, N, mass, k);
        points = points.concat(ring.points);
        springs = springs.concat(ring.springs);
        rings.push(translatePoints(makeVec3(i*dist, 0, 0), rotatePoints(makeVec3(0,1,0), Math.PI/2, ring)));
    }
    
    for (i=0; i<L-1; i++) {
        var linkRes = linkRings(rings[i], rings[i+1], dist, k);
        axialSprings = axialSprings.concat(linkRes.springs);
        
        for (j=0; j<N; j++) {
            if (lines[j]) lines[j].push(linkRes.muscles[j]);
            else lines[j] = [linkRes.muscles[j]];
        }
    }
    
    springs = springs.concat(axialSprings);
    
    return {rings: rings, lines: lines, points: points, springs: springs};
}

function makeGraphics() {
    var graphics = {}
    
    graphics.canvas = document.createElement('canvas');
    graphics.canvas.style.position = 'absolute';
    document.body.appendChild(graphics.canvas);
    
    graphics.ctx = graphics.canvas.getContext('2d');
    graphics.ctx.fillStyle = '#2F49C2';
    graphics.ctx.strokeStyle = '#2F49C2';
    
    graphics.size = 1;
    
    graphics.resize = function() {
        var w = window.innerWidth;
        var h = window.innerHeight;
        this.w = w;
        this.h = h;
                
        this.canvas.setAttribute('width', w);
        this.canvas.setAttribute('height', h);
        
        //Reset transform to default
        this.ctx.setTransform(1, 0, 0, 1, 0, 0);
        
        if (w > h) {
            this.scale = 1;//h/this.size;
            this.py = 0;
            this.px = (w-h)/2;
        } else {
            this.scale = 1;//w/this.size;
            this.px = 0;
            this.py = (h-w)/2;
        }
        
        //this.ctx.setTransform(this.scale, 0, 0, -this.scale, this.px, h);
        this.ctx.setTransform(this.scale, 0, 0, -this.scale, w/2, h/2);
        graphics.clear();
    };
    
    graphics.drawCircle = function(x, y, r, stroke, col) {
        var oldCol;
        if (col) { oldCol = this.ctx.fillStyle; this.ctx.fillStyle = col; }
        var ctx = this.ctx;
        if (ctx.stroke) ctx.lineWidth = stroke;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, 2 * Math.PI, false);
        if (!stroke) ctx.fill();
        else ctx.stroke();
        if (oldCol) { this.ctx.fillStyle = oldCol; }
    };
    
    graphics.drawRect = function(x, y, w, h, col) {
        var oldCol;
        if (col) { oldCol = this.ctx.fillStyle; this.ctx.fillStyle = col; }
        var ctx = this.ctx;
        ctx.fillRect(x, y, w, h);
        if (oldCol) { this.ctx.fillStyle = oldCol; }
    };
    
    graphics.drawLine = function(x1, y1, x2, y2, width, col) {
        var ctx = this.ctx;
        var oldCol;
        if (col) { oldCol = this.ctx.strokeStyle; this.ctx.strokeStyle = col; }
        ctx.beginPath();
        ctx.lineWidth = width || 1/this.size;
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
        if (oldCol) { this.ctx.strokeStyle = oldCol; }
    };  
    
    graphics.clear = function() {
        var ctx = this.ctx;
        ctx.save();
        this.ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, this.w, this.h);
        ctx.restore();
    };
    
    graphics.resize();
    
    return graphics;
}

function addButton(label, onclick) {
    var dom = document.createElement('a');
    getbyid('controls').appendChild(dom);
    dom.className = 'btn';
    dom.innerHTML = label;
    if (typeof onclick == 'function') dom.onclick = onclick;
    return dom;
}

function getbyid(id) { return document.getElementById(id); }

//Worm parameters

//Middle radius
var Rmid = 1.0;
//End radius
var Rend = 0.59;

var wormSections = 31;
var wormLines = 8;
var wormSectionSpacing = 1.0
var wormStiffness = 30;
var wormPointMass = 0.1;

var contractionLimit = 0.7*wormSectionSpacing;

var wormProfile = function(x) {
    var Kl = (Rmid-Rend)/0.5;
    var Bl = Rend;
    var Br = Rmid+(Kl/2);
    if (x<0.5) {
        return Kl*x+Bl;
    } else {
        return -Kl*x+Br;
    }
};

function runWormDemo() {
    console.log("Start");
    
    graphics = makeGraphics();
    graphics.resize();
    graphics.drawCircle( 0, 0, 1, false, "#FF00FF");
    
    world = makeSimWorld();
    
    //camera = makeCamera([0,0,0], Math.PI/4, Math.PI/6, graphics.w, graphics.h, 1);
    camera = makeCamera([0,0,0], 0, 0, graphics.w, graphics.h, 0.01);
    
    worm = makeWormModel(wormSections, wormLines, wormSectionSpacing, wormStiffness, wormPointMass, wormProfile);
    
    wormSoftBody = makeSoftBody(worm.points, worm.springs);
    
    world.addSoftBody(wormSoftBody);
    
    function redraw() {
        graphics.clear();
        world.draw(camera, graphics);
    }
    
    redraw();
    
    addButton("up", function () { camera.moveRel(scalXvec(1,camera.top)); redraw(); });
    addButton("down", function () { camera.moveRel(scalXvec(-1,camera.top)); redraw(); });
    addButton("right", function () { camera.moveRel(scalXvec(0.01,camera.right)); redraw(); });
    addButton("left", function () { camera.moveRel(scalXvec(-1,camera.right)); redraw(); });
}



