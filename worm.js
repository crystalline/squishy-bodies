//C-elegans-like worm model contructor
//Author: Crystalline Emerald (crystalline.emerald@gmail.com)

function rotatePoints(axis, phi, body, origin) {
    var i;
    for (i=0; i<body.points.length; i++) {
        if (origin) {
            body.points[i].pos = addVecs(origin,
                rotateAxisAngle(axis, phi, subVecs(body.points[i].pos, origin)));
        } else {
            body.points[i].pos = rotateAxisAngle(axis, phi, body.points[i].pos);
        }
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
    
    for (i=0; i<N; i++) {
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
    
    var body = {points: points, springs: springs, rings: rings, lines: lines, leftLines: [lines[1], lines[2]], rightLines: [lines[5], lines[6]]};
    
    translatePoints(makeVec3(-L*dist/2,0,0), body);
    
    return body;
}

function actMappingL2(s) {
    return wormSectionSpacing - s*(wormSectionSpacing-contractionLimit);
}

var wormColorMap = new Array(256);
var i;
for (i=0; i<256; i++) {
    wormColorMap[i] = 'rgb('+i+',0,'+(256-i)+')';
}

function scalarColor(s) {
    return wormColorMap[Math.floor(s*255)];
}

function muscleContract(muscle, s) {
    var s = Math.min(1, Math.max(0,s));
    muscle.spr.l = actMappingL2(s);
    var color = scalarColor(s);
    muscle.pa.color = color;
    muscle.spr.color = color;
}

function fade(index) {
    return 1;
    var fadeStart = Math.floor(wormSections*0.75);
    if (index > fadeStart) {
        //index-fadeStart/(wormSections-fadeStart);
        return 1 + (index-fadeStart)/(fadeStart-wormSections);
    } else {
        return 1;
    }
}

function wormControllerStep(worm, dt, timestep) {
    if (timestep > startTime) {
        worm.leftLines.forEach(function(line) {
            line.forEach(function(muscle, index) {
                muscleContract(muscle, (0.5 * fade(index) * Math.sin( index*freq*2*Math.PI/wormSections + 2*Math.PI*(timestep % period)/period )) + 0.5);
            });
        });
        worm.rightLines.forEach(function(line) {
            line.forEach(function(muscle, index) {
                muscleContract(muscle, (0.5 * fade(index) * Math.cos( index*freq*2*Math.PI/wormSections + 2*Math.PI*(timestep % period)/period )) + 0.5);
            });
        });
    }
}

function makeAnimationController(settings) {
    var ac = {animations:[], freeList:[]};
    
    ac.addAnim = function(obj, prop, target, time, ondone) {
        var anim = {}
        anim.obj=obj;
        anim.prop=prop;
        anim.start=obj[prop];
        anim.target=target;
        anim.velocity=(target-obj[prop])/time;
        anim.ondone=ondone;
        this.animations.push(anim);
    };
    
    ac.step = function(dt) {
        var i = 0;
        this.fps = 1/dt;
        for (i=this.animations.length-1; i>=0; i--) {
            var anim = this.animations[i];
            var propVal = anim.obj[anim.prop];
            var incremented = propVal + anim.velocity * dt;
            
            if (Math.abs(anim.target - incremented) < Math.abs(anim.target - propVal)) {
                anim.obj[anim.prop] = incremented;
            } else {
                anim.obj[anim.prop] = anim.target;
                if (typeof anim.ondone == "function") { anim.ondone(); }
                this.animations.splice(i,1);
            }
        }        
    };
    
    return ac;
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
        if (typeof text == "string") {
            this.ctx.fillText(text, x, y);
        }
        if (typeof text == "object" && text.length) {
            var i;
            for (i=0; i<text.length; i++) {
                this.ctx.fillText(text[i], x, y+i*10);            
            }
        }
        this.ctx.restore();
    }
    
    graphics.resize();
    
    return graphics;
}

//Sim parameters
simDt = 0.01;

var worldSettings = {
    surfaceK: 5.0,
    surfaceDrag: 0.28,
    anisoFriction: true,
    surfaceDragTan: 0.28,
    surfaceDragNorm: 0.01,
    airDrag: 0.01,
    g: 1.0
}

//Controller parameters
var period = 500;
var startTime = 250;
var freq = 2.5;

//Worm parameters

//Middle radius
var Rmid = 1.0;
//End radius
var Rend = 0.59;

wormSections = 31;
wormLines = 8;
wormSectionSpacing = 1.0
wormStiffness = 30;
wormPointMass = 0.1;

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

var importexport = {
    loadWorld: function () {
        
    },
    saveWorld: function () {
        
    }
};

//Create cube objects for tests
function makeCube(center, side, mass, stiffness) {
    center = center || [0,0,0];
    side = side || 1;
    mass = mass || 1;
    stiffness = stiffness || 10;
    var vertices = [
        [-0.5,-0.5,-0.5],
        [0.5,-0.5,-0.5],
        [-0.5,0.5,-0.5],
        [0.5,0.5,-0.5],
        [-0.5,-0.5,0.5],
        [0.5,-0.5,0.5],
        [-0.5,0.5,0.5],
        [0.5,0.5,0.5]
    ];
    var points = [], springs = [];
    vertices.forEach(function(v) {
        var p = addVecs(scalXvec(side, v), center);
        points.push(makePoint(p, mass));
    });
    var diagonal = Math.sqrt(3)*side;
    springs.push(makeSpring(points[0], points[1], side, stiffness));
    springs.push(makeSpring(points[0], points[2], side, stiffness));
    springs.push(makeSpring(points[3], points[1], side, stiffness));
    springs.push(makeSpring(points[3], points[2], side, stiffness));
    springs.push(makeSpring(points[4], points[5], side, stiffness));
    springs.push(makeSpring(points[4], points[6], side, stiffness));
    springs.push(makeSpring(points[7], points[5], side, stiffness));
    springs.push(makeSpring(points[7], points[6], side, stiffness));
    springs.push(makeSpring(points[0], points[4], side, stiffness));
    springs.push(makeSpring(points[1], points[5], side, stiffness));
    springs.push(makeSpring(points[2], points[6], side, stiffness));
    springs.push(makeSpring(points[3], points[7], side, stiffness));
    springs.push(makeSpring(points[0], points[7], diagonal, stiffness));
    springs.push(makeSpring(points[1], points[6], diagonal, stiffness));
    springs.push(makeSpring(points[2], points[5], diagonal, stiffness));
    springs.push(makeSpring(points[3], points[4], diagonal, stiffness));
    return {points: points, springs: springs};
}

function runWormDemo() {
    console.log("Start");
    
    graphics = makeGraphics();
    graphics.resize();
    graphics.drawCircle( 0, 0, 1, false, "#FF00FF");
    
    world = makeSimWorld(worldSettings);
    
    camera = makeCamera([0,0,0], Math.PI/4, Math.PI/3, graphics.w, graphics.h, 0.04);
    
    //var cube = rotatePoints([0,1,0], Math.PI/6, makeCube([0,0,5],2,1,30), [0,0,5]);
    //world.addSoftBody(makeSoftBody(cube.points, cube.springs));
    /*
    var pa = {mass: 1, pos: [1,1,1]};
    var pb = {mass: 1, pos: [1,0,1]};
    var spr = {pa: pa, pb: pb, l: 1.2, k: 2};
    wormSoftBody = makeSoftBody([pa,pb], [spr]);
    */
        
    worm = makeWormModel(wormSections, wormLines, wormSectionSpacing, wormStiffness, wormPointMass, wormProfile);
    
    wormSoftBody = makeSoftBody(worm.points, worm.springs);
    
    world.addSoftBody(wormSoftBody);
    
    var gui = new dat.GUI();
    
    var cam = {alpha: rad2ang(camera.alpha), beta: rad2ang(camera.beta),
               scale: 0.04, x: 0, y:0, z:0};
    
    var config = {pauseSim: false, pauseRender: false, muscleControl: true};
    
    var ac = makeAnimationController();
    
    function camUpdate(value) {
        camera.needUpdate = true;
        camera.alpha = ang2rad(cam.alpha);
        camera.beta = ang2rad(cam.beta);
        camera.pos = [cam.x, cam.y, cam.z];
        camera.scale = cam.scale;
    };
    
    gui.add(config, "pauseRender");
    gui.add(config, "pauseSim");
    gui.add(window, "simDt");
    gui.add(window, "wormStiffness").onFinishChange(function(val) {
        wormSoftBody.springs.forEach(function(spr) { spr.l = wormStiffness });
    });
    gui.add(config, "muscleControl");
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
    
    //Keyboard event handling
    function getChar(event) {
        if (event.which == null) { // IE
            if (event.keyCode < 32) return null;
            return String.fromCharCode(event.keyCode);
        }
        if (event.which != 0) {
            if (event.which < 32) return null;
            return String.fromCharCode(event.which);
        }
        return null;
    }
    var camMoved = false;
    var movekeys = {
        "W":[0,1,0],
        "S":[0,-1,0],
        "A":[-1,0,0],
        "D":[1,0,0]
    };
    window.addEventListener("keydown", function(event) {
        var vec = movekeys[getChar(event)];
        if (vec && !camera.posUpdate) {
            var delta = scalXvec(1, addArrOfVecs( [scalXvec(vec[0],camera.planeForward), scalXvec(vec[1],camera.planeRight), scalXvec(vec[2],camera.refTop) ] ));
            cam.x += delta[1];
            cam.y += delta[0];
            cam.z += 0;
            gui.updateManually();
            camUpdate();
        };
    });
    window.addEventListener("keyup", function(event) {
        
    });
    
    //Mainloop
    var prevFrameT = Date.now();
    timestep = 0;
    
    function draw() {
        requestAnimationFrame(draw);
        if (camera.needUpdate) { 
            camera.needUpdate = false;
            camera.updateTransform();
        }
        if (!config.pauseSim) {
            world.step(simDt);
            world.step(simDt);
            world.step(simDt);            
            ac.step(simDt);
            if (config.muscleControl) wormControllerStep(worm, simDt*3, timestep*3);
        }
        if (!config.pauseRender) { 
            graphics.clear();
            world.draw(camera, graphics);
        }
        var time = Date.now();
        var frameT = time - prevFrameT;
        graphics.drawText([Math.round(1000/(frameT))+' fps',
                           (Math.round(world.measureEnergy()*10)/10)+ ' energy'], 10, 10);
        prevFrameT = time;
        timestep++;
    }
    
    draw();
}



