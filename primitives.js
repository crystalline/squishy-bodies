//Mass-spring primitives for use in simulations
//Author: Crystalline Emerald (crystalline.emerald@gmail.com)

function rotatePoints(axis, phi, body, origin) {
    var i;
    for (i=0; i<body.points.length; i++) {
        if (origin) {
            body.points[i].pos = addVecs(origin,
                rotateAxisAngle(axis, phi, subVecs(body.points[i].pos, origin)));
        } else {
            body.points[i].pos = rotateAxisAngle(axis, phi, body.points[i].pos);
        }
    }
    return body;
}

function translatePoints(vec, body) {
    var i;
    for (i=0; i<body.points.length; i++) {
        addVecs(body.points[i].pos, vec, body.points[i].pos);
    }
    return body;
}

//Make ring of point masses connected with springs, last point is central
function makeRingZ(R, N, mass, k, phi0) {
    phi0 = phi0 || 0;
    var points = [];
    var springs = [];
    var phi = 2*Math.PI/N;
    var rvec = makeVec3(R, 0, 0);
    var axis = makeVec3(0, 0, 1);
    var dist = 2*R*Math.sin(phi/2);
    var i;
    
    for (i=0; i<N; i++) {
        points.push(makePoint(rotateAxisAngle(axis, phi0+phi*i, rvec), mass));
    }
    
    for (i=0; i<N-1; i++) {
        springs.push(makeSpring(points[i], points[i+1], dist, k));
    }
    
    springs.push(makeSpring(points[N-1], points[0], dist, k));
    
    points.push(makePoint(makeVec3(0,0,0), mass));
    
    for (i=0; i<N; i++) {
        springs.push(makeSpring(points[points.length-1], points[i], R, k));
    }
    
    var body = {points: points, springs: springs};
    
    return body;
}

function getRingRadius(ring) {
    return distVec3(ring.points[ring.points.length-1].pos, ring.points[0].pos);
}

//Returns list of springs and muscles
//Sets anisotropic friction pairs
function linkRings(A, B, dist, k, noCrossLink) {
    if (A.points.length == B.points.length) {
        var springs = [];
        var muscles = [];
        var Ra = getRingRadius(A);
        var Rb = getRingRadius(B);
        var diagonalA = Math.sqrt(dist*dist + Ra*Ra);
        var diagonalB = Math.sqrt(dist*dist + Rb*Rb);
        var i;
        
        for (i=0; i<A.points.length; i++) {
            //Create parallel spring
            var spr = makeSpring( A.points[i], B.points[i], dist, k);
            springs.push(spr);
            //Add corresponding point as anisotropic friction pair
            A.points[i].afpair = B.points[i];
            //Create muscle if not in central fiber
            if (i < A.points.length-1) {
                muscles.push({pa: A.points[i], pb: B.points[i], d: dist, spr: spr});
            }
        }
        
        if (!noCrossLink) for (i=0; i<A.points.length-1; i++) {
            var spA = makeSpring(A.points[A.points.length-1], B.points[i], diagonalA, k);
            var spB = makeSpring(A.points[i], B.points[B.points.length-1], diagonalB, k); 
            springs.push(spA);
            springs.push(spB);
            muscles[i].spA = spA;
            muscles[i].da = diagonalA;
            muscles[i].spB = spB;
            muscles[i].db = diagonalB;
        }
        
        return {springs: springs, muscles: muscles};
    } else {
        console.log("error: incompatible rings!");
    }
}

//Create cube objects for tests
function makeCube(center, side, mass, stiffness) {
    center = center || [0,0,0];
    side = side || 1;
    mass = mass || 1;
    stiffness = stiffness || 10;
    var vertices = [
        [-0.5,-0.5,-0.5],
        [0.5,-0.5,-0.5],
        [-0.5,0.5,-0.5],
        [0.5,0.5,-0.5],
        [-0.5,-0.5,0.5],
        [0.5,-0.5,0.5],
        [-0.5,0.5,0.5],
        [0.5,0.5,0.5]
    ];
    var points = [], springs = [];
    vertices.forEach(function(v) {
        var p = addVecs(scalXvec(side, v), center);
        points.push(makePoint(p, mass));
    });
    var diagonal = Math.sqrt(3)*side;
    var conns = [[0,1],[0,2],[3,1],[3,2],[4,5],[4,6],[7,5],[7,6],[0,4],[1,5],[2,6],[3,7]];
    var dconns = [[0,7],[1,6],[2,5],[3,4]];
    conns.forEach(function(c) {
        springs.push(makeSpring(points[c[0]], points[c[1]], side, stiffness));    
    });
    dconns.forEach(function(c) {
        springs.push(makeSpring(points[c[0]], points[c[1]], diagonal, stiffness));    
    });
    return {points: points, springs: springs};
}

function makeVoxelBox(l,w,h) {
    
}

function makeFromVoxelArray( ) {
    
}

function makeTetraTruss(center, dir, bondLen, nsegments, mass) {
    var proj = Math.sqrt(2)/2;
    var base = scalXvec(bondLen, makeVec3(0,0,1));
    var bases = [
        scalXvec(bondLen, makeVec3(0.5, 0, 0.5)),
        scalXvec(bondLen, makeVec3(-0.5, 0, 0.5)),
        scalXvec(bondLen, makeVec3(0,-proj,1)),
        scalXvec(bondLen, makeVec3(0,proj,1)),
    ];
    
    var points = [];
    var springs = [];
    
    function link(pa, pb) {
        springs.push({pa: pa, pb: pb, l: bondLen, k: 30});
    }
    
    function pointify(v) {
        return {mass:mass, pos:v, r:0.5};
    }
    
    var i,j;
    var top = [];
    var next = [];
    
    for (j=0; j<bases.length; j++) {
        top[j] = pointify(bases[j]);
        next[j] = copyVec3(top[j]);
        points.push(top[j]);
    }
    
    link(top[0], top[1]);
    
    for (i=0; i<nsegments; i++) {
        for (j=0; j<bases.length; j++) {
            next[j] = pointify(addVecs(top[j].pos, base));
            if (!(i == nsegments-1 && j > 1))
                points.push(next[j]);
        }
        
        link(top[0], top[2]);
        link(top[1], top[2]);
        
        link(top[0], next[0]);
        link(top[1], next[1]);
        
        link(top[2], next[0]);
        link(top[2], next[1]);
        
        link(next[0], next[1]);
        if (i<nsegments-1) link(top[2], next[2]);
        
        /////
        
        link(top[0], top[3]);
        link(top[1], top[3]);
        
        link(top[0], next[0]);
        link(top[1], next[1]);
        
        link(top[3], next[0]);
        link(top[3], next[1]);
        
        link(next[0], next[1]);
        if (i<nsegments-1) link(top[3], next[3]);
        
        top = next;
        next = [];
    }
    
    var result = {points: points, springs: springs};
    
    console.log(result);
    
    return result;
}



