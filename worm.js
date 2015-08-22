//C-elegans-like worm model constructor
//Author: Crystalline Emerald (crystalline.emerald@gmail.com)

//L is the number of rings, N is a number of sections per ring R is radius of ring, dist is distance between rings	   
function makeWormModel(L, N, dist, k, mass, radialProfile, pradius) {
    
    var rings = [];
    var axialSprings = [];
    var lines = new Array(N);
    var i,j;
    
    var points = [];
    var springs = [];
    
    for (i=0; i<L; i++) {
        var R = radialProfile(i/L);
        var ring = makeRingZ(R, N, mass, k, Math.PI/6);
        points = points.concat(ring.points);
        springs = springs.concat(ring.springs);
        rings.push(translatePoints(makeVec3(i*dist, 0, 0), rotatePoints(makeVec3(0,1,0), Math.PI/2, ring)));
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

    var body = {points: points, springs: springs, rings: rings, lines: lines, leftLines: [lines[1]], rightLines: [lines[4]]};
    
    translatePoints(makeVec3(-L*dist/2,0,2), body);
    
    if (pradius) body.points.forEach(function(p) {
        p.radius = pradius;
    });
    
    return body;
}

function wormProfile(x) {
    var Kl = (Rmid-Rend)/0.5;
    var Bl = Rend;
    var Br = Rmid+(Kl/2);
    if (x<0.5) {
        return Kl*x+Bl;
    } else {
        return -Kl*x+Br;
    }
};

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
    collisions: false,
    collisionK: 5,
    surfaceK: 5.0,
    surfaceDrag: 0.28,
    anisoFriction: true,
    surfaceDragTan: 0.28,
    surfaceDragNorm: 0.01,
    airDrag: 0.01,
    g: 1.0,
    springsHooke: true
}

//Controller parameters
var period = 300;
var startTime = 250;
var freq = 2.5;

//Worm parameters

//Middle radius
var Rmid = 1.6;
//End radius
var Rend = 1.0;

var wormSections = 31;
var wormLines = 6;
var wormSectionSpacing = 1.2;
var wormStiffness = 30;
var wormPointMass = 0.1;
var wormBallRadius = 0.5;

var contractionLimit = 0.5*wormSectionSpacing;

function runWormDemo() {
    var simulation = {}

    window.s = simulation;
    simulation.world = makeSimWorld(worldSettings);
    simulation.worm = makeWormModel(wormSections, wormLines, wormSectionSpacing, wormStiffness, wormPointMass, wormProfile, wormBallRadius);
    simulation.world.addSoftBody(makeSoftBody(simulation.worm.points, simulation.worm.springs));
    simulation.simDt = 0.03;
    simulation.controller = function(world, dt, nStep, simConfig) {
        wormControllerStep(simConfig.worm, dt, nStep);
    };
    simulation.setup = function(world, camera, gui, simConfig) {
        gui.add(window, "wormStiffness").onFinishChange(function(val) {
            simConfig.worm.springs.forEach(function(spr) { spr.l = wormStiffness });
        });
    };
    
    runSimulationInViewer(simulation);
}

