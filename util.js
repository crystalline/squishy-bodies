//JS utility functions
//Author: Crystalline Emerald (crystalline.emerald@gmail.com)

util = {
    isNumeric: function(n) {
        return !isNaN(n) && isFinite(n);
    },
    simpleExtend: function(dst, src) {
        for (var k in src) {
            if (src.hasOwnProperty(k)) {
                dst[k] = src[k];
            }
        }
        return dst;
    },
    pushBack: function(dst, src) {
        var i;
        var start = dst.length;
        for (i=0; i<src.length; i++) {
            dst[start+i] = src[i];
        }
        return dst;
    },
    arrayShuffle: function (array, random) {
        random = random || Math.random;
        for (var i = array.length - 1; i > 0; i--) {
            var j = Math.floor(random() * (i + 1));
            var temp = array[i];
            array[i] = array[j];
            array[j] = temp;
        }
        return array;
    },
    extend: function() {
        if (arguments.length > 1) {
            var i;
            for (i=1; i<arguments.length; i++) {
                this.simpleExtend(arguments[0], arguments[i]);
            }
        }
        return arguments[0];
    },
    //Very simple pseudorandom number generator
    prng: function(seed) {
        this.seed = seed % 2147483647;
        if (this.seed <= 0) this.seed += 2147483646;
        this.state = this.seed;
    }
};

util.prng.prototype.nextInt = function () {
    return this.state = this.state * 16807 % 2147483647;
};

util.prng.prototype.next = function () {
    // We know that result of next() will be 1 to 2147483646 (inclusive).
    return (this.nextInt() - 1) / 2147483646;
};

util.prng.prototype.reset = function() { this.state = this.seed };

util.prng.prototype.test = function() {
    var s = 0;
    for (var i = 0; i<1000; i++) {
        s += this.next();
    }
    console.log('Testing prng, seed= '+this.seed);
    console.log('Expected value: '+s/1000);
    this.reset();
};
