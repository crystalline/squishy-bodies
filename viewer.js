//Generic HTML5 viewer for running squishy-body simulations. Provides camera and default controls, allows for customization via callbacks. See the main function runSimulationInViewer for details.
//Author: Crystalline Emerald (crystalline.emerald@gmail.com)

function makeAnimationController(settings) {
    var ac = {animations:[], freeList:[]};
    
    ac.addAnim = function(obj, prop, target, time, ondone) {
        var anim = {}
        anim.obj=obj;
        anim.prop=prop;
        anim.start=obj[prop];
        anim.target=target;
        anim.velocity=(target-obj[prop])/time;
        anim.ondone=ondone;
        this.animations.push(anim);
    };
    
    ac.step = function(dt) {
        var i = 0;
        this.fps = 1/dt;
        for (i=this.animations.length-1; i>=0; i--) {
            var anim = this.animations[i];
            var propVal = anim.obj[anim.prop];
            var incremented = propVal + anim.velocity * dt;
            
            if (Math.abs(anim.target - incremented) < Math.abs(anim.target - propVal)) {
                anim.obj[anim.prop] = incremented;
            } else {
                anim.obj[anim.prop] = anim.target;
                if (typeof anim.ondone == "function") { anim.ondone(); }
                this.animations.splice(i,1);
            }
        }        
    };
    
    return ac;
}

function makeGraphics() {
    var graphics = {}
    
    graphics.canvas = document.createElement('canvas');
    graphics.canvas.style.position = 'absolute';
    document.body.appendChild(graphics.canvas);
    
    graphics.ctx = graphics.canvas.getContext('2d');
    graphics.ctx.fillStyle = '#2F49C2';
    graphics.ctx.strokeStyle = '#2F49C2';
    graphics.ctx.font = "60px Arial";
    graphics.size = 1;
    
    graphics.resize = function() {
        var w = window.innerWidth;
        var h = window.innerHeight;
        this.w = w;
        this.h = h;
                
        this.canvas.setAttribute('width', w);
        this.canvas.setAttribute('height', h);
        
        //Reset transform to default
        this.ctx.setTransform(1, 0, 0, 1, 0, 0);
        
        if (w > h) {
            this.scale = 1;
            //this.scale = h/10;
            this.py = 0;
            this.px = (w-h)/2;
        } else {
            this.scale = 1;
            //this.scale = w/10;
            this.px = 0;
            this.py = (h-w)/2;
        }
        
        //this.ctx.setTransform(this.scale, 0, 0, -this.scale, this.px, h);
        this.ctx.setTransform(this.scale, 0, 0, -this.scale, w/2, h/2);
        graphics.clear();
    };
    
    graphics.drawCircle = function(x, y, r, stroke, col) {
        var oldCol;
        if (col) { oldCol = this.ctx.fillStyle; this.ctx.fillStyle = col; }
        var ctx = this.ctx;
        if (ctx.stroke) ctx.lineWidth = stroke;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, 2 * Math.PI, false);
        if (!stroke) ctx.fill();
        else ctx.stroke();
        if (oldCol) { this.ctx.fillStyle = oldCol; }
    };
    
    graphics.drawRect = function(x, y, w, h, col) {
        var oldCol;
        if (col) { oldCol = this.ctx.fillStyle; this.ctx.fillStyle = col; }
        var ctx = this.ctx;
        ctx.fillRect(x, y, w, h);
        if (oldCol) { this.ctx.fillStyle = oldCol; }
    };
    
    graphics.drawLine = function(x1, y1, x2, y2, width, col) {
        var ctx = this.ctx;
        var oldCol;
        if (col) { oldCol = this.ctx.strokeStyle; this.ctx.strokeStyle = col; }
        ctx.beginPath();
        ctx.lineWidth = width || 1/this.size;
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
        if (oldCol) { this.ctx.strokeStyle = oldCol; }
    };  
    
    graphics.clear = function() {
        var ctx = this.ctx;
        ctx.save();
        this.ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, this.w, this.h);
        ctx.restore();
    };
    
    graphics.drawText = function(text,x,y) {
        this.ctx.save();
        this.ctx.setTransform(2, 0, 0, 2, 0, 0);
        if (typeof text == "string") {
            this.ctx.fillText(text, x, y);
        }
        if (typeof text == "object" && text.length) {
            var i;
            for (i=0; i<text.length; i++) {
                this.ctx.fillText(text[i], x, y+i*10);            
            }
        }
        this.ctx.restore();
    }
    
    graphics.resize();
    
    return graphics;
}

var importexport = {
    loadWorld: function () {
        
    },
    saveWorld: function () {
        
    }
};

//To run a simulation in viewer you should and provide it
//and it's configuration in a simConfig object
//Necessary fields: world, simDt, controller
function runSimulationInViewer(simConfig) {
    console.log("Start");
    
    graphics = makeGraphics();
    graphics.resize();
    graphics.drawCircle( 0, 0, 1, false, "#FF00FF");
    
    var world = simConfig.world;
    var simDt = simConfig.simDt;
    
    var camera = makeCamera([0,0,0], Math.PI/4, Math.PI/3, graphics.w, graphics.h, 0.04);  
    
    //Cache for camera parameters changed by gui
    var cam = {alpha: rad2ang(camera.alpha), beta: rad2ang(camera.beta),
               scale: 0.04, x: 0, y:0, z:0};
    
    var gui = new dat.GUI();
    
    var config = {pauseSim: false, pauseRender: false, controller: true};
    
    var ac = makeAnimationController();
    
    function camUpdate(value) {
        camera.needUpdate = true;
        camera.alpha = ang2rad(cam.alpha);
        camera.beta = ang2rad(cam.beta);
        camera.pos = [cam.x, cam.y, cam.z];
        camera.scale = cam.scale;
    };
    
    gui.add(config, "pauseRender");
    gui.add(config, "pauseSim");
    gui.add(simConfig, "simDt");
    gui.add(config, "controller");
    gui.add(cam, "alpha", -180, 180).onChange(camUpdate);
    gui.add(cam, "beta", -180, 180).onChange(camUpdate);
    gui.add(cam, "scale").onChange(camUpdate);
    gui.add(cam, "x").onChange(camUpdate);
    gui.add(cam, "y").onChange(camUpdate);
    gui.add(cam, "z").onChange(camUpdate);
    
    gui.updateManually = function() {
        var gui = this;
        // Iterate over all controllers
        for (var i in gui.__controllers) {
            gui.__controllers[i].updateDisplay();
        }
    };
    
    //Mouse event handling
    var mouseDown = 0;
    var px=false;
    var py=false;
    
    window.addEventListener("resize", function() {
        graphics.resize();
        camera.screenW = window.innerWidth;
        camera.screenH = window.innerHeight;
        camera.updateTransform();
    }, false);
    
    graphics.canvas.addEventListener("mousemove", function(event) {
        var x = event.pageX;
        var y = event.pageY;
        if (mouseDown && px && py) {
            cam.beta -= (y - py);
            cam.alpha -= (x - px);
            gui.updateManually();
            camUpdate();
        }
        px = x;
        py = y;
    }, false);
    graphics.canvas.onmousedown = function() { 
        mouseDown = 1;
    }
    graphics.canvas.onmouseup = function() {
        mouseDown = 0;
        px=false;
        py=false;
    }
    
    //Keyboard event handling
    function getChar(event) {
        if (event.which == null) { // IE
            if (event.keyCode < 32) return null;
            return String.fromCharCode(event.keyCode);
        }
        if (event.which != 0) {
            if (event.which < 32) return null;
            return String.fromCharCode(event.which);
        }
        return null;
    }
    var camMoved = false;
    var movekeys = {
        "W":[0,1,0],
        "S":[0,-1,0],
        "A":[-1,0,0],
        "D":[1,0,0]
    };
    window.addEventListener("keydown", function(event) {
        var vec = movekeys[getChar(event)];
        if (vec && !camera.posUpdate) {
            var delta = scalXvec(1, addArrOfVecs( [scalXvec(vec[0],camera.planeForward), scalXvec(vec[1],camera.planeRight), scalXvec(vec[2],camera.refTop) ] ));
            cam.x += delta[1];
            cam.y += delta[0];
            cam.z += 0;
            gui.updateManually();
            camUpdate();
        };
    });
    window.addEventListener("keyup", function(event) {
        
    });
    
    //Mainloop
    var prevFrameT = Date.now();
    var timestep = 0;
    
    function draw() {
        requestAnimationFrame(draw);
        if (camera.needUpdate) { 
            camera.needUpdate = false;
            camera.updateTransform();
        }
        if (!config.pauseSim) {
            if (simConfig.preTimestep) {
                simConfig.preTimestep(world, simDt*3, timestep*3, simConfig);
            }
            world.step(simDt);
            world.step(simDt);
            world.step(simDt);            
            ac.step(simDt);
            if (simConfig.postTimestep) {
                simConfig.preTimestep(world, simDt*3, timestep*3, simConfig);
            }
            if (simConfig.controller) {
                simConfig.controller(world, simDt*3, timestep*3, simConfig);
            }
        }
        if (!config.pauseRender) { 
            graphics.clear();
            world.draw(camera, graphics);
        }
        var time = Date.now();
        var frameT = time - prevFrameT;
        graphics.drawText([Math.round(1000/(frameT))+' fps',
                           (Math.round(world.measureEnergy()*10)/10)+ ' energy'], 10, 10);
        prevFrameT = time;
        timestep++;
    }
    
    if (simConfig.setup) {
        simConfig.setup(world, camera, gui, simConfig);
    }
    
    draw();
}

