// 3D Javacript ETA 6497 Clock using three.js
// MIT License. - Work in Progress
// Jeff Miller 2025. 8/26/25

/* References and Notes
- AI support: Google Gemini
- HDRI: https://polyhaven.com/a/colorful_studio
- PBR Textures: https://www.cgbookcase.com/
- Modified ETA 6497-1 Watch Movement CAD: Steen Winther: https://grabcad.com/library/eta-6497-1-complete-watch-movement
- ETA 6497 Custom Clock Hands and Clock Case made in Fusion 360
- 5 Hz Tick Sound - Clock Ticking by RedDog0607: https://pixabay.com/sound-effects/clock-ticking-365218/
- Development and Debugging Tools: Google Gemini
- File encoding is set to UF-8
- Local Server: python -m http.server
*/

import * as THREE from 'three';
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GUI } from 'three/examples/jsm/libs/lil-gui.module.min.js';

// --- Declare UI element variables in the global scope ---
let digitalDate, digitalClock;
let gui;
let mouseDownTime;
let mouseDownPos = new THREE.Vector2();

const settings = {
    tiltEnabled: false,
    soundEnabled: false,
    resetCamera: () => {
        controls.reset();
        camera.position.set(0, 0, 60);
        controls.target.set(0, 0, 0);
    }
};

// --- 3D Model Variables ---
let clockModel;
let modelScale = 3.5;
let secondWheel, minuteWheel, hourWheel, balanceWheel, escapeWheel, centerWheel, thirdWheel, palletFork, hairSpring, secondWheelSmallGear, thirdWheelTopGear;
let newHourHand, newMinuteHand, newSecondHand;
const balanceWheelSpeedMultiplier = 1.0;

// --- Variables for realistic hairspring animation ---
let hairSpringMesh, hairSpringOriginalPositions;
let studOriginalPos = new THREE.Vector3();
let colletOriginalPos = new THREE.Vector3(); // The inner anchor point
let studRadius = 0; // The distance from the collet to the stud

// --- Sound ---
const tickSound = new Audio('/textures/clock-ticking-5Hz.mp3');
tickSound.volume = 0.0; // Controlled by GUI

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

    // --- GUI Setup ---
    gui = new GUI();
    gui.domElement.style.display = 'none';

    gui.add(settings, 'tiltEnabled').name('Enable Tilt').onChange(value => {
        if (value) {
            enableTilt();
        } else {
            disableTilt();
        }
    });

    gui.add(settings, 'soundEnabled').name('Enable Sound').onChange(value => {
        tickSound.volume = value ? 0.2 : 0.0;
    });

    gui.add(settings, 'resetCamera').name('Reset Camera');

    // --- Listeners to differentiate clicks from drags for GUI toggle ---
    window.addEventListener('mousedown', (event) => {
        mouseDownTime = Date.now();
        mouseDownPos.set(event.clientX, event.clientY);
    });

    window.addEventListener('mouseup', (event) => {
        const duration = Date.now() - mouseDownTime;
        const distance = mouseDownPos.distanceTo(new THREE.Vector2(event.clientX, event.clientY));

        if (duration < 200 && distance < 5) {
            if (gui.domElement.contains(event.target)) {
                return;
            }

            if (gui.domElement.style.display === 'none') {
                gui.domElement.style.display = 'block';

                if (tickSound && tickSound.paused) {
                    tickSound.play().catch(() => {});
                    tickSound.pause();
                }
            } else {
                gui.domElement.style.display = 'none';
            }
        }
    });
});

// --- Scene Setup ---
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });

// --- PBR Correct Renderer Setup ---
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.7;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.VSMShadowMap;
document.body.appendChild(renderer.domElement);

// --- Controls ---
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

// --- Loading Manager ---
const loadingManager = new THREE.LoadingManager();
loadingManager.onLoad = () => {
    console.log("All assets loaded successfully.");
    layoutScene();
};

// --- PBR Correct Lighting Setup ---
const rgbeLoader = new RGBELoader(loadingManager);
rgbeLoader.setPath('textures/');
rgbeLoader.load('PolyHaven_colorful_studio_2k.hdr', (texture) => {
    texture.mapping = THREE.EquirectangularReflectionMapping;
    scene.environment = texture;
});

const dirLight = new THREE.DirectionalLight(0xffffff, 2.5);
dirLight.position.set(10, 28, 25);
dirLight.castShadow = true;
dirLight.shadow.mapSize.width = 2048;
dirLight.shadow.mapSize.height = 2048;
const d = 15;
dirLight.shadow.camera.left = -d;
dirLight.shadow.camera.right = d;
dirLight.shadow.camera.top = d;
dirLight.shadow.camera.bottom = -d;
dirLight.shadow.bias = -0.001;
dirLight.shadow.normalBias = 0.01;
scene.add(dirLight);
scene.add(dirLight.target);

// --- Create a master "clockUnit" group ---
const clockUnit = new THREE.Group();
clockUnit.position.z = 0;

const zShift = 1.0;

// --- PBR Material Definitions ---
const textureLoader = new THREE.TextureLoader(loadingManager).setPath('textures/');

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

const steelBaseColor = textureLoader.load('BrushedIron02_2K_BaseColor.png');
const steelNormal = textureLoader.load('BrushedIron02_2K_Normal.png');
const steelRoughness = textureLoader.load('BrushedIron02_2K_Roughness.png');
steelBaseColor.colorSpace = THREE.SRGBColorSpace;

const steelTextures = [steelBaseColor, steelNormal, steelRoughness];
steelTextures.forEach(texture => {
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
});

const brushedSteelMaterial = new THREE.MeshStandardMaterial({
    map: steelBaseColor,
    normalMap: steelNormal,
    roughnessMap: steelRoughness,
    metalness: 0.9,
    roughness: 0.4,
    color: 0xe0e0e0
});

function cloneMaterialWithTextures(material) {
    const newMaterial = material.clone();
    newMaterial.map = material.map.clone();
    newMaterial.normalMap = material.normalMap.clone();
    newMaterial.roughnessMap = material.roughnessMap.clone();
    newMaterial.displacementMap = material.displacementMap.clone();
    return newMaterial;
}

const topBottomMaterial = cloneMaterialWithTextures(wallMaterial);
const leftRightMaterial = cloneMaterialWithTextures(wallMaterial);

const allWallTextures = [
    wallMaterial.map, wallMaterial.normalMap, wallMaterial.roughnessMap, wallMaterial.displacementMap,
    topBottomMaterial.map, topBottomMaterial.normalMap, topBottomMaterial.roughnessMap, topBottomMaterial.displacementMap,
    leftRightMaterial.map, leftRightMaterial.normalMap, leftRightMaterial.roughnessMap, leftRightMaterial.displacementMap
];

allWallTextures.forEach(texture => {
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
});

const wallGeometry = new THREE.PlaneGeometry(1, 1, 100, 100);
const wall = new THREE.Mesh(wallGeometry, wallMaterial);
wall.receiveShadow = true;

const wallThickness = 0.01;
const boxGroup = new THREE.Group();
scene.add(boxGroup);
boxGroup.add(wall);
boxGroup.add(clockUnit);

const topWall = new THREE.Mesh(new THREE.BoxGeometry(1, 1, wallThickness), topBottomMaterial);
const bottomWall = new THREE.Mesh(new THREE.BoxGeometry(1, 1, wallThickness), topBottomMaterial);
const leftWall = new THREE.Mesh(new THREE.BoxGeometry(1, 1, wallThickness), leftRightMaterial);
const rightWall = new THREE.Mesh(new THREE.BoxGeometry(1, 1, wallThickness), leftRightMaterial);

[topWall, bottomWall, leftWall, rightWall].forEach(w => {
    w.castShadow = true;
    w.receiveShadow = true;
    boxGroup.add(w);
});

// --- Materials for GLB parts ---
const brassMaterial = new THREE.MeshStandardMaterial({ color: 0xED9149, metalness: 0.8, roughness: 0.2 });
const blackAluminumMaterial = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, metalness: 0.6, roughness: 0.4 });
const lumeMaterial = new THREE.MeshStandardMaterial({ color: 0x90ee90, emissive: 0x90ee90, emissiveIntensity: 0.6, roughness: 0.8, transparent: true, opacity: 0.5 });

// --- GLB Model Loader ---
const gltfLoader = new GLTFLoader(loadingManager);
gltfLoader.setPath('textures/').load('ETA6497-1.glb', (gltf) => {
    clockModel = gltf.scene || gltf.scenes[0];

    if (!clockModel) {
        console.error("GLTFLoader Error: Could not find a valid scene in the GLB file.");
        return;
    }
    
    clockUnit.add(clockModel);
    clockModel.position.set(0, 0, -4.0 + zShift);
    clockModel.rotation.set(0, 0, 0);
    clockModel.scale.set(modelScale, modelScale, modelScale);

    console.log("--- All Meshes in GLB File ---");
    clockModel.traverse(child => { if (child.isMesh) { console.log(child.name); } });
    console.log("--------------------------------");
    
    const collectedParts = {};
    clockModel.traverse(child => {
        if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
            collectedParts[child.name] = child;
        }
    });

    newHourHand = new THREE.Group();
    newMinuteHand = new THREE.Group();
    newSecondHand = new THREE.Group();
    
    const hourOuter = collectedParts['HourHandOuterBody'];
    const hourLume = collectedParts['HourHandLumeBody'];
    if (hourOuter) newHourHand.add(hourOuter);
    if (hourLume) newHourHand.add(hourLume);

    const minuteOuter = collectedParts['MinuteHandOuterBody'];
    const minuteLume = collectedParts['MinuteHandLumeBody'];
    if (minuteOuter) newMinuteHand.add(minuteOuter);
    if (minuteLume) newMinuteHand.add(minuteLume);

    const secondOuter = collectedParts['SecondsHandOuterBody'];
    const secondLume = collectedParts['SecondsHandLumeBody'];
    if (secondOuter) newSecondHand.add(secondOuter);
    if (secondLume) newSecondHand.add(secondLume);

    clockModel.add(newHourHand);
    clockModel.add(newMinuteHand);
    
    for (const name in collectedParts) {
        const part = collectedParts[name];
        if (name.startsWith('HourHandOuterBody') || name.startsWith('MinuteHandOuterBody') || name.startsWith('SecondsHandOuterBody')) { part.material = blackAluminumMaterial; }
        else if (name.startsWith('HourHandLumeBody') || name.startsWith('MinuteHandLumeBody') || name.startsWith('SecondsHandLumeBody')) { part.material = lumeMaterial; }
        else if (['BarrelBridge_Body', 'TrainWheelBridgeBody', 'BalancingBridgeBody'].includes(name)) { part.material = brushedSteelMaterial; }
        else if (['SecondWheel', 'Minute_Wheel_Body', 'HourWheel_Body', 'EscapeWheelBody', 'CenterWheelBody', 'ThirdWheelBody', 'BalanceWheelBody', 'SecondWheelSmallGear', 'ThirdWheelTopGear'].includes(name)) { part.material = brassMaterial; }
    }

    const partsToPivot = [ 'SecondWheel', 'Minute_Wheel_Body', 'HourWheel_Body', 'BalanceWheelBody', 'EscapeWheelBody', 'CenterWheelBody', 'ThirdWheelBody', 'HairSpringBody', 'SecondWheelSmallGear', 'ThirdWheelTopGear' ];
    partsToPivot.forEach(name => {
        const part = collectedParts[name];
        if (part) {
            if (name === 'HairSpringBody') {
                hairSpringMesh = part;
                hairSpringOriginalPositions = hairSpringMesh.geometry.attributes.position.array.slice();
                
                const positions = hairSpringOriginalPositions;
                const vertexCount = positions.length / 3;
                let tempVertex = new THREE.Vector3();

                const bb = new THREE.Box3().setFromObject(hairSpringMesh);
                const bbCenter = new THREE.Vector3();
                bb.getCenter(bbCenter);
                
                let min_dist_sq = Infinity;
                let colletVertexIndex = -1;
                for (let i = 0; i < vertexCount; i++) {
                    tempVertex.set(positions[i * 3], positions[i * 3 + 1], positions[i * 3 + 2]);
                    const distSq = tempVertex.distanceToSquared(bbCenter);
                    if (distSq < min_dist_sq) {
                        min_dist_sq = distSq;
                        colletVertexIndex = i;
                    }
                }

                if (colletVertexIndex !== -1) {
                    colletOriginalPos.set(positions[colletVertexIndex * 3], positions[colletVertexIndex * 3 + 1], positions[colletVertexIndex * 3 + 2]);
                }

                // --- Reverted STUD LOGIC: Find anchor by angle ---
                let maxRadius = 0;
                for (let i = 0; i < vertexCount; i++) {
                    tempVertex.set(positions[i * 3], positions[i * 3 + 1], positions[i * 3 + 2]);
                    const radius = tempVertex.distanceTo(colletOriginalPos);
                    if (radius > maxRadius) {
                        maxRadius = radius;
                    }
                }

                const targetAngle = THREE.MathUtils.degToRad(-20);
                let minAngleDiff = Infinity;
                let studVertexIndex = -1;

                for (let i = 0; i < vertexCount; i++) {
                     tempVertex.set(positions[i * 3], positions[i * 3 + 1], positions[i * 3 + 2]);
                     const radius = tempVertex.distanceTo(colletOriginalPos);

                     if (radius > maxRadius * 0.9) { 
                         const angle = Math.atan2(tempVertex.z - colletOriginalPos.z, tempVertex.x - colletOriginalPos.x);
                         let angleDiff = Math.abs(angle - targetAngle);
                         if (angleDiff > Math.PI) angleDiff = 2 * Math.PI - angleDiff;

                         if (angleDiff < minAngleDiff) {
                             minAngleDiff = angleDiff;
                             studVertexIndex = i;
                         }
                     }
                }
                
                if (studVertexIndex !== -1) {
                    studOriginalPos.set(positions[studVertexIndex * 3], positions[studVertexIndex * 3 + 1], positions[studVertexIndex * 3 + 2]);
                    studRadius = studOriginalPos.distanceTo(colletOriginalPos);
                    console.log("Hairspring Stud (outer anchor) found at:", studOriginalPos);
                    console.log("Hairspring Collet (inner anchor) found at:", colletOriginalPos);
                } else {
                    console.error("Could not find stud for hairspring.");
                }
            }

            const center = new THREE.Vector3();
            new THREE.Box3().setFromObject(part).getCenter(center);
            const pivot = new THREE.Group();
            part.parent.add(pivot);
            pivot.position.copy(center);
            pivot.add(part);
            part.position.sub(center);
            switch (name) {
                case 'SecondWheel': secondWheel = pivot; break;
                case 'Minute_Wheel_Body': minuteWheel = pivot; break;
                case 'HourWheel_Body': hourWheel = pivot; break;
                case 'BalanceWheelBody': balanceWheel = pivot; break;
                case 'EscapeWheelBody': escapeWheel = pivot; break;
                case 'CenterWheelBody': centerWheel = pivot; break;
                case 'ThirdWheelBody': thirdWheel = pivot; break;
                case 'HairSpringBody': hairSpring = pivot; break;
                case 'SecondWheelSmallGear': secondWheelSmallGear = pivot; break;
                case 'ThirdWheelTopGear': thirdWheelTopGear = pivot; break;
            }
        }
    });

    const palletForkBodyMesh = collectedParts['PalletForkBody'];
    const palletJewelBodyMesh = collectedParts['Plate_Jewel_Body'];
    if (palletForkBodyMesh && palletJewelBodyMesh) {
        const jewelCenter = new THREE.Vector3();
        new THREE.Box3().setFromObject(palletJewelBodyMesh).getCenter(jewelCenter);
        const pivot = new THREE.Group();
        palletForkBodyMesh.parent.add(pivot);
        pivot.position.copy(jewelCenter);
        if (collectedParts['PalletForkJewel1']) pivot.add(collectedParts['PalletForkJewel1']);
        if (collectedParts['PalletForkJewel2']) pivot.add(collectedParts['PalletForkJewel2']);
        pivot.add(palletForkBodyMesh);
        pivot.children.forEach(child => child.position.sub(jewelCenter));
        palletFork = pivot;
    }
    
    if (secondWheel) {
        const pivot = new THREE.Group();
        clockModel.add(pivot);
        const center = new THREE.Vector3();
        new THREE.Box3().setFromObject(secondWheel).getCenter(center);
        pivot.position.copy(center);
        pivot.add(newSecondHand);
        newSecondHand.position.sub(center);
        newSecondHand = pivot;
    }
});

function layoutScene() {
    camera.position.z = 60;
    camera.updateProjectionMatrix();

    const boxDepth = 8.5;
    const backWallZ = -boxDepth;
    const wallCenterZ = -boxDepth / 2;
    const boxFrontZ = 0.0;

    const fov = camera.fov * (Math.PI / 180);
    const viewPlaneDistance = camera.position.z - boxFrontZ;
    const viewPlaneHeight = 2 * Math.tan(fov / 2) * viewPlaneDistance;
    const viewPlaneWidth = viewPlaneHeight * camera.aspect;

    const backPlaneDistance = camera.position.z - backWallZ;
    const backPlaneHeight = 2 * Math.tan(fov / 2) * backPlaneDistance;
    const backPlaneWidth = backPlaneHeight * camera.aspect;

    const unitsPerTexture = 15;
    const wallTextures = [wallMaterial.map, wallMaterial.normalMap, wallMaterial.roughnessMap, wallMaterial.displacementMap];
    const tbTextures = [topBottomMaterial.map, topBottomMaterial.normalMap, topBottomMaterial.roughnessMap, topBottomMaterial.displacementMap];
    const lrTextures = [leftRightMaterial.map, leftRightMaterial.normalMap, leftRightMaterial.roughnessMap, leftRightMaterial.displacementMap];

    wallTextures.forEach(t => t.repeat.set(backPlaneWidth / unitsPerTexture, backPlaneHeight / unitsPerTexture));
    tbTextures.forEach(t => t.repeat.set(viewPlaneWidth / unitsPerTexture, boxDepth / unitsPerTexture));
    lrTextures.forEach(t => t.repeat.set(boxDepth / unitsPerTexture, viewPlaneHeight / unitsPerTexture));

    wall.position.z = backWallZ;
    wall.scale.set(backPlaneWidth, backPlaneHeight, 1);

    topWall.scale.set(viewPlaneWidth, boxDepth, 1);
    topWall.position.set(0, viewPlaneHeight / 2, wallCenterZ);
    topWall.rotation.set(Math.PI / 2, 0, 0);

    bottomWall.scale.set(viewPlaneWidth, boxDepth, 1);
    bottomWall.position.set(0, -viewPlaneHeight / 2, wallCenterZ);
    bottomWall.rotation.set(-Math.PI / 2, 0, 0);

    leftWall.scale.set(boxDepth, viewPlaneHeight, 1);
    leftWall.position.set(-viewPlaneWidth / 2, 0, wallCenterZ);
    leftWall.rotation.set(0, Math.PI / 2, 0);

    rightWall.scale.set(boxDepth, viewPlaneHeight, 1);
    rightWall.position.set(viewPlaneWidth / 2, 0, wallCenterZ);
    rightWall.rotation.set(0, -Math.PI / 2, 0);

    const clockNativeDiameter = 22;
    const padding = 5;
    const availableWidth = viewPlaneWidth - (padding * 2);
    const availableHeight = viewPlaneHeight - (padding * 2);

    const scale = Math.min(availableWidth, availableHeight) / clockNativeDiameter;
    clockUnit.scale.set(scale, scale, scale);

    const shadowVolumeBox = new THREE.Box3().setFromObject(boxGroup);
    const shadowVolumeCenter = new THREE.Vector3();
    shadowVolumeBox.getCenter(shadowVolumeCenter);
    const shadowVolumeRadius = shadowVolumeBox.getSize(new THREE.Vector3()).length() / 2;
	const paddedRadius = shadowVolumeRadius * 1.2;
    const lightPositionOffset = { x: 10, y: 28, z: 25 };

    dirLight.target.position.copy(shadowVolumeCenter);
    dirLight.position.set(
        shadowVolumeCenter.x + lightPositionOffset.x,
        shadowVolumeCenter.y + lightPositionOffset.y,
        shadowVolumeCenter.z + lightPositionOffset.z
    );
    dirLight.target.updateMatrixWorld();

    dirLight.shadow.camera.left = -paddedRadius;
    dirLight.shadow.camera.right = paddedRadius;
    dirLight.shadow.camera.top = paddedRadius;
    dirLight.shadow.camera.bottom = -paddedRadius;

    const lightDistanceToCenter = dirLight.position.distanceTo(shadowVolumeCenter);
    dirLight.shadow.camera.near = Math.max(0.1, lightDistanceToCenter - shadowVolumeRadius);
    dirLight.shadow.camera.far = lightDistanceToCenter + shadowVolumeRadius;
    dirLight.shadow.camera.updateProjectionMatrix();
}

let tiltX = 0, tiltY = 0;
function handleOrientation(event) {
  tiltY = event.beta || 0;
  tiltX = event.gamma || 0;
}

function enableTilt() {
    if (typeof DeviceOrientationEvent?.requestPermission === 'function') {
        DeviceOrientationEvent.requestPermission().then(permissionState => {
            if (permissionState === 'granted') {
                window.addEventListener('deviceorientation', handleOrientation);
            } else {
                settings.tiltEnabled = false;
                gui.controllers.forEach(c => c.updateDisplay());
            }
        });
    } else {
        window.addEventListener('deviceorientation', handleOrientation);
    }
}

function disableTilt() {
    window.removeEventListener('deviceorientation', handleOrientation);
    tiltX = 0;
    tiltY = 0;
}

// --- RE-USABLE VECTORS FOR ANIMATION LOOP ---
const p_orig = new THREE.Vector3();
const p_relative = new THREE.Vector3();

// --- Animation Loop ---
function animate() {
  requestAnimationFrame(animate);
  controls.update();

  const maxTilt = 15;
  const x = THREE.MathUtils.clamp(tiltX, -maxTilt, maxTilt);
  const y = THREE.MathUtils.clamp(tiltY, -maxTilt, maxTilt);
  const rotY = THREE.MathUtils.degToRad(x) * 0.5;
  const rotX = THREE.MathUtils.degToRad(y) * 0.5;

  const now = new Date();
  const time = now.getTime() / 1000;

  const continuousSeconds = now.getSeconds() + now.getMilliseconds() / 1000;
  const minutes = now.getMinutes() + continuousSeconds / 60;
  const hours = now.getHours() % 12 + minutes / 60;
  const intervalIndex = Math.floor(continuousSeconds * 5);
  const quantizedSeconds = intervalIndex / 5.0;

  const thirdWheelRotation = (((minutes % 7.5) / 7.5) * Math.PI * 2);
  const secondRotation = -((quantizedSeconds / 60) * Math.PI * 2);
  
  if (newMinuteHand) newMinuteHand.rotation.z = -THREE.MathUtils.degToRad((minutes / 60) * 360);
  if (newHourHand) newHourHand.rotation.z = -THREE.MathUtils.degToRad((hours / 12) * 360);
  if (minuteWheel) minuteWheel.rotation.z = ((minutes / 60) * Math.PI * 2); 
  if (hourWheel) hourWheel.rotation.z = -((hours / 12) * Math.PI * 2);
  if (centerWheel) centerWheel.rotation.z = -((minutes / 60) * Math.PI * 2);
  if (thirdWheel) thirdWheel.rotation.z = thirdWheelRotation;
  if (thirdWheelTopGear) thirdWheelTopGear.rotation.z = thirdWheelRotation;
  
  if (newSecondHand) newSecondHand.rotation.z = -THREE.MathUtils.degToRad((quantizedSeconds / 60) * 360);
  if (secondWheel) secondWheel.rotation.z = secondRotation;
  if (secondWheelSmallGear) secondWheelSmallGear.rotation.z = secondRotation;
  if (escapeWheel) escapeWheel.rotation.z = (((quantizedSeconds % 5) / 5) * Math.PI * 2);
  
  if (palletFork) {
    palletFork.rotation.z = -THREE.MathUtils.degToRad(22) * Math.sin(time * Math.PI * 10);
  }

  // --- Balance Wheel and Hairspring Animation ---
  if (balanceWheel) {
    const sineValue = Math.sin(time * Math.PI * 2 * (2.5 * balanceWheelSpeedMultiplier));
    balanceWheel.rotation.z = -(Math.PI / 2) * sineValue;
    
    // Animate hairspring with "breathing" only, based on radial distance from center
    if (hairSpringMesh && hairSpringOriginalPositions && studRadius > 0) {
      const positions = hairSpringMesh.geometry.attributes.position;
      const vertexCount = positions.count;
      
      const minScale = 0.25;
      const maxScale = 1.25;
      const currentScale = minScale + ((sineValue + 1) / 2) * (maxScale - minScale);

      for (let i = 0; i < vertexCount; i++) {
        p_orig.set(
            hairSpringOriginalPositions[i * 3],
            hairSpringOriginalPositions[i * 3 + 1],
            hairSpringOriginalPositions[i * 3 + 2]
        );

        const dist_c = p_orig.distanceTo(colletOriginalPos);
        
        // Weight is 1.0 at the collet and fades to 0.0 at the stud's radius.
        // It is clamped at 0 to keep the outer edge and tail static.
        let weight = 1.0 - (dist_c / studRadius);
        weight = Math.max(0, weight);
        
        const vertexScale = 1.0 + (currentScale - 1.0) * weight;

        p_relative.subVectors(p_orig, colletOriginalPos);
        p_relative.multiplyScalar(vertexScale);
        p_relative.add(colletOriginalPos);

        positions.setXYZ(i, p_relative.x, p_relative.y, p_relative.z);
      }
      
      positions.needsUpdate = true;
    }
  }

  const currentSecond = Math.floor(now.getSeconds());
  if (animate.lastSecond !== currentSecond) {
    if(tickSound && settings.soundEnabled) {
        tickSound.currentTime = 0;
        tickSound.play().catch(() => {});
    }
    animate.lastSecond = currentSecond;
  }

  renderer.render(scene, camera);
}


// --- Initial Setup Calls ---
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  renderer.setSize(window.innerWidth, window.innerHeight);
  layoutScene();
});

animate();
