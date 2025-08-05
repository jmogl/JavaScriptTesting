// 3D Javacript Clock using three.js
// MIT License. - Work in Progress using Gemini
// Jeff Miller 2025. 8/4/25


import * as THREE from 'three';
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';

// --- Declare UI element variables in the global scope ---
let digitalDate, digitalClock;

// --- 3D Model Variables ---
let clockModel;
let modelRotationX = 0, modelRotationY = 0, modelRotationZ = 0;
let modelScale = 3.5;
let secondWheel, minuteWheel, hourWheel, balanceWheel, escapeWheel, centerWheel, thirdWheel, palletFork, hairSpring;
const balanceWheelSpeedMultiplier = 1.0;


// --- Wait for the DOM to be ready, then create and inject UI elements ---
window.addEventListener('DOMContentLoaded', () => {
    digitalDate = document.createElement('div');
    digitalClock = document.createElement('div');

    Object.assign(digitalDate.style, {
        position: 'absolute', bottom: '20px', left: '20px',
        color: 'white', fontFamily: '"Courier New", Courier, monospace',
        fontSize: '1.75em', textShadow: '0 0 8px black', zIndex: '10'
    });
    Object.assign(digitalClock.style, {
        position: 'absolute', bottom: '20px', right: '20px',
        color: 'white', fontFamily: '"Courier New", Courier, monospace',
        fontSize: '1.75em', textShadow: '0 0 8px black', zIndex: '10'
    });

    document.body.appendChild(digitalDate);
    document.body.appendChild(digitalClock);
});


// --- Scene Setup ---
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(20, window.innerWidth / window.innerHeight, 1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });

// --- PBR Correct Renderer Setup ---
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.8;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

// --- PBR Correct Lighting Setup ---
const rgbeLoader = new RGBELoader();
rgbeLoader.setPath('textures/');
// MODIFICATION: Corrected HDRI filename
rgbeLoader.load('PolyHaven_colorful_studio_2k.hdr', (texture) => {
    texture.mapping = THREE.EquirectangularReflectionMapping;
    scene.environment = texture;
});

const dirLight = new THREE.DirectionalLight(0xffffff, 3.0);
dirLight.position.set(10, 20, 10);
dirLight.castShadow = true;
dirLight.shadow.mapSize.width = 2048;
dirLight.shadow.mapSize.height = 2048;
const d = 15;
dirLight.shadow.camera.left = -d;
dirLight.shadow.camera.right = d;
dirLight.shadow.camera.top = d;
dirLight.shadow.camera.bottom = -d;
dirLight.shadow.bias = -0.0001;
dirLight.shadow.normalBias = 0.005;

scene.add(dirLight);

// --- Create a master "clockUnit" group ---
const clockUnit = new THREE.Group();
scene.add(clockUnit);

const watchGroup = new THREE.Group();
clockUnit.add(watchGroup);

const zShift = 1.0;

// --- PBR Material Definitions ---
const textureLoader = new THREE.TextureLoader().setPath('textures/');

// 1. Wood Wall PBR Material
const woodBaseColor = textureLoader.load('Wood03_2K_BaseColor.png');
const woodNormal = textureLoader.load('Wood03_2K_Normal.png');
const woodRoughness = textureLoader.load('Wood03_2K_Roughness.png');
const woodHeight = textureLoader.load('Wood03_2K_Height.png');
woodBaseColor.colorSpace = THREE.SRGBColorSpace;

const wallMaterial = new THREE.MeshStandardMaterial({
    map: woodBaseColor,
    normalMap: woodNormal,
    roughnessMap: woodRoughness,
    displacementMap: woodHeight,
    displacementScale: 0.05
});

const woodTextureRepeat = 5;
[woodBaseColor, woodNormal, woodRoughness, woodHeight].forEach( texture => {
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(woodTextureRepeat, woodTextureRepeat);
});

const wallGeometry = new THREE.PlaneGeometry(1, 1, 100, 100);
const wall = new THREE.Mesh(wallGeometry, wallMaterial);
wall.position.z = -4;
wall.receiveShadow = true;
clockUnit.add(wall);


// 2. Brushed Steel PBR Material
const steelBaseColor = textureLoader.load('BrushedIron02_2K_BaseColor.png');
const steelNormal = textureLoader.load('BrushedIron02_2K_Normal.png');
const steelRoughness = textureLoader.load('BrushedIron02_2K_Roughness.png');
steelBaseColor.colorSpace = THREE.SRGBColorSpace;

const brushedSteelMaterial = new THREE.MeshStandardMaterial({
    map: steelBaseColor,
    metalness: 1.0,
    roughnessMap: steelRoughness,
    normalMap: steelNormal
});

// 3. Original Materials (will reflect the new environment)
const silverMaterial = new THREE.MeshStandardMaterial({
    color: 0xffffff, metalness: 1.0, roughness: 0.1
});
const brightSilverMaterial = new THREE.MeshStandardMaterial({
    color: 0xffffff, metalness: 1.0, roughness: 0.1
});
const secondMaterial = new THREE.MeshStandardMaterial({
    color: 0xff0000, metalness: 0.5, roughness: 0.4
});
const brassMaterial = new THREE.MeshStandardMaterial({
    color: 0xED9149, metalness: 0.8, roughness: 0.2
});
// A placeholder for other parts of the mechanism
const placeholderMaterial = new THREE.MeshPhysicalMaterial({
    color: 0x555555, roughness: 0.5, metalness: 1.0, envMapIntensity: 0.5
});


// Apply the new HDRI environment map to all relevant materials
// MODIFICATION: Corrected HDRI filename
rgbeLoader.load('PolyHaven_colorful_studio_2k.hdr', (texture) => {
    const envMap = new THREE.PMREMGenerator(renderer).fromEquirectangular(texture).texture;
    scene.environment = envMap; 
    
    silverMaterial.envMap = envMap;
    brightSilverMaterial.envMap = envMap;
    secondMaterial.envMap = envMap;
    brassMaterial.envMap = envMap;
    brushedSteelMaterial.envMap = envMap;
    placeholderMaterial.envMap = envMap;
});


// --- Tick Marks, Numerals, Hands, etc. (Original Code) ---
const markerRadius = 10.0;
const borderThickness = 1.0;
const borderHeight = 1.2;
const outerRadius = markerRadius + borderThickness;
const innerRadius = markerRadius;
const borderShape = new THREE.Shape();
borderShape.absarc(0, 0, outerRadius, 0, Math.PI * 2, false);
const holePath = new THREE.Path();
holePath.absarc(0, 0, innerRadius, 0, Math.PI * 2, true);
borderShape.holes.push(holePath);
const borderExtrudeSettings = { depth: borderHeight, bevelEnabled: false, curveSegments: 256 };
const borderGeom = new THREE.ExtrudeGeometry(borderShape, borderExtrudeSettings);
borderGeom.translate(0, 0, -borderHeight / 2);
const borderMaterial = new THREE.MeshStandardMaterial({ color: 0x000040 });
const borderMesh = new THREE.Mesh(borderGeom, borderMaterial);
borderMesh.castShadow = true;
borderMesh.receiveShadow = true;
borderMesh.position.z = -4 + zShift;
clockUnit.add(borderMesh);


for (let i = 0; i < 60; i++) {
    const angle = (i / 60) * Math.PI * 2;
    let markerGeom;
    const markerDepth = 0.5;
    const extrudeSettings = { depth: markerDepth, bevelEnabled: true, bevelSize: 0.02, bevelThickness: 0.02, bevelSegments: 2 };
    if (i % 5 === 0) {
        const shape = new THREE.Shape();
        shape.moveTo(-0.125, -0.5); shape.lineTo(0.125, -0.5); shape.lineTo(0.125, 0.5); shape.lineTo(-0.125, 0.5); shape.closePath();
        markerGeom = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    } else {
        const shape = new THREE.Shape();
        shape.moveTo(-0.05, -0.25); shape.lineTo(0.05, -0.25); shape.lineTo(0.05, 0.25); shape.lineTo(-0.05, 0.25); shape.closePath();
        markerGeom = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    }
    const marker = new THREE.Mesh(markerGeom, silverMaterial);
    const markerZ = -3.35 + zShift;
    marker.position.set(markerRadius * Math.sin(angle), markerRadius * Math.cos(angle), markerZ);
    marker.rotation.z = -angle;
    marker.castShadow = true;
    watchGroup.add(marker);
}

const fontLoader = new FontLoader();
const fontURL = 'https://cdn.jsdelivr.net/npm/three@0.166.0/examples/fonts/helvetiker_regular.typeface.json';
const numeralRadius = 8.075;
fontLoader.load(fontURL, (font) => {
    const numeralSize = 1.5;
    const numeralThickness = (numeralSize / 2) * 1.25;
    for (let i = 1; i <= 12; i++) {
        const angle = (i / 12) * Math.PI * 2;
        const numeralGeometry = new TextGeometry(i.toString(), { font: font, size: numeralSize, depth: numeralThickness, curveSegments: 12, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.05, bevelSegments: 2 });
        numeralGeometry.center();
        const numeral = new THREE.Mesh(numeralGeometry, silverMaterial);
        const numeralZ = -3.34 + zShift;
        numeral.position.set(numeralRadius * Math.sin(angle), numeralRadius * Math.cos(angle), numeralZ);
        numeral.castShadow = true;
        numeral.receiveShadow = true;
        watchGroup.add(numeral);
    }
});

const hourHandShape = new THREE.Shape();
hourHandShape.moveTo(-0.3, 0); hourHandShape.lineTo(0.3, 0); hourHandShape.lineTo(0, 4.0); hourHandShape.closePath();
const hourGeometry = new THREE.ExtrudeGeometry(hourHandShape, { depth: 0.4, bevelEnabled: true, bevelSize: 0.04, bevelThickness: 0.08, bevelSegments: 2 });
hourGeometry.translate(0, 0, -0.2);
const hourHand = new THREE.Mesh(hourGeometry, silverMaterial);
hourHand.position.z = -2.04 + zShift;
hourHand.castShadow = true;
watchGroup.add(hourHand);

const minuteHandShape = new THREE.Shape();
minuteHandShape.moveTo(-0.2, 0); minuteHandShape.lineTo(0.2, 0); minuteHandShape.lineTo(0, 6.0); minuteHandShape.closePath();
const minuteGeometry = new THREE.ExtrudeGeometry(minuteHandShape, { depth: 0.3, bevelEnabled: true, bevelSize: 0.03, bevelThickness: 0.06, bevelSegments: 2 });
minuteGeometry.translate(0, 0, -0.15);
const minuteHand = new THREE.Mesh(minuteGeometry, brightSilverMaterial);
minuteHand.position.z = -2.03 + zShift;
minuteHand.castShadow = true;
watchGroup.add(minuteHand);

const secondGeometry = new THREE.BoxGeometry(0.1, 7.0, 0.3);
secondGeometry.translate(0, 3.5, 0);
const secondHand = new THREE.Mesh(secondGeometry, secondMaterial);
secondHand.position.z = -2.02 + zShift;
secondHand.castShadow = true;
watchGroup.add(secondHand);


// --- NEW: Refactored Model Loader ---
const objLoader = new OBJLoader().setPath('textures/');
objLoader.load('ETA6497-1_OBJ.obj', (object) => {
    clockModel = object;
    clockModel.position.set(0, 0, -4.0 + zShift);
    clockModel.rotation.set(0,0,0);
    clockModel.scale.set(modelScale, modelScale, modelScale);
    
    const collectedParts = {};
    clockModel.traverse(child => {
        if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
            
            // Assign materials programmatically
            switch (child.name) {
                case 'BarrelBridge_Body':
                case 'TrainWheelBridgeBody':
                    child.material = brushedSteelMaterial;
                    break;
                
                case 'SecondsWheel': case 'Minute_Wheel_Body': case 'HourWheel_Body':
                case 'EscapeWheel': case 'CenterWheelBody': case 'ThirdWheel':
                case 'BalanceWheelBody':
                    child.material = brassMaterial;
                    break;

                case 'MovementBarrel2_Body':
                case 'PalletBridgeBody':
                    child.material = placeholderMaterial.clone();
                    child.material.transparent = true;
                    child.material.opacity = 0.5;
                    child.castShadow = false;
                    break;

                default:
                    child.material = silverMaterial.clone(); // Default to silver for other parts
                    break;
            }
            collectedParts[child.name] = child;
        }
    });

    // --- Restore Pivot and Animation Logic ---
    const partsToPivot = [
        'SecondsWheel', 'Minute_Wheel_Body', 'HourWheel_Body', 'BalanceWheelBody',
        'EscapeWheel', 'CenterWheelBody', 'ThirdWheel', 'HairSpringBody'
    ];
    partsToPivot.forEach(name => {
        const part = collectedParts[name];
        if (part) {
            const center = new THREE.Vector3();
            new THREE.Box3().setFromObject(part).getCenter(center);
            const pivot = new THREE.Group();
            part.parent.add(pivot);
            pivot.position.copy(center);
            pivot.add(part);
            part.position.sub(center);
            switch (name) {
                case 'SecondsWheel': secondWheel = pivot; break;
                case 'Minute_Wheel_Body': minuteWheel = pivot; break;
                case 'HourWheel_Body': hourWheel = pivot; break;
                case 'BalanceWheelBody': balanceWheel = pivot; break;
                case 'EscapeWheel': escapeWheel = pivot; break;
                case 'CenterWheelBody': centerWheel = pivot; break;
                case 'ThirdWheel': thirdWheel = pivot; break;
                case 'HairSpringBody': hairSpring = pivot; break;
            }
        }
    });

    const palletForkBodyMesh = collectedParts['PalletForkBody'];
    const palletJewelBodyMesh = collectedParts['Plate_Jewel_Body'];
    const palletForkJewel1Mesh = collectedParts['PalletForkJewel1'];
    const palletForkJewel2Mesh = collectedParts['PalletForkJewel2'];
    if (palletForkBodyMesh && palletJewelBodyMesh) {
        const jewelCenter = new THREE.Vector3();
        new THREE.Box3().setFromObject(palletJewelBodyMesh).getCenter(jewelCenter);
        const pivot = new THREE.Group();
        palletForkBodyMesh.parent.add(pivot);
        pivot.position.copy(jewelCenter);
        pivot.add(palletForkBodyMesh);
        palletForkBodyMesh.position.sub(jewelCenter);
        if (palletForkJewel1Mesh) { pivot.add(palletForkJewel1Mesh); palletForkJewel1Mesh.position.sub(jewelCenter); }
        if (palletForkJewel2Mesh) { pivot.add(palletForkJewel2Mesh); palletForkJewel2Mesh.position.sub(jewelCenter); }
        palletFork = pivot;
    }

    // --- Final scene adjustments ---
    clockUnit.add(clockModel);
    
    const faceGeom = new THREE.RingGeometry(6.25, 10.5, 64);
    const faceMat = new THREE.MeshStandardMaterial({ color: 0xFFFDD0, metalness: 0.1, roughness: 0.9 });
    const newFace = new THREE.Mesh(faceGeom, faceMat);
    newFace.receiveShadow = true;
    newFace.position.z = -3.4 + zShift;
    clockUnit.add(newFace);
});


// --- Utility and Control Functions (Original Code) ---
function updateCameraPosition() {
    const clockSize = 22;
    const fovInRadians = THREE.MathUtils.degToRad(camera.fov);
    const distance = (clockSize / 2) / Math.tan(fovInRadians / 2) / (1/camera.aspect > 1 ? 1 : 1/camera.aspect);
    camera.position.z = distance;
}

function updateBackgroundSize() {
    if (!wall || !camera) return;
    const distance = camera.position.z - (wall.position.z + clockUnit.position.z);
    const vFov = THREE.MathUtils.degToRad(camera.fov);
    const height = 2 * Math.tan(vFov / 2) * distance;
    const width = height * camera.aspect;
    wall.scale.set(width * 1.2, height * 1.2, 1);
}

let tiltX = 0, tiltY = 0;
function handleOrientation(event) {
  tiltY = event.beta || 0;
  tiltX = event.gamma || 0;
}
function setupTiltControls() {
    if (typeof DeviceOrientationEvent?.requestPermission === 'function') {
        const button = document.createElement('button');
        Object.assign(button.style, { position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', padding: '1em 2em', fontSize: '1em', color: 'white', backgroundColor: 'rgba(0,0,0,0.7)', border: '1px solid white', borderRadius: '8px', cursor: 'pointer', zIndex: '1001' });
        button.textContent = 'Enable Tilt';
        document.body.appendChild(button);
        button.addEventListener('click', async () => {
            try { if (await DeviceOrientationEvent.requestPermission() === 'granted') { window.addEventListener('deviceorientation', handleOrientation); } } finally { document.body.removeChild(button); }
        });
    } else {
        window.addEventListener('deviceorientation', handleOrientation);
    }
}

const tickSound = new Audio('https://cdn.jsdelivr.net/gh/freebiesupply/sounds/tick.mp3');
tickSound.volume = 0.2;

// --- Animation Loop ---
function animate() {
  requestAnimationFrame(animate);

  const maxTilt = 15;
  const x = THREE.MathUtils.clamp(tiltX, -maxTilt, maxTilt);
  const y = THREE.MathUtils.clamp(tiltY, -maxTilt, maxTilt);
  const rotY = THREE.MathUtils.degToRad(x) * 0.5;
  const rotX = THREE.MathUtils.degToRad(y) * 0.5;
  clockUnit.rotation.y = rotY;
  clockUnit.rotation.x = rotX;
  
  camera.lookAt(clockUnit.position);

  const now = new Date();
  const seconds = now.getSeconds() + now.getMilliseconds() / 1000;
  const minutes = now.getMinutes() + seconds / 60;
  const hours = now.getHours() % 12 + minutes / 60;

  secondHand.rotation.z = -THREE.MathUtils.degToRad((seconds / 60) * 360);
  minuteHand.rotation.z = -THREE.MathUtils.degToRad((minutes / 60) * 360);
  hourHand.rotation.z   = -THREE.MathUtils.degToRad((hours / 12) * 360);
  
  if (secondWheel) secondWheel.rotation.z = -(seconds / 60) * Math.PI * 2;
  if (minuteWheel) minuteWheel.rotation.z = -(minutes / 60) * Math.PI * 2;
  if (hourWheel) hourWheel.rotation.z = -(hours / 12) * Math.PI * 2;
  if (escapeWheel) escapeWheel.rotation.z = ((seconds % 5) / 5) * Math.PI * 2;
  if (centerWheel) centerWheel.rotation.z = (minutes / 60) * Math.PI * 2;
  if (thirdWheel) thirdWheel.rotation.z = ((minutes % 7.5) / 7.5) * Math.PI * 2;
  if (palletFork) {
    const time = now.getTime() / 1000;
    palletFork.rotation.z = THREE.MathUtils.degToRad(22) * Math.sin(time * Math.PI * 8);
  }
  
  if (balanceWheel) {
    const time = now.getTime() / 1000;
    const sineValue = Math.sin(time * Math.PI * 2 * (3 * balanceWheelSpeedMultiplier));
    balanceWheel.rotation.z = (Math.PI / 2) * sineValue;
    if (hairSpring) hairSpring.scale.set(0.95 + 0.35 * sineValue, 0.95 + 0.35 * sineValue, 1);
  }

  const pad = (n) => n.toString().padStart(2, '0');
  const spanStyles = `background-color: rgba(0, 0, 0, 0.5); padding: 0.1em 0.3em; border-radius: 4px;`;
  if (digitalClock) digitalClock.innerHTML = `<span style="${spanStyles}">${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(Math.floor(now.getSeconds()))}</span>`;
  if (digitalDate) digitalDate.innerHTML = `<span style="${spanStyles}">${pad(now.getMonth() + 1)}/${pad(now.getDate())}/${now.getFullYear().toString().slice(-2)}</span>`;

  const currentSecond = Math.floor(now.getSeconds());
  if (animate.lastSecond !== currentSecond) {
    tickSound.currentTime = 0;
    tickSound.play().catch(() => {});
    animate.lastSecond = currentSecond;
  }

  renderer.render(scene, camera);
}

// --- Initial Setup Calls ---
updateCameraPosition();
updateBackgroundSize();

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  updateCameraPosition();
  updateBackgroundSize();
});

setupTiltControls();
animate();

