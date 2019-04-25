## Synopsis

Squishy bodies is a softbody simulation engine written in Javascript. There are no other dependencies except HTML5-conforming browser. Squishy bodies uses canvas for rendering of simulation scenes.
Special features include anisotropic friction that allows for realistic snake/worm locomotion simulation.

## Demos

### Controls
```
W,A,S,D to move camera
LeftMouseClick+MouseMove or arrow keys to rotate camera
+/- to scale camera
Ctrl+LeftMouseClick to select atoms
Esc to cancel atom selection
Del to delete selected atoms
Shift+MouseMove to move selected atoms
F to floodfill the selection to the connected atom graphs
Space to pause simulation
[ and ] to scale selection radius
```

![trusses demo](https://github.com/crystalline/squishy-bodies/raw/master/docs/scr_truss.png "Trusses demo")
[Falling struts](https://crystalline.github.io/squishy-bodies/demo_falling_struts.html)<br/>
A simple demo of soft strut instances falling down and colliding with each other

![worm demo](https://github.com/crystalline/squishy-bodies/raw/master/docs/scr_worm.png "Worm demo")
[Nematode-like worm](https://crystalline.github.io/squishy-bodies/demo_worm.html)<br/>
A more sophisticated demo is a simulation of C Elegans-like worm built from masses and springs. Long lines of muscles cells are simulated with springs that have their equilibrium lengths modulated in a sinusoidal pattern by hardcoded controller.

## Code Example

You can create worlds filled with various contraptions built from point masses linked with springs and then simulate them by calling world.step(dt). Make sure that your springs aren't too stiff and timestep isn't too large or the simulation may explode.
```
var pa = {mass: 1, pos: [1,1,1]};
var pb = {mass: 1, pos: [1,0,1]};
var spr = {pa: pa, pb: pb, l: 1.2, k: 2};
var softbody = makeSoftBody([pa,pb], [spr]);
var world = makeSimWorld();
world.addSoftBody(softbody);
world.step(0.01);
```

## Contributors

Crystalline Emerald

## License

MIT License
