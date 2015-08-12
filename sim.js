//Soft body simulator with anisotropic friction
//Author: Crystalline Emerald (crystalline.emerald@gmail.com)

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
    var force = scalXvec(spring.k*(length-spring.l), normal);
    addVecs(pa.force, force, pa.force);
    var force = scalXvec(-1, force, force);
    addVecs(pb.force, force, pb.force);
}

function computeSimpleFriction(point, world) {
    addVecs(point.force, scalXvec(-world.surfaceDrag, point.v), point.force);
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
        point.force[2] -= world.surfaceK * z;
        if (anisoFriction) {
            computeAnisoFriction(point, world);
        } else {
            computeSimpleFriction(point, world);
        }
    } else {
        point.ground = false;
        //Add air drag force
        addVecs(point.force, scalXvec(-world.airDrag, point.v), point.force);
    }
    
    point.force[2] -= world.g * point.mass;
}

function integratePoint(point, dt) {
    addVecs(point.v, scalXvec(dt/point.mass, point.force), point.v);
    addVecs(point.pos, scalXvec(dt, point.v), point.pos);
    zeroVec3(point.force);
}

function makeSimWorld(settings) {
    
    var world = {timestep: 0, g: 1, surfaceK: 5};
    util.simpleExtend(world, settings);
    world.bodies = [];
    
    world.addSoftBody = function(body, position, orientation) {
        this.bodies.push(body);
    };
    
    world.step = function(dt) {
        var that = this;
        this.bodies.forEach(function (body) {
            var i, pt, spr;
            for (i=0; i<body.springs.length; i++) {
                spr = body.springs[i];
                computeSpringForces(spr);
            }
            for (i=0; i<body.points.length; i++) {
                pt = body.points[i];
                computePointForces(pt, that);
                integratePoint(pt, dt);
            }
        });
        this.timestep++;
    };
    
    world.draw = function(camera, screen) {
        var ptW = 3, lineW = 1.5, gridW = 1;
        this.bodies.forEach(function (body) {
            var i, pt, spr, ptA, ptB;
            for (i=0; i<body.points.length; i++) {
                pt = body.points[i];
                applyCameraTransform(camera, pt.pos, pt.scrPos);
                screen.drawCircle(pt.scrPos[0], pt.scrPos[1], ptW, false, pt.color);
            }
            for (i=0; i<body.springs.length; i++) {
                spr = body.springs[i];
                ptA = spr.pa;
                ptB = spr.pb;
                screen.drawLine(ptA.scrPos[0], ptA.scrPos[1], ptB.scrPos[0], ptB.scrPos[1], lineW, spr.color);
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
