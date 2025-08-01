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

// Get and style the digital clock element once for efficiency.
const digitalClock = document.getElementById('digitalClock');
if (digitalClock) {
    // The container DIV is now only for positioning and font styles.
    Object.assign(digitalClock.style, {
        position: 'absolute',
        // Increased from 92% to move the clock down by about one text height.
        top: '96%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        textAlign: 'center', // This will center the inner span
        color: 'white',
        fontSize: '1.75em',
        fontFamily: '"Courier New", Courier, monospace',
        textShadow: '0 0 8px black',
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
    if (i % 5 === 0) continue;
    const angle = (i / 60) * Math.PI * 2;
    const markerDepth = 0.5;
    const markerGeom = new THREE.BoxGeometry(0.1, 0.5, markerDepth);
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

fontLoader.load(fontURL, (font) => {
    const numeralRadius = 8.5;
    const numeralSize = 1.5;
    const numeralThickness = (numeralSize / 2) * 1.25;

    for (let i = 1; i <= 12; i++) {
        const angle = (i / 12) * Math.PI * 2;
        const numeralGeometry = new TextGeometry(i.toString(), {
            font: font, size: numeralSize, height: numeralThickness, curveSegments: 12,
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

const hourHeight = 4;
const hourGeometry = new THREE.BoxGeometry(0.5, hourHeight, 0.5);
hourGeometry.translate(0, hourHeight / 2, 0);
const hourHand = new THREE.Mesh(hourGeometry, silverMaterial);
hourHand.position.z = 1.8;
hourHand.castShadow = true;
hourHand.receiveShadow = true;
watchGroup.add(hourHand);

const minuteHeight = 6;
const minuteGeometry = new THREE.BoxGeometry(0.3, minuteHeight, 0.4);
minuteGeometry.translate(0, minuteHeight / 2, 0);
const minuteHand = new THREE.Mesh(minuteGeometry, brightSilverMaterial);
minuteHand.position.z = 1.9;
minuteHand.castShadow = true;
minuteHand.receiveShadow = true;
watchGroup.add(minuteHand);

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
            } catch (error) {
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

  const maxTilt = 20;
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
  
  if (digitalClock) {
    const pad = (n) => n.toString().padStart(2, '0');
    const timeString = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(Math.floor(now.getSeconds()))}`;
    // The background is applied to an inner span, which fits the text tightly.
    // The padding is in 'em' units to scale proportionally with the font size.
    digitalClock.innerHTML = `<span style="background-color: rgba(0, 0, 0, 0.5); padding: 0.1em 0.3em; border-radius: 4px;">${timeString}</span>`;
  }

  const currentSecond = Math.floor(now.getSeconds());
  if (animate.lastSecond !== currentSecond) {
    tickSound.currentTime = 0;
    tickSound.play().catch(() => {});
    animate.lastSecond = currentSecond;
  }

  renderer.render(scene, camera);
}

updateCameraPosition();
updateBackgroundSize();

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  updateCameraPosition();
  updateBackgroundSize();
});
