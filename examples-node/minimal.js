var Canvas = require('canvas-browserify');
var CanvasLongShadow = require('..')(Canvas);
var canvas = new CanvasLongShadow.Canvas(500, 500);
var ctx = canvas.getContext('2d');

// Draw the background.
ctx.fillStyle = '#195A72';
ctx.fillRect(0, 0, canvas.width, canvas.height);

ctx.translate(canvas.width / 2, canvas.width / 2); // center everything

// Render the default shadow cast by drawShape().
var shadowRenderer = new CanvasLongShadow.Renderer(canvas.width, canvas.height);
shadowRenderer.render(ctx, drawShape);

// Render the actual shape on top of the shadow.
ctx.fillStyle = '#33B5E5';
drawShape(ctx); // comment this out to see only the shadow

var outputFileName = 'minimal-out.png';
require('fs').writeFileSync('minimal-out.png', canvas.toBuffer());
console.log('wrote ' + outputFileName);

function drawShape(ctx) {
    ctx.rotate(0.15);
    ctx.fillRect(-100, -100, 200, 200);
}
