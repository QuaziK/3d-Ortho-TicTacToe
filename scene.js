"use strict";

var canvas;
var gl;

var numVerticesInAllXFaces;
var x_indices;
var x_vertices;
var x_object;
var x_normals;
var x_texture_coords;

var numVerticesInAllOFaces;
var o_indices;
var o_vertices;
var o_object;
var o_normals;
var o_texture_coords;

var numVerticesInAllGridFaces;
var grid_indices;
var grid_vertices;
var grid_object;
var grid_normals;
var grid_texture_coords;

var numVerticesInAllPlaneFaces;
var plane_indices;
var plane_vertices;
var plane_object;
var plane_normals;
var plane_texture_coords;

var lightPosition1 = vec4(1.0, 1.0, 1.0, 0.0);
var lightPosition2 = vec4(-1.0, -1.0, 1.0, 0.0);
var lightAmbient = vec4(0,0,0, 1.0 );
var lightDiffuse = vec4( 1,1,1, 1.0 );
var lightSpecular = vec4( 1,1,1, 1.0 );

var materialAmbient = vec4( 0,0,0, 1.0 );
var materialDiffuse = vec4( .8,.8,.8, 1.0);
var materialSpecular = vec4( 1.0, 1.0, 1.0, 1.0 );
var materialShininess = 20.0;                                             

var ambientProduct = mult(lightAmbient, materialAmbient);
var diffuseProduct = mult(lightDiffuse, materialDiffuse);
var specularProduct = mult(lightSpecular, materialSpecular);

var near = 0.3;    // Near clipping plane
var far = 30.0;   // Far clipping plane
var fovy = 60.0;  // Field-of-view in Y direction angle (in degrees)
var aspect = 1.0;  // Viewport aspect ratio

const TIME_VAL = .05;
const G = 9.8 // gravity factor
// ["name", x coord, y coord, time factor]
// time factors need to be processed by the timeToZ() before sending to render
// every time x/o gets rendered their time factor gets reduced by TIME_VAL until 0
var gameState = [["e",0,0,0], ["e",0,0,0], ["e",0,0,0],
                 ["e",0,0,0], ["e",0,0,0], ["e",0,0,0],
                 ["e",0,0,0], ["e",0,0,0], ["e",0,0,0]];
var gameWon = false; // if true prevents all incoming clicks to register pieces
var useXPiece = true; // if true, registerClick() puts an x, if false puts an o

const Z_MULT = 5; //multiplier for timeToZ() output

function loadedX(data, _callback)
{
	x_object = loadOBJFromBuffer(data);
	console.log(x_object);
	x_indices = x_object.i_verts;
	x_vertices = x_object.c_verts;
	numVerticesInAllXFaces = x_indices.length;
	x_normals = getOrderedNormalsFromObj(x_object);
	x_texture_coords = getOrderedTextureCoordsFromObj(x_object);
	_callback();
}

function loadedO(data, _callback)
{
	o_object = loadOBJFromBuffer(data);
	console.log(o_object);
	o_indices = o_object.i_verts;
	o_vertices = o_object.c_verts;
	numVerticesInAllOFaces = o_indices.length;
	o_normals = getOrderedNormalsFromObj(o_object);
	o_texture_coords = getOrderedTextureCoordsFromObj(o_object);
	_callback();
}

function loadedGrid(data, _callback)
{
	grid_object = loadOBJFromBuffer(data);
	console.log(grid_object);
	grid_indices = grid_object.i_verts;
	grid_vertices = grid_object.c_verts;
	numVerticesInAllGridFaces = grid_indices.length;
	grid_normals = getOrderedNormalsFromObj(grid_object);
	grid_texture_coords = getOrderedTextureCoordsFromObj(grid_object);
	_callback();
}

function loadedPlane(data, _callback)
{
	plane_object = loadOBJFromBuffer(data);
	console.log(plane_object);
	plane_indices = plane_object.i_verts;
	plane_vertices = plane_object.c_verts;
	numVerticesInAllPlaneFaces = plane_indices.length;
	plane_normals = getOrderedNormalsFromObj(plane_object);
	plane_texture_coords = getOrderedTextureCoordsFromObj(plane_object);
	_callback();
}


function getOrderedTextureCoordsFromObj(obj_object){
	var texCoordsOrderedWithVertices = [];
    for (var i = 0; i < obj_object.i_verts.length; i++){
        texCoordsOrderedWithVertices[2 * obj_object.i_verts[i]]     = obj_object.c_uvt[2 * obj_object.i_uvt[i]];
        texCoordsOrderedWithVertices[2 * obj_object.i_verts[i] + 1] = obj_object.c_uvt[2 * obj_object.i_uvt[i] + 1];        
    }
	return texCoordsOrderedWithVertices;
}

function getOrderedNormalsFromObj(obj_object){
	var normalsOrderedWithVertices = [];
    for (var ii = 0; ii < obj_object.i_verts.length; ii++){
        normalsOrderedWithVertices[3 * obj_object.i_verts[ii]]     = obj_object.c_norms[3 * obj_object.i_norms[ii]];
        normalsOrderedWithVertices[3 * obj_object.i_verts[ii] + 1] = obj_object.c_norms[3 * obj_object.i_norms[ii] + 1];        
        normalsOrderedWithVertices[3 * obj_object.i_verts[ii] + 2] = obj_object.c_norms[3 * obj_object.i_norms[ii] + 2];        
    }
	return normalsOrderedWithVertices;
}

function readO(){
	loadOBJFromPath("newo.obj", loadedO, readGrid);
}

function readGrid(){
	loadOBJFromPath("lines.obj", loadedGrid, readPlane);
}

function readPlane(){
	loadOBJFromPath("plane.obj", loadedPlane, setupAfterDataLoad);
}

var textureX;
var textureO;
var textureGrid;
var texturePlane;

function configureTexture( image ) {
    var texture = gl.createTexture();
    gl.bindTexture( gl.TEXTURE_2D, texture );
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D( gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, image );
    gl.generateMipmap( gl.TEXTURE_2D );
    gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST_MIPMAP_LINEAR );
    gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST );
	return texture;
}

function setupAfterDataLoad(){
	
	gl.enable(gl.DEPTH_TEST);
	
    setupXBuffers();
	setupOBuffers();
    setupGridBuffers();
    setupPlaneBuffers();
	
	var image1 = document.getElementById("woodImage");
	textureX = configureTexture( image1 );
	var image2 = document.getElementById("worldImage");
    textureO = configureTexture( image2 );
	var image3 = document.getElementById("ballImage");
    textureGrid = configureTexture( image3 );
	var image4 = document.getElementById("donutImage");
    texturePlane = configureTexture( image4 );    
    
    render();	
}

window.onload = function init()
{
    canvas = document.getElementById( "gl-canvas" );

    gl = WebGLUtils.setupWebGL( canvas );
    if ( !gl ) { alert( "WebGL isn't available" ); }

    gl.viewport( 0, 0, canvas.width, canvas.height );
	aspect =  canvas.width/canvas.height;
    gl.clearColor( 1.0, 1.0, 1.0, 1.0);
	
	loadOBJFromPath("newx.obj", loadedX, readO);
    
    canvas.addEventListener("mousedown", function(event){
        var clickCoord = [(2*event.clientX/canvas.width-1), (2*(canvas.height-event.clientY)/canvas.height-1)];
        //console.log(clickCoord);
        registerClick(clickCoord[0], clickCoord[1]);
    });    
}

var x_shader, o_shader, grid_shader, plane_shader;
var vBufferX, vBufferO, vBufferGrid, vBufferPlane; 
var vPositionX, vPositionO, vPositionGrid, vPositionPlane;

var iBufferX, iBufferO, iBufferGrid, iBufferPlane;
var nBufferX, nBufferO, nBufferGrid, nBufferPlane;
var tBufferX, tBufferO, tBufferGrid, tBufferPlane;

var vTexCoordX, vTexCoordO, vTexCoordGrid, vTexCoordPlane;
var vNormalX, vNormalO, vNormalGrid, vNormalPlane;

var projectionMatrixLocX, modelViewMatrixLocX;
var projectionMatrixLocO, modelViewMatrixLocO;
var projectionMatrixLocGrid, modelViewMatrixLocGrid;
var projectionMatrixLocPlane, modelViewMatrixLocPlane;

//TODO setup+render functions
function setupXBuffers(){
    //  Load shaders and initialize attribute buffers
    x_shader = initShaders( gl, "xo-vertex-shader", "xo-fragment-shader" );
    gl.useProgram( x_shader );

    // array element buffer
    iBufferX = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, iBufferX);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(x_indices), gl.STATIC_DRAW);
	
    // vertex array attribute buffer
    vBufferX = gl.createBuffer();
    gl.bindBuffer( gl.ARRAY_BUFFER, vBufferX );
    gl.bufferData( gl.ARRAY_BUFFER, new Float32Array(x_vertices), gl.STATIC_DRAW );

    vPositionX = gl.getAttribLocation( x_shader, "vPosition" );
    //console.log(vPositionX);

	// normal array attribute buffer
	nBufferX = gl.createBuffer();
	gl.bindBuffer( gl.ARRAY_BUFFER, nBufferX );
	gl.bufferData( gl.ARRAY_BUFFER, new Float32Array(x_normals), gl.STATIC_DRAW );

	vNormalX = gl.getAttribLocation( x_shader, "vNormal" );
    console.log(vNormalX);

	// texture array attribute buffer
	tBufferX = gl.createBuffer();
    gl.bindBuffer( gl.ARRAY_BUFFER, tBufferX );
    gl.bufferData( gl.ARRAY_BUFFER, flatten(x_texture_coords), gl.STATIC_DRAW );
    
    vTexCoordX = gl.getAttribLocation( x_shader, "vTexCoord" );
    //console.log(vTexCoordX);

	// Model view projection uniforms
	modelViewMatrixLocX = gl.getUniformLocation( x_shader, "modelViewMatrix" );
    projectionMatrixLocX = gl.getUniformLocation( x_shader, "projectionMatrix" );
}

function setupOBuffers(){
    //  Load shaders and initialize attribute buffers
    o_shader = initShaders( gl, "xo-vertex-shader", "xo-fragment-shader" );
    gl.useProgram( o_shader );

    // array element buffer
    iBufferO = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, iBufferO);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(o_indices), gl.STATIC_DRAW);
	
    // vertex array attribute buffer
    vBufferO = gl.createBuffer();
    gl.bindBuffer( gl.ARRAY_BUFFER, vBufferO );
    gl.bufferData( gl.ARRAY_BUFFER, new Float32Array(o_vertices), gl.STATIC_DRAW );

    vPositionO = gl.getAttribLocation( o_shader, "vPosition" );
    //console.log(vPositionO);

	// normal array attribute buffer
	nBufferO = gl.createBuffer();
	gl.bindBuffer( gl.ARRAY_BUFFER, nBufferO );
	gl.bufferData( gl.ARRAY_BUFFER, new Float32Array(o_normals), gl.STATIC_DRAW );

	vNormalX = gl.getAttribLocation( o_shader, "vNormal" );
    console.log(vNormalX);

	// texture array attribute buffer
	tBufferO = gl.createBuffer();
    gl.bindBuffer( gl.ARRAY_BUFFER, tBufferO );
    gl.bufferData( gl.ARRAY_BUFFER, flatten(o_texture_coords), gl.STATIC_DRAW );
    
    vTexCoordO = gl.getAttribLocation( o_shader, "vTexCoord" );
    //console.log(vTexCoordO);

	// Model view projection uniforms
	modelViewMatrixLocO = gl.getUniformLocation( o_shader, "modelViewMatrix" );
    projectionMatrixLocO = gl.getUniformLocation( o_shader, "projectionMatrix" );
}

function setupGridBuffers(){

}

function setupPlaneBuffers(){

}

function renderX(x, y, z){
    if (Number.isNaN(z)) { z=0; }
    //console.log("Render X to ", x, y, z);

    // Use x shader program
    gl.useProgram( x_shader );
	
    // Indicies
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, iBufferX);
	
	// Vertices
	gl.bindBuffer( gl.ARRAY_BUFFER, vBufferX );
    gl.vertexAttribPointer( vPositionX, 3, gl.FLOAT, false, 0, 0 );
    gl.enableVertexAttribArray( vPositionX );

	// Normals
	gl.bindBuffer( gl.ARRAY_BUFFER, nBufferX );
    gl.vertexAttribPointer( vNormalX, 3, gl.FLOAT, false, 0, 0 );
    gl.enableVertexAttribArray( vNormalX );

	// Texture
	gl.bindBuffer( gl.ARRAY_BUFFER, tBufferX );
	gl.vertexAttribPointer( vTexCoordX, 2, gl.FLOAT, false, 0, 0 );
    gl.enableVertexAttribArray( vTexCoordX );

    // Bind texture
	gl.bindTexture( gl.TEXTURE_2D, textureX );
	
    // Model View Projection
    var modelViewMatrixX = mult(modelViewMatrix, translate(x, y, z));
	gl.uniformMatrix4fv( modelViewMatrixLocX, false, flatten(modelViewMatrixX) );
    gl.uniformMatrix4fv( projectionMatrixLocX, false, flatten(projectionMatrix) );

	// console.log(numVerticesInAllXFaces);
    gl.drawElements( gl.TRIANGLES, numVerticesInAllXFaces, gl.UNSIGNED_SHORT, 0 );
}

function renderO(x, y, z){
    if (Number.isNaN(z)) { z=0; }    
    //console.log("Render O to ", x, y, z);

    // Use x shader program
    gl.useProgram( o_shader );
	
    // Indicies
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, iBufferO);
	
	// Vertices
	gl.bindBuffer( gl.ARRAY_BUFFER, vBufferO );
    gl.vertexAttribPointer( vPositionO, 3, gl.FLOAT, false, 0, 0 );
    gl.enableVertexAttribArray( vPositionO );

	// Normals
	gl.bindBuffer( gl.ARRAY_BUFFER, nBufferO );
    gl.vertexAttribPointer( vNormalO, 3, gl.FLOAT, false, 0, 0 );
    gl.enableVertexAttribArray( vNormalO );

	// Texture
	gl.bindBuffer( gl.ARRAY_BUFFER, tBufferO );
	gl.vertexAttribPointer( vTexCoordO, 2, gl.FLOAT, false, 0, 0 );
    gl.enableVertexAttribArray( vTexCoordO );

    // Bind texture
	gl.bindTexture( gl.TEXTURE_2D, textureO );
	
    // Model View Projection
    var modelViewMatrixO = mult(modelViewMatrix, translate(x, y, z));
	gl.uniformMatrix4fv( modelViewMatrixLocO, false, flatten(modelViewMatrixO) );
    gl.uniformMatrix4fv( projectionMatrixLocO, false, flatten(projectionMatrix) );

	// console.log(numVerticesInAllYFaces);
    gl.drawElements( gl.TRIANGLES, numVerticesInAllOFaces, gl.UNSIGNED_SHORT, 0 );
}

function renderGrid(){
    
}

function renderPlane(){
    
}

function timeToZ(time_factor){
    var zet = Z_MULT * Math.sqrt(time_factor / G);
    return zet;
}

//takes a list of x and y coordiantes of mouse clicks and determines which slot should a piece would go
//calls checkGameState after piece was placed
//alternates which piece is to be placed
//does nothing if gameWon = true
//the canvas coordiantes are as such
//(-1,1) ___ (1,1)
//      |   |
//(-1,0)|___|(1,0)
function registerClick(xcoord, ycoord){
    if (!gameWon){
        var piece;
        if (useXPiece) { piece="x"; } else { piece="o" }
        var gridxy = clickToGridCoor(xcoord, ycoord);
        if (gameState[matrixToLinear(gridxy[0],gridxy[1])][0] == "e" ) {
            gameState[matrixToLinear(gridxy[0],gridxy[1])] = [piece, gridxy[2],gridxy[3], 2.0];
        }        
        console.log(gameState);
        useXPiece = !useXPiece;
    }
}

//function to convert mouse click coordinates to grid coordites
//also returns the 3d space x,y coordinates on where to render the X/O object
//[xgrid,ygrid,x3d,y3d]
function clickToGridCoor(xcoord, ycoord){
        if (xcoord < -.33 && xcoord > -1 && ycoord > .33 && ycoord < 1){ //(0,0)
            return [0,0,.55,.55];
        }
        if (xcoord < .33 && xcoord > -.33 && ycoord > .33 && ycoord < 1){ //(1,0)
            return [1,0,.55,.55];
        }
        if (xcoord < 1 && xcoord > .33 && ycoord > .33 && ycoord < 1){ //(2,0)
            return [2,0,.55,.55];
        }
        if (xcoord < -.33 && xcoord > -1 && ycoord > -.33 && ycoord < .33){ //(0,1)
            return [0,1,.55,.55];
        }
        if (xcoord < .33 && xcoord > -.33 && ycoord > -.33 && ycoord < .33){ //(1,1)
            return [1,1,.55,.55];
        }
        if (xcoord < 1 && xcoord > .33 && ycoord > -.33 && ycoord < .33){ //(2,1)
            return [2,1,.55,.55];
        }
        if (xcoord < -.33 && xcoord > -1 && ycoord > -1 && ycoord < -.33){ //(0,2)
            return [0,2,.55,.55];
        }
        if (xcoord < .33 && xcoord > -.33 && ycoord > -1 && ycoord < -.33){ //(1,2)
            return [1,2,.55,.55];
        }
        if (xcoord < 1 && xcoord > .33 && ycoord > -1 && ycoord < -.33){ //(2,2)
            return [2,2,.55,.55];
        } 
}

//checks all possible winning combinations to see if one occured
//if win is detected set gameWon = true
//if not do nothing
function checkGameState(){
    for (var sic = 0; sic < 2; sic++){
        var piece;
        if (sic == 0) { piece="x"; } else { piece="o"; }
        if (gameState[0][0] == piece &&
            gameState[1][0] == piece &&
            gameState[2][0] == piece) {gameWon = true;} // top row
            
        if (gameState[3][0] == piece &&
            gameState[4][0] == piece &&
            gameState[5][0] == piece) {gameWon = true;} // mid row
            
        if (gameState[6][0] == piece &&
            gameState[7][0] == piece &&
            gameState[8][0] == piece) {gameWon = true;} // bot row
            
        if (gameState[0][0] == piece &&
            gameState[3][0] == piece &&
            gameState[6][0] == piece) {gameWon = true;} // left col
            
        if (gameState[1][0] == piece &&
            gameState[4][0] == piece &&
            gameState[7][0] == piece) {gameWon = true;} // mid col
            
        if (gameState[2][0] == piece &&
            gameState[5][0] == piece &&
            gameState[8][0] == piece) {gameWon = true;} // right col
            
        if (gameState[0][0] == piece &&
            gameState[4][0] == piece &&
            gameState[8][0] == piece) {gameWon = true;} // tl->br diag 
            
        if (gameState[6][0] == piece &&
            gameState[4][0] == piece &&
            gameState[2][0] == piece) {gameWon = true;} // bl->tr diag           
    }
}

//because the gameState is a 1d list, when speaking in x and y coordinates it is necessary to convert them to a 1d scale
//EX: (1,2) -> 7, (0,0) -> 0, (2,2) -> 8
//everything has an offset of 0
// 0 | 1 | 2      (0,0) | (1,0) | (2,0)
// 3 | 4 | 5  <-> (0,1) | (1,1) | (2,1)
// 6 | 7 | 8      (0,2) | (1,2) | (2,2)
function matrixToLinear(x, y){
    return x+(y*3);
}

//checks each slot in gameState to see if all pieces have finished falling
//resets the board if so
//is only called when gameWon = true
function allSettled() {
    var goReset = true;
    for (var ii = 0; ii<gameState.length; ii++){
        if (gameState[ii][3] > 0) { goReset=false; }
    }
    if (goReset) {
        gameWon = false;
        useXPiece = true;
        gameState = [["e",0,0,0], ["e",0,0,0], ["e",0,0,0],
                     ["e",0,0,0], ["e",0,0,0], ["e",0,0,0],
                     ["e",0,0,0], ["e",0,0,0], ["e",0,0,0]];
    }
}

var modelViewMatrix, projectionMatrix;
function render()
{
    gl.clear( gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

	var eye = vec3(.7, -.7, .7);   
	var at = vec3(0.0, 0.0, 0.0);
	var up = vec3(0.0, -1.0, 0.0);

	modelViewMatrix = lookAt( eye, at, up );

    projectionMatrix = perspective(fovy, aspect, near, far);
 
    renderX(-1,1,-1); //! temp
    renderO(-2,1,-1); //! temp
    renderX(-3,1,-1); //! temp
    renderO(-1,1,-2); //! temp    
    renderX(-2,1,-2); //! temp        
    renderO(-3,1,-2); //! temp   
    renderX(-1,1,-3); //! temp    
    renderO(-2,1,-3); //! temp        
    renderX(-3,1,-3); //! temp       
    //! @todo uncomment
    /*
    for (var i = 0; i < gameState.length; i++){
        if (gameState[i][0] == "x"){
            renderX(gameState[i][1], gameState[i][2], timeToZ(gameState[i][3]));
            if (gameState[i][3] > 0) {
                gameState[i][3] = gameState[i][3] - TIME_VAL;
            }
        }
        if (gameState[i][0] == "o"){
            renderO(gameState[i][1], gameState[i][2], timeToZ(gameState[i][3]));
            if (gameState[i][3] > 0) {
                gameState[i][3] = gameState[i][3] - TIME_VAL;
            }
        }
        checkGameState();
        if (gameWon){allSettled();}
    }
    */
 
    requestAnimFrame( render );
}