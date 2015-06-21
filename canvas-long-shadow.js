window.CanvasLongShadow = (function () {
    function extractAngleOptionRad(options, name) {
        var radName = name + 'Rad';
        if (typeof options[radName] !== 'undefined') {
            return options[radName];
        }

        var degName = name + 'Deg';
        if (typeof options[degName] !== 'undefined') {
            return (Math.PI / 180) * options[degName];
        }

        return null;
    }

    function Renderer(rendererOptions) {
        //
        // OPTIONS
        //

        // The dimensions are required and should not change during the lifetime
        // of a renderer to ensure that canvases can be cached in order to
        // reduce memory allocations.
        var renderWidth = rendererOptions.width|0;
        var renderHeight = rendererOptions.height|0;
        if (renderWidth <= 0 || renderHeight <= 0) throw "invalid dimensions";

        // The mask may be rendered at a lower resolution to improve
        // performance.
        var maskResolution = rendererOptions.edgeQuality || 1;
        if (maskResolution <= 0) throw "the edge quality must be > 0";
        if (maskResolution > 1) throw "an edge quality > 1 is a waste of computing power";

        //
        // CACHE
        //

        var shadowCanvas = document.createElement('canvas');
        shadowCanvas.width = renderWidth;
        shadowCanvas.height = renderHeight;
        var shadowCtx = shadowCanvas.getContext('2d');

        var maskCanvas = document.createElement('canvas');
        maskCanvas.width = (renderWidth * maskResolution)|0;
        maskCanvas.height = (renderHeight * maskResolution)|0;
        var maskCtx = maskCanvas.getContext('2d');

        var maskShapeCanvas = document.createElement('canvas');
        maskShapeCanvas.width = maskCanvas.width;
        maskShapeCanvas.height = maskCanvas.height;
        var maskShapeCtx = maskShapeCanvas.getContext('2d');

        //
        // METHODS
        //

        function renderIntoContext(ctx, options) {
            //
            // OPTIONS
            //

            // The shape renderer is required.
            var drawShape = options.shapeRenderer || null;
            if (drawShape === null) throw "missing shape renderer";

            // We default to the most frequently used shadow angle.
            var angleRad = extractAngleOptionRad(options, 'angle') || Math.PI / 4; // 45 degrees

            // Depth defaults to the worst case, which is that the shadow needs to
            // cross the whole canvas at the most unfortunate angle (i.e. the exact
            // diagonal). This does not cover shapes that are actually bigger than
            // the canvas, but those cases cannot be handled automatically.
            var depth = options.depth || Math.sqrt(renderWidth * renderWidth + renderHeight * renderHeight);

            // We default to a simple flat shadow.
            var fillStyle = options.fillStyle || 'rgba(0, 0, 0, 0.2)';

            // The fill style may be offset by a certain amount.
            var fillOriginX = options.fillOriginX || 0;
            var fillOriginY = options.fillOriginY || 0;

            var fillOffsetX = options.fillOffsetX || 0;
            var fillOffsetY = options.fillOffsetY || 0;

            var fillRotationRad = extractAngleOptionRad(options, 'fillRotation') || 0;

            var fillScaleX = options.fillScaleX || 1;
            var fillScaleY = options.fillScaleY || 1;

            //
            // RENDERING
            //

            // Rasterize the mask shape.
            maskShapeCtx.save();

            renderShapeMask(maskShapeCtx, function (ctx) {
                ctx.scale(maskResolution, maskResolution);
                drawShape(ctx);
            });

            maskShapeCtx.restore();

            // Cast the shadow as a mask.
            maskCtx.save();
            renderMask(maskCtx, maskShapeCanvas, angleRad, depth * maskResolution);
            maskCtx.restore();

            // Compose the shadow out of mask and fill style.
            renderShadow(shadowCtx, maskCanvas, angleRad,
                fillOriginX, fillOriginY,
                fillOffsetX, fillOffsetY,
                fillRotationRad,
                fillScaleX, fillScaleY,
                fillStyle);

            // Blit the shadow onto the actual target.
            ctx.drawImage(shadowCanvas, 0, 0);
        }

        // expose methods
        this.draw = renderIntoContext;
    }

    function renderShapeMask(ctx, drawShape) {
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        ctx.globalAlpha = 1.0;
        ctx.fillStyle = '#000';
        drawShape(ctx);
    }

    function renderMask(ctx, shapeMask, angleRad, depth) {
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

        // Render the shape mask iterations.
        ctx.globalCompositeOperation = 'source-over';

        var strideX = Math.cos(angleRad);
        var strideY = Math.sin(angleRad);
        var iteration;

        for (iteration = 0; iteration < depth; ++iteration) {
            ctx.drawImage(shapeMask, (strideX * iteration), (strideY * iteration));
        }

        // Clear the original shape (important for transparent shapes).
        ctx.globalCompositeOperation = 'destination-out';
        ctx.drawImage(shapeMask, 0, 0);
    }

    function renderShadow(ctx, mask, angleRad, fillOriginX, fillOriginY, fillOffsetX, fillOffsetY, fillRotationRad, fillScaleX, fillScaleY, fillStyle) {
        ctx.save();
        ctx.globalCompositeOperation = 'copy'; // avoids clearRect()
        ctx.drawImage(mask, 0, 0, ctx.canvas.width, ctx.canvas.height);
        ctx.restore();

        fillShadow(ctx, angleRad, fillOriginX, fillOriginY, fillOffsetX, fillOffsetY, fillRotationRad, fillScaleX, fillScaleY, fillStyle);
    }

    function fillShadow(ctx, angleRad, fillOriginX, fillOriginY, fillOffsetX, fillOffsetY, fillRotationRad, fillScaleX, fillScaleY, fillStyle) {
        // Evaluate the fill style, if necessary.
        if (typeof fillStyle === 'function') {
            ctx.save();
            fillStyle = fillStyle(ctx);
            ctx.restore();
        }

        // Draw the fill style, clipped by the mask that exists on the canvas.
        ctx.save();
        ctx.globalCompositeOperation = 'source-in';
        ctx.beginPath();
        ctx.rect(0, 0, ctx.canvas.width, ctx.canvas.height);
        ctx.fillStyle = fillStyle;
        ctx.translate(fillOriginX, fillOriginY);
        ctx.rotate(angleRad + fillRotationRad);
        ctx.scale(fillScaleX, fillScaleY);
        ctx.translate(fillOffsetX, fillOffsetY);
        ctx.fill();
        ctx.restore();
    }

    return {
        Renderer: Renderer
    };
}());
