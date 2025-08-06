
// 3D Javacript Clock using three.js
// MIT License. - Work in Progress using Gemini
// Jeff Miller 2025. 8/6/25

// Import the main three.js library
import * as THREE from 'three'; // Provides core 3D engine functions

// Import auxiliary loaders and controls
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js'; // Loads font data for 3D text
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js'; // Generates 3D text geometry
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js'; // Loads HDR environment maps
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js'; // Loads Wavefront OBJ models
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'; // Adds intuitive camera orbit controls

// --- Declare UI element variables globally ---
let digitalDate; // DOM element for displaying date
let digitalClock; // DOM element for displaying clock
let modeToggleButton; // Button to switch between tilt and orbit modes
let tiltEnabled = true; // Flag tracking whether tilt mode is active
let permissionButton; // Button for requesting iOS tilt permission

// --- 3D Model Variables ---
let clockModel; // Reference to loaded watch model
let modelRotationX = 0, modelRotationY = 0, modelRotationZ = 0; // Tracks model rotation offsets
let modelScale = 3.5; // Uniform scale factor for watch model

// Wheel pivot variables initialized to undefined
let secondWheel, minuteWheel, hourWheel, balanceWheel, escapeWheel, centerWheel, thirdWheel, palletFork, hairSpring;
const balanceWheelSpeedMultiplier = 1.0; // Speed factor for balance wheel oscillation

// --- Wait until DOM is fully loaded ---
window.addEventListener('DOMContentLoaded', () => {
    // Create div elements for digital date and clock displays
    digitalDate = document.createElement('div'); // Container for date text
    digitalClock = document.createElement('div'); // Container for clock text

    // Apply CSS styles to digital date element
    Object.assign(digitalDate.style, {
        position: 'absolute', // Absolute positioning
        bottom: '20px', // 20px from bottom edge
        left: '20px', // 20px from left edge
        color: 'white', // White text color
        fontFamily: '"Courier New", Courier, monospace', // Monospaced font
        fontSize: '1.75em', // Font size
        textShadow: '0 0 8px black', // Soft outer glow
        zIndex: '10' // Render above 3D canvas
    });
    // Apply CSS styles to digital clock element
    Object.assign(digitalClock.style, {
        position: 'absolute', // Absolute positioning
        bottom: '20px', // 20px from bottom edge
        right: '20px', // 20px from right edge
        color: 'white', // White text color
        fontFamily: '"Courier New", Courier, monospace', // Monospaced font
        fontSize: '1.75em', // Font size
        textShadow: '0 0 8px black', // Soft outer glow
        zIndex: '10' // Render above 3D canvas
    });

    // Attach date and clock elements to the document body
    document.body.appendChild(digitalDate);
    document.body.appendChild(digitalClock);

    // --- iOS Tilt Permission Prompt ---
    if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
        // On iOS, require explicit permission for device orientation
        permissionButton = document.createElement('button'); // Create a button for permission
        permissionButton.textContent = 'Enable Tilt'; // Button label
        Object.assign(permissionButton.style, {
            position: 'absolute', // Absolute positioning
            top: '60px', // 60px from top to avoid overlap with modeToggleButton
            left: '50%', // Center horizontally
            transform: 'translateX(-50%)', // Center transform
            padding: '0.5em 1em', // Button padding
            backgroundColor: 'rgba(0, 0, 0, 0.5)', // Semi-transparent background
            color: 'white', // White text
            border: '1px solid white', // White border
            borderRadius: '4px', // Rounded corners
            cursor: 'pointer', // Pointer cursor on hover
            zIndex: '1001' // Render above other UI
        });
        document.body.appendChild(permissionButton); // Add to page
        permissionButton.addEventListener('click', () => {
            // Request orientation permission on button click
            DeviceOrientationEvent.requestPermission()
                .then(response => {
                    if (response === 'granted') {
                        window.addEventListener('deviceorientation', handleOrientation); // Listen for tilt events
                        permissionButton.style.display = 'none'; // Hide button on grant
                    } else {
                        console.warn('Tilt permission denied.'); // Log denial
                    }
                })
                .catch(error => console.error('Error requesting tilt permission:', error)); // Log errors
        });
    } else {
        // Non-iOS or no permission API: enable tilt immediately
        window.addEventListener('deviceorientation', handleOrientation); // Listen for tilt events
    }

    // Create and style the mode toggle button
    modeToggleButton = document.createElement('button'); // Button to switch modes
    modeToggleButton.textContent = 'Switch to Orbit'; // Initial label
    Object.assign(modeToggleButton.style, {
        position: 'absolute', // Absolute positioning
        top: '10px', // 10px from top edge
        left: '50%', // Center horizontally
        transform: 'translateX(-50%)', // Center transform
        padding: '0.5em 1em', // Button padding
        backgroundColor: 'rgba(0, 0, 0, 0.5)', // Semi-transparent background
        color: 'white', // White text color
        border: '1px solid white', // White border
        borderRadius: '4px', // Rounded corners
        cursor: 'pointer', // Pointer cursor on hover
        zIndex: '1001' // Render above other UI
    });
    // Add click handler to toggle between tilt and orbit
    modeToggleButton.addEventListener('click', () => {
        tiltEnabled = !tiltEnabled; // Toggle mode flag
        if (tiltEnabled) {
            controls.enabled = false; // Disable orbit controls in tilt mode
            window.addEventListener('deviceorientation', handleOrientation); // Ensure tilt listener
            modeToggleButton.textContent = 'Switch to Orbit'; // Update button text
            resetView(); // Reset camera and orientation offsets
        } else {
            controls.enabled = true; // Enable orbit controls in orbit mode
            window.removeEventListener('deviceorientation', handleOrientation); // Stop tilt listener
            modeToggleButton.textContent = 'Switch to Tilt'; // Update button text
            resetView(); // Reset camera view
        }
    });
    // Append toggle button to document body
    document.body.appendChild(modeToggleButton);
});

// --- Setup Three.js Scene, Camera, and Renderer ---
const scene = new THREE.Scene(); // Create scene container
const camera = new THREE.PerspectiveCamera(
    50, // Field of view in degrees
    window.innerWidth / window.innerHeight, // Aspect ratio
    1, // Near clipping plane distance
    1000 // Far clipping plane distance
);
const renderer = new THREE.WebGLRenderer({ antialias: true }); // WebGL renderer with antialiasing

// Configure renderer for PBR and proper color/tone mapping
renderer.setPixelRatio(window.devicePixelRatio); // Match screen DPI
renderer.setSize(window.innerWidth, window.innerHeight); // Fullscreen canvas
renderer.outputColorSpace = THREE.SRGBColorSpace; // Correct output color space
renderer.toneMapping = THREE.ACESFilmicToneMapping; // Filmic tone mapping
renderer.toneMappingExposure = 0.8; // Exposure adjustment
renderer.shadowMap.enabled = true; // Enable shadow maps
renderer.shadowMap.type = THREE.PCFSoftShadowMap; // Soft shadows
// Attach renderer canvas to DOM
document.body.appendChild(renderer.domElement);

// --- Orbit Controls Setup ---
const controls = new OrbitControls(camera, renderer.domElement); // Create orbit controls
controls.enableDamping = true; // Enable damping for smoother motion
controls.enabled = false; // Start in tilt mode, so disable orbit

// --- Helper Function: Reset Viewpoint ---
function resetView() {
    camera.position.set(0, 0, 60); // Position camera at z = 60
    camera.lookAt(scene.position); // Point camera at scene center
    controls.reset(); // Reset orbit control state
    tiltX = tiltY = 0; // Reset tilt offsets
    boxGroup.rotation.x = boxGroup.rotation.y = 0; // Reset scene group rotation
}

// --- Loading Manager for Assets ---
const loadingManager = new THREE.LoadingManager(); // Manages asset loading
loadingManager.onLoad = () => {
    console.log('All assets loaded successfully.'); // Log on load complete
    layoutScene(); // Compute initial layout and scaling
};

// --- Load HDR Environment Map ---
const rgbeLoader = new RGBELoader(loadingManager); // HDR loader using loadingManager
rgbeLoader.setPath('textures/'); // Folder for HDR file
rgbeLoader.load('PolyHaven_colorful_studio_2k.hdr', (texture) => {
    texture.mapping = THREE.EquirectangularReflectionMapping; // Enable equirectangular mapping
    scene.environment = texture; // Apply as scene environment
});

// --- Directional Light Setup ---
const dirLight = new THREE.DirectionalLight(0xffffff, 2.5); // Bright white directional light
dirLight.position.set(10, 38, 23); // Place light above and to side
dirLight.castShadow = true; // Enable shadows from this light
const d = 15; // Frustum size for shadow camera
// Configure shadow camera extents
dirLight.shadow.mapSize.width = 2048;
dirLight.shadow.mapSize.height = 2048;
dirLight.shadow.camera.left = -d;
dirLight.shadow.camera.right = d;
dirLight.shadow.camera.top = d;
dirLight.shadow.camera.bottom = -d;
dirLight.shadow.bias = -0.0001; // Prevent shadow acne
dirLight.shadow.normalBias = 0.005; // Improve shadow stability
scene.add(dirLight); // Add light to scene

// --- Visual Helpers for Light ---
const lightSphere = new THREE.Mesh(
    new THREE.SphereGeometry(0.5, 16, 8), // Small sphere geometry
    new THREE.MeshBasicMaterial({ color: 0xffff00 }) // Yellow material
);
lightSphere.position.copy(dirLight.position); // Place sphere at light position
scene.add(lightSphere); // Add sphere to scene
const lightLine = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([dirLight.position.clone(), dirLight.target.position.clone()]), // Line from light to target
    new THREE.LineBasicMaterial({ color: 0xffff00 }) // Yellow line material
);
scene.add(lightLine); // Add line helper

// --- Create Master Group for All 3D Objects ---
const boxGroup = new THREE.Group(); // Top-level group for box and clock
scene.add(boxGroup); // Add to scene root
const clockUnit = new THREE.Group(); // Sub-group for clock components
clockUnit.position.z = 0; // Align at scene origin
boxGroup.add(clockUnit); // Nest clock inside box group

// --- Orientation Event Handler ---
let tiltX = 0, tiltY = 0; // Variables to store device orientation angles
function handleOrientation(event) {
    tiltY = event.beta || 0; // Front-back tilt angle
    tiltX = event.gamma || 0; // Left-right tilt angle
}

// --- Animation Loop ---
function animate() {
    requestAnimationFrame(animate); // Schedule next frame
    controls.update(); // Update orbit controls when enabled

    const maxTilt = 15; // Maximum tilt in degrees
    const x = THREE.MathUtils.clamp(tiltX, -maxTilt, maxTilt); // Clamp gamma
    const y = THREE.MathUtils.clamp(tiltY, -maxTilt, maxTilt); // Clamp beta
    const rotY = THREE.MathUtils.degToRad(x) * 0.5; // Scale tilt to rotation
    const rotX = THREE.MathUtils.degToRad(y) * 0.5;

    boxGroup.rotation.y = rotY; // Apply Y rotation to group
    boxGroup.rotation.x = rotX; // Apply X rotation to group

    const now = new Date(); // Current timestamp
    const seconds = now.getSeconds() + now.getMilliseconds() / 1000; // Fractional seconds
    const minutes = now.getMinutes() + seconds / 60; // Fractional minutes
    const hours = now.getHours() % 12 + minutes / 60; // Fractional hours

    // Rotate clock hands by time fraction
    secondHand.rotation.z = -THREE.MathUtils.degToRad((seconds / 60) * 360);
    minuteHand.rotation.z = -THREE.MathUtils.degToRad((minutes / 60) * 360);
    hourHand.rotation.z = -THREE.MathUtils.degToRad((hours / 12) * 360);

    // Rotate mechanical wheels if model is loaded
    if (secondWheel) secondWheel.rotation.z = -(seconds / 60) * Math.PI * 2;
    if (minuteWheel) minuteWheel.rotation.z = -(minutes / 60) * Math.PI * 2;
    if (hourWheel) hourWheel.rotation.z = -(hours / 12) * Math.PI * 2;
    if (escapeWheel) escapeWheel.rotation.z = ((seconds % 5) / 5) * Math.PI * 2;
    if (centerWheel) centerWheel.rotation.z = (minutes / 60) * Math.PI * 2;
    if (thirdWheel) thirdWheel.rotation.z = ((minutes % 7.5) / 7.5) * Math.PI * 2;
    if (palletFork) palletFork.rotation.z = THREE.MathUtils.degToRad(22) * Math.sin(Date.now() / 1000 * Math.PI * 8);
    if (balanceWheel) {
        const sineValue = Math.sin(Date.now() / 1000 * Math.PI * 2 * (3 * balanceWheelSpeedMultiplier));
        balanceWheel.rotation.z = Math.PI / 2 * sineValue; // Oscillate balance wheel
        if (hairSpring) hairSpring.scale.set(0.95 + 0.35 * sineValue, 0.95 + 0.35 * sineValue, 1); // Animate spring
    }

    renderer.render(scene, camera); // Render the current frame
}

// --- Handle Window Resize Events ---
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight; // Update aspect ratio
    renderer.setSize(window.innerWidth, window.innerHeight); // Resize renderer
    layoutScene(); // Recompute layout and scaling
});

// --- Initialize View and Start Animation ---
resetView(); // Set initial camera and group state
animate(); // Enter render loop
