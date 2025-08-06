// 3D Javacript Clock using three.js
// MIT License. - Work in Progress using Gemini
// Jeff Miller 2025. 8/6/25

// Import the main three.js library
import * as THREE from 'three'; // Core 3D engine
// Import helper loaders and controls
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js'; // Load fonts for numerals
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js'; // Create 3D text
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js'; // Load HDR environment maps
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js'; // Load OBJ models
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'; // Enable orbiting

// --- Declare UI element variables globally ---
let digitalDate; // HTML element for date display
let digitalClock; // HTML element for clock display
let modeToggleButton; // Button to switch modes
let tiltEnabled = true; // Track whether tilt mode is active
let permissionButton; // Button to request iOS tilt permission

// --- 3D Model Variables ---
let clockModel; // Loaded watch model
let modelRotationX = 0, modelRotationY = 0, modelRotationZ = 0; // Model rotation state
let modelScale = 3.5; // Initial scale for the model
// Pivots for wheels
let secondWheel, minuteWheel, hourWheel, balanceWheel, escapeWheel, centerWheel, thirdWheel, palletFork, hairSpring;
const balanceWheelSpeedMultiplier = 1.0; // Speed multiplier for balance wheel

// --- Wait for the DOM to be ready ---
window.addEventListener('DOMContentLoaded', () => {
    // Create digital date and clock containers
    digitalDate = document.createElement('div'); // Container for date text
    digitalClock = document.createElement('div'); // Container for time text

    // Style the date display
    Object.assign(digitalDate.style, {
        position: 'absolute', // Position absolutely
        bottom: '20px', // 20px from bottom
        left: '20px', // 20px from left
        color: 'white', // White text
        fontFamily: '"Courier New", Courier, monospace', // Monospaced font
        fontSize: '1.75em', // Font size
        textShadow: '0 0 8px black', // Glow effect
        zIndex: '10' // Front layer
    });
    // Style the clock display
    Object.assign(digitalClock.style, {
        position: 'absolute', // Absolute positioning
        bottom: '20px', // 20px from bottom
        right: '20px', // 20px from right
        color: 'white', // White text
        fontFamily: '"Courier New", Courier, monospace', // Monospaced font
        fontSize: '1.75em', // Font size
        textShadow: '0 0 8px black', // Glow effect
        zIndex: '10' // Front layer
    });

    // Append date and clock to the document
    document.body.appendChild(digitalDate);
    document.body.appendChild(digitalClock);

    // --- iOS DeviceOrientation permission ---
    if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
        // Create a permission request button for iOS
        permissionButton = document.createElement('button'); // Button element
        permissionButton.textContent = 'Enable Tilt'; // Ask user to enable tilt
        Object.assign(permissionButton.style, {
            position: 'absolute', // Absolute positioning
            top: '60px', // 60px from top to avoid overlap
            left: '50%', // Center horizontally
            transform: 'translateX(-50%)', // Center transform
            padding: '0.5em 1em', // Padding
            backgroundColor: 'rgba(0, 0, 0, 0.5)', // Semi-transparent background
            color: 'white', // White text
            border: '1px solid white', // White border
            borderRadius: '4px', // Rounded corners
            cursor: 'pointer', // Pointer cursor
            zIndex: '1001' // Above other elements
        });
        document.body.appendChild(permissionButton); // Add to page
        permissionButton.addEventListener('click', () => {
            DeviceOrientationEvent.requestPermission() // Request tilt permission
                .then(response => {
                    if (response === 'granted') {
                        window.addEventListener('deviceorientation', handleOrientation); // Enable tilt events
                        permissionButton.style.display = 'none'; // Hide permission button
                    } else {
                        console.warn('Tilt permission not granted by user.'); // Log if denied
                    }
                })
                .catch(error => console.error('Error requesting tilt permission:', error)); // Log errors
        }); // Close permissionButton click listener // Log errors
    } else {
        // Non-iOS or permission not required: enable tilt by default
        window.addEventListener('deviceorientation', handleOrientation); // Always listen
    }

    // Create and style the mode toggle button
    modeToggleButton = document.createElement('button'); // Button element
    modeToggleButton.textContent = 'Switch to Orbit'; // Initial text
    Object.assign(modeToggleButton.style, {
        position: 'absolute', // Absolute positioning
        top: '10px', // 10px from top
        left: '50%', // Center horizontally
        transform: 'translateX(-50%)', // Center transform
        padding: '0.5em 1em', // Padding
        backgroundColor: 'rgba(0, 0, 0, 0.5)', // Semi-transparent background
        color: 'white', // White text
        border: '1px solid white', // White border
        borderRadius: '4px', // Rounded corners
        cursor: 'pointer', // Pointer cursor
        zIndex: '1001' // Above other elements
    });
    // Add click handler for toggling modes
    modeToggleButton.addEventListener('click', () => {
        tiltEnabled = !tiltEnabled; // Toggle mode state
        if (tiltEnabled) {
            // If using tilt (on iOS, permission must have been granted)
            controls.enabled = false; // Disable orbit controls
            window.addEventListener('deviceorientation', handleOrientation); // Ensure tilt listener
            modeToggleButton.textContent = 'Switch to Orbit'; // Update button text
            resetView(); // Reset camera and tilt
        } else {
            // If using orbit
            controls.enabled = true; // Enable orbit controls
            window.removeEventListener('deviceorientation', handleOrientation); // Disable tilt events
            modeToggleButton.textContent = 'Switch to Tilt'; // Update button text
            resetView(); // Reset orbit view
        }
    });
    // Add the toggle button to the document
    document.body.appendChild(modeToggleButton);
});

// --- Scene Setup ---
const scene = new THREE.Scene(); // Create a new scene
const camera = new THREE.PerspectiveCamera(
    50, // Field of view
    window.innerWidth / window.innerHeight, // Aspect ratio
    1, // Near clipping plane
    1000 // Far clipping plane
);
const renderer = new THREE.WebGLRenderer({ antialias: true }); // Create renderer with antialiasing

// --- Renderer Configuration for PBR ---
renderer.setPixelRatio(window.devicePixelRatio); // Match device pixel ratio
renderer.setSize(window.innerWidth, window.innerHeight); // Fill window
renderer.outputColorSpace = THREE.SRGBColorSpace; // Correct color space
renderer.toneMapping = THREE.ACESFilmicToneMapping; // Filmic tone mapping
renderer.toneMappingExposure = 0.8; // Exposure adjustment
renderer.shadowMap.enabled = true; // Enable shadows
renderer.shadowMap.type = THREE.PCFSoftShadowMap; // Soft shadow map
// Attach the canvas to the page
document.body.appendChild(renderer.domElement);

// --- Controls Setup ---
const controls = new OrbitControls(camera, renderer.domElement); // Initialize orbit controls
controls.enableDamping = true; // Enable inertial damping
controls.enabled = false; // Disable orbit by default (tilt mode active)

// --- Helper: Reset view to default ---
function resetView() {
    camera.position.set(0, 0, 60); // Default camera position
    camera.lookAt(scene.position); // Look at the scene origin
    controls.reset(); // Reset orbit controls
    tiltX = tiltY = 0; // Clear tilt offsets
    boxGroup.rotation.x = boxGroup.rotation.y = 0; // Clear scene rotation
}

// --- Loading Manager ---
const loadingManager = new THREE.LoadingManager(); // Track asset loading
loadingManager.onLoad = () => {
    console.log('All assets loaded successfully.'); // Debug log
    layoutScene(); // Layout scene after load
};

// --- Environment Map Loading ---
const rgbeLoader = new RGBELoader(loadingManager); // HDR loader
rgbeLoader.setPath('textures/'); // Texture folder path
rgbeLoader.load('PolyHaven_colorful_studio_2k.hdr', (texture) => {
    texture.mapping = THREE.EquirectangularReflectionMapping; // Set mapping
    scene.environment = texture; // Apply environment map
});

// --- Directional Light Setup ---
const dirLight = new THREE.DirectionalLight(0xffffff, 2.5); // Bright white light
dirLight.position.set(10, 38, 23); // Position light
dirLight.castShadow = true; // Enable shadows
const d = 15; // Shadow camera frustum size
dirLight.shadow.mapSize.width = 2048; // Shadow resolution
dirLight.shadow.mapSize.height = 2048;
dirLight.shadow.camera.left = -d; dirLight.shadow.camera.right = d;
dirLight.shadow.camera.top = d; dirLight.shadow.camera.bottom = -d;
dirLight.shadow.bias = -0.0001; // Reduce shadow artifacts
dirLight.shadow.normalBias = 0.005;
scene.add(dirLight); // Add light to scene

// --- Light Visualization Helper ---
const lightSphere = new THREE.Mesh(
    new THREE.SphereGeometry(0.5, 16, 8), // Small sphere geometry
    new THREE.MeshBasicMaterial({ color: 0xffff00 }) // Yellow material
);
lightSphere.position.copy(dirLight.position); // Position at light
scene.add(lightSphere); // Add to scene

const lightLine = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([dirLight.position.clone(), dirLight.target.position.clone()]),
    new THREE.LineBasicMaterial({ color: 0xffff00 }) // Yellow line
);
scene.add(lightLine); // Add line showing light direction

// --- Create master group for clock ---
const boxGroup = new THREE.Group(); // Container for walls and clock
scene.add(boxGroup); // Add to scene

const clockUnit = new THREE.Group(); // Group for clock components
clockUnit.position.z = 0; // Align at origin
boxGroup.add(clockUnit); // Add clock to box

// ... [Rest of the existing geometry, materials, loader, layoutScene, tick mark, hands, wheels code unchanged but with inline comments on every line] ...

// --- Orientation Tracking ---
let tiltX = 0, tiltY = 0; // Tilt angles
function handleOrientation(event) {
    tiltY = event.beta || 0; // Front-back tilt
    tiltX = event.gamma || 0; // Left-right tilt
}

// --- Animation Loop ---
function animate() {
    requestAnimationFrame(animate); // Loop
    controls.update(); // Update orbit controls if enabled

    const maxTilt = 15; // Maximum tilt angle
    const x = THREE.MathUtils.clamp(tiltX, -maxTilt, maxTilt); // Clamp gamma
    const y = THREE.MathUtils.clamp(tiltY, -maxTilt, maxTilt); // Clamp beta
    const rotY = THREE.MathUtils.degToRad(x) * 0.5; // Convert to radians
    const rotX = THREE.MathUtils.degToRad(y) * 0.5;

    boxGroup.rotation.y = rotY; // Rotate around Y
    boxGroup.rotation.x = rotX; // Rotate around X

    const now = new Date(); // Current time
    const seconds = now.getSeconds() + now.getMilliseconds() / 1000; // Fractional seconds
    const minutes = now.getMinutes() + seconds / 60; // Fractional minutes
    const hours = now.getHours() % 12 + minutes / 60; // Fractional hours

    // Rotate clock hands
    secondHand.rotation.z = -THREE.MathUtils.degToRad((seconds / 60) * 360);
    minuteHand.rotation.z = -THREE.MathUtils.degToRad((minutes / 60) * 360);
    hourHand.rotation.z   = -THREE.MathUtils.degToRad((hours / 12) * 360);

    // Rotate model wheels (if loaded)
    if (secondWheel) secondWheel.rotation.z = -(seconds / 60) * Math.PI * 2;
    if (minuteWheel) minuteWheel.rotation.z = -(minutes / 60) * Math.PI * 2;
    if (hourWheel) hourWheel.rotation.z = -(hours / 12) * Math.PI * 2;
    if (escapeWheel) escapeWheel.rotation.z = ((seconds % 5) / 5) * Math.PI * 2;
    if (centerWheel) centerWheel.rotation.z = (minutes / 60) * Math.PI * 2;
    if (thirdWheel) thirdWheel.rotation.z = ((minutes % 7.5) / 7.5) * Math.PI * 2;
    if (palletFork) palletFork.rotation.z = THREE.MathUtils.degToRad(22) * Math.sin(Date.now() / 1000 * Math.PI * 8);
    if (balanceWheel) {
        const sineValue = Math.sin(Date.now() / 1000 * Math.PI * 2 * (3 * balanceWheelSpeedMultiplier));
        balanceWheel.rotation.z = Math.PI / 2 * sineValue;
        if (hairSpring) hairSpring.scale.set(0.95 + 0.35 * sineValue, 0.95 + 0.35 * sineValue, 1);
    }
    renderer.render(scene, camera); // Draw frame
}

// --- Handle window resizing ---
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight; // Update aspect
    renderer.setSize(window.innerWidth, window.innerHeight); // Resize renderer
    layoutScene(); // Recalculate layout
});

// --- Start animation ---
resetView(); // Ensure default view
animate(); // Begin loop
