Of course. Here are the final adjustments to the light position and the leather texture scaling.

## Final Adjustments
Light Position: To continue fine-tuning the shadows, the light has been moved a little further out in the same direction to the position (35, 20, 35).

Realistic Leather Scaling: To fix the "checkerboard" look of the background, I have significantly increased the tiling of the leather textures. This repeats the texture pattern more frequently, creating a much finer and more realistic leather grain on the clock face.

Final Clock3D.js
JavaScript

// 3D Javacript Clock using three.js
// Goal is to have a realistic 3D depth with tilt on mobile devices
// MIT License. - Work in Progress using Gemini
// Jeff Miller 2025. 8/1/25

import * as THREE from 'three';
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';

// --- Declare UI element variables in the global scope ---
let digitalDate, digitalClock;

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
renderer.toneMappingExposure = 1.4;
document.body.appendChild(renderer.domElement);

// --- Environment Map for Reflections ---
const pmremGenerator = new THREE.PMREMGenerator(renderer);
pmremGenerator.compileEquirectangularShader();

const rgbeLoader = new RGBELoader();
rgbeLoader.load('https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/peppermint_powerplant_2_1k.hdr', (texture) => {
    const envMap = pmremGenerator.fromEquirectangular(texture).texture;
    scene.environment = envMap;
    texture.dispose();
    pmremGenerator.dispose();
});

// --- Lighting ---
const ambientLight = new THREE.AmbientLight(0xffffff, 2.0);
scene.add(ambientLight);

const dirLight = new THREE.DirectionalLight(0xffffff, 5.0);
dirLight.castShadow = true;
// Final light position adjustment
dirLight.position.set(35, 20, 35);
dirLight.shadow.mapSize.set(2048, 2048);
dirLight.shadow.camera.left = -15;
dirLight.shadow.camera.right = 15;
dirLight.shadow.camera.top = 15;
dirLight.shadow.camera.bottom = -15;
dirLight.shadow.bias = -0.0001;
scene.add(dirLight);

// --- Create a master "clockUnit" group to handle tilting ---
const clockUnit = new THREE.Group();
scene.add(clockUnit);

const watchGroup = new THREE.Group();
clockUnit.add(watchGroup);

// --- Background Plane (Realistic Leather) ---
const watchMaterial = new THREE.MeshStandardMaterial({
  color: 0x111122,
  metalness: 0.1,
  roughness: 1.0,
  normalScale: new THREE.Vector2(0.3, 0.3)
});

const textureLoader = new THREE.TextureLoader();

// Normal map for leather grain
textureLoader.load('https://threejs.org/examples/textures/leather/Leather_008_normal.jpg', (map) => {
    map.wrapS = THREE.RepeatWrapping;
    map.wrapT = THREE.RepeatWrapping;
    // Increased repeat for finer grain
    map.repeat.set(10, 10);
    watchMaterial.normalMap = map;
    watchMaterial.needsUpdate = true;
});

// Roughness map for satin sheen
textureLoader.load('https://threejs.org/examples/textures/roughness_map.jpg', (map) => {
    map.wrapS = THREE.RepeatWrapping;
    map.wrapT = THREE.RepeatWrapping;
    // Increased repeat for finer grain
    map.repeat.set(10, 10);
    watchMaterial.roughnessMap = map;
    watchMaterial.needsUpdate = true;
});


const watchGeometry = new THREE.PlaneGeometry(1, 1);
const watch = new THREE.Mesh(watchGeometry, watchMaterial);
watch.position.z = -1;
watch.receiveShadow = true;
clockUnit.add(watch);

// --- Metallic Materials ---
const silverMaterial = new THREE.MeshStandardMaterial({
    color: 0xffffff, metalness: 1.0, roughness: 0.0
});
const brightSilverMaterial = new THREE.MeshStandardMaterial({
    color: 0xffffff, metalness: 1.0, roughness: 0.0
});

// --- Tick Marks ---
const markerRadius = 10.0;
for (let i = 0; i < 60; i++) {
    const angle = (i / 60) * Math.PI * 2;
    let markerGeom;
    const markerDepth = 0.5;

    if (i % 5 === 0) {
        markerGeom = new THREE.BoxGeometry(0.25, 1.0, markerDepth);
    } else {
        markerGeom = new THREE.BoxGeometry(0.1, 0.5, markerDepth);
    }
    const marker = new THREE.Mesh(markerGeom, silverMaterial);
    marker.position.set(markerRadius * Math.sin(angle), markerRadius * Math.cos(angle), -1.0 + 0.01 + (markerDepth / 2));
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
            font: font, size: numeralSize, depth: numeralThickness, curveSegments: 12,
        });
        numeralGeometry.center();
        const numeral = new THREE.Mesh(numeralGeometry, silverMaterial);
        const backOfNumeral = -1.0 + 0.01 + (numeralThickness / 2);
        numeral.position.set(numeralRadius * Math.sin(angle), numeralRadius * Math.cos(angle), backOfNumeral);
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
hourHand.position.z = -0.04;
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
minuteHand.position.z = -0.03;
minuteHand.castShadow = true;
watchGroup.add(minuteHand);

const secondGeometry = new THREE.BoxGeometry(0.1, 7.0, 0.3);
secondGeometry.translate(0, 3.5, 0);
const secondMaterial = new THREE.MeshStandardMaterial({ color: 0xff0000, metalness: 0.8, roughness: 0.4 });
const secondHand = new THREE.Mesh(secondGeometry, secondMaterial);
secondHand.position.z = -0.02;
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
    if (!watch || !camera) return;
    const distance = camera.position.z - watch.position.z;
    const vFov = THREE.MathUtils.degToRad(camera.fov);
    const height = 2 * Math.tan(vFov / 2) * distance;
    const width = height * camera.aspect;
    
    const safetyMargin = 1.2;
    watch.scale.set(width * safetyMargin, height * safetyMargin, 1);
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
  
  camera.lookAt(0, 0, 0);

  const now = new Date();
  const seconds = now.getSeconds() + now.getMilliseconds() / 1000;
  const minutes = now.getMinutes() + seconds / 60;
  const hours = now.getHours() % 12 + minutes / 60;

  secondHand.rotation.z = -THREE.MathUtils.degToRad((seconds / 60) * 360);
  minuteHand.rotation.z = -THREE.MathUtils.degToRad((minutes / 60) * 360);
  hourHand.rotation.z   = -THREE.MathUtils.degToRad((hours / 12) * 360);
  
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
