//Common 3d subroutines ported to JS from CL
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
    return [x,y,z];
}

function makeQuat(w,x,y,z) {
    return [w,x,y,z];
}

function makeMatrix(w, h) {
    var m = makeArray(w*h, 0);
    m.w = w;
    m.h = h;
    return m;
}

function l2norm(v) {
    var i, result;
    for (i=0; i<v.length; i++) {
        result += v[i]*v[i];
    }
    return Math.sqrt(result);
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
    return sXv(invnorm, vec, res);
}

function addVecs(va, vb, res) {
    res = res || new Array(vec.length);
    var i;
    for (i=0; i<va.length; i++) {
        res[i] = va[i] + vb[i];
    }
    return res;
}

function addArrOfVecs(arr, res) {
    if (arr.length < 2) return;
    var i, n = arr[0].length;
    res = res || new Array(n);
    for (i=0; i<arr.length; i++) {
        addVecs(res, arr[i], res);
    }
    return res;
}

function subVecs(va, vb, res) {
    res = res || new Array(vec.length);
    var i;
    for (i=0; i<va.length; i++) {
        res[i] = va[i] - vb[i];
    }
    return res;
}

function dotVecs(va, vb, res) {
    var i, acc=0;
    for (i=0; i<va.length; i++) {
        acc += va[i] * vb[i];
    }
    return acc;
}

function crossVecs(a, b, res) {
    res = res || new Array(3);
    res[0] = a[2]*b[3] - a[3]*b[2];
    res[1] = a[3]*b[1] - a[1]*b[3];
    res[2] = a[1]*b[2] - a[2]*b[1];
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
            res[a.w*i+j] = 0;
            for (k=0; k<a.w; k++) {
                res[a.w*i+j] += a[a.w*i+k] * b[j+k*b.w]
            }
        }
    }
}

function ang2rad(angle) {
    return 2 * Math.PI * (angle/360);
}

//Rodriguez formula
function rotateAxisAngle(unitAxis, phi, v, res) {
    return addArrOfVecs(
                scalXvec( Math.cos(phi), v),
                scalXvec( Math.sin(phi), crossVec(unitAxis, v) ),
                scalXvec( dotVecs(unitAxis, v) * (1 - Math.cos(phi)), k) );
}

//Quaternions
var addQuats = addVecs;

function mulQuats(A, B, res) {
    res = res || new Array(4);
    var s1 = A[1], s2 = B[1],
        v1 = [A[2], A[3], A[4]],
        v2 = [B[2], B[3], B[4]];
    res[0] = s1*s2 - dotVecs(v1, v2);
    var v = addArrOfVecs( [
        scalXvec(s1, v2), scalXvec(s2, v1), crossVec(v1, v2)
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
    res[0] = Math.cos(phi*0.5);
    var s = Math.sin(phi*0.5);
    res[1] = s*unitAxis[1];
    res[2] = s*unitAxis[1];
    res[3] = s*unitAxis[1];
    return res;
}

function applyQuaternionRotation(q, v, res) {
    var vtemp = [0, v[0], v[1], v[2]];
    var qres = mulQuats( mulQuats( q, vtemp ), conjQuat( q ) );
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

