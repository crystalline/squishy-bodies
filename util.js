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
    extend: function() {
        if (arguments.length > 1) {
            var i;
            for (i=1; i<arguments.length; i++) {
                this.simpleExtend(arguments[0], arguments[i]);
            }
        }
        return arguments[0];
    }
};
