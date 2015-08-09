//Soft body simulator with anisotropic friction
//Author: Crystalline Emerald (crystalline.emerald@gmail.com)

//Camera is isometric by default
function makeCamera(position, alpha, beta, screenW, screenH, scale) {
    var camera = {pos: position};
    
    camera.refTop = [0,0,1];
    camera.refRight = [0,1,0];
    
    camera.updateTransform = function (alpha, beta, screenW, screenH, scale) {
        
        if (util.isNumeric(alpha)) this.alpha = alpha;
        if (util.isNumeric(beta)) this.beta = beta;
        if (util.isNumeric(screenW)) this.screenW = screenW;
        if (util.isNumeric(screenH)) this.screenH = screenH;
        if (util.isNumeric(scale)) this.scale = scale;
        
        this.rotTop = makeQuaternionRotation(this.refTop, -this.alpha);
        this.rotRight = makeQuaternionRotation(this.refRight, -this.beta);
        
        console.log(this.rotTop);
        console.log(this.rotRight);
        
        this.right = applyQuaternionRotation(this.rotTop, this.refRight);
        this.top = applyQuaternionRotation(this.rotRight, this.refTop);

        this.forward = crossVecs(this.top, this.right);

        this.rotation = mulQuats(this.rotTop, this.rotRight);
        
        var screenScaling = Math.min(this.screenW,this.screenH)*this.scale;
        
        this.screenMatrix = makeMatrix(3,3,
            [screenScaling,0,0,
             0,screenScaling,0,
             0,0,screenScaling]);

        this.matrix = matXmat(quaternionToRotMatrix(this.rotation), this.screenMatrix);
        
        this.trans = this.pos;
    };
    
    camera.zoom = function(delta) {
        this.scale *= (delta || 1);
        this.updateTransform();
    };
    
    camera.moveRel = function (posDelta, alpha, beta) {
        console.log(this.pos);
        addVecs(this.pos, posDelta || makeVec3(0,0,0), this.pos);
        console.log(this.pos);
        this.alpha += (alpha || 0);
        this.beta += (beta || 0);
        this.updateTransform();
    };
    
    camera.updateTransform(alpha, beta, screenW, screenH, scale);
    
    return camera;
}

function applyCameraTransform(camera, vec, res) {
    res = res || makeVec3(0,0,0);
    temp = makeVec3(0,0,0);
    //matXvec(camera.matrix, vec, temp);
    //subVecs(temp, camera.trans, res);
    subVecs(vec, camera.trans, temp);
    matXvec(camera.matrix, temp, res);
    return res;
}

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
    });
    return {points: points, springs: springs};
}
	
function computeSpringForces(spring) {
    var pa = spring.pa;
    var pb = spring.pb;
    var diff = subVecs(pb.pos, pa.pos);
    var length = l2norm(diff);
    var normal = scalXvec(1/length, diff);
    var force = scalXvec(spring.k*(length-spring.d), normal);
    
    addVecs(pa.force, force, pa.force);
    var force = scalXvec(-1, force, force);
    addVecs(pb.force, force, pa.force);
}

function computePointForces(point, world) {
    var z = point.pos[2];
    var anisoFriction = world.anisoFriction;
    
    if (z < 0) {
        point.ground = true;
        point.force[2] -= world.surfaceK * z;
        if (anisoFriction) {
            /*  (if anisotropic-friction
				  (setf F (aniso-friction p))
				  (setf F (simple-friction p)))
    	    */
        }
        
    } else {
        point.ground = false;
    }
    
    point.force[2] -= world.g * point.m;
}

function integratePoint(point, dt) {
    addVecs(point.v, scalXvec(dt/point.m, point.force), point.v);
    addVecs(point.pos, scalXvec(dt, point.v), point.pos);
    zeroVec3(point.force);
}

function makeSimWorld(settings) {
    
    var world = {timestep: 0};
    util.simpleExtend(world, settings);
    world.bodies = [];
    
    world.addSoftBody = function(body, position, orientation) {
        this.bodies.push(body);
    };
    
    world.step = function(dt) {
        this.bodies.forEach(function (body) {
            var i, pt, spr;
            for (i=0; i<body.springs.length; i++) {
                spr = body.springs[i];
                computeSpringForces(spr);
            }
            for (i=0; i<body.points.length; i++) {
                pt = body.points[i];
                computePointForces(pt, this);
                integratePoint(pt);
            }
        });
        this.timestep++;
    };
    
    world.draw = function(camera, screen) {
        var ptW = 3, lineW = 2, gridW = 1;
        this.bodies.forEach(function (body) {
            var i, pt, spr, ptA, ptB;
            for (i=0; i<body.points.length; i++) {
                pt = body.points[i];
                applyCameraTransform(camera, pt.pos, pt.scrPos);
                screen.drawCircle(pt.scrPos[0], pt.scrPos[1], ptW);
            }
            for (i=0; i<body.springs.length; i++) {
                spr = body.springs[i];
                ptA = spr.pa;
                ptB = spr.pb;
                screen.drawLine(ptA.scrPos[0], ptA.scrPos[1], ptB.scrPos[0], ptB.scrPos[1], lineW);
            }
            
            //Draw grid
            var gridA = makeVec3(0,0,0);
            var gridB = makeVec3(0,0,0);
            var Ngrid = 10;
            var gStep = 10;
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
        });
    };
    
    return world;
}
