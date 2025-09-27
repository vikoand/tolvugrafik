/////////////////////////////////////////////////////////////////
//    Sýnidæmi í Tölvugrafík
//     Vörpunarfylki búið til í JS og sent yfir til
//     hnútalitara, sem margfaldar (þ.e. varpar)
//
//    Hjálmtýr Hafsteinsson, september 2025 (reverted to 2D Newton's cradle)
/////////////////////////////////////////////////////////////////
var canvas;
var gl;
var program;

var points = [];
var colors = [];
var NumVertices = 6;  // For square (2 triangles)

var vBuffer, cBuffer;
var mvLoc, pLoc;

var pivotY = 0.8;
var pivotDX = 0.08;
var speed = 1.5;
var anchorS = 0.08;
var bandT = 0.02;
var length = 0.7;
var bobS = 0.18;

var leftAngle = 45.0;
var rightAngle = 0.0;
var startTime;

window.onload = function init() {
    canvas = document.getElementById("gl-canvas");
    gl = WebGLUtils.setupWebGL(canvas);
    if (!gl) { alert("WebGL isn't available"); }

    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(1.0, 1.0, 1.0, 1.0);
    gl.disable(gl.DEPTH_TEST);  // Disable for 2D

    makeUnitSquare();
    program = initShaders(gl, "vertex-shader", "fragment-shader");
    gl.useProgram(program);

    // Vertex buffer (positions) - 2D
    vBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(points), gl.STATIC_DRAW);
    var vPosition = gl.getAttribLocation(program, "vPosition");
    gl.vertexAttribPointer(vPosition, 2, gl.FLOAT, false, 0, 0);  // 2 for 2D
    gl.enableVertexAttribArray(vPosition);

    // Color buffer
    cBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, cBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(colors), gl.STATIC_DRAW);
    var vColor = gl.getAttribLocation(program, "vColor");
    gl.vertexAttribPointer(vColor, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vColor);

    mvLoc = gl.getUniformLocation(program, "modelView");
    pLoc = gl.getUniformLocation(program, "projection");

    var proj = ortho(-1.0, 1.0, -1.0, 1.0, -1.0, 1.0);  // Orthographic for 2D
    gl.uniformMatrix4fv(pLoc, false, flatten(proj));

    startTime = Date.now();

    render();
}

function render() {
    gl.clear(gl.COLOR_BUFFER_BIT);

    var elapsed = (Date.now() - startTime) / 1000.0;

    // Continuous phase-based animation
    var phase = elapsed * speed;
    if (phase < 1.0) {
        leftAngle = 45.0 - (45.0 * phase);  // Left swings from 45° to 0°
        rightAngle = 0.0;
    } else if (phase < 2.0) {
        leftAngle = 0.0;
        rightAngle = -45.0 * (phase - 1.0);  // Right swings from 0° to -45°
    } else if (phase < 3.0) {
        leftAngle = 0.0;
        rightAngle = -45.0 + (45.0 * (phase - 2.0));  // Right returns to 0°
    } else if (phase < 4.0) {
        rightAngle = 0.0;
        leftAngle = 45.0 * (phase - 3.0);  // Left swings back from 0° to 45°
    } else {
        startTime = Date.now();  // Reset for next cycle
    }

    var mv = mat4();

    // Draw anchors
    drawSquare(mv, -pivotDX, pivotY, 0.0, anchorS, vec4(0.2, 0.2, 0.2, 1.0));
    drawSquare(mv, pivotDX, pivotY, 0.0, anchorS, vec4(0.2, 0.2, 0.2, 1.0));

    // Draw left band (with rotation)
    var M = mult(mv, translate(-pivotDX, pivotY, 0.0));
    M = mult(M, rotateZ(-leftAngle));
    M = mult(M, translate(0.0, -length / 2, 0.0));
    M = mult(M, scalem(bandT, length, 1.0));
    gl.uniformMatrix4fv(mvLoc, false, flatten(M));
    setSolidColor(vec4(0.4, 0.6, 0.9, 1.0));
    gl.drawArrays(gl.TRIANGLES, 0, NumVertices);

    // Draw right band (with rotation)
    M = mult(mv, translate(pivotDX, pivotY, 0.0));
    M = mult(M, rotateZ(-rightAngle));
    M = mult(M, translate(0.0, -length / 2, 0.0));
    M = mult(M, scalem(bandT, length, 1.0));
    gl.uniformMatrix4fv(mvLoc, false, flatten(M));
    setSolidColor(vec4(0.4, 0.6, 0.9, 1.0));
    gl.drawArrays(gl.TRIANGLES, 0, NumVertices);

    // Draw left bob
    var leftRad = radians(-leftAngle);
    var leftBobX = -pivotDX + Math.sin(leftRad) * length;
    var leftBobY = pivotY - Math.cos(leftRad) * length;
    drawSquare(mv, leftBobX, leftBobY, 0.0, bobS, vec4(0.9, 0.5, 0.3, 1.0));

    // Draw right bob
    var rightRad = radians(-rightAngle);
    var rightBobX = pivotDX + Math.sin(rightRad) * length;
    var rightBobY = pivotY - Math.cos(rightRad) * length;
    drawSquare(mv, rightBobX, rightBobY, 0.0, bobS, vec4(0.3, 0.7, 0.3, 1.0));

    requestAnimationFrame(render);
}

function drawSquare(mv, x, y, angDeg, size, color) {
    var M = mult(mv, translate(x, y, 0.0));
    M = mult(M, rotateZ(angDeg));
    M = mult(M, scalem(size, size, 1.0));
    gl.uniformMatrix4fv(mvLoc, false, flatten(M));
    setSolidColor(color);
    gl.drawArrays(gl.TRIANGLES, 0, NumVertices);
}

function setSolidColor(color) {
    var cols = [];
    for (var i = 0; i < NumVertices; i++) {
        cols.push(color);
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, cBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(cols), gl.STATIC_DRAW);
}

function makeUnitSquare() {
    var verts = [
        vec2(-0.5, -0.5),
        vec2(0.5, -0.5),
        vec2(0.5, 0.5),
        vec2(-0.5, -0.5),
        vec2(0.5, 0.5),
        vec2(-0.5, 0.5)
    ];
    var col = vec4(1.0, 1.0, 1.0, 1.0);
    for (var i = 0; i < 6; i++) {
        points.push(verts[i]);
        colors.push(col);
    }
}