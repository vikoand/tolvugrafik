/////////////////////////////////////////////////////////////////
//
//    Verkefni 1 í Tölvugrafík – Frogger grunnur á kennaradæmi
//    Skipting: gangstétt (efst & neðst) og 3 akreinar þar á milli.
//    Rauður þríhyrningur neðst sem hliðrast með örvum (vinstri/hægri).
//
//    Viktor Örlygur Andrason, september 2025
//
/////////////////////////////////////////////////////////////////
var canvas;
var gl;
var program;
var bufferId;
var vPositionLoc;
var uColorLoc;
// Layout
var topSidewalkYMin = 0.6, topSidewalkYMax = 0.8;
var bottomSidewalkYMin = -1.0, bottomSidewalkYMax = -0.8;
var roadYMin = bottomSidewalkYMax;
var roadYMax = topSidewalkYMin;
var laneHeight = (roadYMax - roadYMin) / 5;

// þríhyrningur (froskur)
var frog = {
    x: 0.0,
    y: -0.9,
    halfW: 0.06,
    halfH: 0.05
};
var frogUp = true;
var nextGoal = 'top';

// Stig
var score = 0;
var headerYMin = 0.8, headerYMax = 1.0;
function resetFrog() {
  frog.x = 0.0;
  frog.y = -0.9;
  frogUp = true;
}

// Bílar
var cars = [];
(function initCars() {
  var carSize = laneHeight * 0.5;
  var colors = [
    vec4(0.90, 0.20, 0.20, 1.0),
    vec4(0.20, 0.65, 0.95, 1.0),
    vec4(0.95, 0.80, 0.20, 1.0),
    vec4(0.60, 0.90, 0.35, 1.0),
    vec4(0.75, 0.50, 0.95, 1.0)
  ];
  var speeds = [0.35, 0.45, 0.52, 0.40, 0.48];
  for (var i = 0; i < 5; i++) {
    var laneCenterY = roadYMin + (i + 0.5) * laneHeight;
    var dir = (i % 2 === 0) ? 1 : -1; // alternate lane direction

    var baseSpeed = speeds[i];
    // First (and for most lanes, only) car per lane
    var x1 = (dir === 1) ? -0.8 : 0.8;
    cars.push({ x: x1, y: laneCenterY, size: carSize, color: colors[(i*2) % colors.length], speed: baseSpeed, dir: dir });

    // Only for the MIDDLE lane (i === 2): add a second car with a different speed
    if (i === 2) {
      var x2 = (dir === 1) ? 0.3 : -0.3;          // staggered start to avoid overlap
      var secondSpeed = Math.max(0.15, baseSpeed * 0.85); // different speed (15% slower)
      cars.push({ x: x2, y: laneCenterY, size: carSize, color: colors[(i*2+1) % colors.length], speed: secondSpeed, dir: dir });
    }
  }
})();

// Árekstar
function aabbIntersects(ax, ay, aw, ah, bx, by, bw, bh) {
  var aL = ax - aw * 0.5, aR = ax + aw * 0.5, aB = ay - ah * 0.5, aT = ay + ah * 0.5;
  var bL = bx - bw * 0.5, bR = bx + bw * 0.5, bB = by - bh * 0.5, bT = by + bh * 0.5;
  return !(aL > bR || aR < bL || aB > bT || aT < bB);

}

function resetGame() {
  score = 0;
  nextGoal = 'top';
  frogUp = true;
  frog.x = 0.0;
  frog.y = (bottomSidewalkYMax + bottomSidewalkYMin) * 0.5;
  initCars();
}


window.onload = function init() {
    canvas = document.getElementById( "gl-canvas" );
    gl = WebGLUtils.setupWebGL( canvas );
    if ( !gl ) { alert( "WebGL isn't available" ); }
    
    gl.viewport( 0, 0, canvas.width, canvas.height );
    gl.clearColor( 0.85, 0.85, 0.85, 1.0 );

    program = initShaders( gl, "vertex-shader", "fragment-shader" );
    gl.useProgram( program );
    
    bufferId = gl.createBuffer();
    gl.bindBuffer( gl.ARRAY_BUFFER, bufferId );
    
    vPositionLoc = gl.getAttribLocation( program, "vPosition" );
    gl.vertexAttribPointer( vPositionLoc, 2, gl.FLOAT, false, 0, 0 );
    gl.enableVertexAttribArray( vPositionLoc );

    uColorLoc = gl.getUniformLocation(program, "uColor");

    // Add static title text overlay
    var titleEl = document.createElement('div');
    titleEl.textContent = 'Verkefni 1';
    titleEl.style.position = 'absolute';
    titleEl.style.left = canvas.offsetLeft + 'px';
    titleEl.style.top = (canvas.offsetTop + 4) + 'px';
    titleEl.style.width = canvas.width + 'px';
    titleEl.style.textAlign = 'center';
    titleEl.style.font = 'bold 16px system-ui, sans-serif';
    titleEl.style.color = '#ffffff';
    document.body.appendChild(titleEl);


    // Event listener for keyboard
    window.addEventListener("keydown", function(e){
               var dx = 0.0, dy = 0.0;
        if (e.key === "ArrowLeft")      dx = -0.08;
        else if (e.key === "ArrowRight") dx =  0.08;
        else if (e.key === "ArrowUp")  { dy =  0.08; frogUp = true; }
        else if (e.key === "ArrowDown"){ dy = -0.08; frogUp = false; }
        else return;

        frog.x = clamp(frog.x + dx, -1.0 + frog.halfW, 1.0 - frog.halfW);

        var newY = clamp(frog.y + dy, -1.0 + frog.halfH, 1.0 - frog.halfH);
        var topCenter = (topSidewalkYMin + topSidewalkYMax) * 0.5;
        var bottomCenter = (bottomSidewalkYMin + bottomSidewalkYMax) * 0.5;

        if (newY + frog.halfH <= bottomSidewalkYMax && newY < bottomCenter) {
          newY = bottomCenter;
        }

        if (newY - frog.halfH >= topSidewalkYMin && newY > topCenter) {
          newY = topCenter;
        }

        frog.y = newY;

        e.preventDefault();
    } );

    render();
}

function clamp(v, lo, hi) { 
  return Math.max(lo, Math.min(hi, v)); 
}

function rectVerts(x1, y1, x2, y2) {
    return flatten([
        vec2(x1, y1),
        vec2(x2, y1),
        vec2(x2, y2),
        vec2(x1, y2)
    ]);
}

// --- Teikna götur --
function drawRect(x1, y1, x2, y2, color4) {
    gl.uniform4fv(uColorLoc, color4);
    gl.bufferData(gl.ARRAY_BUFFER, rectVerts(x1,y1,x2,y2), gl.DYNAMIC_DRAW);
    gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);
}

// --- Teikna bíla ---
function drawRectC(cx, cy, w, h, color4) {
    drawRect(cx - w*0.5, cy - h*0.5, cx + w*0.5, cy + h*0.5, color4);
}

function drawTriangle(cx, cy, halfW, halfH, color4, pointingUp) {
  gl.uniform4fv(uColorLoc, color4);
  var v;
  if (pointingUp) {
      v = flatten([
          vec2(cx, cy + halfH),
          vec2(cx - halfW, cy - halfH),
          vec2(cx + halfW, cy - halfH)
      ]);
  } else {
      v = flatten([
          vec2(cx, cy - halfH),
          vec2(cx - halfW, cy + halfH),
          vec2(cx + halfW, cy + halfH)
      ]);
  }
  gl.bufferData(gl.ARRAY_BUFFER, v, gl.DYNAMIC_DRAW);
  gl.drawArrays(gl.TRIANGLES, 0, 3);
}

var _lastTime = performance.now();

function render() {
    gl.clear( gl.COLOR_BUFFER_BIT );

    var now = performance.now();
    var dt = Math.min(0.05, (now - _lastTime) / 1000.0);
    _lastTime = now;

    // Upfærir staðsetningu bíla
    for (var i = 0; i < cars.length; i++) {
      var c = cars[i];
      c.x += c.speed * c.dir * dt;
      var half = c.size * 0.5;
      if (c.x + half > 1.0) { c.x = 1.0 - half; c.dir *= -1; }
      if (c.x - half < -1.0) { c.x = -1.0 + half; c.dir *= -1; }
    }

    // Stig: þegar froskur (AABB) er KOMINN Á gangstétt
    var topCenter = (topSidewalkYMin + topSidewalkYMax) * 0.5;
    var bottomCenter = (bottomSidewalkYMin + bottomSidewalkYMax) * 0.5;
    var frogTop = frog.y + frog.halfH;
    var frogBottom = frog.y - frog.halfH;

    if (nextGoal === 'top') {
      if (frogBottom >= topSidewalkYMin) {
        score += 1;
        nextGoal = 'bottom';
        frogUp = false;
        frog.y = topCenter;
      }
    } else {
      if (frogTop <= bottomSidewalkYMax) {
        score += 1;
        nextGoal = 'top';
        frogUp = true;
        frog.y = bottomCenter;
      }
    }

    // --- Árekstrarpróf (AABB) ---
    var frogW = frog.halfW * 2.0, frogH = frog.halfH * 2.0;
    for (var i = 0; i < cars.length; i++) {
      var c = cars[i];
      if (aabbIntersects(frog.x, frog.y, frogW, frogH, c.x, c.y, c.size, c.size)) {
        resetGame();
        break;
      }
    }
    
    // --- Gangstéttir ---
    drawRect(-1.0, topSidewalkYMin, 1.0, topSidewalkYMax, vec4(0.90, 0.90, 0.90, 1.0));
    drawRect(-1.0, bottomSidewalkYMin, 1.0, bottomSidewalkYMax, vec4(0.90, 0.90, 0.90, 1.0));
    
    // --- Vegur ---
    drawRect(-1.0, roadYMin, 1.0, roadYMax, vec4(0.25, 0.25, 0.28, 1.0));
    
    // --- Akreinaskil ---
    var lineH = 0.01; // þykkt línu
    for (var i = 1; i < 5; i++) {
      var y = roadYMin + i * laneHeight;
      drawRect(-1.0, y - lineH * 0.5, 1.0, y + lineH * 0.5, vec4(1.0, 1.0, 1.0, 0.5));
    }

    // --- Þríhyrningur (froskur) ---
    drawTriangle(frog.x, frog.y, frog.halfW, frog.halfH, vec4(0.2, 0.9, 0.2, 1.0), frogUp);

    // --- Bílar ---
    for (var i = 0; i < cars.length; i++) {
      var c = cars[i];
      drawRectC(c.x, c.y, c.size, c.size, c.color);
    }
    
    // --- 'Canvas' haus ---
    drawRect(-1.0, headerYMin, 1.0, headerYMax, vec4(0.75, 0.15, 0.20, 1.0));

    // --- Stiginn ---
    var tickW = 0.178;
    var tickGap = 0.02;
    var tickY0 = headerYMin + 0.02;
    var tickY1 = headerYMax - 0.1;
    var maxTicks = 10;
    var ticksToDraw = Math.min(score, maxTicks);
    var startX = -1.0 + 0.02;
    for (var i = 0; i < ticksToDraw; i++) {
      var x0 = startX + i * (tickW + tickGap);
      var x1 = x0 + tickW;
      if (x1 > 1.0 - 0.02) break;
      drawRect(x0, tickY0, x1, tickY1, vec4(1.0 , 1.0, 1.0, 1.0));
    }
    
    window.requestAnimFrame(render);
}
