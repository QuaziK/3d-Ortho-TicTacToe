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

var aspect;

const TIME_VAL = .2;
const G = 9.8 // gravity factor
// ["name", x coord, y coord, time factor]
// time factors need to be processed by the timeToZ() before sending to render
// every time x/o gets rendered their time factor gets reduced by TIME_VAL
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
	grid_texture_coords = getOrderedTegridtureCoordsFromObj(grid_object);
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
	plane_texture_coords = getOrderedTeplanetureCoordsFromObj(plane_object);
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
	loadOBJFromPath("ooh.obj", loadedO, readGrid);
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
	
	var image1 = document.getElementById("texImage1");
	textureX = configureTexture( image1 );
	var image2 = document.getElementById("texImage2");
    textureO = configureTexture( image2 );
	var image3 = document.getElementById("texImage3");
    textureGrid = configureTexture( image3 );
	var image4 = document.getElementById("texImage4");
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
	
	loadOBJFromPath("eks.obj", loadedX, readO);
    
    canvas.addEventListener("mousedown", function(event){
        var clickCoord = [(2*event.clientX/canvas.width-1), (2*(canvas.height-event.clientY)/canvas.height-1)];
        registerClick(clickCoord[0], clickCoord[1]);
    });    
}

var x_shader, o_shader, grid_shader, plane_shader;
var vBufferX, vBufferX, vBufferGrid, vBufferPlane; 
var vPositionX, vPositionO, vPositionGrid, vPositionPlane;

var iBufferX, iBufferO, iBufferGrid, iBufferPlane;
var nBufferX, nBufferO, nBufferGrid, nBufferPlane;
var tBufferX, tBufferO, tBufferGrid, tBufferPlane;

var vTexCoordX, vTexCoordO, vTexCoordGrid, vTexCoordPlane;
var vNormalX, vNormalO, vTexCoordGrid, vTexCoordPlane;

var projectionMatrixLocX, modelViewMatrixLocX;
var projectionMatrixLocO, modelViewMatrixLocO;
var projectionMatrixLocGrid, modelViewMatrixLocGrid;
var projectionMatrixLocPlane, modelViewMatrixLocPlane;

//TODO setup+render functions
function setupXBuffers(){

}

function setupOBuffers(){

}

function setupGridBuffers(){

}

function setupPlaneBuffers(){

}

function renderX(x, y, z){

}

function renderO(x, y, z){

}

function renderGrid(){
    
}

function renderPlane(){
    
}

function timeToZ(time_factor){
    var zet = Z_MULT * Math.sqrt(time_factor / G);
    return zet;
}

//TODO
//takes a list of x and y coordiantes of mouse clicks and determines which slot should a piece would go
//calls checkGameState after piece was placed
//alternates which piece is to be placed
//does nothing if gameWon = true
function registerClick(xcoord, ycoord){
    if (!gameWon){
        
    }
}

//TODO 
//looks at the passed coordiante and checks surrounding slots if it made a 3 in a row with them
function checkGameState(grid_x, grid_y){
    
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

var modelViewMatrix, projectionMatrix;
function render()
{
    gl.clear( gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

	var eye = vec3(1.0, -1.0, 1.0);   
	var at = vec3(0.0, 0.0, 0.0);
	var up = vec3(0.0, 0.0, 1.0);

	modelViewMatrix = lookAt( eye, at, up );

    projectionMatrix = perspective(120, aspect, 0.3, 30);
 
    for (var i = 0; i < gameState.length; i++){
        if (gameState[i][0] == "x"){
            renderX(gameState[i][1], gameState[i][2], timeToZ(gameState[i][3]));
            if (gameState[i][3] != 0) {
                gameState[i][3] = gameState[i][3] - TIME_VAL;
            }
        }
        if (gameState[i][0] == "o"){
            renderX(gameState[i][1], gameState[i][2], timeToZ(gameState[i][3]));
            if (gameState[i][3] != 0) {
                gameState[i][3] = gameState[i][3] - TIME_VAL;
            }
        }
    }
 
    requestAnimFrame( render );
}
