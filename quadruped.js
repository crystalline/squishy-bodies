//Quadruped creature constructor
//Author: Crystalline Emerald (crystalline.emerald@gmail.com)

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

function makeFallingStrutsWorld() {
    var world = makeSimWorld(worldSettings);
    
    var i,j,N=9;
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

function makeClawWorld() {
    var world = makeSimWorld(worldSettings);
    
    var leg = makeLeg({origin: [0,0,0],
                        dir: [0,0,1],
                        nsegments: 16,
                        seglen: 1.1,
                        nlines: 6,
                        stiffness: 30,
                        pmass: 0.2,
                        pradius: 0.5,
                        shape: 1.3,
                        fixorigin: true,
                        muscle: {1:true, 2:true, 3:true, 8:true, 9:true, 10:true}});
    
    world.addSoftBody(makeSoftBody(leg.points, leg.springs));
    
    return {world:world, body:leg};
}

function makeTrussWorld() {
    var world = makeSimWorld(worldSettings);
    
    var truss = makeTetraTruss(0, [0,0,1], 1.1, 10, 0.1);
    
    world.addSoftBody(makeSoftBody(truss.points, truss.springs));
    
    return {world:world, body:truss};
}

function makeMomentumConservationTestWorld() {
    var world = makeSimWorld(worldSettings);
    var leg1 = makeLeg({origin: [0,0,3],
                        dir: [0,0,1],
                        nsegments: 6,
                        seglen: 0.9,
                        nlines: 8,
                        stiffness: 30,
                        pmass: 1,
                        pradius: 0.5,
                        shape: 1.2});
           
    var leg2 = makeLeg({origin: [0,-3,0],
                        dir: [0,1,0],
                        nsegments: 10,
                        seglen: 1.1,
                        nlines: 2,
                        stiffness: 30,
                        pmass: 1,
                        pradius: 0.5,
                        shape: 1.5});
    
    world.addSoftBody(makeSoftBody(leg1.points, leg1.springs));
    world.addSoftBody(makeSoftBody(leg2.points, leg2.springs));
    return {world:world};
}

function makeRigidityTestWorld() {
    var world = makeSimWorld(worldSettings);
    var leg1 = makeLeg({origin: [-3,0,8],
                        dir: [0,1,1],
                        alpha: Math.PI/10,
                        nsegments: 30,
                        seglen: 1.1,
                        nlines: 5,
                        stiffness: 30,
                        pmass: 1,
                        pradius: 0.5,
                        shape: function(x) { return x < 0.5 ? 1.0+(0.5-x) : 1.0 },
                        fixorigin: true});
    world.addSoftBody(makeSoftBody(leg1.points, leg1.springs));
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
    drawBonds: false,
    sortPointsByZ: 0
}

function runQuadDemo() {
    var simulation = {}

    window.s = simulation;
    
    var model = makeTrussWorld();
    
    simulation.world = model.world;//makeFallingStrutsWorld();
    console.log(model.body);
    simulation.world.cc = 0;
    
    simulation.simDt = 0.03;
    
    var muscles = {};
    
    var sq2 = Math.sqrt(2);
    var restL = 1.1;
    var minL = 0.7*restL;
    var maxL = 1.3*restL;
    
    function linMap(x, a, b) {
        return a + Math.min(1,Math.max(0,x))*(b-a);
    }
    
    function controlClaw (world, camera, gui, simConfig) {
        actuators1 = model.body.muscles[8];
        actuators2 = model.body.muscles[9];
        actuators3 = model.body.muscles[10];
        
        console.log(model.body.muscles);
        
        var i;
        var N = Math.floor(actuators1.length/2);
        
        function actuate(actuators,i,x) {
            actuators[i].spr.l = linMap(x, minL, maxL);
            actuators[i].spA.l = sq2*linMap(x, minL, maxL);
            actuators[i].spB.l = sq2*linMap(x, minL, maxL);
            actuators[i+N].spr.l = linMap(1-x, minL, maxL);
            actuators[i+N].spA.l = sq2*linMap(1-x, minL, maxL);
            actuators[i+N].spB.l = sq2*linMap(1-x, minL, maxL);
        }
        
        var attachHandler = function (pre, i, actuators) {
            muscles[pre+i] = 0.5;
            gui.add(muscles, pre+i, 0, 1).onChange(function (x) {
                var k;
                for (k=0; k<actuators.length; k++) {
                    actuate(actuators[k], i, x);                
                }
                gui.updateManually();
            });        
        };
        
        var joint1 = [model.body.muscles[8],model.body.muscles[9],model.body.muscles[10]];
        var joint2 = [model.body.muscles[1],model.body.muscles[2],model.body.muscles[3]];
        
        for (i=0; i<N; i++) {
            attachHandler("top", i, joint1);
        }
        
        for (i=0; i<N; i++) {
            attachHandler("bot", i, joint2);
        }
    };
    
    function controlTruss(world, camera, gui, simConfig) {
    
    };
    
    simulation.setup = controlTruss;
    
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

