// 3D Javacript Clock using three.js
// Goal is to have a realistic 3D depth with tilt on mobile devices
// MIT License. - Work in Progress using Gemini
// Jeff Miller 2025. 8/4/25
// MODIFIED: Refactored model loading to remove MTL dependency and fix PBR material assignment.

import * as THREE from 'three';
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';
import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader.js';
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

renderer.setClearColor(0xcccccc);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.shadowMap.enabled = true;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.7;
document.body.appendChild(renderer.domElement);

// --- Lighting ---
const dirLight = new THREE.DirectionalLight(0xffffff, 8.0); 

dirLight.castShadow = true;
dirLight.position.set(10, 15, 36);
dirLight.shadow.mapSize.set(4096, 4096);

const shadowCamSize = 12;
dirLight.shadow.camera.left = -shadowCamSize;
dirLight.shadow.camera.right = shadowCamSize;
dirLight.shadow.camera.top = shadowCamSize;
dirLight.shadow.camera.bottom = -shadowCamSize;
dirLight.shadow.camera.near = 10;
dirLight.shadow.camera.far = 60;

dirLight.shadow.bias = -0.0005;
dirLight.shadow.normalBias = 0.01;

scene.add(dirLight);


// --- Create a master "clockUnit" group ---
const clockUnit = new THREE.Group();
scene.add(clockUnit);

const watchGroup = new THREE.Group();
clockUnit.add(watchGroup);

const zShift = 1.0;

// --- Background Plane (Wood) ---
const wallMaterial = new THREE.MeshStandardMaterial({
  color: 0x808080,
  metalness: 0.0,
  roughness: 0.8
});

const textureLoader = new THREE.TextureLoader();

textureLoader.load(
    './textures/laminate_floor_02_diff_4k.jpg',
    (texture) => {
        texture.encoding = THREE.sRGBEncoding;
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.rotation = Math.PI / 2;
        texture.center.set(0.5, 0.5);
        wallMaterial.map = texture;
        wallMaterial.needsUpdate = true;
        updateBackgroundSize();
    },
    undefined,
    (err) => {
        console.error('An error happened loading the wood texture. Using fallback color.');
        wallMaterial.color.set(0x111122);
    }
);

const wallGeometry = new THREE.PlaneGeometry(1, 1);
const wall = new THREE.Mesh(wallGeometry, wallMaterial);
wall.position.z = -4;
wall.receiveShadow = true;
clockUnit.add(wall);


// --- Define All Materials Programmatically ---
const pbrTextureLoader = new THREE.TextureLoader();
const baseColorMap = pbrTextureLoader.load('textures/BrushedIron02_2K_BaseColor.png');
const metallicMap = pbrTextureLoader.load('textures/BrushedIron02_2K_Metallic.png');
const roughnessMap = pbrTextureLoader.load('textures/BrushedIron02_2K_Roughness.png');
const normalMap = pbrTextureLoader.load('textures/BrushedIron02_2K_Normal.png');
baseColorMap.encoding = THREE.sRGBEncoding;

const brushedSteelMaterial = new THREE.MeshStandardMaterial({
    map: baseColorMap,
    metalnessMap: metallicMap,
    roughnessMap: roughnessMap,
    normalMap: normalMap,
    // Add a roughness multiplier to soften the mirror-like reflections.
    roughness: 2.5,
    envMapIntensity: 0.8
});

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
    color: 0xED9149,
    metalness: 0.8,
    roughness: 0.2
});
// A default material for parts we don't explicitly assign
const defaultCaseMaterial = new THREE.MeshStandardMaterial({ color: 0x666666, metalness: 0.9, roughness: 0.4 });


// --- Environment Map Setup ---
const pmremGenerator = new THREE.PMREMGenerator(renderer);
pmremGenerator.compileEquirectangularShader();

const rgbeLoader = new RGBELoader();
rgbeLoader.load(
    'https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/studio_small_03_1k.hdr',
    (texture) => {
        const envMap = pmremGenerator.fromEquirectangular(texture).texture;
        scene.environment = envMap;

        // Apply environment map to all metallic surfaces
        brushedSteelMaterial.envMap = envMap;
        silverMaterial.envMap = envMap;
        brightSilverMaterial.envMap = envMap;
        secondMaterial.envMap = envMap;
        brassMaterial.envMap = envMap;
        defaultCaseMaterial.envMap = envMap;
        
        texture.dispose();
        pmremGenerator.dispose();
    },
    undefined,
    (err) => {
        console.error('An error occurred loading the HDR map.', err);
    }
);


// --- Tick Marks ---
const markerRadius = 10.0;
// --- Border Wall ---
const borderThickness = 1.0;
const borderHeight    = 1.2;
const outerRadius     = markerRadius + borderThickness;
const innerRadius     = markerRadius;

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

// --- Creamy White Clock Face ---
const faceRadius = markerRadius + borderThickness / 2;
const faceSegments = 64;
const faceGeometry = new THREE.CircleGeometry(faceRadius, faceSegments);
const faceMaterial = new THREE.MeshStandardMaterial({
  color: 0xFFFDD0,
  metalness: 0.1,
  roughness: 0.9
});
const faceMesh = new THREE.Mesh(faceGeometry, faceMaterial);
faceMesh.name = 'clock_face';
faceMesh.receiveShadow = true;
faceMesh.castShadow = false;
faceMesh.position.z = -3.4 + zShift;
clockUnit.add(faceMesh);


for (let i = 0; i < 60; i++) {
    const angle = (i / 60) * Math.PI * 2;
    let markerGeom;
    const markerDepth = 0.5;

    const extrudeSettings = {
        depth: markerDepth,
        bevelEnabled: true,
        bevelSize: 0.02,
        bevelThickness: 0.02,
        bevelSegments: 2,
    };

    if (i % 5 === 0) { // Hour mark
        const width = 0.25, height = 1.0;
        const shape = new THREE.Shape();
        shape.moveTo(-width / 2, -height / 2);
        shape.lineTo(width / 2, -height / 2);
        shape.lineTo(width / 2, height / 2);
        shape.lineTo(-width / 2, height / 2);
        shape.closePath();
        markerGeom = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    } else { // Minute mark
        const width = 0.1, height = 0.5;
        const shape = new THREE.Shape();
        shape.moveTo(-width / 2, -height / 2);
        shape.lineTo(width / 2, -height / 2);
        shape.lineTo(width / 2, height / 2);
        shape.lineTo(-width / 2, height / 2);
        shape.closePath();
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
        
        const numeralGeometry = new TextGeometry(i.toString(), {
            font: font,
            size: numeralSize,
            depth: numeralThickness,
            curveSegments: 12,
            bevelEnabled: true,
            bevelThickness: 0.02,
            bevelSize: 0.05,
            bevelSegments: 2
        });

        numeralGeometry.center();
        const numeral = new THREE.Mesh(numeralGeometry, silverMaterial);

        const numeralZ = -3.34 + zShift;
        numeral.position.set(numeralRadius * Math.sin(angle), numeralRadius * Math.cos(angle), numeralZ);
        numeral.castShadow = true; 
        numeral.receiveShadow = true;
        watchGroup.add(numeral);
    }
});

// --- Clock Hands ---
const hourHandShape = new THREE.Shape();
const hourHandLength = 4.0;
const hourHandWidth = 0.6;
const hourHandDepth = 0.4;
hourHandShape.moveTo(-hourHandWidth / 2, 0);
hourHandShape.lineTo(hourHandWidth / 2, 0);
hourHandShape.lineTo(0, hourHandLength);
hourHandShape.closePath();
const hourExtrudeSettings = {
    depth: hourHandDepth, bevelEnabled: true,
    bevelSize: 0.04, bevelThickness: 0.08, bevelSegments: 2
};
const hourGeometry = new THREE.ExtrudeGeometry(hourHandShape, hourExtrudeSettings);
hourGeometry.translate(0, 0, -hourHandDepth / 2);
const hourHand = new THREE.Mesh(hourGeometry, silverMaterial);
hourHand.position.z = -2.04 + zShift;
hourHand.castShadow = true;
watchGroup.add(hourHand);

const minuteHandShape = new THREE.Shape();
const minuteHandLength = 6.0;
const minuteHandWidth = 0.4;
const minuteHandDepth = 0.3;
minuteHandShape.moveTo(-minuteHandWidth / 2, 0);
minuteHandShape.lineTo(minuteHandWidth / 2, 0);
minuteHandShape.lineTo(0, minuteHandLength);
minuteHandShape.closePath();
const minuteExtrudeSettings = {
    depth: minuteHandDepth, bevelEnabled: true,
    bevelSize: 0.03, bevelThickness: 0.06, bevelSegments: 2
};
const minuteGeometry = new THREE.ExtrudeGeometry(minuteHandShape, minuteExtrudeSettings);
minuteGeometry.translate(0, 0, -minuteHandDepth / 2);
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


// --- Utility Functions ---
function updateCameraPosition() {
    const clockSize = 22;
    const fovInRadians = THREE.MathUtils.degToRad(camera.fov);

    const distanceForHeight = (clockSize / 2) / Math.tan(fovInRadians / 2);

    const width = clockSize;
    const cameraWidth = width / camera.aspect;
    const distanceForWidth = (cameraWidth / 2) / Math.tan(fovInRadians / 2);

    camera.position.z = Math.max(distanceForHeight, distanceForWidth);
}

function updateBackgroundSize() {
    if (!wall || !camera) return;
    const distance = camera.position.z - (wall.position.z + clockUnit.position.z);
    const vFov = THREE.MathUtils.degToRad(camera.fov);
    const height = 2 * Math.tan(vFov / 2) * distance;
    const width = height * camera.aspect;

    const safetyMargin = 1.2;
    wall.scale.set(width * safetyMargin, height * safetyMargin, 1);

    if (wall.material.map) {
        const textureScale = 25;
        wall.material.map.repeat.set(
            wall.scale.x / textureScale,
            wall.scale.y / textureScale
        );
    }
}


let tiltX = 0, tiltY = 0;

function handleOrientation(event) {
  tiltY = event.beta || 0;
  tiltX = event.gamma || 0;
}

function setupTiltControls() {
    if (typeof DeviceOrientationEvent?.requestPermission === 'function') {
        const button = document.createElement('button');
        Object.assign(button.style, {
            position: 'absolute', top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)', padding: '1em 2em',
            fontSize: '1em', color: 'white', backgroundColor: 'rgba(0,0,0,0.7)',
            border: '1px solid white', borderRadius: '8px', cursor: 'pointer', zIndex: '1001'
        });
        button.textContent = 'Enable Tilt';
        document.body.appendChild(button);
        button.addEventListener('click', async () => {
            try {
                if (await DeviceOrientationEvent.requestPermission() === 'granted') {
                    window.addEventListener('deviceorientation', handleOrientation);
                }
            } finally {
                document.body.removeChild(button);
            }
        });
    } else {
        window.addEventListener('deviceorientation', handleOrientation);
    }
}

const tickSound = new Audio('https://cdn.jsdelivr.net/gh/freebiesupply/sounds/tick.mp3');
tickSound.volume = 0.2;


// --- REFACTORED MODEL LOADER ---
// We now load the OBJ directly and assign our own materials, ignoring the MTL file.
const objLoader = new OBJLoader();
objLoader.load(
    'textures/ETA6497-1_OBJ.obj',
    (object) => {
        clockModel = object;
        clockModel.position.set(0, 0, -4.0 + zShift);
        clockModel.rotation.set(modelRotationX, modelRotationY, modelRotationZ);
        clockModel.scale.set(modelScale, modelScale, modelScale);

        const collectedParts = {};
        
        // --- Explicit Material Assignment ---
        // Loop through all meshes in the loaded model
        clockModel.traverse(child => {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;

                // Assign materials based on the mesh's name from the OBJ file
                switch (child.name) {
                    case 'BarrelBridge_Body':
                        child.material = brushedSteelMaterial;
                        break;
                    
                    case 'SecondsWheel':
                    case 'Minute_Wheel_Body':
                    case 'HourWheel_Body':
                    case 'EscapeWheel':
                    case 'CenterWheelBody':
                    case 'ThirdWheel':
                    case 'BalanceWheelBody':
                        child.material = brassMaterial;
                        break;

                    // Make these parts semi-transparent
                    case 'MovementBarrel2_Body':
                    case 'TrainWheelBridgeBody':
                    case 'PalletBridgeBody':
                        child.material = defaultCaseMaterial.clone(); // Clone to give it a unique material instance
                        child.material.transparent = true;
                        child.material.opacity = 0.5;
                        child.castShadow = false; // Transparent objects often shouldn't cast shadows
                        break;

                    // For everything else, assign a default metallic material
                    default:
                        child.material = defaultCaseMaterial;
                        break;
                }
                collectedParts[child.name] = child;
            }
        });
        
        // --- Create pivots for wheels (this logic remains the same) ---
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

                // Assign to global animation variables
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

        // Create pivot for the Pallet Fork
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

            if (palletForkJewel1Mesh) {
                pivot.add(palletForkJewel1Mesh);
                palletForkJewel1Mesh.position.sub(jewelCenter);
            } else {
                console.error("Could not find 'PalletForkJewel1' mesh in the model.");
            }

            if (palletForkJewel2Mesh) {
                pivot.add(palletForkJewel2Mesh);
                palletForkJewel2Mesh.position.sub(jewelCenter);
            } else {
                console.error("Could not find 'PalletForkJewel2' mesh in the model.");
            }
            palletFork = pivot;
        } else {
            if (!palletForkBodyMesh) console.error("Could not find 'PalletForkBody' mesh in the model.");
            if (!palletJewelBodyMesh) console.error("Could not find 'Plate_Jewel_Body' mesh in the model.");
        }

        // --- Final scene adjustments ---
        clockUnit.add(clockModel);
        
        const oldFace = clockUnit.getObjectByName('clock_face');
        if (oldFace) {
            clockUnit.remove(oldFace);
            oldFace.geometry.dispose();
            // oldFace.material.dispose(); // Also good practice
        }
        
        const holeRadius = 6.25;
        const outerRadius = markerRadius + borderThickness / 2;
        const segments = 64;
        const shape = new THREE.Shape();
        shape.absarc(0, 0, outerRadius, 0, Math.PI * 2, false);
        const hole = new THREE.Path();
        hole.absarc(0, 0, holeRadius, 0, Math.PI * 2, true);
        shape.holes.push(hole);
        const faceGeom = new THREE.ShapeGeometry(shape, segments);
        const faceMat = new THREE.MeshStandardMaterial({
            color: 0xFFFDD0,
            metalness: 0.1,
            roughness: 0.9
        });
        const newFace = new THREE.Mesh(faceGeom, faceMat);
        newFace.name = 'clock_face';
        newFace.receiveShadow = true;
        newFace.position.z = -3.4 + zShift;
        clockUnit.add(newFace);
    },
    undefined,
    (err) => {
        console.error('Failed to load OBJ:', err);
    }
);

// --- End Model Loader ---
// --- Animation Loop ---
function animate() {
  requestAnimationFrame(animate);

  const maxTilt = 15;
  const x = THREE.MathUtils.clamp(tiltX, -maxTilt, maxTilt);
  const y = THREE.MathUtils.clamp(tiltY, -maxTilt, maxTilt);

  const rotationMultiplier = 0.5;
  const rotY = THREE.MathUtils.degToRad(x) * rotationMultiplier;
  const rotX = THREE.MathUtils.degToRad(y) * rotationMultiplier;

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
  
  if (secondWheel) {
    secondWheel.rotation.z = -(seconds / 60) * Math.PI * 2;
  }
  if (minuteWheel) {
    minuteWheel.rotation.z = -(minutes / 60) * Math.PI * 2;
  }
  if (hourWheel) {
    hourWheel.rotation.z = -(hours / 12) * Math.PI * 2;
  }
  if (escapeWheel) {
    escapeWheel.rotation.z = ((seconds % 5) / 5) * Math.PI * 2;
  }
  if (centerWheel) {
    centerWheel.rotation.z = (minutes / 60) * Math.PI * 2;
  }
  if (thirdWheel) {
    // Rotates counter-clockwise
    thirdWheel.rotation.z = ((minutes % 7.5) / 7.5) * Math.PI * 2;
  }
  if (palletFork) {
    const time = now.getTime() / 1000;
    const amplitude = THREE.MathUtils.degToRad(22);
    const frequency = 4;
    palletFork.rotation.z = amplitude * Math.sin(time * Math.PI * 2 * frequency);
  }
  
  if (balanceWheel) {
    const time = now.getTime() / 1000;
    const frequency = 3 * balanceWheelSpeedMultiplier; 
    const sineValue = Math.sin(time * Math.PI * 2 * frequency);

    const amplitude = Math.PI / 2;
    balanceWheel.rotation.z = amplitude * sineValue;

    if (hairSpring) {
        const currentScale = 0.95 + 0.35 * sineValue;
        hairSpring.scale.set(currentScale, currentScale, 1);
    }
  }


  const pad = (n) => n.toString().padStart(2, '0');
  const spanStyles = `background-color: rgba(0, 0, 0, 0.5); padding: 0.1em 0.3em; border-radius: 4px;`;

  if (digitalClock) {
      const time = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(Math.floor(now.getSeconds()))}`;
      digitalClock.innerHTML = `<span style="${spanStyles}">${time}</span>`;
  }

  if (digitalDate) {
      const date = `${pad(now.getMonth() + 1)}/${pad(now.getDate())}/${now.getFullYear().toString().slice(-2)}`;
      digitalDate.innerHTML = `<span style="${spanStyles}">${date}</span>`;
  }

  const currentSecond = Math.floor(now.getSeconds());
  if (animate.lastSecond !== currentSecond) {
    tickSound.currentTime = 0;
    tickSound.play().catch(() => {});
    animate.lastSecond = currentSecond;
  }

  renderer.render(scene, camera);
}

// --- Initial Setup Calls ---
camera.aspect = window.innerWidth / window.innerHeight;
camera.updateProjectionMatrix();
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

