# HTML5 Canvas Parallel Long Shadow Renderer

This is a library capable of rendering long shadows, often used in flat design, using a HTML5 Canvas. It runs in modern browsers and Node.js.

![Reference Image](demo-src/fancy-reference.png)

# Installation

## Browser

> TODO

## Node.js

```bash
npm install --save canvas-long-shadow
```

# API

```javascript
var CanvasLongShadow = require('canvas-long-shadow'); // not needed in the browser
var renderer = new CanvasLongShadow.Renderer(width, height);
renderer.render(ctx, {angleDeg: 30}); // Renders onto an existing canvas...
var image = renderer.renderImage();   // ...or directly into an image.
```

## `new Renderer(width, height[, options])`

* `width` {Number}
* `height` {Number}
* `options` {Object}
    - `quality` {Number} default = `1` <br/>
      Resolution of the shadow map, relative to the output size (`0.5` halves the resolution). Reduce to speed up rendering, at the cost of some image quality. This is especially useful for (near) real-time applications.

## `Renderer#render(ctx, options)`

Renders a shadow using the provided context.

* `ctx` {CanvasRenderingContext2D}
* `options` {Object | Function} <br/>
  If this is a function, it is a shortcut to specifying the `shapeRenderer` option, and nothing else.
    - `shapeRenderer` {Function} (required) <br/>
      Defines the shape to be shadowed. Receives a `CanvasRenderingContext2D` argument to draw the shape with. Context state changes will not affect the context supplied though the `ctx` parameter.
    - `angleRad` {Number} <br/>
      Shadow angle in radians. If this option is not set, `angleDeg` will be used.
    - `angleDeg` {Number} default = `45` <br/>
      Shadow angle in degrees. Will only be used if `angleRad` is not set.
    - `throwDistance` {Number} default = `Infinity` <br/>
      How far the shadow should be thrown along the specified angle, in pixels.
    - `fillStyle` {String | CanvasGradient | CanvasPattern | Function} <br/>
      A standard `CanvasRenderingContext2D#fillStyle` value or a function doing the fill. If it is a function, it will receive a `CanvasRenderingContext2D` and the shadow angle (in radians) as arguments.
    - `offsetX` {Number} default = `0` <br/>
      Moves the shadow boundaries (specified by `Renderer#getWidth()` and `Renderer#getHeight()`) by the specified amount on the local X-axis. By default, the boundaries are centered around the current transformation.
    - `offsetY` {Number} default = `0` <br/>
      Like `offsetX`, but for the local Y-axis.

_Note: The shadow can only be rendered properly if the shape stays inside the specified boundaries._

## `Renderer` Properties

* `width` {Number}
* `height` {Number}
* `quality` {Number}

# How to Build

## Prerequisites

* Node.js with `npm`
* gulp.js

## Build Steps

1. clone the sources
2. `npm install` to pull the development dependencies
3. `gulp build` to build and package the distribution (excludes `gh-pages`)
