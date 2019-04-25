// Soft body simulator with anisotropic friction
// Copyright (c) 2016 Crystalline Emerald
// Licensed under MIT license.

//3d index class
//TODO: optimize xsize and ysize to be power of 2
function make3dIndex(cellSide, xsize, ysize) {
    var index = this;
    
    index.side = cellSide;
    index.xsize = xsize;
    index.ysize = ysize;
    index.ycoeff = 2*index.xsize;
    index.zcoeff = 4*index.xsize*index.ysize;
    index.k = 1/index.side;
    index.cells = {};
    index.objectCache = {};
    index.indexCache = {};
    index.neighbourCache = {};
    index.neighbourhood = new Int32Array([
        0,0,0,
        0,0,1,
        1,0,1,
        -1,0,1,
        0,1,1,
        0,-1,1,
        1,1,1,
        1,-1,1,
        -1,1,1,
        -1,-1,1,
        1,0,0,
        -1,0,0,
        0,1,0,
        0,-1,0,
        1,1,0,
        1,-1,0,
        -1,1,0,
        -1,-1,0,
        0,0,-1,
        1,0,-1,
        -1,0,-1,
        0,1,-1,
        0,-1,-1,
        1,1,-1,
        1,-1,-1,
        -1,1,-1,
        -1,-1,-1
    ]);
    
    return index;
}

make3dIndex.prototype.getStats = function() {
    var i;
    var nOccCells = 0;
    var nBalls = new util.avgTracker();
    var collListLen = new util.avgTracker();
    for (var i in this.cells) {
        nOccCells++;
        nBalls.update(this.cells[i].length);
    }
    
    var emptyCollLists = 0;
    for (var id in this.objectCache) {
        if (this.neighbourCache[id])
            collListLen.update(this.neighbourCache[id].length);
        else
            emptyCollLists++;
    }
    return {avgObjsPerCell: nBalls.x, occupiedCells: nOccCells, avgCollListLen: collListLen.x, emptyCollLists: emptyCollLists};
};

make3dIndex.prototype.addObject = function(pos, obj, collisionMask) {
    var x = pos[0];
    var y = pos[1];
    var z = pos[2];
    var cx = Math.floor(x * this.k)+this.xsize;
    var cy = Math.floor(y * this.k)+this.ysize;
    var cz = Math.floor(z * this.k);
    var i, k, index, objects, dx, dy, dz;

    index = cx+cy*this.ycoeff+cz*this.zcoeff;
    
    if (!this.cells[index]) this.cells[index] = [obj];
    else this.cells[index].push(obj);
    
    this.objectCache[obj.id] = obj;
    this.indexCache[obj.id] = index;
    this.neighbourCache[obj.id] = false;

    var validCollObjs = [];
    var near = this.neighbourhood;    

    for (i=0; i<near.length; i+=3) {
        dx = near[i];
        dy = near[i+1];
        dz = near[i+2];
        index = cx+dx+(cy+dy)*this.ycoeff+(cz+dz)*this.zcoeff;
        objects = this.cells[index];
        if (objects) {
            for (k=0; k<objects.length; k++) {
                var other = objects[k];
                if (obj != other && !collisionMask[obj.id][other.id]) {
                    validCollObjs.push(other);
                    if (!this.neighbourCache[other.id])
                        this.neighbourCache[other.id] = [obj];
                    else
                        this.neighbourCache[other.id].push(obj);
                }
            }
        }
    }
    if (validCollObjs.length > 0)
        this.neighbourCache[obj.id] = validCollObjs;
};

make3dIndex.prototype.updateObjectsInRadiusAroundObject = function (obj, fn, collisionMask) {    
    var cache = this.neighbourCache[obj.id];
    if (cache) {
        var k;
        for (k=0; k<cache.length; k++) {
            var updated = fn(cache[k], obj);
            if (updated) {
                this.updateObj(cache[k], collisionMask);
                this.updateObj(obj, collisionMask);
            }
        }
    }
};

make3dIndex.prototype.removeObject = function(obj, index) {
    
    var j, k;
    
    index = index || this.indexCache[obj.id];
    
    delete this.objectCache[obj.id];
    this.indexCache[obj.id] = 0;
    
    var objects = this.cells[index];
    
    if (objects.length == 1) {
        delete this.cells[index];
    } else {
        var k;
        for (k=objects.length-1; k>=0; k--) {
            var pb = objects[k];
            if (pb == obj) {
                objects.splice(k,1);
            }
        }
    }
    
    var cache = this.neighbourCache[obj.id];
    if (cache) {
        for (k=0; k<cache.length; k++) {
            var other = cache[k];
            var oCache = this.neighbourCache[other.id];
            if (oCache.length == 1) {
                this.neighbourCache[other.id] = false;
            } else {
                for (j=oCache.length-1; j>=0; j--) {
                    if (oCache[j] == obj) {
                        oCache.splice(j,1);
                    }
                }
            }
        }
    }
    this.neighbourCache[obj.id] = false;
};

make3dIndex.prototype.updateObj = function(obj, collisionMask) {
    var id = obj.id;
    var oldIndex = this.indexCache[id];
    var pos = obj.pos;
    var x = pos[0];
    var y = pos[1];
    var z = pos[2];
    var cx = Math.floor(x * this.k)+this.xsize;
    var cy = Math.floor(y * this.k)+this.ysize;
    var cz = Math.floor(z * this.k);
    var index = cx+cy*this.ycoeff+cz*this.zcoeff;
    if (index != oldIndex) {
        this.removeObject(obj, oldIndex);
        this.addObject(pos, obj, collisionMask);
    }
};

make3dIndex.prototype.updateIndex = function(collisionMask) {
    for (var id in this.objectCache) {
        var obj = this.objectCache[id];
        this.updateObj(obj, collisionMask);
    }
};

function test3dIndex() {
    var N = 10000;
    var L = 1.0;
    var w = 10;
    var h = 10;
    var d = 10;
    var side = 1.05;
    var balls = [];
    var i,j;
    var random = Math.random;
        
    var index = new make3dIndex(side, w+5, h+5);
    var mask = [];
    
    for (i=0; i<N; i++) {
        var ball = {pos: [random()*w, random()*h, random()*d], id: i};
        balls.push(ball);
        mask[i] = {};
    }
        
    var t1 = Date.now();
    
    for (i=0; i<N; i++) {
        index.addObject(balls[i].pos, balls[i], mask);
    }
    
    //Shuffle balls
    var Ns = Math.floor(N*0.7);
    for (i=0; i<Ns; i++) {
        balls[i].pos = [random()*w, random()*h, random()*d];
    }
    
    index.updateIndex(mask);
       
    var t2 = Date.now();
    
    var testIndex = Math.floor(N/2);
    var testBall = balls[testIndex];
    
    var center = testBall.pos;
    console.log('center = '+center);
    
    var ballsTest = [];
    
    console.log(balls.length);
    
    for (j=0; j<balls.length; j++) {
        var ball = balls[j];
        if (j != testIndex && distSquareVec3(ball.pos, center) < L*L) {
            ballsTest.push(ball);
        }
    }
    
    var t3 = Date.now();
    
    var result = [];
    
    index.updateObjectsInRadiusAroundObject(testBall, function(ballA, ballB) {
        if (distSquareVec3(ballA.pos, ballB.pos) < L*L) {
            result.push(ballA);
        }
    }, mask);
    
    var t4 = Date.now();
    
    var order = function(a,b) { if (a.pos[0] > b.pos[0]) { return 1 } else { return -1 } };
    result.sort(order);
    ballsTest.sort(order);
            
    var fail = false;
    
    if (result.length != ballsTest.length) {
        console.log('Index test failed: length difference '+result.length+' '+ballsTest.length);
        fail = true;
        console.log(JSON.stringify(result.map(function (x) { return x.id })));
        console.log(JSON.stringify(ballsTest.map(function (x) { return x.id })));
        return
   };
    
    for (i=0; i<Math.max(result.length, ballsTest.length); i++) {
        if (!compareVec3(result[i].pos, ballsTest[i].pos)) {
            console.log('Index test failed at '+i+': '+result[i].pos+' != '+ballsTest[i].pos);
            fail = true;
        }
    }
    
    if (!fail) { console.log('Index3d tests passed: got '+result.length+' objs, time \nreference get:'+((t3-t2)/1000)+'\nindexed insert & shuffle:'+((t2-t1)/1000)+' get:'+((t4-t3)/1000)); }
}

try { if (GLOBAL) {
    for (var i=0; i<1; i++) {
        try {
            //test3dIndex();
        } catch (e) { console.log(e) }
    }
} } catch (e) {}

//Point and spring constructors
function makePoint(pos, mass) {
    return {pos: pos, mass: mass};
}

function makeSpring(pa, pb, l, k) {
    return {pa: pa, pb: pb, l: l, k: k};
}

//Point: {pos: [x,y,z], mass: point_mass}
//Spring: {pa: point, pb: point, l: equilibrium_distance, k: stiffness}
function makeSoftBody(points, springs) {
    points.forEach(function (point) {
        point.v = makeVec3(0,0,0);
        point.force = makeVec3(0,0,0);
        point.ground = false;
        point.scrPos = makeVec3(0,0,0);
        point.ppos = makeVec3(point.pos[0], point.pos[1], point.pos[2]);
    });
    return {points: points, springs: springs};
}

var temp = makeVec3(0,0,0);
var temp1 = makeVec3(0,0,0);
var temp2 = makeVec3(0,0,0);
var temp3 = makeVec3(0,0,0);
var temp4 = makeVec3(0,0,0);

function penaltyForceSolver(spring) {
    var pa = spring.pa;
    var pb = spring.pb;
    var diff = subVecs(pb.pos, pa.pos);
    var length = l2norm(diff);
    var normal = scalXvec(1/length, diff);
  
    var force = scalXvec(spring.k*(length-spring.l), normal);
    addVecs(pa.force, force, pa.force);
    var force = scalXvec(-1, force, force);
    addVecs(pb.force, force, pb.force);
}

function positionConstraintSolver(spring) {
    var pa = spring.pa;
    var pb = spring.pb;
    var diff = subVecs(pb.pos, pa.pos, temp);
    var length = l2norm(diff);
    var normal = scalXvec(1/length, diff, temp2);
    
    if (!pb.fix) addVecs(pb.pos, scalXvec(-0.5*(length-spring.l), normal, temp1), pb.pos);
    if (!pa.fix) addVecs(pa.pos, scalXvec(0.5*(length-spring.l), normal, temp1), pa.pos);
}

function positionConstraintSolverSmooth(spring, restitution) {
    var pa = spring.pa;
    var pb = spring.pb;
    var diff = subVecs(pb.pos, pa.pos, temp);
    var length = l2norm(diff);
    var normal = scalXvec(1/length, diff, temp2);
    
    if (!pb.fix) addVecs(pb.pos, scalXvec(-0.5*restitution*(length-spring.l), normal, temp1), pb.pos);
    if (!pa.fix) addVecs(pa.pos, scalXvec(0.5*restitution*(length-spring.l), normal, temp1), pa.pos);
}

function computeBondStrain(spring) {
    var pa = spring.pa;
    var pb = spring.pb;
    var diff = subVecs(pb.pos, pa.pos, temp);
    var length = l2norm(diff);
    var delta = length-spring.l;
    return Math.abs(delta);
}

function computeSimpleFriction(point, world) {
    addVecs(point.force, scalXvec(-world.surfaceDrag, point.v, temp), point.force);
}

function computeAnisoFriction(point, world) {
    if (point.afpair) {
        var anormal = normalize(subVecs(point.afpair.pos, point.pos));
        var vel = point.v;
        var velNorm = scalXvec(dotVecs(anormal, vel), anormal);
        var velTan = subVecs(vel, velNorm);
        //Add friction force to point force accumulator
        addVecs(scalXvec(-world.surfaceDragTan, velTan), point.force, point.force);
        addVecs(scalXvec(-world.surfaceDragNorm, velNorm), point.force, point.force);
    } else {
        computeSimpleFriction(point, world);
    }
}

function computePointForces(point, world) {
    var z = point.pos[2];
    var anisoFriction = world.anisoFriction;
    
    if (z < 0) {
        point.ground = true;
        
        //point.force[2] -= world.surfaceK * z;
        point.pos[2] = 0;
                
        if (anisoFriction) {
            computeAnisoFriction(point, world);
        } else {
            computeSimpleFriction(point, world);
        }
    } else {
        point.ground = false;
        //Add air drag force
        addVecs(point.force, scalXvec(-world.airDrag, point.v, temp), point.force);
    }
    
    point.force[2] -= world.g * point.mass;
}

function integratePointEuler(point, dt) {
    addVecs(point.v, scalXvec(dt/point.mass, point.force), point.v);
    addVecs(point.pos, scalXvec(dt, point.v), point.pos);
    zeroVec3(point.force);
}

function integratePointVerlet(point, dt) {
   var next = temp;
   
   addVecs(subVecs(scalXvec(2, point.pos, temp1), point.ppos, temp2),
                   scalXvec(dt*dt/point.mass, point.force, temp3), next);
   
   scalXvec(1/dt, subVecs(next, point.pos, temp1), point.v);
   
   var prev = point.ppos;
   point.ppos = point.pos;
   point.pos = prev;
   
   point.pos[0] = next[0];
   point.pos[1] = next[1];
   point.pos[2] = next[2];
   
   zeroVec3(point.force);
}

function computeCollision(pa, pb) {
    if (pa != pb) {
        var ra = pa.r;
        var rb = pb.r;
        var diff = subVecs(pb.pos, pa.pos, temp);
        var length = l2norm(diff);
        var critlen = ra+rb;
        var penetration = length-critlen;
        
        if (penetration<0) {
            window.s.world.cc++;
            var normal = scalXvec(1/length, diff, temp1);
            
            if (!pb.fix) addVecs(pb.pos, scalXvec(-0.5*penetration, normal, temp2), pb.pos);
            if (!pa.fix) addVecs(pa.pos, scalXvec(0.5*penetration, normal, temp2), pa.pos);
            
            return true;
        }
    }
}

prng = new util.prng(12317);
pseudoRandom = function() { return prng.next() };

function makeSimWorld(settings) {
    
    //Default settings
    var world = {
        timestep: 0,
        collisions: true,
        collisionIndex: true,
        collisionK: 30,
        gridStep: 1.1,
        g: 0.2,
        surfaceK: 10,
        airDrag: 0.1,
        anisoFriction: false,
        surfaceDragTan: 0.28,
        surfaceDragNorm: 0.01,
        integrator: integratePointVerlet,
        //Graphics parameters
        sortPointsByZ: false,
        pointWidth: 5,
        lineWidth: 2,
        gridWidth: 1,
        drawBonds: true,
        drawAtoms: true,
        bondSolveIter: 3,
        actuatorSolveIter: 30
    };
    
    util.simpleExtend(world, settings);
    
    world.points = [];
    world.springs = [];
    world.actuators = [];
    world.actPoints = [];
    world.pIdCounter = 0;
    world.connIndex = [];
    world.selection = {};
    
    world.index3d = new make3dIndex(1.01,1024,1024);
    world.objById = world.index3d.objectCache;
    
    world.addSoftBody = function(body) {
        var i;
        var actuatedPoints = {};
        for (i=0; i<body.points.length; i++) {
            var point = body.points[i];
            point.id = this.pIdCounter++;
            this.connIndex[point.id] = {};
        }
        for (i=0; i<body.springs.length; i++) {
            var spring = body.springs[i];
            if (!this.connIndex[spring.pa.id]) {
                this.connIndex[spring.pa.id] = {};
            }
            this.connIndex[spring.pa.id][spring.pb.id] = true;
            if (!this.connIndex[spring.pb.id]) {
                this.connIndex[spring.pb.id] = {};
            }
            this.connIndex[spring.pb.id][spring.pa.id] = true;
            
            //Discern actuator bonds and corresponding points from static bonds
            if (spring.act) {
                this.actuators.push(spring);
                actuatedPoints[spring.pa.id] = true;
                actuatedPoints[spring.pb.id] = true;
            } else {
                this.springs.push(spring);
            }
        }
        
        for (i=0; i<body.points.length; i++) {
            var point = body.points[i];
            this.index3d.addObject(point.pos, point, this.connIndex);
            if (actuatedPoints[point.id]) {
                this.actPoints.push(point);            
            } else {
                this.points.push(point);
            }
        }
    };
    
    world.floodFillSelection = function () {
        var visited = {};
        var updated = false;
        while (true) {
            updated = false;
            for (id in this.selection) {
                if (!visited[id]) {
                    for (neighbor in this.connIndex[id]) {
                        this.selection[neighbor] = true;
                    }
                    visited[id] = true;
                    updated = true;
                }
            }
            if (!updated) break;
        }
    };
    
    world.minimizeSelection = function() {
        var points = [];
        var springs = [];
        var i,j;
        var bondSolver = this.springsHooke ? penaltyForceSolver : positionConstraintSolver;
        
        for (id in this.selection) {
            points.push(this.objById[id]);
        }        
        for (i=0; i<this.springs.length; i++) {
            var spr = this.springs[i];
            if (this.selection[spr.pa.id] && this.selection[spr.pb.id]) {
                springs.push(spr);
            }
        }
        
        //Minimize constraints, terminate either on reaching sub-epsilon strain or iter limit
        var epsilon = 0.001 * springs.length;
        var strain;
        var iterLimit = 500;
        console.log("Start minimizing: "+springs.length+" bonds, epsilon="+epsilon+" iter limit="+iterLimit);
        for (j=0; j<iterLimit; j++) {
            strain = 0;
            util.arrayShuffle(springs);
            for (i=0; i<springs.length; i++) {
                var spr = springs[i];
                bondSolver(spr);
            }
            for (i=0; i<springs.length; i++) {
                var spr = springs[i];
                strain += computeBondStrain(spr);
            }
            if (strain < epsilon) break;
        }
        if (j == iterLimit) {
            console.log("Stop minimizing by iter limit");
        } else {
            console.log("Stop minimizing by strain < epsilon");
        }
        
        //Null point velocities to forget pre-minimization state
        for (i=0; i<points.length; i++) {
            var pt = points[i];
            copyVec3(pt.pos, pt.ppos);
        }
        
        return {points: points, springs: springs};
    };
    
    world.deletePointByIds = function(idDict) {
        var i;
        for (i=this.points.length-1; i>=0; i--) {
            var p = this.points[i];
            if (idDict[p.id]) {
                this.index3d.removeObject(p);
                this.points.splice(i,1);
                this.connIndex[p.id] && delete this.connIndex[p.id];
            }
        }
        for (i=this.springs.length-1; i>=0; i--) {
            var s = this.springs[i];
            if (idDict[s.pa.id]) {
                this.springs.splice(i,1);
                this.connIndex[s.pb.id] && delete this.connIndex[s.pb.id][s.pa.id];
            } else if (idDict[s.pb.id]) {
                this.springs.splice(i,1);
                this.connIndex[s.pa.id] && delete this.connIndex[s.pa.id][s.pb.id];
            }
        }
    };
    
    world.checkBond = function(pa, pb) {
        return this.connIndex[pa.id] && this.connIndex[pa.id][pb.id];
    };   
    
    world.step = function(dt) {
        var stepStartT = Date.now();
        var i, j, pt, pa, pb, ra, rb, spr;
        var pointIntegrator = this.integrator;
        var that = this;
        
        if (this.collisions) {
            util.arrayShuffle(this.points, pseudoRandom);
            var collStartIndexT = Date.now();
            var collK = world.collisionK;
            
            if (this.collisionIndex) {
                this.index3d.updateIndex(this.connIndex);                
            }
            
            var collStartT = Date.now();
            
            var that = this;
            if (this.collisionIndex) {
                for (i=0; i<this.points.length; i++) {
                    pa = this.points[i];
                    this.index3d.updateObjectsInRadiusAroundObject(pa, computeCollision, this.connIndex);
                }
            } else {
                for (i=0; i<this.points.length; i++) {
                    pa = this.points[i];
                    for (j=0; j<this.points.length; j++) {
                        pb = this.points[j];
                        if (!this.checkBond(pa,pb)) computeCollision(pa, pb);
                    }
                }
            }            
                        
            this.collTime = Date.now() - collStartT;
            this.collIndexTime = collStartT - collStartIndexT;
            
        }
        
        var bondSolver = this.springsHooke ? penaltyForceSolver : positionConstraintSolver;
        util.arrayShuffle(this.springs, pseudoRandom);
        for (j=0; j<this.bondSolveIter; j++) {
            for (i=0; i<this.springs.length; i++) {
                spr = this.springs[i];
                bondSolver(spr, this);
            }
        }
        
        for (i=0; i<this.points.length; i++) {
            pt = this.points[i];
            if (!pt.fix) {
                computePointForces(pt, this);
                pointIntegrator(pt, dt);
            }
        }
        
        //Solve actuated bonds and points more accurately    
        for (j=0; j<this.actuatorSolveIter; j++) {
            util.arrayShuffle(this.actuators, pseudoRandom);
            for (i=0; i<this.actuators.length; i++) {
                spr = this.actuators[i];
                positionConstraintSolverSmooth(spr, 0.5);
            }
        }
        
        util.arrayShuffle(this.actPoints, pseudoRandom);
        for (i=0; i<this.actPoints.length; i++) {
            pt = this.actPoints[i];
            if (!pt.fix) {
                computePointForces(pt, this);
                pointIntegrator(pt, dt);
            }
        }
        
        this.timestep++;
        this.prevStepTime = Date.now() - stepStartT;
    };
    
    world.measureEnergy = function() {
        var energy = 0, world = this;
        var i=0;
        for (i=0; i<this.points.length; i++) {
            var pt = this.points[i];
            var z = pt.pos[2];
            //Kinetic energy
            energy += l2normSquare(pt.v)*pt.mass*0.5;
            //Ground spring energy
            energy += Math.min(z,0)*z*world.surfaceK*0.5;
        }
        for (i=0; i<this.springs.length; i++) {
            var spr = this.springs[i];
            //Spring tension energy
            var delta = spr.l-distVec3(spr.pa.pos, spr.pb.pos);
            energy += delta*delta*spr.k*0.5;
        }
        return energy;
    };
    
    function comparePoints(pa, pb) {
        return pa.scrPos[2] - pb.scrPos[2];
    }
    
    function drawReference(camera, screen) {       
        var ref = [[1,0,0],[0,1,0],[0,0,1]];
        var colors = ["#FF0000","#00FF00","#0000FF"];
        var scrPos = [0,0,0];
        var zero = [0,0,0];
        applyCameraTransform(camera, scrPos, zero);
        
        var i;
        
        for (i=0; i<ref.length; i++) {
            applyCameraTransform(camera, ref[i], scrPos);
            screen.drawCircle(scrPos[0], scrPos[1], camera.screenScaling*0.1, undefined, colors[i]);
            screen.drawLine(scrPos[0], scrPos[1], zero[0], zero[1], 3, colors[i]);
        }    
    }
    
    function drawGrid(camera, screen, Ngrid, gStep, gridW) {   
        
        var gridA = makeVec3(0,0,0);
        var gridB = makeVec3(0,0,0);
        var ptA = makeVec3(0,0,0);
        var ptB = makeVec3(0,0,0);
        
        gridA[0] = -(Ngrid*gStep/2);
        gridA[1] = -(Ngrid*gStep/2);
        gridB[0] = -(Ngrid*gStep/2);
        gridB[1] = (Ngrid*gStep/2);
        for (i=0; i<=Ngrid; i++) {
            applyCameraTransform(camera, gridA, ptA);
            applyCameraTransform(camera, gridB, ptB);
            screen.drawLine(ptA[0],ptA[1],ptB[0],ptB[1],gridW);
            gridA[0]+=gStep;
            gridB[0]+=gStep;
        }
        
        gridA[0] = -(Ngrid*gStep/2);
        gridA[1] = -(Ngrid*gStep/2);
        gridB[0] = (Ngrid*gStep/2);
        gridB[1] = -(Ngrid*gStep/2);
        for (i=0; i<=Ngrid; i++) {
            applyCameraTransform(camera, gridA, ptA);
            applyCameraTransform(camera, gridB, ptB);
            screen.drawLine(ptA[0],ptA[1],ptB[0],ptB[1],gridW);
            gridA[1]+=gStep;
            gridB[1]+=gStep;
        }            
    }
    
    world.draw = function(camera, screen) {
        var ptW = this.pointWidth, lineW = this.lineWidth, gridW = this.gridWidth;
        var i, pt, width, fill, color, spr, ptA, ptB;
        
        for (i=0; i<this.points.length; i++) {
            pt = this.points[i];
            applyCameraTransform(camera, pt.pos, pt.scrPos);
        }
        
        if (this.actPoints) {
            for (i=0; i<this.actPoints.length; i++) {
                pt = this.actPoints[i];
                applyCameraTransform(camera, pt.pos, pt.scrPos);
            }
        }
        
        if (this.drawAtoms) {            
            if (this.sortPointsByZ) { this.points.sort(comparePoints); }
            var that = this;
            function drawPoint(pt) {
                width = ptW;
                fill = 1;
                color = pt.color;
                if (pt.r) width = camera.screenScaling*pt.r;
                if (that.selection[pt.id]) {
                    fill = undefined;
                    color = "#AA1111";
                    if (that.selectionIsMoving) {
                      color = "#FFFF00";
                    }
                }
                screen.drawCircle(pt.scrPos[0], pt.scrPos[1], width, fill, color);
            }
            
            for (i=0; i<this.points.length; i++) {
                pt = this.points[i];
                drawPoint(pt);
            }
            
            if (this.actPoints) {
                for (i=0; i<this.actPoints.length; i++) {
                    pt = this.actPoints[i];
                    drawPoint(pt);
                }
            }
        }
        
        if (this.drawBonds) {
            for (i=0; i<this.springs.length; i++) {
                spr = this.springs[i];
                ptA = spr.pa;
                ptB = spr.pb;
                screen.drawLine(ptA.scrPos[0], ptA.scrPos[1], ptB.scrPos[0], ptB.scrPos[1], lineW, spr.color);
            }
        }
        
        drawGrid(camera, screen, 10, 10, gridW);
        drawReference(camera, screen);
    };
    
    return world;
}
