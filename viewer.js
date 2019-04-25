// Generic HTML5 viewer for running simulations with squishy-body physics engine.
// Provides camera and default controls, allows for customization via callbacks.
// See the main function runSimulationInViewer for details.
// Copyright (c) 2016 Crystalline Emerald
// Licensed under MIT license.

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
        ctx.arc(Math.round(x), Math.round(y), Math.round(r), 0, 2 * Math.PI, false);
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
        ctx.moveTo(Math.round(x1), Math.round(y1));
        ctx.lineTo(Math.round(x2), Math.round(y2));
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
        this.ctx.fillStyle = "#00AA00";
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
    
    var camera = makeCamera([0,0,0], Math.PI/4, Math.PI/3, graphics.w, graphics.h, 0.04);  
    
    window.camera = camera;
    window.world = world;
    
    //Cache for camera parameters changed by gui
    var cam = {alpha: rad2ang(camera.alpha), beta: rad2ang(camera.beta),
               scale: 0.04, x: 0, y:0, z:0};
    
    var gui = new dat.GUI();
    
    var config = {pauseSim: false, pauseRender: false, controller: true};
    
    var ac = makeAnimationController();
    
    var editor = {selRadius:0.1, instantMove: true};
    
    function handleClick(x, y) {
        var click = camera.getRayFromScreen(x,y);
        world.points.forEach(function(ball) {
            if (rayBallIntersect(click.source, click.normal, editor.selRadius, ball.pos, ball.r)) {
                world.selection[ball.id] = true;
            }
        });
    }
    
    function camUpdate(value) {
        camera.needUpdate = true;
        camera.alpha = ang2rad(cam.alpha);
        camera.beta = ang2rad(cam.beta);
        camera.pos = [cam.x, cam.y, cam.z];
        camera.scale = cam.scale;
    };
    
    gui.add(config, "pauseRender");
    gui.add(world, "drawAtoms");
    gui.add(world, "drawBonds");
    gui.add(config, "pauseSim");
    gui.add(simConfig, "simDt");
    if (simConfig.controller) gui.add(config, "controller");
    gui.add(cam, "alpha", -180, 180).onChange(camUpdate);
    gui.add(cam, "beta", -180, 180).onChange(camUpdate);
    gui.add(cam, "scale").onChange(camUpdate);
    gui.add(cam, "x").onChange(camUpdate);
    gui.add(cam, "y").onChange(camUpdate);
    gui.add(cam, "z").onChange(camUpdate);
    gui.add(editor, "selRadius", 0.0, 10.0);
    gui.add(editor, "instantMove");
    editor.selRadius = 1.0;
    
    gui.updateManually = function() {
        var gui = this;
        // Iterate over all controllers
        for (var i in gui.__controllers) {
            gui.__controllers[i].updateDisplay();
        }
    };
    
    gui.updateManually();
    
    function scaleCam(s) {
        cam.scale *= (1+s);
        if (cam.scale < 0.001) cam.scale = 0.001;
        gui.updateManually();
        camUpdate();
    }
    
    function rotCam(dAlpha, dBeta) {
        cam.beta -= dBeta;
        cam.alpha += dAlpha;
        gui.updateManually();
        camUpdate();
    }
    
    //Mouse event handling
    var mouseDown = 0;
    var px=false;
    var py=false;
    var mouseWorldX = false;
    var mouseWorldY = false;
    var mouseWorldMove = false;
    
    //Keyboard modifiers
    var mods = {};
    
    function handleEvent(event) {
        if (event.type === 'keyup') {
          if (event.key === 'Control') {
            mods.ctrl = false;  
          }
          if (event.key === 'Shift') {
            mods.shift = false;  
          }
        } else {
          mods.ctrl = event.ctrlKey || (event.key === 'Control');
          mods.shift = event.shiftKey || (event.key === 'Shift');
        }
    }
    
    window.addEventListener("resize", function() {
        graphics.resize();
        camera.screenW = window.innerWidth;
        camera.screenH = window.innerHeight;
        camera.updateTransform();
    }, false);
    
    graphics.canvas.addEventListener("mousemove", function(event) {
        handleEvent(event);
        var x = event.pageX;
        var y = event.pageY;
        
        var _mxy = camera.getWorldXYFromScreenXY(x, y);
        mouseWorldX = _mxy.x;
        mouseWorldY = _mxy.y;
        
        //Move atoms
        if (mods.shift && mouseDown && px && py) {
            world.selectionIsMoving = true;
            var ray = camera.getRayFromScreen(x,y);
            if (!mouseWorldMove) {
                mouseWorldMove = ray.scrSource;
            } else {
                var i;
                var deltaPos = subVecs(ray.scrSource, mouseWorldMove);
                
                //Move points parallel to screen plane by camera-space mouse movement delta
                for (i=0; i<world.points.length; i++) {
                    var p = world.points[i];
                    if (world.selection[p.id]) {
                        if (editor.instantMove) {
                            addVecs(p.pos, deltaPos, p.pos);
                            copyVec3(p.pos, p.ppos);
                        } else {
                            addVecs(p.pos, deltaPos, p.pos);
                            p.pos[2] = Math.max(0, p.pos[2]);
                        }
                    }
                }
                
                //Damp excess velocity if moving in physical mode
                if (editor.instantMove)
                for (i=0; i<world.points.length; i++) {
                    var p = world.points[i];
                    var dpos = subVecs(p.pos, p.ppos);
                    var dist = l2norm(dpos);
                    var maxDist = 0.5;
                    if (dist > maxDist) {
                        addVecs(p.ppos, scalXvec(dist-maxDist, dpos), p.ppos);
                    }
                }                       
                
                mouseWorldMove = ray.scrSource;
            }
        } else {
            world.selectionIsMoving = false;
            //Rotate camera
            if (!mods.ctrl && mouseDown && px && py) {
                rotCam((x - px), (y - py));
            }
        }
        px = x;
        py = y;
    }, false);
    graphics.canvas.onmousedown = function(event) { 
        mouseDown = 1;
        handleEvent(event);
    }
    graphics.canvas.onmouseup = function(event) {
        mouseDown = 0;
        px=false;
        py=false;
        handleEvent(event);
        if (mods.ctrl) handleClick(event.pageX, event.pageY);
        if (mouseWorldMove) mouseWorldMove = false;
    }
    
    var specialCodes = {
        173: "-",
        189: "-",
        61: "+",
        187: "+",
        219: "[",
        221: "]",
        37: "left",
        38: "up",
        39: "right",
        40: "down",
        27: "escape",
        46: "delete"
    };
    
    //Keyboard event handling
    function getChar(event) {
        console.log(event.keyCode);
        if (specialCodes[event.keyCode]) return specialCodes[event.keyCode];
        if (event.which != 0) {
            if (event.which < 32) return null;
            return String.fromCharCode(event.which);
        }
        return null;
    }
    
    var camMoved = false;
    var movekeys = {
        "W":[1,0,0],
        "S":[-1,0,0],
        "A":[0,-1,0],
        "D":[0,1,0]
    };
    
    var rotConst = rad2ang(0.1);
    var scalConst = 0.1;

    window.addEventListener("keyup", function(event) {
        handleEvent(event);
    });
    
    window.addEventListener("keydown", function(event) {
        handleEvent(event);
        var char = getChar(event);
        if (char == "+") { scaleCam(scalConst); return }
        if (char == "-") { scaleCam(-scalConst); return }   
        if (char == "[") { editor.selRadius = Math.max(1.0, editor.selRadius-1.0); };
        if (char == "]") { editor.selRadius = editor.selRadius+1.0; };
        if (char == "left") { rotCam(rotConst, 0); return }
        if (char == "right") { rotCam(-rotConst, 0); return }
        if (char == "up") { rotCam(0, rotConst); return }
        if (char == "down") { rotCam(0, -rotConst); return }
        if (char == "escape") { world.selection = {} }
        if (char == "delete") { world.deletePointByIds(world.selection); world.selection = {}; }
        if (char == "F") { world.floodFillSelection() };
        if (char == "M") { world.minimizeSelection() };
        
        var vec = movekeys[char];
        if (vec && !camera.posUpdate) {
            var delta = scalXvec(1, addArrOfVecs( [
                scalXvec(vec[0], camera.planeForward),
                scalXvec(vec[1], camera.planeRight),
                scalXvec(vec[2], camera.refForward) ] ));
            cam.x += delta[0];
            cam.y += delta[1];
            cam.z += 0;
            gui.updateManually();
            camUpdate();
        };
        if (char == " ") {
            config.pauseSim = !config.pauseSim;
            gui.updateManually();
        }
    });
    window.addEventListener("keyup", function(event) {
        handleEvent(event);
    });
    window.addEventListener("mousewheel", function(event) {
        var rotation = -event.deltaY/window.innerHeight;
        scaleCam(rotation);
    });
    
    //Mainloop
    var prevFrameT = Date.now();
    var timestep = 0;
    var frameCount = 0;
    
    var avgStep = new util.avgTracker();
    
    function draw() {
        requestAnimationFrame(draw);
        if (camera.needUpdate) { 
            camera.needUpdate = false;
            camera.updateTransform();
        }
        if (!config.pauseSim) {
            var simDt = simConfig.simDt;
            if (simConfig.preTimestep) {
                simConfig.preTimestep(world, simDt, timestep, simConfig);
            }
            world.step(simDt);        
            ac.step(simDt);
            if (simConfig.postTimestep) {
                simConfig.postTimestep(world, simDt, timestep, simConfig);
            }
            if (simConfig.controller && config.controller) {
                simConfig.controller(world, simDt, timestep, simConfig);
            }
            
            avgStep.update(world.prevStepTime);
        }
        if (!config.pauseRender) { 
            graphics.clear();
            world.draw(camera, graphics);
        }
                
        if (mods.ctrl) {
          graphics.drawCircle(mouseWorldX, mouseWorldY, editor.selRadius*camera.screenScaling, false, 'rgba(255,0,0,0.45)');
        } else {
          graphics.drawCircle(mouseWorldX, mouseWorldY, editor.selRadius*camera.screenScaling, false, 'rgba(0,0,0,0.3)');
        }
        
        var time = Date.now();
        var frameT = time - prevFrameT;
        
        var stats = [Math.round(1000/(frameT))+' fps',
                     (Math.round(world.measureEnergy()*10)/10)+ ' energy',
                     timestep+ ' timestep'];
        if (util.isNumeric(world.collIndexTime))
            stats.push( 'collision indexing '+(world.collIndexTime)+' ms' );
        if (util.isNumeric(world.collTime))
            stats.push( 'collision '+(world.collTime)+' ms' );
        if (util.isNumeric(world.prevStepTime))
            stats.push( 'cpu time per step '+(world.prevStepTime)+' ms'+', avg '+avgStep.getRounded(1)+' ms');
        stats.push(world.points.length+' atoms '+world.springs.length+' bonds');
        
        if (!config.pauseRender) graphics.drawText(stats, 10, 10);
        
        prevFrameT = time;
        if (!config.pauseSim) timestep++;
        frameCount++;
    }
    
    if (simConfig.setup) {
        simConfig.setup(world, camera, gui, simConfig);
    }
    
    draw();
}

