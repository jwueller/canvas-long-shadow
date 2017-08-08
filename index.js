'use strict';

var renderer = require('./src/renderer');
var canvas = require('canvas-browserify');

var factory = function (canvasInstance) {
    return renderer(canvasInstance);
}

var _default = renderer(canvas);
factory.Renderer = _default.Renderer;
factory.Canvas = _default.Canvas;

module.exports = factory;