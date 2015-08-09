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
        points.push(makePoint(rotateAxisAngle(axis, phi*i, rvec), mass));
    }
    
    for (i=0; i<N-1; i++) {
        springs.push(makeSpring(points[i], points[i+1], dist, k));
    }
    
    springs.push(makeSpring(points[N-1], points[0], dist, k));
    
    points.push(makePoint(makeVec3(0,0,0), mass));
    
    for (i=0; i<N-1; i++) {
        springs.push(makeSpring(points[points.length-1], points[i], R, k));
    }
    
    var body = {points: points, springs: springs};
    
    return body;
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
            springs.push(spr);
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
        //rings.push(translatePoints(makeVec3(i*dist, 0, 0), ring));
        //console.log(rings[rings.length-1]);
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
    
    var body = {rings: rings, lines: lines, points: points, springs: springs};
    
    translatePoints(makeVec3(-L*dist/2,0,0), body);
    
    return body;
}

function makeGraphics() {
    var graphics = {}
    
    graphics.canvas = document.createElement('canvas');
    graphics.canvas.style.position = 'absolute';
    document.body.appendChild(graphics.canvas);
    
    graphics.ctx = graphics.canvas.getContext('2d');
    graphics.ctx.fillStyle = '#2F49C2';
    graphics.ctx.strokeStyle = '#2F49C2';
    graphics.ctx.font = "60px Arial";
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
            this.scale = 1;
            //this.scale = h/10;
            this.py = 0;
            this.px = (w-h)/2;
        } else {
            this.scale = 1;
            //this.scale = w/10;
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
    
    graphics.drawText = function(text,x,y) {
        this.ctx.save();
        this.ctx.setTransform(2, 0, 0, 2, 0, 0);
        this.ctx.fillText(text,x,y);
        this.ctx.restore();
    }
    
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

//Sim parameters
var worldSettings = {
    surfaceK: 5.0,
    surfaceDrag: 0.28,
    anisoFriction: false,
    surfaceDragTan: 0.28,
    surfaceDragNorm: 0.01,
    airDrag: 0.01,
    g: 1.0
}

//Controller parameters
var period = 700;
var startTime = 250;
var freq = 2.5;

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
    
    world = makeSimWorld(worldSettings);
    
    camera = makeCamera([0,0,0], Math.PI/4, Math.PI/3, graphics.w, graphics.h, 0.04);
    
    worm = makeWormModel(wormSections, wormLines, wormSectionSpacing, wormStiffness, wormPointMass, wormProfile);
    
    wormSoftBody = makeSoftBody(worm.points, worm.springs);
    
    world.addSoftBody(wormSoftBody);
    
    var gui = new dat.GUI();
    
    var cam = {alpha: rad2ang(camera.alpha), beta: rad2ang(camera.beta),
               scale: 0.04, x: 0, y:0, z:0};
    var config = {pause: false};
    
    function camUpdate(value) {
        camera.needUpdate = true;
        camera.alpha = ang2rad(cam.alpha);
        camera.beta = ang2rad(cam.beta);
        camera.pos = [cam.x, cam.y, cam.z];
        camera.scale = cam.scale;
    };
    
    gui.add(config, "pause").onFinishChange(function(val) {if (!val) requestAnimationFrame(draw)});
    gui.add(cam, "alpha", -180, 180).onChange(camUpdate);
    gui.add(cam, "beta", -180, 180).onChange(camUpdate);
    gui.add(cam, "scale").onChange(camUpdate);
    gui.add(cam, "x").onChange(camUpdate);
    gui.add(cam, "y").onChange(camUpdate);
    gui.add(cam, "z").onChange(camUpdate);
    
    gui.updateManually = function() {
        var gui = this;
        // Iterate over all controllers
        for (var i in gui.__controllers) {
            gui.__controllers[i].updateDisplay();
        }
    };
    
    //Mouse event handling
    mouseDown = 0;
    px=false;
    py=false;
    
    window.addEventListener("resize", function() {
        graphics.resize();
        camera.screenW = window.innerWidth;
        camera.screenH = window.innerHeight;
        camera.updateTransform();
    }, false);
    
    graphics.canvas.addEventListener("mousemove", function(event) {
        var x = event.pageX;
        var y = event.pageY;
        if (mouseDown && px && py) {
            cam.beta -= (y - py);
            cam.alpha -= (x - px);
            gui.updateManually();
            camUpdate();
        }
        px = x;
        py = y;
    }, false);
    graphics.canvas.onmousedown = function() { 
        mouseDown = 1;
    }
    graphics.canvas.onmouseup = function() {
        mouseDown = 0;
        px=false;
        py=false;
    }
    
    //Mainloop
    var prevFrameT = Date.now();
    
    function draw() {
        if (!config.pause) requestAnimationFrame(draw);
        if (camera.needUpdate) { 
            camera.needUpdate = false;
            camera.updateTransform();
        }
        world.step(0.01);
        graphics.clear();
        world.draw(camera, graphics);
        var time = Date.now();
        var frameT = time - prevFrameT;
        graphics.drawText(Math.round(1000/(frameT))+' fps',10,10);
        prevFrameT = time;
    }
    
    draw();
}



