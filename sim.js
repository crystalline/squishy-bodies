//Soft body simulator with anisotropic friction
//Author: Crystalline Emerald (crystalline.emerald@gmail.com)

//Camera is isometric by default
function makeCamera(position, alpha, beta) {
    var camera = {pos: position};
    
    var refTop = [0,0,1];
    var refRight = [0,1,0];
    var rotTop = makeQuaternionRotation(refRight, -alpha);
    var rotRight = makeQuaternionRotation(refTop, -beta);
    
    camera.top = applyQuaternionRotation(rotTop, refTop);
    camera.right = applyQuaternionRotation(rotRight, refRight);
    camera.forward = crossVecs(camera.top, camera.right);
    
    camera.rotation = mulQuats(rotTop, rotRight);
    camera.rotmatrix = quaternionToRotMatrix(camera.rotation);
    
    return camera;
}

function applyCameraTransform(camera, vec, res) {
    res = res || makeVec3();
    matXvec(camera.rotmatrix, vec, res);
    return res;
}

//Point: {pos: [x,y,z], mass: point_mass}
//Spring: {pa: point, pb: point, l: equilibrium_distance, k: stiffness}
function makeSoftBody(points, springs) {
    points.forEach(function (point) {
        point.v = makeVec3(0,0,0);
        point.force = makeVec3(0,0,0);
        point.ground = false;
    });
    return {points: points, springs: springs};
}
	
function computeSpringForces(spring) {
    var pa = spring.pa;
    var pb = spring.pb;
    var diff = subVec(pb.pos, pa.pos);
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
        
    };
    
    return world;
}
