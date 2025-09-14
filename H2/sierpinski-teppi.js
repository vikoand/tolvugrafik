/////////////////////////////////////////////////////////////////
//    S�nislausn � D�mi 5 � Heimad�mum 2 � T�lvugraf�k
//      Teiknar Teppi Sierpinskis � endurkv�man h�tt.  Byggt �
//      forriti �r kennslub�k fyrir �r�hyrning Sierpinskis.
//
//    Hj�lmt�r Hafsteinsson, �g�st 2025
/////////////////////////////////////////////////////////////////
var canvas;
var gl;

var points = [];

var numTimesToSubdivide = 6;

window.onload = function init()
{
    canvas = document.getElementById( "gl-canvas" );
    
    gl = WebGLUtils.setupWebGL( canvas );
    if ( !gl ) { alert( "WebGL isn't available" ); }
        
    //
    //  Initialize our data for the Sierpinski Carpet
    //

    // First, initialize the corners of our carpet with four points.
    var vertices = [
        vec2( -0.75, -0.75 ),
        vec2( -0.75, 0.75 ),
        vec2( 0.75, 0.75 ),
        vec2( 0.75, -0.75 )
    ];

    // Start the recursion
    divideSquare( vertices[0], vertices[1], vertices[2], vertices[3], numTimesToSubdivide);

    //
    //  Configure WebGL
    gl.viewport( 0, 0, canvas.width, canvas.height );
    gl.clearColor( 1.0, 1.0, 1.0, 1.0 );

    //  Load shaders and initialize attribute buffers
    var program = initShaders( gl, "vertex-shader", "fragment-shader" );
    gl.useProgram( program );

    // Load the data into the GPU
    var bufferId = gl.createBuffer();
    gl.bindBuffer( gl.ARRAY_BUFFER, bufferId );
    gl.bufferData( gl.ARRAY_BUFFER, flatten(points), gl.STATIC_DRAW );

    // Associate out shader variables with our data buffer
    var vPosition = gl.getAttribLocation( program, "vPosition" );
    gl.vertexAttribPointer( vPosition, 2, gl.FLOAT, false, 0, 0 );
    gl.enableVertexAttribArray( vPosition );

    render();
};

// Draw a square using two triangles
function square( a, b, c, d )
{
    points.push( a, b, c );
    points.push( a, c, d );
};

function divideSquare( a, b, c, d, count )
{
    // check for end of recursion
    
    if ( count <= 0 ) {
        square( a, b, c, d );
    }
    else {
    
        //split the sides
        var ab0 = mix( a, b, 0.3333 );
        var ab1 = mix( a, b, 0.6667 );
        var bc0 = mix( b, c, 0.3333 );
        var bc1 = mix( b, c, 0.6667 );
        var cd0 = mix( c, d, 0.3333 );
        var cd1 = mix( c, d, 0.6667 );
        var ad0 = mix( a, d, 0.3333 );
        var ad1 = mix( a, d, 0.6667 );
        var dab = mix( ad0, bc0, 0.3333 );
        var abc = mix( ad0, bc0, 0.6667 );
        var cda = mix( ad1, bc1, 0.3333 );
        var bcd = mix( ad1, bc1, 0.6667 );

        --count;

        // eight new squares
        divideSquare( a, ab0, dab, ad0, count );
        divideSquare( ab0, ab1, abc, dab, count );
        divideSquare( ab1, b, bc0, abc, count );
        divideSquare( abc, bc0, bc1, bcd, count );
        divideSquare( bcd, bc1, c, cd0, count );
        divideSquare( cda, bcd, cd0, cd1, count );
        divideSquare( ad1, cda, cd1, d, count );
        divideSquare( ad0, dab, cda, ad1, count );
    }
}

function render()
{
    gl.clear( gl.COLOR_BUFFER_BIT );
    gl.drawArrays( gl.TRIANGLES, 0, points.length );
}
