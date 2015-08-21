//Quadruped creature constructor
//Author: Crystalline Emerald (crystalline.emerald@gmail.com)

//L is the number of rings, N is a number of sections per ring radialProfile is a function that returns radius of ring given its number, dist is distance between rings	   
function makeRadialProfile(L, N, dist, k, mass, radialProfile, fixOrigin) {
    
    var rings = [];
    var axialSprings = [];
    var lines = new Array(N);
    var i,j;
    
    var points = [];
    var springs = [];
    
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
        var linkRes = linkRings(rings[i], rings[i+1], dist, k);
        axialSprings = axialSprings.concat(linkRes.springs);
        
        for (j=0; j<N; j++) {
            if (lines[j]) lines[j].push(linkRes.muscles[j]);
            else lines[j] = [linkRes.muscles[j]];
        }
    }
    
    springs = springs.concat(axialSprings);
    
    var body = {points: points, springs: springs, rings: rings, lines: lines};
    
    return body;
}

function legProfile(x) {
    var Kl = (Rmid-Rend)/0.5;
    var Bl = Rend;
    var Br = Rmid+(Kl/2);
    if (x<0.5) {
        return Kl*x+Bl;
    } else {
        return -Kl*x+Br;
    }
};

//config: {origin:, dir:, alpha:, nsegments:, seglen:, nlines:, stiffness:,
//         pmass:, pradius:, pcolor:, shape:, fixorigin:}
function makeLeg(config) {
    var shape = config.shape;
    if (typeof config.shape == 'number') { shape = function (x) { return config.shape; }; }
    var leg = makeRadialProfile(config.nsegments, config.nlines, config.seglen, config.stiffness, config.pmass, shape, config.fixorigin);
    var dir = normalize(config.dir);
    var legAxis = [0,0,1];
    var rotAxis = normalize(crossVecs(legAxis, dir));
    var rotAngle = Math.acos(dotVecs(legAxis, dir));
    if (config.alpha) rotatePoints(legAxis, config.alpha, leg)
    translatePoints(config.origin, rotatePoints(rotAxis, rotAngle, leg));
    leg.points.forEach(function(p) {
        p.radius = config.pradius;
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

var worldSettings = {
    collisions: true,
    collisionK: 20.0,
    surfaceK: 5.0,
    surfaceDrag: 0.28,
    anisoFriction: true,
    surfaceDragTan: 0.28,
    surfaceDragNorm: 0.01,
    airDrag: 0.2,
    g: 1.0
}

//Controller parameters
var period = 500;
var startTime = 250;
var freq = 2.5;

var contractionLimit = 0.7;

function runQuadDemo() {
    var simulation = {}

    window.s = simulation;
    
    simulation.world = makeSimWorld(worldSettings);
    
    /*
    var leg1 = makeLeg({origin: [0,0,3],
                        dir: [0,0,1],
                        nsegments: 6,
                        seglen: 0.9,
                        nlines: 8,
                        stiffness: 30,
                        pmass: 1,
                        pradius: 0.5,
                        shape: 1.2});
    
    simulation.world.addSoftBody(makeSoftBody(leg1.points, leg1.springs));
       
    var leg2 = makeLeg({origin: [0,-3,0],
                        dir: [0,1,0],
                        nsegments: 10,
                        seglen: 1.1,
                        nlines: 2,
                        stiffness: 30,
                        pmass: 1,
                        pradius: 0.5,
                        shape: 1.5});
    
    simulation.world.addSoftBody(makeSoftBody(leg2.points, leg2.springs));
    */
    
    var leg1 = makeLeg({origin: [-1,0,6],
                        dir: [0,0,1],
                        nsegments: 6,
                        seglen: 1.1,
                        nlines: 6,
                        stiffness: 30,
                        pmass: 1,
                        pradius: 0.5,
                        shape: 1.3});
    
    simulation.world.addSoftBody(makeSoftBody(leg1.points, leg1.springs));
       
    var leg2 = makeLeg({origin: [0,-3,1.5],
                        dir: [0,1,0],
                        nsegments: 10,
                        seglen: 1.1,
                        nlines: 6,
                        stiffness: 30,
                        pmass: 1,
                        pradius: 0.5,
                        shape: 1.3});
    
    simulation.world.addSoftBody(makeSoftBody(leg2.points, leg2.springs));
    
    var leg3 = makeLeg({origin: [-3,0,8],
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
    
    simulation.simDt = 0.03;
    simulation.setup = function(world, camera, gui, simConfig) {
        gui.add(world, "sortPointsByZ");
    };
    
    runSimulationInViewer(simulation);
}
