import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js';
import { SUBTRACTION, Evaluator, Brush } from 'three-bvh-csg';
import CustomShaderMaterial from 'three-custom-shader-material/vanilla';
import GUI from 'lil-gui';
import terrainVertexShader from './shaders/terrain/vertex.glsl';
import terrainFragmentShader from './shaders/terrain/fragment.glsl';
import { texture } from 'three/examples/jsm/nodes/Nodes.js';

/**
 * Base
 */
// Debug
const gui = new GUI({ width: 325 });
const debugObject = {};
// Material
debugObject.colorWaterDeep = '#3700ff';
debugObject.colorWaterSurface = '#800000';
debugObject.colorSand = '#ff996';
debugObject.colorGrass = '#e03800';
debugObject.colorSnow = '#ffffff';
debugObject.colorRock = '#adadad';
debugObject.planeOpacity = 0.5;


// Canvas
const canvas = document.querySelector('canvas.webgl');

// Scene
const scene = new THREE.Scene();

// Loaders
const rgbeLoader = new RGBELoader();

/**
 * Textures
 */
const textureLoader = new THREE.TextureLoader()
const matcapTexture = textureLoader.load('textures/matcaps/3.png')
matcapTexture.colorSpace = THREE.SRGBColorSpace


/**
 * Environment map
 */
// const environmentMap = textureLoader.load('/space1.png');

// // Set the mapping type
// environmentMap.mapping = THREE.EquirectangularReflectionMapping;

// // Assign the environment map to the scene
// scene.background = environmentMap;
// scene.environment = environmentMap;

// gui.add(scene, 'backgroundBlurriness').min(0).max(1).step(0.01).name('Background Blurriness');

/**
 * Terrain
 */
const geometry = new THREE.PlaneGeometry(10, 10, 500, 500);
geometry.deleteAttribute('uv');
geometry.deleteAttribute('normal');
geometry.rotateX(-Math.PI * 0.5);

// Material
const uniforms = {
	uTime: new THREE.Uniform(0),

	uPositionFrequency: new THREE.Uniform(0.2),
	uStrength: new THREE.Uniform(2.0),
	uWarpFrequency: new THREE.Uniform(5.0),
	uWarpStrength: new THREE.Uniform(0.5),

	uColorWaterDeep: new THREE.Uniform(new THREE.Color(debugObject.colorWaterDeep)),
	uColorWaterSurface: new THREE.Uniform(new THREE.Color(debugObject.colorWaterSurface)),
	uColorSand: new THREE.Uniform(new THREE.Color(debugObject.colorSand)),
	uColorGrass: new THREE.Uniform(new THREE.Color(debugObject.colorGrass)),
	uColorSnow: new THREE.Uniform(new THREE.Color(debugObject.colorSnow)),
	uColorRock: new THREE.Uniform(new THREE.Color(debugObject.colorRock)),
};

gui.add(uniforms.uPositionFrequency, 'value').name('Position Frequency').min(0.0).max(1.0).step(0.001);
gui.add(uniforms.uStrength, 'value').name('Strength').min(0.0).max(5.0).step(0.001);
gui.add(uniforms.uWarpFrequency, 'value').name('Warp Frequency').min(0.0).max(10.0).step(0.001);
gui.add(uniforms.uWarpStrength, 'value').name('Warp Strength').min(0.0).max(1.0).step(0.001);

gui.addColor(debugObject, 'colorWaterDeep').onChange(() =>
	uniforms.uColorWaterDeep.value.set(debugObject.colorWaterDeep)
);
gui.addColor(debugObject, 'colorWaterSurface').onChange(() =>
	uniforms.uColorWaterSurface.value.set(debugObject.colorWaterSurface)
);
gui.addColor(debugObject, 'colorSand').onChange(() => uniforms.uColorSand.value.set(debugObject.colorSand));
gui.addColor(debugObject, 'colorGrass').onChange(() => uniforms.uColorGrass.value.set(debugObject.colorGrass));
gui.addColor(debugObject, 'colorSnow').onChange(() => uniforms.uColorSnow.value.set(debugObject.colorSnow));
gui.addColor(debugObject, 'colorRock').onChange(() => uniforms.uColorRock.value.set(debugObject.colorRock));

// Add plane opacity control to the GUI
gui.add(debugObject, 'planeOpacity').min(0).max(1).step(0.01).name('Plane Opacity').onChange(() => {
	planeMaterial.opacity = debugObject.planeOpacity;
});

const material = new CustomShaderMaterial({
	// CSM
	baseMaterial: THREE.MeshStandardMaterial,
	vertexShader: terrainVertexShader,
	fragmentShader: terrainFragmentShader,
	uniforms: uniforms,
	silent: true,

	// MeshStandardMaterial
	metalness: 0.0,
	roughness: 0.5,
	color: '#85d534',
});

gui.add(material, 'metalness').name('Metalness').min(0.0).max(1.0).step(0.01);
gui.add(material, 'roughness').name('Roughness').min(0.0).max(1.0).step(0.01);

const depthMaterial = new CustomShaderMaterial({
	// CSM
	baseMaterial: THREE.MeshDepthMaterial,
	vertexShader: terrainVertexShader,
	uniforms: uniforms,
	silent: true,

	// MeshDepthMaterial
	depthPacking: THREE.RGBADepthPacking,
});

const terrain = new THREE.Mesh(geometry, material);
terrain.customDepthMaterial = depthMaterial;
terrain.castShadow = true;
terrain.receiveShadow = true;
scene.add(terrain);

/**
 * Water
 */

const water = new THREE.Mesh(
	new THREE.PlaneGeometry(10, 10, 1, 1),
	new THREE.MeshPhysicalMaterial({
		transmission: 1,
		roughness: 0.3,
	})
);
water.rotation.x = -Math.PI * 0.5;
water.position.y = -0.1;
scene.add(water);

/**
 *  Board
 */
// Brushes
const boardFill = new Brush(new THREE.BoxGeometry(11, 2, 11));
const boardHole = new Brush(new THREE.BoxGeometry(10, 2.1, 10));
// boardHole.position.y = 0.2; //creates bottom of box
// boardHole.updateMatrixWorld();

boardFill.material.color.set('#ff0000');
boardHole.material = new THREE.MeshNormalMaterial();

//Evaluate
const evaluator = new Evaluator();
const board = evaluator.evaluate(boardFill, boardHole, SUBTRACTION);
board.geometry.clearGroups();
board.material = new THREE.MeshMatcapMaterial({ matcap: matcapTexture });
board.castShadow = true;
board.receiveShadow = true;
scene.add(board);

/**
 * Transparent Plane
 */

const planeGeometry = new THREE.PlaneGeometry(6.5, 3);
const planeMaterial = new THREE.MeshBasicMaterial({
	color: 0x000000,
	transparent: true,
	opacity: 0.25,
});
const plane = new THREE.Mesh(planeGeometry, planeMaterial);
plane.rotation.x = -Math.PI * 0.5;
plane.position.y = 1.00; 
plane.position.z = 0.5; 
scene.add(plane);

/**
 * 3D Text
 */
const fontLoader = new FontLoader();
fontLoader.load('/fonts/spacex.json', (font) => {
	// First line of text
	const textGeometry = new TextGeometry('Space X', {
		font: font,
		size: 0.5,
		height: 0.2,
		curveSegments: 12,
		bevelEnabled: true,
		bevelThickness: 0.03,
		bevelSize: 0.02,
		bevelOffset: 0,
		bevelSegments: 5,
	});
	textGeometry.center();

	const textMaterial1 = new THREE.MeshMatcapMaterial({ matcap: matcapTexture });
	const textMesh1 = new THREE.Mesh(textGeometry, textMaterial1);
	textMesh1.position.set(0, 1.5, 0);
	textMesh1.rotation.x = -Math.PI * 0.5;
	scene.add(textMesh1);

	// Second line of text
	const textGeometry2 = new TextGeometry('Bye, EaRtH', {
		font: font,
		size: 0.49,
		height: 0.2,
		curveSegments: 12,
		bevelEnabled: true,
		bevelThickness: 0.03,
		bevelSize: 0.02,
		bevelOffset: 0,
		bevelSegments: 5,
	});	
	textGeometry2.center();
	

	const textMaterial2 = new THREE.MeshMatcapMaterial({ matcap: matcapTexture });
	const textMesh2 = new THREE.Mesh(textGeometry2, textMaterial2);
	textMesh2.position.set(0.0, 1.0, 1.0);
	textMesh2.rotation.x = -Math.PI * 0.5;
	scene.add(textMesh2);

});

/**
 * Lights
 */
const directionalLight = new THREE.DirectionalLight('#ffffff', 3);
directionalLight.position.set(6.25, 10, 4);
directionalLight.castShadow = true;
directionalLight.shadow.mapSize.set(1024, 1024);
directionalLight.shadow.camera.near = 0.1;
directionalLight.shadow.camera.far = 30;
directionalLight.shadow.camera.top = 8;
directionalLight.shadow.camera.right = 8;
directionalLight.shadow.camera.bottom = -8;
directionalLight.shadow.camera.left = -8;
scene.add(directionalLight);

/**
 * Sizes
 */
const sizes = {
	width: window.innerWidth,
	height: window.innerHeight,
};

window.addEventListener('resize', () => {
	// Update sizes
	sizes.width = window.innerWidth;
	sizes.height = window.innerHeight;

	// Update camera
	camera.aspect = sizes.width / sizes.height;
	camera.updateProjectionMatrix();

	// Update renderer
	renderer.setSize(sizes.width, sizes.height);
	renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});

/**
 * Camera
 */
// Base camera
const camera = new THREE.PerspectiveCamera(45, sizes.width / sizes.height, 0.1, 100);
camera.position.set(5, 3, 8);
scene.add(camera);

// Controls
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;

/**
 * Renderer
 */
const renderer = new THREE.WebGLRenderer({
	canvas: canvas,
	antialias: true,
	alpha: true,
});
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.setClearColor(0x000000, 0);
renderer.setSize(sizes.width, sizes.height);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

/**
 * Animate
 */
const clock = new THREE.Clock();
const tick = () => {
	const elapsedTime = clock.getElapsedTime();

	// Update terrain
	uniforms.uTime.value = elapsedTime;

	// Update controls
	controls.update();

	// Render
	renderer.render(scene, camera);

	// Call tick again on the next frame
	window.requestAnimationFrame(tick);
};

tick();
