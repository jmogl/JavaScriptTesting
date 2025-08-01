// 3D Javacript Clock using three.js
// Goal is to have a realistic 3D depth with tilt on mobile devices
// MIT License. - Work in Progress using Gemini
// Jeff Miller 2025. 7/31/25

import * as THREE from 'three';
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';

// --- Declare UI element variables in the global scope ---
let digitalDate, digitalClock;

// --- Wait for the DOM to be ready, then create and inject UI elements ---
window.addEventListener('DOMContentLoaded', () => {
    // 1. Create container elements
    digitalDate = document.createElement('div');
    digitalClock = document.createElement('div');

    // 2. Style and position the date container (lower left)
    Object.assign(digitalDate.style, {
        position: 'absolute',
        bottom: '20px',
        left: '20px',
        color: 'white',
        fontFamily: '"Courier New", Courier, monospace',
        fontSize: '1.75em',
        textShadow: '0 0 8px black',
        zIndex: '10'
    });

    // 3. Style and position the clock container (lower right)
    Object.assign(digitalClock.style, {
        position: 'absolute',
        bottom: '20px',
        right: '20px',
        color: 'white',
        fontFamily: '"Courier New", Courier, monospace',
        fontSize: '1.75em',
        textShadow: '0 0 8px black',
        zIndex: '10'
    });

    // 4. Add the newly created elements to the document body
    document.body.appendChild(digitalDate);
    document.body.appendChild(digitalClock);
});


// --- Scene Setup ---
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });

renderer.setClearColor(0xcccccc);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.shadowMap.enabled = true;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
document.body.appendChild(renderer.domElement);

// --- Environment Map for Reflections ONLY ---
const rgbeLoader = new RGBELoader();
rgbeLoader.load('https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/peppermint_powerplant_2_1k.hdr', (texture) => {
    texture.mapping = THREE.EquirectangularReflectionMapping;
    
    // Use the texture for reflections, but NOT as the visible background.
    scene.environment = texture;
});

const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

const dirLight = new THREE.DirectionalLight(0xffffff, 1.5);
dirLight.castShadow = true;
dirLight.position.set(20, 10, 20);
dirLight.shadow.mapSize.set(2048, 2048);
camera.add(dirLight);
scene.add(camera);

const watchGroup = new THREE.Group();
scene.add(watchGroup);

// --- Reinstated Dark Blue Background Plane ---
const watchMaterial = new THREE.MeshStandardMaterial({
  color: 0x222244,
  metalness: 0.1, // Slightly metallic to interact with light
  roughness: 0.8, // Mostly rough surface
});
const watchGeometry = new THREE.PlaneGeometry(1, 1);
const watch = new THREE.Mesh(watchGeometry, watchMaterial);
watch.position.z = -1; // Position it at the back
watch.receiveShadow = true;
scene.add(watch); // Add plane directly to the scene

// --- Updated Metallic Materials ---
const silverMaterial = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    metalness: 1.0,
    roughness: 0.2
});

const brightSilverMaterial = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    metalness: 1.0,
    roughness: 0.1
});

// --- Tick Marks (Positioned relative to the background plane) ---
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
    // Correct Z-position to be in front of the `watch` plane
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
            font: font,
            size: numeralSize,
            depth: numeralThickness,
            curveSegments: 12,
        });
        numeralGeometry.center();
        const numeral = new THREE.Mesh(numeralGeometry, silverMaterial);
        // Correct Z-position to be in front of the `watch` plane
        const backOfNumeral = -1.0 + 0.01 + (numeralThickness / 2);
        numeral.position.set(numeralRadius * Math.sin(angle), numeralRadius * Math.cos(angle), backOfNumeral);
        numeral.castShadow = true;
        numeral.receiveShadow = true;
        watchGroup.add(numeral);
    }
});

// --- Clock Hands ---
const hourHandShape = new THREE.Shape();
hourHandShape.moveTo(-0.3, 0);
hourHandShape.lineTo(0.3, 0);
hourHandShape.lineTo(0, 4.0);
hourHandShape.closePath();
const hourGeometry = new THREE.ExtrudeGeometry(hourHandShape, { depth: 0.4, bevelEnabled: false });
hourGeometry.translate(0, 0, -0.2);
const hourHand = new THREE.Mesh(hourGeometry, silverMaterial);
hourHand.position.z = 1.8;
hourHand.castShadow = true;
watchGroup.add(hourHand);

const minuteHandShape = new THREE.Shape();
minuteHandShape.moveTo(-0.2, 0);
minuteHandShape.lineTo(0.2, 0);
minuteHandShape.lineTo(0, 6.0);
minuteHandShape.closePath();
const minuteGeometry = new THREE.ExtrudeGeometry(minuteHandShape, { depth: 0.3, bevelEnabled: false });
minuteGeometry.translate(0, 0, -0.15);
const minuteHand = new THREE.Mesh(minuteGeometry, brightSilverMaterial);
minuteHand.position.z = 1.9;
minuteHand.castShadow = true;
watchGroup.add(minuteHand);

const secondGeometry = new THREE.BoxGeometry(0.1, 7.0, 0.3);
secondGeometry.translate(0, 3.5, 0);
const secondMaterial = new THREE.MeshStandardMaterial({ color: 0xff0000, metalness: 0.8, roughness: 0.4 });
const secondHand = new THREE.Mesh(secondGeometry, secondMaterial);
secondHand.position.z = 2.0;
secondHand.castShadow = true;
watchGroup.add(secondHand);

// --- Utility Functions ---
function updateCameraPosition() {
    const clockSize = 22;
    const fovInRadians = THREE.MathUtils.degToRad(camera.fov);
    const distance = (clockSize / 2) / Math.tan(fovInRadians / 2) / camera.aspect;
    camera.position.z = distance;
}

// Reinstated function to keep the background plane filling the screen
function updateBackgroundSize() {
    if (!watch) return;
    const distance = camera.position.z - watch.position.z;
    const vFov = THREE.MathUtils.degToRad(camera.fov);
    const height = 2 * Math.tan(vFov / 2) * distance;
    const width = height * camera.aspect;
    
    const safetyMargin = 1.4;
    watch.scale.set(width * safetyMargin, height * safetyMargin, 1);
}

let tiltX = 0, tiltY = 0;

function handleOrientation(event) {
  tiltY = event.beta || 0;
  tiltX = event.gamma || 0;
}

function setupTiltControls() {
    if (typeof DeviceOrientationEvent?.requestPermission === 'function') {
        const permissionButton = document.createElement('button');
        Object.assign(permissionButton.style, {
            position: 'absolute', top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)', padding: '1em 2em',
            fontSize: '1em', color: 'white', backgroundColor: 'rgba(0,0,0,0.7)',
            border: '1px solid white', borderRadius: '8px', cursor: 'pointer', zIndex: '1001'
        });
        permissionButton.textContent = 'Enable Tilt';
        document.body.appendChild(permissionButton);
        permissionButton.addEventListener('click', async () => {
            try {
                const response = await DeviceOrientationEvent.requestPermission();
                if (response === 'granted') {
                    window.addEventListener('deviceorientation', handleOrientation);
                }
            } finally {
                document.body.removeChild(permissionButton);
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

  const shiftMultiplier = 0.2;
  camera.position.x = -x * shiftMultiplier;
  camera.position.y = y * shiftMultiplier;
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
      const timeString = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(Math.floor(now.getSeconds()))}`;
      digitalClock.innerHTML = `<span style="${spanStyles}">${timeString}</span>`;
  }
  
  if (digitalDate) {
      const dateString = `${pad(now.getMonth() + 1)}/${pad(now.getDate())}/${now.getFullYear().toString().slice(-2)}`;
      digitalDate.innerHTML = `<span style="${spanStyles}">${dateString}</span>`;
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
updateBackgroundSize(); // Call this on initial load

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  updateCameraPosition();
  updateBackgroundSize(); // Also call on resize
});

setupTiltControls();
animate();
