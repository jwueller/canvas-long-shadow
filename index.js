'use strict';

module.exports = {
    Renderer: require('./src/renderer'),

    // FIXME: Workaround for upstream bug:
    // https://github.com/Automattic/node-canvas/issues/487
    Canvas: require('canvas-browserify')
};
