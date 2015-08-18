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
        point.ppos = makeVec3(point.pos[0], point.pos[1], point.pos[2]);
    });
    return {points: points, springs: springs};
}

window.springsForce = false;
window.collisionForce = false;

function computeSpringForces(spring) {
    var pa = spring.pa;
    var pb = spring.pb;
    var diff = subVecs(pb.pos, pa.pos);
    var length = l2norm(diff);
    var normal = scalXvec(1/length, diff);
    
    if (window.springsForce) {
        var force = scalXvec(spring.k*(length-spring.l), normal);
        addVecs(pa.force, force, pa.force);
        var force = scalXvec(-1, force, force);
        addVecs(pb.force, force, pb.force);    
    } else if (Math.random() > 0.1) {
        if (!pb.fix) addVecs(pb.pos, scalXvec(-0.5*(length-spring.l), normal), pb.pos);
        if (!pa.fix) addVecs(pa.pos, scalXvec(0.5*(length-spring.l), normal), pa.pos);
    }
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
        addVecs(point.force, scalXvec(-world.airDrag, point.v), point.force);
    }
    
    point.force[2] -= world.g * point.mass;
}

function integratePointEuler(point, dt) {
    addVecs(point.v, scalXvec(dt/point.mass, point.force), point.v);
    addVecs(point.pos, scalXvec(dt, point.v), point.pos);
    zeroVec3(point.force);
}

function integratePointVerlet(point, dt) {
   var next = addVecs(subVecs(scalXvec(2, point.pos), point.ppos),
                      scalXvec(dt*dt/point.mass, point.force));
   point.ppos = point.pos;
   point.v = scalXvec(1/dt, subVecs(next, point.pos));
   point.pos = next;
   zeroVec3(point.force);
}

function makeSimWorld(settings) {
    
    var world = {
        timestep: 0,
        collisions: true,
        collisionK: 30,
        gridStep: 1.1,
        g: 1,
        surfaceK: 10,
        airDrag: 0.1,
        anisoFriction: false,
        surfaceDragTan: 0.28,
        surfaceDragNorm: 0.01,
        integrator: integratePointVerlet,
        //Graphics parameters
        sortPointsByZ: true,
        pointWidth: 5,
        lineWidth: 2,
        gridWidth: 1
    };
    
    util.simpleExtend(world, settings);
    
    world.points = [];
    world.springs = [];
    
    //Collision grid
    world.grid = []
    
    world.addSoftBody = function(body) {
        util.pushBack(this.points, body.points);
        util.pushBack(this.springs, body.springs);
    };
    
    world.step = function(dt) {
        var i, j, pt, pa, pb, ra, rb, spr;
        var pointIntegrator = this.integrator;
        
        for (i=0; i<this.springs.length; i++) {
            spr = this.springs[i];
            computeSpringForces(spr);
        }
        
        if (this.collisions) {
            util.arrayShuffle(this.points);
            var collStartT = Date.now();
            var collK = world.collisionK;
            for (i=0; i<this.points.length; i++) {
                for (j=0; j<this.points.length; j++) {
                    pa = this.points[i];
                    pb = this.points[j];
                    if (i != j && pa.radius && pb.radius) {
                        var ra = pa.radius;
                        var rb = pb.radius;
                        var diff = subVecs(pb.pos, pa.pos);
                        var length = l2norm(diff);
                        var critlen = ra+rb;
                        var penetration = length-critlen;
                        
                        if (penetration<0) {
                            
                            var normal = scalXvec(1/length, diff);
                            
                            if (window.collisionForce) {                                
                                var force = scalXvec(collK*penetration, normal);
                                addVecs(pa.force, force, pa.force);
                                var force = scalXvec(-1, force, force);
                                addVecs(pb.force, force, pb.force);
                            } else {
                                if (!pb.fix) addVecs(pb.pos, scalXvec(-0.5*penetration, normal), pb.pos);
                                if (!pa.fix) addVecs(pa.pos, scalXvec(0.5*penetration, normal), pa.pos);                    
                            }
                            
                            /*
                            var ma = pa.mass;
                            var mb = pb.mass;
                            var J = -(1+0.3)*dotVecs(subVecs(pa.v, pb.v), normal)/((1/ma+1/mb));
                            addVecs(pa.v, scalXvec(J/ma, normal), pa.v);
                            addVecs(pb.v, scalXvec(J/mb, normal), pb.v);
                            */
                        }
                    }
                }
            }
            this.collTime = Date.now() - collStartT;
        }
        
        for (i=0; i<this.points.length; i++) {
            pt = this.points[i];
            if (!pt.fix) {
                computePointForces(pt, this);
                pointIntegrator(pt, dt);
            }
        }
        
        this.timestep++;
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
        var i, pt, width, spr, ptA, ptB;
        
        for (i=0; i<this.points.length; i++) {
            pt = this.points[i];
            applyCameraTransform(camera, pt.pos, pt.scrPos);
        }
        
        if (this.sortPointsByZ) { this.points.sort(comparePoints); }
        
        for (i=0; i<this.points.length; i++) {
            pt = this.points[i];
            width = ptW;
            if (pt.radius) width = camera.screenScaling*pt.radius;
            screen.drawCircle(pt.scrPos[0], pt.scrPos[1], width, 1, pt.color);
        }
        
        for (i=0; i<this.springs.length; i++) {
            spr = this.springs[i];
            ptA = spr.pa;
            ptB = spr.pb;
            screen.drawLine(ptA.scrPos[0], ptA.scrPos[1], ptB.scrPos[0], ptB.scrPos[1], lineW, spr.color);
        }
                   
        drawGrid(camera, screen, 10, 10, gridW);
    };
    
    return world;
}
