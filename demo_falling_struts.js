// Squishy bodies - a soft body physics simulation engine for Javascript
// "Falling struts" demo - basically a stress test of collisions & spatial index
// Copyright (c) 2016 Crystalline Emerald
// Licensed under MIT license.

//L is the number of rings, N is a number of sections per ring radialProfile is a function that returns radius of ring given its number, dist is distance between rings	   
function makeRadialProfile(L, N, dist, k, mass, radialProfile, fixOrigin, muscleIndices) {
    
    var rings = [];
    var axialSprings = [];
    var lines = new Array(N);
    var i,j;
    
    var points = [];
    var springs = [];
    var muscles = {};
    
    for (i=0; i<L; i++) {
        var R = radialProfile(i/L);
        var ring = makeRingZ(R, N, mass, k);
        if (i == 0 && fixOrigin) {
            ring.points.forEach(function(p) {
                p.fix = true;            
            });
        }
        points = points.concat(ring.points);
        springs = springs.concat(ring.springs);
        rings.push(translatePoints(makeVec3(0, 0, i*dist), ring));
    }
    
    for (i=0; i<L-1; i++) {
        
        var linkRes;
        if (muscleIndices && muscleIndices[i]) {
            linkRes = linkRings(rings[i], rings[i+1], dist, k);
        } else {
            linkRes = linkRings(rings[i], rings[i+1], dist, k);
        }

        if (muscleIndices && muscleIndices[i]) {
            for (j=0; j<linkRes.muscles.length; j++) {
                linkRes.muscles[j].spr.act = true;
                linkRes.muscles[j].spA.act = true;
                linkRes.muscles[j].spB.act = true;
            }
            muscles[i] = linkRes.muscles;
        }
        
        axialSprings = axialSprings.concat(linkRes.springs);
        
        for (j=0; j<N; j++) {
            if (lines[j]) lines[j].push(linkRes.muscles[j]);
            else lines[j] = [linkRes.muscles[j]];
        }
    }
    
    springs = springs.concat(axialSprings);
    
    var body = {points: points,
                springs: springs,
                rings: rings,
                lines: lines,
                muscles: muscles};
        
    return body;
}

//config: {origin:, dir:, alpha:, nsegments:, seglen:, nlines:, stiffness:,
//         pmass:, pradius:, pcolor:, shape:, fixorigin:}
function makeLeg(config) {
    var shape = config.shape;
    if (typeof config.shape == 'number') { shape = function (x) { return config.shape; }; }
    var leg = makeRadialProfile(config.nsegments, config.nlines, config.seglen, config.stiffness, config.pmass, shape, config.fixorigin, config.muscle);
    var dir = normalize(config.dir);
    var legAxis = [0,0,1];
    var rotAxis = normalize(crossVecs(legAxis, dir));
    var rotAngle = Math.acos(dotVecs(legAxis, dir));
    if (config.alpha) rotatePoints(legAxis, config.alpha, leg)
    translatePoints(config.origin, rotatePoints(rotAxis, rotAngle, leg));
    leg.points.forEach(function(p) {
        p.r = config.pradius;
        if (config.pcolor) p.col = config.pcolor;
    });
    return leg;
}

function makeFallingStrutsWorld() {
    var world = makeSimWorld(worldSettings);
    
    var i,j,N=8;
    for (i=0; i<N; i++) {
         for (j=0; j<N; j++) {
            var leg = makeLeg({origin: [4*(j-N/2),4*(i-N/2),6],
                                dir: [0,1,1],
                                nsegments: 16,
                                seglen: 1.1,
                                nlines: 6,
                                stiffness: 30,
                                pmass: 1,
                                pradius: 0.5,
                                shape: 1.3});
            world.addSoftBody(makeSoftBody(leg.points, leg.springs));
        }
    }
             
    var leg3 = makeLeg({origin: [0,-8,1.5],
                        dir: [0,1,0],
                        nsegments: 16,
                        seglen: 1.1,
                        nlines: 6,
                        stiffness: 30,
                        pmass: 1,
                        pradius: 0.5,
                        shape: 1.3});
    
    world.addSoftBody(makeSoftBody(leg3.points, leg3.springs));
    
    return {world:world};
}

var worldSettings = {
    collisions: true,
    collisionIndex: true,
    collisionK: 20.0,
    surfaceK: 5.0,
    surfaceDrag: 0.28,
    anisoFriction: true,
    surfaceDragTan: 0.28,
    surfaceDragNorm: 0.01,
    airDrag: 0.2,
    g: 1.0,
    drawAtoms: true,
    drawBonds: false,
    drawAtomsGradient: true,
    sortPointsByZ: true,
    drawColliding: true
}

function runQuadDemo() {
    var simulation = {}

    window.s = simulation;
    
    var model = makeFallingStrutsWorld();
    
    simulation.world = model.world;
    simulation.world.cc = 0;
    
    simulation.simDt = 0.03;
        
    function hashSim(world, step) {
        console.log("Sim timestep="+step+" hash="+util.stringHash(JSON.stringify(world.points.map(function(p) { return p.pos })))+" cc="+world.cc);
    }
    
    simulation.postTimestep = function (world, dt, n) {
        if (n == 20) {
            hashSim(world, n)
        }
        if (n == 250) {
            hashSim(world, n)
        }
    }
    
    runSimulationInViewer(simulation);
}

