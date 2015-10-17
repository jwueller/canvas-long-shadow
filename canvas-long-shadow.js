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
        var maskRenderScale = rendererOptions.edgeQuality || 1;
        if (typeof maskRenderScale !== 'number') throw "edge quality is not a number";
        if (maskRenderScale <= 0) throw "the edge quality must be > 0";
        if (maskRenderScale > 1) throw "an edge quality > 1 is a waste of computing power";

        //
        // CACHE
        //

        var shadowCanvas = document.createElement('canvas');
        shadowCanvas.width = renderWidth;
        shadowCanvas.height = renderHeight;
        var shadowCtx = shadowCanvas.getContext('2d');

        var maskCanvas = document.createElement('canvas');
        maskCanvas.width = (renderWidth * maskRenderScale)|0;
        maskCanvas.height = (renderHeight * maskRenderScale)|0;
        var maskCtx = maskCanvas.getContext('2d');

        var maskShapeCanvas = document.createElement('canvas');
        maskShapeCanvas.width = maskCanvas.width;
        maskShapeCanvas.height = maskCanvas.height;
        var maskShapeCtx = maskShapeCanvas.getContext('2d');

        var transformFillDefault = createRotateAroundPointTransform(renderWidth / 2, renderHeight / 2);

        //
        // METHODS
        //

        function renderIntoContext(ctx, options) {
            //
            // OPTIONS
            //

            // The shape renderer is required.
            var fillShape = options.shapeRenderer || null;
            if (fillShape === null) throw "missing shape renderer";

            // We default to the most frequently used shadow angle.
            var angleRad = extractAngleOptionRad(options, 'angle') || Math.PI / 4; // 45 degrees

            // Depth defaults to the worst case, which is that the shadow needs
            // to cross the whole canvas at the most unfortunate angle (i.e. the
            // exact diagonal). This does not cover shapes that are actually
            // bigger than the canvas, but those cases cannot be handled
            // automatically in a reasonable manner.
            var depth = options.depth || Math.sqrt(renderWidth * renderWidth + renderHeight * renderHeight);

            // We default to a simple flat shadow.
            var fillStyle = options.fillStyle || 'rgba(0, 0, 0, 0.2)';

            // The fill may be transformed freely. By default, the fill follows
            // the shadow rotation.
            var applyFillTransform = options.fillTransform || transformFillDefault;
            if (typeof applyFillTransform !== 'function') throw "fill transform is not a function";

            var fillShadow = options.fillRenderer || function (fillCtx) {
                fillCtx.fillStyle = 'rgba(0, 0, 0, 0.2)';
                fillCtx.fillRect(0, 0, fillCtx.canvas.width, fillCtx.canvas.height);
            };

            //
            // RENDERING
            //

            // Rasterize the mask shape.
            renderShapeMask(maskShapeCtx, function (ctx) {
                ctx.scale(maskRenderScale, maskRenderScale);
                fillShape(ctx);
            });

            // Cast the shadow as a mask.
            renderMask(maskCtx, maskShapeCanvas, angleRad, depth * maskRenderScale);

            // Compose the shadow out of mask and fill style.
            renderShadow(shadowCtx, maskCanvas, fillStyle, function (ctx) {
                applyFillTransform(ctx, angleRad);
            });

            // Blit the shadow onto the actual target.
            ctx.drawImage(shadowCanvas, 0, 0);
        }

        function getDimensions() {
            return {
                width: renderWidth,
                height: renderHeight
            };
        }

        // expose methods
        this.draw = renderIntoContext;
        this.getDimensions = getDimensions;
    }

    function renderShapeMask(ctx, fillShape) {
        ctx.save();
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        ctx.globalAlpha = 1.0;
        ctx.fillStyle = '#000';
        fillShape(ctx);
        ctx.restore();
    }

    function renderMask(ctx, shapeMask, angleRad, depth) {
        ctx.save();
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

        // Render the shape mask iterations.
        ctx.globalCompositeOperation = 'source-over';

        var strideX = Math.cos(angleRad);
        var strideY = Math.sin(angleRad);
        var iteration;

        for (iteration = 0; iteration < depth; ++iteration) {
            ctx.drawImage(shapeMask, strideX * iteration, strideY * iteration);
        }

        // Clear the original shape (important for transparent shapes).
        ctx.globalCompositeOperation = 'destination-out';
        ctx.drawImage(shapeMask, 0, 0);
        ctx.restore();
    }

    function renderShadow(ctx, mask, fillStyle, applyFillTransform) {
        // Evaluate the fill style, if necessary.
        if (typeof fillStyle === 'function') {
            ctx.save();
            fillStyle = fillStyle(ctx);
            ctx.restore();
        }

        // Render the shadow fill.
        ctx.save();
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        ctx.beginPath();
        ctx.rect(0, 0, ctx.canvas.width, ctx.canvas.height);
        applyFillTransform(ctx);
        ctx.fillStyle = fillStyle;
        ctx.fill();
        ctx.restore();

        // Apply the mask.
        ctx.save();
        ctx.globalCompositeOperation = 'destination-in';
        ctx.drawImage(mask, 0, 0, ctx.canvas.width, ctx.canvas.height);
        ctx.restore();
    }

    // function renderShadow(ctx, mask, fillStyle, fillOriginX, fillOriginY, transformFill) {
    //     ctx.save();
    //     ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    //     ctx.drawImage(mask, 0, 0, ctx.canvas.width, ctx.canvas.height);
    //     ctx.restore();

    //     fillShadow(ctx, fillStyle, fillOriginX, fillOriginY, transformFill);
    // }

    // function fillShadow(ctx, fillStyle, fillOriginX, fillOriginY, transformFill) {
    //     // Evaluate the fill style, if necessary.
    //     if (typeof fillStyle === 'function') {
    //         ctx.save();
    //         fillStyle = fillStyle(ctx);
    //         ctx.restore();
    //     }

    //     // Draw the fill style, clipped by the mask that exists on the canvas.
    //     ctx.save();
    //     ctx.globalCompositeOperation = 'source-in';
    //     ctx.beginPath();
    //     ctx.rect(0, 0, ctx.canvas.width, ctx.canvas.height);
    //     ctx.translate(fillOriginX, fillOriginY);

    //     if (typeof transformFill === 'function') {
    //         transformFill(ctx);
    //     }

    //     ctx.fillStyle = fillStyle;
    //     ctx.fill();
    //     ctx.restore();
    // }

    function renderImage(options) {
        var renderer = new Renderer(options);
        var dimensions = renderer.getDimensions();
        var canvas = document.createElement('canvas');
        canvas.width = dimensions.width;
        canvas.height = dimensions.height;
        var ctx = canvas.getContext('2d');
        renderer.draw(ctx, options);
        return canvas;
    }

    function createIdentityTransform() {
        return function () {};
    }

    function createRotateAroundPointTransform(centerX, centerY) {
        return function (ctx, angleRad) {
            ctx.translate(centerX, centerY);
            ctx.rotate(angleRad);
        };
    }

    return {
        // objects
        Renderer: Renderer,

        // functions
        createIdentityTransform: createIdentityTransform,
        createRotateAroundPointTransform: createRotateAroundPointTransform,

        renderImage: renderImage
    };
}());
