// Common 3d subroutines for Javascript
// Copyright (c) 2016 Crystalline Emerald
// Licensed under MIT license.

//Initial slow implementation
//TODO: Speed up
//TODO: lower allocation overhead
//TODO: Make consistent function names

var epsilon = 0.0001;

function makeArray(n, init) {
    var a = new Array(n);
    if (init) {
        var i;
        for(i=0; i<n; i++) {
            if (typeof init == 'function')
                a[i] = init(i);
            else
                a[i] = init;
        }
    }
    return a;
}

function makeVec3(x,y,z) {
    x = x || 0; y = y || 0; z = z || 0; 
    return [x,y,z];
}

function zeroVec3(dst) {
    dst[0] = 0; dst[1] = 0; dst[2] = 0;
}

function compareVec3(va, vb) {
    return va[0] == vb[0] && va[1] == vb[1] && va[2] == vb[2];
}

function copyVec3(src, dst) {
    dst = dst || makeVec3(0,0,0);
    dst[0] = src[0];
    dst[1] = src[1];
    dst[2] = src[2];
    return dst;
}

function makeQuat(w,x,y,z) {
    return [w,x,y,z];
}

function makeMatrix(w, h, init) {
    var m = makeArray(w*h, 0);
    m.w = w;
    m.h = h;
    if (init) {
        var i;
        for (i=0; i<w*h; i++) {
            if (typeof init == 'number') { m[i] = init; }
            else if (typeof init == 'function') { m[i] = init(Math.floor(i/w), i%w); }
            else if (init.length) { m[i] = init[i]; }
        }
    }
    return m;
}

function makeIdentityMat(w,h) {
    return makeMatrix(w,h, function(i,j) { if (i==j) return 1; else return 0; });
}

function l2normSquare(v) {
    var i, result = 0;
    for (i=0; i<v.length; i++) {
        result += v[i]*v[i];
    }
    return result;
}

function l2norm(v) {
    return Math.sqrt(l2normSquare(v));
}

function distSquareVec3(va, vb) {
    var dx = va[0]-vb[0],
        dy = va[1]-vb[1],
        dz = va[2]-vb[2];
    return dx*dx+dy*dy+dz*dz;
}

function distVec3(va, vb) {
    return Math.sqrt(distSquareVec3(va, vb));
}

function matXvec(mat, vec, res) {
    res = res || new Array(mat.h);
    var i, j, w = mat.w, h = mat.h;
    for (i=0; i<h; i++) {
        res[i] = 0;
        for (j=0; j<w; j++) {
            res[i] += mat[w*i+j]*vec[j];
        }
    }
    return res;
}

function scalXvec(scalar, vec, res) {
    res = res || new Array(vec.length);
    var i;
    for (i=0; i<vec.length; i++) {
        res[i] = scalar*vec[i];
    }
    return res;
}

function normalize(vec, res) {
    var invnorm = l2norm(vec);
    if (invnorm < epsilon)
        invnorm = 0;
    else
        invnorm = 1/invnorm;
    return scalXvec(invnorm, vec, res);
}

function addVecs(va, vb, res) {
    res = res || new Array(va.length);
    var i;
    for (i=0; i<va.length; i++) {
        res[i] = va[i] + vb[i];
    }
    return res;
}

function addArrOfVecs(arr, res) {
    if (arr.length < 2) return;
    var i, j, n = arr[0].length;
    res = res || new Array(n);
    for (j=0; j<n; j++) { res[j] = 0; }
    for (i=0; i<arr.length; i++) {
        addVecs(res, arr[i], res);
    }
    return res;
}

function subVecs(va, vb, res) {
    res = res || new Array(va.length);
    var i;
    for (i=0; i<va.length; i++) {
        res[i] = va[i] - vb[i];
    }
    return res;
}

function dotVecs(va, vb) {
    var i, acc=0;
    for (i=0; i<va.length; i++) {
        acc += va[i] * vb[i];
    }
    return acc;
}

function crossVecs(a, b, res) {
    res = res || new Array(3);
    res[0] = a[1]*b[2] - a[2]*b[1];
    res[1] = a[2]*b[0] - a[0]*b[2];
    res[2] = a[0]*b[1] - a[1]*b[0];
    return res;
}

function project(target, vec) {
    return scalXvec(dotVec(target, vec), normalize(target));
}

function matXmat(a, b, res) {
    if (a.w != b.h) return;
    res = res || new makeMatrix(b.w, a.h);
    var i,j,k;
    for (i=0; i<a.h; i++) {
        for (j=0; j<b.w; j++) {
            res[b.w*i+j] = 0;
            for (k=0; k<a.w; k++) {
                res[b.w*i+j] += a[a.w*i+k] * b[j+k*b.w];
            }
        }
    }
    return res;
}

function rotMatFromEulerAngles(angle_x, angle_y, angle_z, mat) {
    var mat = mat || makeMat(3,3);
    
    var A       = cos(angle_x);
    var B       = sin(angle_x);
    var C       = cos(angle_y);
    var D       = sin(angle_y);
    var E       = cos(angle_z);
    var F       = sin(angle_z);
    var AD      =   A * D;
    var BD      =   B * D;

    mat[0]  =   C * E;
    mat[1]  =  -C * F;
    mat[2]  =  -D;
    mat[3]  = -BD * E + A * F;
    mat[4]  =  BD * F + A * E;
    mat[5]  =  -B * C;
    mat[6]  =  AD * E + B * F;
    mat[7]  = -AD * F + B * E;
    mat[8] =   A * C;
    
    return mat;
}

function ang2rad(angle) {
    return 2 * Math.PI * (angle/360);
}

function rad2ang(angle) {
    return 360*angle/(2 * Math.PI);
}

//Rodriguez formula
function rotateAxisAngle(unitAxis, phi, v, res) {
    return addArrOfVecs( [
                scalXvec( Math.cos(phi), v),
                scalXvec( Math.sin(phi), crossVecs(unitAxis, v) ),
                scalXvec( dotVecs(unitAxis, v) * (1 - Math.cos(phi)), unitAxis)
           ] );
}

//Quaternions
var addQuats = addVecs;

function mulQuats(A, B, res) {
    res = res || new Array(4);
    var s1 = A[0], s2 = B[0],
        v1 = [A[1], A[2], A[3]],
        v2 = [B[1], B[2], B[3]];
    res[0] = s1*s2 - dotVecs(v1, v2);
    var v = addArrOfVecs( [
        scalXvec(s1, v2), scalXvec(s2, v1), crossVecs(v1, v2)
    ] );
    res[1] = v[0];
    res[2] = v[1];
    res[3] = v[2];
    return res;
}

function conjQuat(A, res) {
    res = res || new Array(4);
    res[0] = A[0];
    res[1] = -A[1];
    res[2] = -A[2];
    res[3] = -A[3];
    return res;
}

function invQuat(A, res) {
    return scalXvec( 1/l2norm(A), conjQuat(A), res);
}

function makeQuaternionRotation(unitAxis, phi, res) {
    res = res || new Array(4);
    if (Math.abs(phi) < epsilon) { res[0] = 1; res[1] = 0; res[2] = 0; res[3] = 0; return res; }
    res[0] = Math.cos(phi*0.5);
    var s = Math.sin(phi*0.5);
    res[1] = s*unitAxis[0];
    res[2] = s*unitAxis[1];
    res[3] = s*unitAxis[2];
    normalize(res, res);
    return res;
}

function applyQuaternionRotation(q, v, res) {
    var vtemp = [0, v[0], v[1], v[2]];
    var qres = mulQuats( mulQuats( q, vtemp ), conjQuat( q ) );
    var res = res || makeVec3(0,0,0);
    res[0] = qres[1];
    res[1] = qres[2];
    res[2] = qres[3];
    return res;
}

function S(x) { return x*x }

function quaternionToRotMatrix(q, res) {
    res = res || makeMatrix(3,3);
    var s = q[0], vx = q[1], vy = q[2], vz = q[3];
    res[0] = 1 - 2*(S(vy)+S(vz));
    res[1] = 2*(vx*vy-s*vz);
    res[2] = 2*(vx*vz+s*vy);
    res[3] = 2*(vx*vy+s*vz);
    res[4] = 1-(2*(S(vx)+S(vz)));
    res[5] = 2*(vy*vz-s*vx);
    res[6] = 2*(vx*vz-s*vy);
    res[7] = 2*(vy*vz+s*vx);
    res[8] = 1-2*(S(vx)+S(vy));
    return res;
}

function quaternionToAxisAngle(q, res) {
    res = res || new Array(4);
    var phi = 2*Math.acos(q[0]);
    var vtemp = normalize([[q0], q[1], q[2]]);
    res[0] = vtemp[0]; res[1] = vtemp[1]; res[2] = vtemp[2];
    res[3] = phi;
    return res;
}

function testQuaternions() {
    var a = normalize([Math.random()-0.5, Math.random()-0.5, Math.random()-0.5]);
    var phi = (Math.random()-0.5)*Math.PI;
    var ra = makeQuaternionRotation(a, phi);
    var ra2 = makeQuaternionRotation(a, phi*2);
    var rara = mulQuats(ra, ra);
    
    var test = [Math.random()-0.5, Math.random()-0.5, Math.random()-0.5];
    
    var a = applyQuaternionRotation(ra, applyQuaternionRotation(ra, test));
    var b = applyQuaternionRotation(ra2, test);
    var c = applyQuaternionRotation(rara, test);
    //var d = rotateAxisAngle(a, phi*2, test);
    
    if (distVec3(a,b) > epsilon || distVec3(a,c) > epsilon || distVec3(b,c) > epsilon ) {
         // || distVec3(b,d) > epsilon) {
        console.log("Quaternion tests FAILED");
        console.log(a);
        console.log(b);
        console.log(c);
        //console.log(d);
    } else {
        console.log("Quaternion tests passed");
    }
}

//Check ball and 3d-cylinder for intersection (when rayRadius == 0 cylinder becomes a ray)
function rayBallIntersect(src, normal, rayRadius, ballPos, ballRad) {
    rayRadius = rayRadius || 0;
    var relCoord = subVecs(ballPos, src);
    var proj = dotVecs(relCoord, normal);
    var rayProj = scalXvec(proj, normal);
    var tangentLen = distSquareVec3(rayProj, relCoord);
    if (tangentLen < (ballRad+rayRadius)*(ballRad+rayRadius)) {
        return true;
    }
}

//Orthographic camera
function makeCamera(position, alpha, beta, screenW, screenH, scale) {
    var camera = {pos: position};
    
    camera.refForward = [0,0,-1];
    camera.refRight = [1,0,0];
    
    camera.updateTransform = function (alpha, beta, screenW, screenH, scale) {
        
        if (util.isNumeric(alpha)) this.alpha = alpha;
        if (util.isNumeric(beta)) this.beta = beta;
        if (util.isNumeric(screenW)) this.screenW = screenW;
        if (util.isNumeric(screenH)) this.screenH = screenH;
        if (util.isNumeric(scale)) this.scale = scale;
                
        this.rotForward = makeQuaternionRotation(this.refForward, -this.alpha);
        this.rotRight = makeQuaternionRotation(this.refRight, -this.beta);
        
        this.irotForward = makeQuaternionRotation(this.refForward, this.alpha);
        this.irotRight = makeQuaternionRotation(this.refRight, this.beta);
        
        this.rotation = mulQuats(this.rotRight,this.rotForward);
        this.irotation = mulQuats(this.irotForward,this.irotRight);
        
        this.right = applyQuaternionRotation(this.irotForward, this.refRight);        
        this.forward = applyQuaternionRotation(this.irotation, this.refForward);
        
        this.top = crossVecs(this.right, this.forward);
        this.planeForward = normalize(makeVec3(this.forward[0], this.forward[1], 0));
        this.planeRight = normalize(makeVec3(this.right[0], this.right[1], 0));        
        
        if (this.screenW < this.screenH) {
            this.screenScaling = this.screenW*this.scale;
        } else {
            this.screenScaling = this.screenH*this.scale;
        }
        
        this.screenMatrix = makeMatrix(3,3,
            [this.screenScaling,0,0,
             0,this.screenScaling,0,
             0,0,this.screenScaling]);

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
    
    camera.getRayFromScreen = function(screenX, screenY) {
        var size = Math.min(this.screenW,this.screenH);
        var nX = (screenX-0.5*this.screenW)/this.screenScaling;
        var nY = ((this.screenH-screenY)-0.5*this.screenH)/this.screenScaling;
        var scrSource = addArrOfVecs([ scalXvec(nX, this.right), scalXvec(nY, this.top)]);
        
        var res = {normal: this.forward,
                   scrSource: scrSource,
                   source: addArrOfVecs([this.pos, scrSource])};
        return res;
    };
    
    camera.getWorldXYFromScreenXY = function(screenX, screenY) {
        var size = Math.min(this.screenW, this.screenH);
        var nX = (screenX-0.5*this.screenW)
        var nY = ((this.screenH-screenY)-0.5*this.screenH)
        var scrSource = addArrOfVecs([ scalXvec(nX, this.right), scalXvec(nY, this.top)]);
        return {x: nX, y: nY};
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

