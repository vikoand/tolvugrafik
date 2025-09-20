/////////////////////////////////////////////////////////////////
//    Sýnidæmi í Tölvugrafík
//     Sýnir notkun á lyklaborðsatburðum til að hreyfa spaða
//
//    Hjálmtýr Hafsteinsson, september 2025 (uppfært af Viktor Örlyg, bætt við box-bounce fyrir Heimadæmi 3)
/////////////////////////////////////////////////////////////////
var canvas;
var gl;

var bufferId, vPosition;
var vertices;
var ballBase;
// Núverandi staðsetning miðju boltans (fernings)
var ball = vec2( 0.0, 0.0 );
var dX = 0.008;
var dY = 0.010;

var maxX = 1.0;
var maxY = 1.0;

var ballRad = 0.05;
var ballBufferId;


window.onload = function init() {

    canvas = document.getElementById( "gl-canvas" );
    
    gl = WebGLUtils.setupWebGL( canvas );
    if ( !gl ) { alert( "WebGL isn't available" ); }
    
    gl.viewport( 0, 0, canvas.width, canvas.height );
    gl.clearColor( 0.8, 0.8, 0.8, 1.0 );

    //
    //  Load shaders and initialize attribute buffers
    //
    var program = initShaders( gl, "vertex-shader", "fragment-shader" );
    gl.useProgram( program );
    
    vertices = [
        vec2( -0.1, -0.9 ),
        vec2( -0.1, -0.86 ),
        vec2(  0.1, -0.86 ),
        vec2(  0.1, -0.9 ) 
    ];

    // Grunnfletir fyrir boltann
    ballBase = new Float32Array([
        -ballRad, -ballRad,
        ballRad, -ballRad,
        ballRad, ballRad,
        -ballRad, ballRad
    ]);
    
    // Load the data into the GPU
    bufferId = gl.createBuffer();
    gl.bindBuffer( gl.ARRAY_BUFFER, bufferId );
    gl.bufferData( gl.ARRAY_BUFFER, flatten(vertices), gl.DYNAMIC_DRAW );

    // Associate out shader variables with our data buffer
    vPosition = gl.getAttribLocation( program, "vPosition" );
    gl.vertexAttribPointer( vPosition, 2, gl.FLOAT, false, 0, 0 );
    gl.enableVertexAttribArray( vPosition );

    // Búum til buffer fyrir boltann
    ballBufferId = gl.createBuffer();
    gl.bindBuffer( gl.ARRAY_BUFFER, ballBufferId );
    gl.bufferData( gl.ARRAY_BUFFER, ballBase, gl.DYNAMIC_DRAW );

    // Event listener for keyboard
    window.addEventListener("keydown", function(e){
        switch( e.keyCode ) {
            case 37:	// vinstri ör
                xmove = -0.04;
                break;
            case 39:	// hægri ör
                xmove = 0.04;
                break;
            default:
                xmove = 0.0;
        }
        for(i=0; i<4; i++) {
            vertices[i][0] += xmove;
        }

        gl.bufferSubData(gl.ARRAY_BUFFER, 0, flatten(vertices));
    } );

    render();
}


function render() {
    
        // ——— Uppfæra boltann og skopp ———
    // Skopp af veggjum
    if (Math.abs(ball[0] + dX) > maxX - ballRad) dX = -dX;
    if (Math.abs(ball[1] + dY) > maxY - ballRad) dY = -dY;

        // Skopp af spaðanum (ef boltinn er að koma niður að honum)
    // Y-efri brún spaðans er vertices[1][1] (t.d. -0.86)
    var paddleLeft  = vertices[0][0];
    var paddleRight = vertices[2][0];
    var paddleTopY  = vertices[1][1];

    // Athuga árekstur: boltinn yfir spaðanum og að fara niður
    if (dY < 0 && (ball[1] - ballRad) <= paddleTopY && (ball[1] - ballRad) >= (paddleTopY - 0.05)) {
        if (ball[0] >= paddleLeft && ball[0] <= paddleRight) {
            // Snúa við Y-hraða
            dY = Math.abs(dY);
            // Smá áhrif frá staðsetningu höggs á dX
            var paddleCenter = 0.5 * (paddleLeft + paddleRight);
            dX += 0.5 * (ball[0] - paddleCenter) * 0.1;
        }
    }

    // Uppfæra staðsetningu boltans
    ball[0] += dX;
    ball[1] += dY;

    // ——— Teikna ———
    gl.clear(gl.COLOR_BUFFER_BIT);

    // Teikna spaðann
    gl.bindBuffer(gl.ARRAY_BUFFER, bufferId);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, flatten(vertices));
    gl.vertexAttribPointer(vPosition, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);
    gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);

    // Teikna boltann (færum grunn-hnitin um (ball.x, ball.y))
    var translated = new Float32Array([
        ballBase[0] + ball[0], ballBase[1] + ball[1],
        ballBase[2] + ball[0], ballBase[3] + ball[1],
        ballBase[4] + ball[0], ballBase[5] + ball[1],
        ballBase[6] + ball[0], ballBase[7] + ball[1]
    ]);
    gl.bindBuffer(gl.ARRAY_BUFFER, ballBufferId);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, translated);
    gl.vertexAttribPointer(vPosition, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);
    gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);


    window.requestAnimFrame(render);
}
