//JS utility functions

util = {
    simpleExtend: function(dst, src) {
        for (var k in src) {
            if (src.hasOwnProperty(k)) {
                dst[k] = src[k];
            }
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
