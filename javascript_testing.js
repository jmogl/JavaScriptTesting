// 3D Javacript Clock using three.js
// Goal is to have a realistic 3D depth with tilt on mobile devices
// MIT License. - Work in Progress using Gemini
// Jeff Miller 2025. 7/31/25

// The import statements are now the simple, original ones.
import * as THREE from 'three';
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js';

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 1000);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setClearColor(0xcccccc);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);

// --- Get and style the UI elements ---

// Get the DOM elements
const digitalClock = document.getElementById('digitalClock');
const digitalDate = document.getElementById('digitalDate');

// Define common font styles for the parent DIV containers
const textContainerStyles = {
    position: 'absolute',
    color: 'white',
    fontSize: '1.75em',
    fontFamily: '"Courier New", Courier, monospace',
    textShadow: '0 0 8px black',
    zIndex: '10' // Ensure it's above the canvas
};

// Style and position the digital clock in the lower right
if (digitalClock) {
    Object.assign(digitalClock.style, textContainerStyles, {
        bottom: '20px',
        right: '20px',
        textAlign: 'right' // Force alignment to the right
    });
}

// Style and position the digital date in the lower left
if (digitalDate) {
    Object.assign(digitalDate.style, textContainerStyles, {
        bottom: '20px',
        left: '20px',
        textAlign: 'left' // Force alignment to the left
    });
}


const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

const dirLight = new THREE.DirectionalLight(0xffffff, 1.5);
dirLight.castShadow = true;
dirLight.position.set(20, 10, 20);
dirLight.shadow.mapSize.set(2048, 2048);
dirLight.shadow.camera.left = -15;
dirLight.shadow.camera.right = 15;
dirLight.shadow.camera.top = 15;
dirLight.shadow.camera.bottom = -15;
dirLight.shadow.bias = -0.0001;

camera.add(dirLight);
scene.add(camera);

// The watchGroup will contain all moving clock parts
const watchGroup = new THREE.Group();
scene.add(watchGroup);

const watchMaterial = new THREE.MeshStandardMaterial({
  color: 0x222244,
  metalness: 0.6,
  roughness: 0.3,
});
// Use a plane that will be scaled to fill the viewport as the background.
const watchGeometry = new THREE.PlaneGeometry(1, 1);
const watch = new THREE.Mesh(watchGeometry, watchMaterial);
watch.position.z = -1; // Position it at the back of the clock assembly.
watch.receiveShadow = true;
// Add the background directly to the scene so it doesn't rotate with the group
scene.add(watch);

const silverMaterial = new THREE.MeshStandardMaterial({ color: 0xc0c0c0, metalness: 1.0, roughness: 0.4 });
const brightSilverMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 1.0, roughness: 0.4 });

// Increased radius to place tick marks outside the numerals.
const markerRadius = 10.0;
for (let i = 0; i < 60; i++) {
    const angle = (i / 60) * Math.PI * 2;
    let markerGeom;
    const markerDepth = 0.5;

    if (i % 5 === 0) {
        // Create a larger, thicker marker for the hours.
        markerGeom = new THREE.BoxGeometry(0.25, 1.0, markerDepth);
    } else {
        // Use the original, smaller marker for the minutes.
        markerGeom = new THREE.BoxGeometry(0.1, 0.5, markerDepth);
    }

    const marker = new THREE.Mesh(markerGeom, silverMaterial);
    marker.position.x = markerRadius * Math.sin(angle);
    marker.position.y = markerRadius * Math.cos(angle);
    // Position the back of the marker just above the background plane.
    marker.position.z = -1.0 + 0.01 + (markerDepth / 2);
    marker.rotation.z = -angle;
    marker.castShadow = true;
    watchGroup.add(marker);
}

const fontLoader = new FontLoader();
const fontURL = 'https://cdn.jsdelivr.net/npm/three@0.166.0/examples/fonts/helvetiker_regular.typeface.json';

// This is the radius used for positioning the clock numerals.
const numeralRadius = 8.5;
fontLoader.load(fontURL, (font) => {
    const numeralSize = 1.5;
    const numeralThickness = (numeralSize / 2) * 1.25;

    for (let i = 1; i <= 12; i++) {
        const angle = (i / 12) * Math.PI * 2;
        const numeralGeometry = new TextGeometry(i.toString(), {
            font: font,
            size: numeralSize,
            depth: numeralThickness, // Changed "height" to "depth"
            curveSegments: 12,
        });
        numeralGeometry.center();
        const numeral = new THREE.Mesh(numeralGeometry, silverMaterial);
        // Position the back of the numeral just above the background plane.
        const backOfNumeral = -1.0 + 0.01 + (numeralThickness / 2);
        numeral.position.set(numeralRadius * Math.sin(angle), numeralRadius * Math.cos(angle), backOfNumeral);
        numeral.castShadow = true;
        numeral.receiveShadow = true;
        watchGroup.add(numeral);
    }
});

// --- Hour Hand ---
const hourHandShape = new THREE.Shape();
const hourHandLength = 4.0;
const hourHandWidth = 0.6;
const hourHandDepth = 0.4;
hourHandShape.moveTo(-hourHandWidth / 2, 0);
hourHandShape.lineTo(hourHandWidth / 2, 0);
hourHandShape.lineTo(0, hourHandLength);
hourHandShape.closePath();

const extrudeSettings = {
    depth: hourHandDepth,
    bevelEnabled: false,
};
const hourGeometry = new THREE.ExtrudeGeometry(hourHandShape, extrudeSettings);
// Center the hand's depth on its z-position
hourGeometry.translate(0, 0, -hourHandDepth / 2);
const hourHand = new THREE.Mesh(hourGeometry, silverMaterial);
hourHand.position.z = 1.8;
hourHand.castShadow = true;
hourHand.receiveShadow = true;
watchGroup.add(hourHand);

// --- Minute Hand ---
const minuteHandShape = new THREE.Shape();
const minuteHandLength = 6.0;
const minuteHandWidth = 0.4;
const minuteHandDepth = 0.3;
minuteHandShape.moveTo(-minuteHandWidth / 2, 0);
minuteHandShape.lineTo(minuteHandWidth / 2, 0);
minuteHandShape.lineTo(0, minuteHandLength);
minuteHandShape.closePath();

const minuteExtrudeSettings = {
    depth: minuteHandDepth,
    bevelEnabled: false,
};
const minuteGeometry = new THREE.ExtrudeGeometry(minuteHandShape, minuteExtrudeSettings);
// Center the hand's depth on its z-position
minuteGeometry.translate(0, 0, -minuteHandDepth / 2);
const minuteHand = new THREE.Mesh(minuteGeometry, brightSilverMaterial);
minuteHand.position.z = 1.9;
minuteHand.castShadow = true;
minuteHand.receiveShadow = true;
watchGroup.add(minuteHand);

// --- Second Hand ---
const secondHeight = 7;
const secondGeometry = new THREE.BoxGeometry(0.1, secondHeight, 0.3);
secondGeometry.translate(0, secondHeight / 2, 0);
const secondMaterial = new THREE.MeshStandardMaterial({ color: 0xff0000 });
const secondHand = new THREE.Mesh(secondGeometry, secondMaterial);
secondHand.position.z = 2.0;
secondHand.castShadow = true;
secondHand.receiveShadow = true;
watchGroup.add(secondHand);

function updateCameraPosition() {
    const clockSize = 22;
    const fovInRadians = THREE.MathUtils.degToRad(camera.fov);
    const distanceForHeight = (clockSize / 2) / Math.tan(fovInRadians / 2);
    const distanceForWidth = distanceForHeight / camera.aspect;
    camera.position.z = Math.max(distanceForHeight, distanceForWidth);
}

function updateBackgroundSize() {
    if (!watch) return;
    const distance = camera.position.z - watch.position.z;
    const vFov = THREE.MathUtils.degToRad(camera.fov);
    const height = 2 * Math.tan(vFov / 2) * distance;
    const width = height * camera.aspect;
    
    // Add a safety margin to the background size to prevent seeing its edges when the camera shifts.
    const safetyMargin = 1.4;
    watch.scale.set(width * safetyMargin, height * safetyMargin, 1);
}

let tiltX = 0, tiltY = 0;

function handleOrientation(event) {
  tiltY = event.beta || 0;
  tiltX = event.gamma || 0;
}

function setupTiltControls() {
    // Check if the browser requires permission for DeviceOrientation events (e.g., iOS 13+).
    if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
        const permissionButton = document.createElement('button');
        Object.assign(permissionButton.style, {
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            padding: '1em 2em',
            fontSize: '1em',
            color: 'white',
            backgroundColor: 'rgba(0,0,0,0.7)',
            border: '1px solid white',
            borderRadius: '8px',
            cursor: 'pointer',
            zIndex: '1001' // Ensure it's on top
        });
        permissionButton.textContent = 'Enable Tilt';
        document.body.appendChild(permissionButton);

        permissionButton.addEventListener('click', async () => {
            try {
                const response = await DeviceOrientationEvent.requestPermission();
                if (response === 'granted') {
                    window.addEventListener('deviceorientation', handleOrientation);
                }
                // Remove the button after the user has responded.
                document.body.removeChild(permissionButton);
            } catch (error)
{
                console.error("Error requesting orientation permission:", error);
                document.body.removeChild(permissionButton);
            }
        });
    } else {
        // For other devices, add the listener directly.
        window.addEventListener('deviceorientation', handleOrientation);
    }
}

const tickSound = new Audio('https://cdn.jsdelivr.net/gh/freebiesupply/sounds/tick.mp3');
tickSound.volume = 0.2;

function animate() {
  requestAnimationFrame(animate);

  const maxTilt = 15;
  const x = THREE.MathUtils.clamp(tiltX, -maxTilt, maxTilt);
  const y = THREE.MathUtils.clamp(tiltY, -maxTilt, maxTilt);

  // Instead of rotating the group, we shift the camera position for a parallax effect.
  const shiftMultiplier = 0.2;
  // A right tilt (positive gamma) moves the camera left (negative x) to see the right side.
  camera.position.x = -x * shiftMultiplier;
  // A forward tilt (positive beta) moves the camera up (positive y) to see the top side.
  camera.position.y = y * shiftMultiplier;
  
  // Keep the camera pointed at the center of the scene
  camera.lookAt(0, 0, 0);

  const now = new Date();
  const seconds = now.getSeconds() + now.getMilliseconds() / 1000;
  const minutes = now.getMinutes() + seconds / 60;
  const hours = now.getHours() % 12 + minutes / 60;

  secondHand.rotation.z = -THREE.MathUtils.degToRad((seconds / 60) * 360);
  minuteHand.rotation.z = -THREE.MathUtils.degToRad((minutes / 60) * 360);
  hourHand.rotation.z   = -THREE.MathUtils.degToRad((hours / 12) * 360);
  
  const pad = (n) => n.toString().padStart(2, '0');
  const spanStyles = `style="background-color: rgba(0, 0, 0, 0.5); padding: 0.1em 0.3em; border-radius: 4px;"`;

  // Update digital clock text
  if (digitalClock) {
    const timeString = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(Math.floor(now.getSeconds()))}`;
    digitalClock.innerHTML = `<span ${spanStyles}>${timeString}</span>`;
  }
  
  // Update digital date text
  if (digitalDate) {
      const month = pad(now.getMonth() + 1); // getMonth() is 0-indexed
      const day = pad(now.getDate());
      const year = now.getFullYear().toString().slice(-2); // Get last two digits
      const dateString = `${month}/${day}/${year}`;
      digitalDate.innerHTML = `<span ${spanStyles}>${dateString}</span>`;
  }

  const currentSecond = Math.floor(now.getSeconds());
  if (animate.lastSecond !== currentSecond) {
    tickSound.currentTime = 0;
    tickSound.play().catch(() => {});
    animate.lastSecond = currentSecond;
  }

  renderer.render(scene, camera);
}

// Initial setup calls to ensure correct sizing and positioning on load
camera.aspect = window.innerWidth / window.innerHeight;
camera.updateProjectionMatrix();
renderer.setSize(window.innerWidth, window.innerHeight);
updateCameraPosition();
updateBackgroundSize();


window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  updateCameraPosition();
  updateBackgroundSize();
});
