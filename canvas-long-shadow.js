window.CanvasLongShadow = (function () {
    'use strict';

    var freeze = Object.freeze || function(obj) {
        // Older JavaScript engines may not have this. Degrade gracefully.
        return obj;
    };

    function renderDefaultFill(fillCtx, angleRad) {
        fillCtx.fillStyle = 'rgba(0, 0, 0, 0.15)';
        fillCtx.fill();
    }

    function getNumber(value, defaultValue) {
        if (typeof value === 'number') return value;
        if (value === null || typeof value === 'undefined') return defaultValue;
        throw 'number expected';
    }

    function createOffScreenRenderContext(width, height) {
        var canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        return canvas.getContext('2d');
    }

    function Renderer(rendererOptions) {
        //
        // OPTIONS
        //

        // The dimensions are required and should not change during the lifetime
        // of a renderer to ensure that canvases can be cached in order to
        // reduce memory allocations.
        var renderWidth = this.width = getNumber(rendererOptions.width, null);
        var renderHeight = this.height = getNumber(rendererOptions.height, null);
        if (renderWidth === null || renderHeight === null) throw 'missing dimensions';
        if (renderWidth < 1 || renderHeight < 1) throw 'invalid dimensions';

        // The mask may be rendered at a lower resolution to improve
        // performance.
        var maskRenderScale = this.quality = getNumber(rendererOptions.quality, 1);
        if (maskRenderScale <= 0) throw 'shadow quality must be > 0';
        // TODO: Are there valid use-cases for super-sampling with this?
        if (maskRenderScale > 1) throw 'shadow quality > 1 is a waste of computing power';
        var maskRenderWidth = Math.max(1, renderWidth * maskRenderScale);
        var maskRenderHeight = Math.max(1, renderHeight * maskRenderScale);

        //
        // CACHE
        //

        var rasterizedShapeCtx = createOffScreenRenderContext(maskRenderWidth, maskRenderHeight);
        var shadowMaskCtx = createOffScreenRenderContext(maskRenderWidth, maskRenderHeight);
        var shadowCtx = createOffScreenRenderContext(renderWidth, renderHeight);

/*
        document.body.appendChild(rasterizedShapeCtx.canvas);
        document.body.appendChild(shadowMaskCtx.canvas);
        document.body.appendChild(shadowCtx.canvas);
*/

        //
        // METHODS
        //

        function renderIntoContext(ctx, options) {
            //
            // OPTIONS
            //

            // The shape renderer is required.
            var transformAndFillShape = options.shapeRenderer || null;
            if (transformAndFillShape === null) throw 'missing shape renderer';

            // We default to the most frequently used shadow angle.
            var angleRad = getNumber(options.angleRad, (Math.PI / 180) * getNumber(options.angleDeg, 45));

            // Depth defaults to the worst case, which is that the shadow needs
            // to cross the whole canvas at the most unfortunate angle (i.e. the
            // exact diagonal). This does not cover shapes that are actually
            // bigger than the canvas, but those cases cannot be handled
            // automatically in a reasonable manner, anyway.
            var depth = getNumber(options.depth, Math.sqrt(renderWidth * renderWidth + renderHeight * renderHeight));

            // Setting the origin allows specifying how the render dimensions
            // expand. Not only is the shape rendered by the offset, but the
            // resulting shadow image is drawn by the inverted offset, making
            // it easy for the user to position the shape shadow in his final
            // image.
            var originX = getNumber(options.originX, renderWidth / 2);
            var originY = getNumber(options.originY, renderHeight / 2);

            // We default to a simple flat shadow.
            var transformAndFillShadow = options.fillRenderer || renderDefaultFill;

            //
            // RENDERING
            //

            rasterizeShape(rasterizedShapeCtx, function (innerCtx) {
                innerCtx.scale(maskRenderScale, maskRenderScale);
                innerCtx.translate(originX, originY);
                transformAndFillShape(innerCtx);
            });

            // "Stretch" the rasterized shape into a shadow mask.
            renderShadowMask(shadowMaskCtx, rasterizedShapeCtx.canvas, angleRad, depth * maskRenderScale);

            // Compose the shadow out of mask and fill style.
            renderShadow(shadowCtx, shadowMaskCtx.canvas, function (innerCtx) {
                innerCtx.translate(originX, originY);
                transformAndFillShadow(innerCtx, angleRad);
            });

            // Blit the shadow onto the actual target.
            ctx.drawImage(shadowCtx.canvas, -originX, -originY);
        }

        function renderIntoImage(options) {
            var ctx = createOffScreenRenderContext(renderWidth, renderHeight);
            renderIntoContext(ctx, options);
            return ctx.canvas;
        }

        // expose methods
        this.render = renderIntoContext;
        this.renderImage = renderIntoImage;

        freeze(this);
    }

    function rasterizeShape(ctx, transformAndFillShape) {
        ctx.save();
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        ctx.globalAlpha = 1.0;
        ctx.fillStyle = '#000';
        transformAndFillShape(ctx);
        ctx.restore();
    }

    function renderShadowMask(ctx, rasterizedShape, angleRad, depth) {
        ctx.save();
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

        // Render the shape mask iterations (this is the slow bit).
        ctx.globalCompositeOperation = 'source-over';

        var strideX = Math.cos(angleRad);
        var strideY = Math.sin(angleRad);
        var iteration;

        for (iteration = 1; iteration < depth; ++iteration) {
            ctx.drawImage(rasterizedShape, iteration * strideX, iteration * strideY);
        }

        // Clear the original shape (important for transparent shapes).
        // TODO: Make this step optional. Not everyone will need it.
        ctx.globalCompositeOperation = 'destination-out';
        ctx.drawImage(rasterizedShape, 0, 0);

        ctx.restore();
    }

    function renderShadow(ctx, mask, transformAndFillShadow) {
        var w = ctx.canvas.width;
        var h = ctx.canvas.height;

        // Render the shadow fill.
        ctx.save();
        ctx.clearRect(0, 0, w, h);
        ctx.beginPath();
        ctx.rect(0, 0, w, h);
        transformAndFillShadow(ctx);
        ctx.restore();

        // Apply the mask.
        ctx.save();
        ctx.globalCompositeOperation = 'destination-in'; // TODO: Apparently, this has compatibility issues. Is there a nice, more portable way that isn't significantly slower?
        ctx.drawImage(mask, 0, 0, w, h);
        ctx.restore();
    }

    return freeze({
        Renderer: Renderer
    });
}());
