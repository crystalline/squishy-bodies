## Synopsis

Squishy bodies is a softbody simulation engine written in Javascript. There are no other dependencies except HTML5-conforming browser. Squishy bodies uses canvas for rendering of simulation scenes.
Special features include anisotropic friction that allows for realistic snake/worm locomotion simulation.

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

## Demo

The only demo so far is a simulation of C Elegans-like worm built from masses and springs. Lateral springlines are contracted and expanded in a sinusoidal pattern.
To run it just load ./wormdemo.html in your browser.

## Contributors

Crystalline Emerald

## License

MIT License
