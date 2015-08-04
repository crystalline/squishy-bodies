//Soft body simulator with anisotropic friction
//Author: Crystalline Emerald (crystalline.emerald@gmail.com)

//Camera is isometric by default
function makeCamera(position, alpha, beta, screenW, screenH, scale) {
    var camera = {pos: position};
    
    camera.refTop = [0,0,1];
    camera.refRight = [0,1,0];
    
    camera.updateTransform = function (alpha, beta, screenW, screenH, scale) {
        camera.scale = scale || camera.scale;
        camera.alpha = alpha || camera.scale;
        camera.beta = beta || camera.scale;
        camera.screenW = screenW || camera.scale;
        camera.screenH = screenH || camera.scale;
        
        camera.rotTop = makeQuaternionRotation(camera.refRight, -camera.alpha);
        camera.rotRight = makeQuaternionRotation(camera.refTop, -camera.beta);
    
        camera.top = applyQuaternionRotation(camera.rotTop, camera.refTop);
        camera.right = applyQuaternionRotation(camera.rotRight, camera.refRight);
        camera.forward = crossVecs(camera.top, camera.right);
        
        camera.rotation = mulQuats(camera.rotTop, camera.rotRight);

        camera.screenMatrix = makeMatrix(3,3,
            [Math.min(camera.screenW, camera.screenH)*camera.scale,0,0,
             0,Math.min(camera.screenW, camera.screenH)*camera.scale,0,
             0,0,1]);
        
        camera.matrix = matXmat(quaternionToRotMatrix(camera.rotation), camera.screenMatrix);
        
        camera.trans = camera.pos;//addVecs(camera.pos, [0.5, 0.5]);
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
    
    addVec(pa.force, force, pa.force);
    var force = scalXvec(-1, force, force);
    addVec(pb.force, force, pa.force);
}

function computePointForces(point, world) {
    var z = point.pos[2];
    
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
    addVec(point.v, scalXvec(dt/point.m, point.force), point.v);
    addVec(point.pos, scalXvec(dt, point.v), point.pos);
    zeroVec3(point.force);
}

function makeSimWorld(settings) {
    
    var world = {step: 0};
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
        this.step++;
    };
    
    world.draw = function(camera, screen) {
        this.bodies.forEach(function (body) {
            var i, pt, spr;
            for (i=0; i<body.points.length; i++) {
                pt = body.points[i];
                applyCameraTransform(camera, pt.pos, pt.scrPos);
                screen.drawCircle(pt.scrPos[0], pt.scrPos[1], 2);
            }
            for (i=0; i<body.springs.length; i++) {
                spr = body.springs[i];
            }
        });
    };
    
    return world;
}
