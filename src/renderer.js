'use strict';

var Canvas = require('canvas-browserify');

function createOffScreenRenderContext(width, height) {
    var c = new Canvas(width, height);
    return c.getContext('2d');
}

function renderDefaultFill(fillCtx, angleRad) {
    fillCtx.fillStyle = 'rgba(0,0,0,0.2)';
    fillCtx.fill();
}

function isNumber(value) {
    return typeof value === 'number' && !isNaN(value);
}

function isFunction(value) {
    return typeof value === 'function';
}

function isSet(value) {
    return value !== null && typeof value !== 'undefined';
}

function Renderer(renderWidth, renderHeight, rendererOptions) {
    // The dimensions are required and should not change during the lifetime
    // of a renderer to ensure that canvases can be re-used.
    if (!isSet(renderWidth) || !isSet(renderHeight)) throw 'missing dimensions';

    if (!isNumber(renderWidth) || renderWidth < 1 || !isNumber(renderHeight) || renderHeight < 1) {
        throw 'invalid dimensions';
    }

    //
    // options
    //

    rendererOptions = rendererOptions || {};

    // The mask may be rendered at a lower resolution to improve performance.
    var maskRenderScale = rendererOptions.quality;

    if (!isSet(maskRenderScale)) {
        maskRenderScale = 1;
    } else if (!isNumber(maskRenderScale) || maskRenderScale <= 0) {
        throw 'invalid shadow quality';
    } else if (maskRenderScale > 1) {
        // If there ARE valid use-cases for super-sampling, please let me know.
        throw 'shadow quality > 1 is a waste of computing power';
    }

    var maskRenderWidth = Math.max(1, renderWidth * maskRenderScale);
    var maskRenderHeight = Math.max(1, renderHeight * maskRenderScale);

    //
    // re-usable intermediate canvases
    //

    var rasterizedShapeCtx = createOffScreenRenderContext(maskRenderWidth, maskRenderHeight);
    var shadowMaskCtx = createOffScreenRenderContext(maskRenderWidth, maskRenderHeight);
    var shadowCtx = createOffScreenRenderContext(renderWidth, renderHeight);

    //
    // DEBUG output; intermediate buffers
    //

    /*
    document.body.appendChild(rasterizedShapeCtx.canvas);
    document.body.appendChild(shadowMaskCtx.canvas);
    document.body.appendChild(shadowCtx.canvas);
    */

    //
    // functions
    //

    function renderIntoContext(ctx, options) {
        //
        // options
        //

        if (!options) {
            options = {};
        } else if (isFunction(options)) {
            options = {shapeRenderer: options};
        }

        // The shape renderer is required.
        var transformAndFillShape = options.shapeRenderer || null;
        if (transformAndFillShape === null) throw 'missing shape renderer';

        // The angle can be specified in radians or degrees. Radians take
        // precedence.
        var angleRad = options.angleRad;
        var angleDeg = options.angleDeg;
        var hasUserAngleRad = isSet(angleRad);
        var hasUserAngleDeg = isSet(angleDeg);

        if ((hasUserAngleRad && !isNumber(angleRad)) || (hasUserAngleDeg && !isNumber(angleDeg))) {
            throw 'invalid shadow angle';
        }

        if (!hasUserAngleRad) {
            // We default to the most common angle.
            if (!hasUserAngleDeg) angleDeg = -45;
            angleRad = (Math.PI / 180) * angleDeg;
        }

        // Note: The throw distance does not take shape dimensions into account.
        var throwDistance = options.throwDistance;

        if (!isSet(throwDistance)) {
            // Throw distance defaults to the worst case, which is that the
            // shadow needs to cross the whole canvas at the most unfortunate
            // angle (i.e. the exact diagonal). This does not cover shapes that
            // are actually bigger than the canvas, but those cases cannot be
            // handled automatically in a reasonable manner, anyway.
            throwDistance = Infinity;
        } else if (!isNumber(throwDistance)) {
            throw 'invalid shadow throw distance';
        }

        // We default to a simple and flat shadow.
        var fillStyle = options.fillStyle || 'rgba(0,0,0,0.15)';

        var fillShadow = isFunction(fillStyle) ? fillStyle : function (fillCtx) {
            fillCtx.fillStyle = fillStyle;
        };

        // Setting the offset allows specifying where the render dimensions
        // apply. This allows fine control when the shadow properties and
        // constraints are well known.
        var offsetX = options.offsetX;
        var offsetY = options.offsetY;
        if (!isSet(offsetX)) offsetX = 0;
        if (!isSet(offsetY)) offsetY = 0;

        if (!isNumber(offsetX) || !isNumber(offsetY)) {
            throw new 'invalid shadow offset';
        }

        var originX = renderWidth / 2 - offsetX;
        var originY = renderHeight / 2 - offsetY;

        //
        // RENDERING
        //

        rasterizeShape(rasterizedShapeCtx, function (innerCtx) {
            innerCtx.scale(maskRenderScale, maskRenderScale);
            innerCtx.translate(originX, originY);
            transformAndFillShape(innerCtx);
        });

        // "Stretch" the rasterized shape into a shadow mask.
        renderShadowMask(shadowMaskCtx, rasterizedShapeCtx.canvas, angleRad, throwDistance * maskRenderScale);

        // Compose the shadow out of mask and fill style.
        renderShadow(shadowCtx, shadowMaskCtx.canvas, function (innerCtx) {
            innerCtx.translate(originX, originY);
            fillShadow(innerCtx, angleRad);
        });

        // Blit the shadow onto the actual target.
        ctx.drawImage(shadowCtx.canvas, -originX, -originY);
    }

    //
    // exports
    //

    this['render'] = renderIntoContext;

    this['width'] = renderWidth;
    this['height'] = renderHeight;
    this['quality'] = maskRenderScale;
}

function rasterizeShape(ctx, transformAndFillShape) {
    ctx.save();
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.globalAlpha = 1.0;
    ctx.fillStyle = '#000';
    transformAndFillShape(ctx);
    ctx.restore();
}

function renderShadowMask(ctx, rasterizedShape, angleRad, throwDistance) {
    var sourceWidth = rasterizedShape.width;
    var sourceHeight = rasterizedShape.height;
    var destinationWidth = ctx.canvas.width;
    var destinationHeight = ctx.canvas.height;

    ctx.save();
    ctx.clearRect(0, 0, destinationWidth, destinationHeight);

    // Render the shape mask iterations (this is the slow bit).
    ctx.globalCompositeOperation = 'source-over';

    var strideX = Math.cos(angleRad);
    var strideY = -Math.sin(angleRad);
    var iteration;
    var left;
    var top;

    // The iteration explicitly does not start at offset zero to avoid artifacts
    // on the leading edges of the shadow.
    for (iteration = 1; iteration < throwDistance; ++iteration) {
        left = iteration * strideX;
        top = iteration * strideY;

        // There is no reason to render anything more than would be visible.
        if (left > destinationWidth || left + sourceWidth < 0 || top > destinationHeight || top + sourceHeight < 0) {
            break;
        }

        ctx.drawImage(rasterizedShape, left, top);
    }

    // Clear the original shape (important for transparent shapes).
    // TODO: Make this step optional. Not everyone will need it.
    ctx.globalCompositeOperation = 'destination-out';
    ctx.drawImage(rasterizedShape, 0, 0);

    ctx.restore();
}

function renderShadow(ctx, mask, fillCallback) {
    var w = ctx.canvas.width;
    var h = ctx.canvas.height;
    ctx.clearRect(0, 0, w, h);

    // Render the shadow fill.
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, w, h);
    fillCallback(ctx);
    ctx.fill();
    ctx.restore();

    // Apply the mask.
    ctx.save();
    ctx.globalCompositeOperation = 'destination-in'; // TODO: Apparently, this has compatibility issues. Is there a nice, more portable way that isn't significantly slower?
    ctx.drawImage(mask, 0, 0, w, h);
    ctx.restore();
}

//
// exports
//

module.exports = Renderer;
