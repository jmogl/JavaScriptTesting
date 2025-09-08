// 3D Javacript ETA 6497 Clock using three.js
// MIT License. - Work In Progress
// Jeff Miller 2025. 9/7/25

/* References and Notes
- AI Development Support & Debugging: Google Gemini
- HDRI: https://polyhaven.com/a/colorful_studio
- PBR Textures: https://www.cgbookcase.com/
- Modified ETA 6497-1 Watch Movement CAD: Steen Winther: https://grabcad.com/library/eta-6497-1-complete-watch-movement
- ETA 6497 Custom Clock Hands and Clock Case made in Fusion 360
- 5 Hz Tick Sound - Clock Ticking by RedDog0607: https://pixabay.com/sound-effects/clock-ticking-365218/
- Development and Debugging Tools: Google Gemini
- File encoding is set to UF-8
- Local Server: python -m http.server run in a terminal in local javascript directory with index.html
- 	http://localhost:8000 in a local browser tab
- Single click brings up gui
- Zoom, Pan (right mouse button or two finger touch), and rotate are supported
- Slow down time! Note that you either need to reset the clock in the GUI or reload the web page to get accurate time if the beat rate is changed!
*/

/*
To Do:
- Finish textures
- Finish gears anamation
- Add option to "explode parts"
- Fix tilt mode for mobile devices 
- Update Shadow Box to a better texture and more detail
- Add top plate back in and make it transparent when viewed from the front
- Add option for lower poly model to improve frame rate on mobile devices
*/

/*

NOTES (Will eventually move this to the ReadMe file):

- Fusion 360 to .OBJ to Blender to .GLB
	- Note: Use "remove" instead of "delete" when removing F360 bodies and keep the history timeline.
	- Select "Split By Group" when importing into Blender under import file dialog options to keep mesh body names
	- Select Up Axis as -Z and Forward Axis as Y based on the orientation used in F360, may change for other models
	- To increase curve object resolution in Blender:
		- In Object Mode (Drop down upper left), right click part of interest
		- In the GUI menu to the lower right, select the wrench icon and "+ Add Modifier" -> Generate -> Subdivision Surface
			- Select Catmull-Clark for best mesh generation
			- Levels Viewport (Note "Render" is ignored in .GLB export!): 
			- Level 0: Original mesh.
			- Level 1: ~4x the polygons. Great for adding a good degree of smoothness (Recommended for 3.js).
			- Level 2: ~16x the original polygons. Use this with caution for hero objects seen up close.
			- Level 3+: ~64x+ polygons. Avoid this for real-time applications, rarely worth it over level 2
		- A Bevel modifyer needs to be added or mesh detail like edges, emboss, etc. are lost (ie. melt).
			- Ensure the object is selected in Blender
			- Select "Add Modifier" -> "Generate" -> "Bevel"
			- Move the Bevel Modifier above the Subdivision Catmull-Clark modifier. Bevel must be run first!
			- Limit method should be set to "Angle", 30 degrees is default. 
			- Segments should be set to "2"
			- Amount should be changed to a small value (default 0.1 m) to 0.002 m to start with. 
			- Under profile, Shape should be 1.0, which makes the beveled edge bow outward. This creates a tigher "cage" 
			  for the subdivision to work with.
		- If Bevel and Subdivision surface doesn't maintain detail, then try using F360 to export high resolution mesh with tessellate command.
				- Select high quality and export the mesh out as .fbx and import separately into Blender.
				- Use scale 100
				- Exporting .obj instead of .fbx for Movement model file since the axis changed in .fbx. Used .fbx for Case model file.
		- I ultimately converted the case mesh using Tesselation in Fusion 360 to high quality and exported to .OBJ 
  		Note: Be careful using F360 appearance and material properties together. It can create two separate meshes when exporting from Blender
			- *** This may be mute depending on how well custom Blender PBR texture exporting works 

 -	Export .GLB, +Y transform out of Blender and save in three.js folder


- ETA 6497 Watch Movement Notes:
- https://calibercorner.com/unitas-caliber-6497/
- Movement is 36.6mm in diameter and 4.5mm thick
- 18,000 vibrations per hour (VPH) (balance wheel swing)
	- 3600 seconds/hour
	- One tick sound for ballance wheel full swing
	- Tick per second = 18,000 VPH / 3600 sec/hr = 5 ticks per second
- Drive Train
	- Center Wheel: Carries Minute hand and rotates once per hour
		- Driven by the Main Spring Barrel. Cannon Pinon Arbor has gear teeth that is press fit into the center wheel's arbor. 
		  The arbor friction acts as a clutch. When the crown is moved to set the time, the minute wheel is turned. The
		  force applied is enough to overcome friction allowing the pinion to slip and rotate independently on the Center
		  wheel arbor. This allows the hands to move without breaking or backwinding the entire drive train!
	
	- To Do: Add Cannon Pinion Back! (Start over with original model now using .glb!)
	- DriverCannonPinion_Gear_Body for rotation.
	- Small Center Wheel gear rotates with Center Gear. Separated for material color.
	- SecondWheelSmallGear rotates with the second wheel. Silver instead of brass.
	- ThirdWheelBottomGear & ThirdWheelTopGear silver moves with ThirdWheel
	- Third Wheel: Rotates every 7.5 minutes counterclockwise from dial side
	- Fourth Wheel: Carries small seconds hand and rotates once per minute. Also drives the escapement
	- Escape Wheel: Advances by half a tooth per beat (15 teeth), resulting in a full rotation every 5 seconds counter clockwise.
	- Crown Wheel: Used to wind the main spring. Turns with the crown.
	- Hour Wheel rotates 1 revolution every 12 hours (720 min).
	- Minute Wheel: Used to set the time with the crown and also drives the hour hand.
		- Drive rate: cannon pinion rotates 1 rotaton per hour. Gear ratio driven minute wheel 36 teeth / driving gear pinon =3
		- Rotation rate is 1 rev per hour / 3 = 1/3 revolution per hour  **** Need to check or fix
	- Balance Wheel: 270 to 310 degrees, 2.5 Hz or 1 per 0.4 seconds back and forth.
	- Power Flow: Mainspring Barrel (First Wheel) -> Center Wheel -> Third Wheel
	- Time Delay (Locking Phase)
		- Escape wheel is stationary when the pallet fork is at its maximum displacement, which is at:
			- At +1.5 to +2 degrees, one of the pallet jewels (for instance, the entry pallet) is holding 
			an escape wheel tooth, and the fork is resting against one banking pin.
			- At -1.5 to -2 degrees, the other pallet jewel (the exit pallet) is holding the next escape wheel tooth, 
			- and the fork is resting against the opposite banking pin.
		- 1. Start of Cycle (0.0 Seconds): Balance wheel is at its fastest, passing through the center.
			It kicks the pallet fork, unlocking the escape wheel. The escape wheel moves one tooth (impulse), which
			happens almost instantly. The first 0.2 second pause begins. 
		- 2. Mid Cycle (0.2 Seconds): Balance wheel reaches end of its swing and starts back the other way. It passes
			through the center again, kicks the pallet fork, and unlocks the escape wheel again. The escape wheel moves	
			another tooth. This ends the first pause and immediately begins the second 0.2 second pause.
		- 3. End of cycle (0.4 Seconds): Balance wheel reaces the end of its second swing and starts back.
*/

//Load Dependencies

import * as THREE from 'three';
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GUI } from 'three/examples/jsm/libs/lil-gui.module.min.js';

// --- Declare UI element variables in the global scope ---
let digitalDate, digitalClock, fpsCounter; //
let gui; //
let pointerDownTime; //
let pointerDownPos = new THREE.Vector2(); //

// --- Variables for smooth camera reset animation ---
const clock = new THREE.Clock();  //
let isResettingCamera = false; //
const cameraResetTargetPos = new THREE.Vector3(0, 0, 60); //
const cameraResetTargetTarget = new THREE.Vector3(0, 0, 0); //
let isUserInteracting = false; //

// --- Cache variables for light replacement ---
let _lightPosition = new THREE.Vector3();
let _lightTargetPosition = new THREE.Vector3();
let _shadowCameraSettings = {};


const settings = {
    clockRunning: true, //
    showDateTime: false,  //
    tiltEnabled: false, //
    soundEnabled: false, //
    soundVolume: 0.2,   // Default volume
    showFPS: false,  //
    showShadowBox: true, 
    listMeshBodies: false,  //
    beatRate: 5.0,  //
    shadowResolution: 2048, // Default is 2048
    maxPixelRatio: 1.5,
    wireframe: false, // <-- MODIFICATION: Added wireframe setting
    // --- MODIFICATION: Default values set to 0 ---
    startPhaseOffsetDeg: 0.0, // Defaulting to 0 degrees
    escapeWheelOffsetDeg: 0.0, // Defaulting to 0 degrees
    resetCamera: () => { //
        if (isResettingCamera) return; //
        isResettingCamera = true; //
    },
    resetClock: () => { //
        settings.beatRate = 5.0; //
        
        // --- MODIFICATION: Set clock mechanism to a "zero" start position ---
        // This ensures a consistent starting state for gear alignment every time.
        simulatedSeconds = 0;
        simulationTotalTicks = 0;
        
        balanceWheelAngles = { start: null, min: Infinity, max: -Infinity }; //
        
        gui.controllers.forEach(c => { //
            if (c.property === 'beatRate') {
                c.updateDisplay(); //
            }
        });
        
        // Update gears to reflect the zero position immediately
        updateClockGears();
    }
};

// --- 3D Model Variables ---
let clockModel; //
let modelScale = 3.5; //
let secondWheel, minuteWheel, hourWheel, balanceWheel, escapeWheel, centerWheel, thirdWheel, palletFork, hairSpring, secondWheelSmallGear, thirdWheelTopGear; //
let newHourHand, newMinuteHand, newSecondHand; //
let collectedParts = {};  //
let shadowBoxWalls; // This will hold the wall meshes for easy toggling

// --- Simulation State Variables ---
let simulatedSeconds = 0; //
// --- MODIFICATION: Add discrete counter. This is now the SINGLE SOURCE OF TRUTH for time.
let simulationTotalTicks = 0;
// Set the starting direction of the pallet fork: 1 for CCW, -1 for CW.
let palletForkState = -1; //
// Synchronize the balance wheel's starting phase with the pallet fork's state.
// This should be the opposite of palletForkState.
let previousSineValue = -palletForkState; //
let balanceWheelAngles = { start: null, min: Infinity, max: -Infinity }; //
// --- MODIFICATION: Changed from 9 degrees to 5 degrees per user request ---
const PALLET_FORK_ANGLE = THREE.MathUtils.degToRad(5); //
const PALLET_FORK_OFFSET = THREE.MathUtils.degToRad(0); //
// A 15-tooth escape wheel requires 30 beats/steps for a full revolution. (360 / 30 = 12 degrees)
const ESCAPE_WHEEL_STEP = (Math.PI * 2) / 30;  // This is 12 degrees in radians

// --- MODIFICATION: Default offset value set to 0.0 ---
let ESCAPE_WHEEL_OFFSET = 0.0; //
// --- MODIFICATION: Default phase value set to 0.0 ---
let STARTING_PHASE_OFFSET = 0.0;
// This constant defines the canonical time duration of a single tick.
const BEAT_TIME_VALUE = 1.0 / 5.0;  // This is the time (in seconds) per beat/tick

// --- Pallet Fork Animation State ---
let isPalletForkAnimating = false; //
let palletForkAnimStartTime = 0; //
const palletForkAnimDuration = 0.08;  //
let palletForkStartAngle = 0; //
let palletForkTargetAngle = 0; //


// --- Hairspring Animation Variables ---
let hairSpringMesh; //
// hairSpringOriginalPositions is no longer needed; shader uses original geometry attribute
let colletOriginalPos = new THREE.Vector3(); //
let hairspringBounds = { minZ: 0, maxZ: 0 }; //
let maxRadius = 0; //
const hairspringAnimationSettings = { //
    maxAmplitude: 0.22, //
    topWeightMultiplier: 0.59, //
    bottomWeightMultiplier: -0.06 //
};

// --- Web Audio API for gapless looping ---
// --- 1. Create AudioContext and global audio variables ---
let audioContext;
let tickAudioBuffer = null;     // This will hold the decoded sound data
let currentTickSource = null; // This holds the "player" node
let masterGainNode = null;      // This is our persistent volume control

try {
    // Create the global AudioContext and the master GainNode (volume)
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    masterGainNode = audioContext.createGain();
    masterGainNode.gain.value = 0.0; // Start muted
    masterGainNode.connect(audioContext.destination); // Connect gain to speakers ONCE
} catch (e) {
    console.error("Web Audio API is not supported in this browser.");
}

// --- 2. Asynchronously load and decode the audio file ---
if (audioContext) {
    fetch('textures/clock-ticking-5Hz.mp3')
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status} while fetching audio file.`);
            }
            return response.arrayBuffer();
        })
        .then(arrayBuffer => audioContext.decodeAudioData(arrayBuffer))
        .then(decodedData => {
            tickAudioBuffer = decodedData; // Store the high-quality buffer
            console.log("Audio file loaded and decoded successfully (Web Audio API).");
        })
        .catch(e => {
            console.error("--- Audio Load Error (Web Audio) ---");
            console.error("Failed to fetch or decode audio file.", e);
        });
}


// --- Wait for the DOM to be ready, then create and inject UI elements ---
window.addEventListener('DOMContentLoaded', () => { //
    digitalDate = document.createElement('div'); //
    digitalClock = document.createElement('div'); //
    fpsCounter = document.createElement('div'); //


    Object.assign(digitalDate.style, { //
        position: 'absolute', bottom: '20px', left: '20px', //
        color: 'white', fontFamily: '"Courier New", Courier, monospace', //
        fontSize: '1.75em', textShadow: '0 0 8px black', zIndex: '10', //
        display: 'none'  //
    });
    Object.assign(digitalClock.style, { //
        position: 'absolute', bottom: '20px', right: '20px', //
        color: 'white', fontFamily: '"Courier New", Courier, monospace', //
        fontSize: '1.75em', textShadow: '0 0 8px black', zIndex: '10', //
        display: 'none' //
    });
    Object.assign(fpsCounter.style, { //
        position: 'absolute', top: '20px', left: '20px', //
        color: 'white', fontFamily: '"Courier New", Courier, monospace', //
        fontSize: '1.75em', textShadow: '0 0 8px black', zIndex: '10', //
        display: 'none' //
    });

    fpsCounter.style.display = settings.showFPS ? 'block' : 'none';

    document.body.appendChild(digitalDate); //
    document.body.appendChild(digitalClock); //
    document.body.appendChild(fpsCounter); //
    
    // --- GUI Setup ---
    gui = new GUI(); //
    gui.domElement.style.display = 'none'; //

    gui.add(settings, 'clockRunning').name('Run Clock'); //
    gui.add(settings, 'showDateTime').name('Show Date & Time').onChange(value => { //
        digitalDate.style.display = value ? 'block' : 'none'; //
        digitalClock.style.display = value ? 'block' : 'none'; //
    });

    gui.add(settings, 'tiltEnabled').name('Enable Tilt').onChange(value => { //
        if (value) { enableTilt(); } else { disableTilt(); } //
    });

    // --- Sound controls linking to Web Audio API ---
    const soundEnabledController = gui.add(settings, 'soundEnabled').name('Enable Sound');

    // 1. Create the volume slider, link its onChange to the masterGainNode
    const volumeSliderController = gui.add(settings, 'soundVolume', 0.0, 1.0, 0.01).name('').onChange(volumeValue => {
        if (masterGainNode) {
            masterGainNode.gain.value = volumeValue; // Update gain in real-time
        }
    });

    // 2. Hide the volume slider by default
    volumeSliderController.domElement.style.display = settings.soundEnabled ? 'block' : 'none';

    // 3. 'Enable Sound' onChange controls visibility, gain, and starts the master audio loop (once)
    soundEnabledController.onChange(value => { 
        if (value) {
            // User wants sound ON
            volumeSliderController.domElement.style.display = 'block'; // SHOW the slider
            if (masterGainNode) {
                masterGainNode.gain.value = settings.soundVolume; // Set gain to slider value
            }

            // Resume AudioContext if it's suspended (required by browsers)
            if (audioContext && audioContext.state === 'suspended') {
                audioContext.resume(); // This IS the user gesture
            }
            
            // If the audio is loaded BUT not playing yet, create and start the master loop.
            if (tickAudioBuffer && !currentTickSource) {
                currentTickSource = audioContext.createBufferSource();
                currentTickSource.buffer = tickAudioBuffer;
                currentTickSource.loop = true; // This is the GAPLESS loop
                
                // Set initial playback rate to match current slider
                currentTickSource.playbackRate.value = settings.beatRate / 5.0; 

                currentTickSource.connect(masterGainNode); // Connect: Source -> Gain
                currentTickSource.start(0); // Play the loop. It will now run forever.
            }
        } else {
            // User wants sound OFF
            volumeSliderController.domElement.style.display = 'none'; // HIDE the slider
            if (masterGainNode) {
                masterGainNode.gain.value = 0.0; // Just MUTE the loop. It continues silently.
            }
        }
    });

    gui.add(settings, 'showFPS').name('Show FPS').onChange(value => { //
        fpsCounter.style.display = value ? 'block' : 'none'; //
    });
    gui.add(settings, 'showShadowBox').name('Show Shadow Box').onChange(value => {
        if (shadowBoxWalls) {
            shadowBoxWalls.visible = value;
        }
    });
    
    // Added onChange handler to sync beat rate and audio playback rate
    gui.add(settings, 'beatRate', 0.5, 5.0, 0.1).name('Beat Rate / Sec').onChange(newBeatRate => {
        // Check if the audio player (source node) has been created yet
        if (currentTickSource) {
            // Update the playbackRate value based on our formula (5.0 = 100% speed)
            currentTickSource.playbackRate.value = newBeatRate / 5.0;
        }
    });

    // --- MODIFICATION: Added temporary slider for STARTING_PHASE_OFFSET ---
    // --- MODIFICATION: Slider logic simplified. It only sets global variables. ---
    // --- The animate() loop now does all calculations every frame, preventing conflicts. ---
    gui.add(settings, 'startPhaseOffsetDeg', 0.0, 180.0, 0.1).name('Start Phase (Deg)').onChange(degrees => {
        STARTING_PHASE_OFFSET = THREE.MathUtils.degToRad(degrees);
        const newStartSineVal = Math.sin(STARTING_PHASE_OFFSET);
        previousSineValue = newStartSineVal;
        palletForkState = (newStartSineVal >= 0) ? -1 : 1; // Update global state
        
        // Set pallet fork mesh position (this is still needed)
        if (palletFork) {
             palletFork.rotation.z = (PALLET_FORK_ANGLE * palletForkState) + PALLET_FORK_OFFSET;
        }
        // NO escape wheel logic needed here. updateClockGears() will handle on next tick.
        // But we need to update the alignment *now*.
        updateClockGears();
    });
    // --- END MODIFICATION ---

    // --- MODIFICATION: Added temporary slider for ESCAPE_WHEEL_OFFSET ---
    // --- MODIFICATION: Slider logic simplified to only set the global offset variable. ---
    gui.add(settings, 'escapeWheelOffsetDeg', 0.0, 180.0, 0.1).name('Escape Wheel Offset').onChange(degrees => {
        // Just update the global variable. 
        ESCAPE_WHEEL_OFFSET = THREE.MathUtils.degToRad(degrees);
        // Call updateClockGears() to reflect the change immediately without waiting for a tick
        updateClockGears();
    });
    // --- END MODIFICATION ---

    gui.add(settings, 'resetClock').name('Reset Clock'); //
    gui.add(settings, 'resetCamera').name('Reset Camera'); //

    // --- Performance Settings Sub-Menu ---
    const performanceFolder = gui.addFolder('Performance Settings');
    
    performanceFolder.add(settings, 'shadowResolution', { 
        'Low (1024x1024)': 1024, 
        'High (2048x2048)': 2048,
        'Ultra (4096x4096)': 4096
    }).name('Shadow Resolution').onChange(value => {
        
        const resolution = parseInt(value);

        if (dirLight && resolution === dirLight.shadow.mapSize.width) {
            return;
        }

        // --- THE "NUKE AND REBUILD" FIX ---
        if (dirLight) {
            if (dirLight.shadow.map) {
                dirLight.shadow.map.dispose();
            }
            scene.remove(dirLight.target);
            scene.remove(dirLight);
        }
        const newLight = new THREE.DirectionalLight(0xffffff, 2.5);
        newLight.position.copy(_lightPosition);
        newLight.castShadow = true;
        newLight.shadow.mapSize.width = resolution;
        newLight.shadow.mapSize.height = resolution;
        newLight.shadow.bias = -0.001;
        newLight.shadow.normalBias = 0.01;
        newLight.shadow.camera.left = _shadowCameraSettings.left;
        newLight.shadow.camera.right = _shadowCameraSettings.right;
        newLight.shadow.camera.top = _shadowCameraSettings.top;
        newLight.shadow.camera.bottom = _shadowCameraSettings.bottom;
        newLight.shadow.camera.near = _shadowCameraSettings.near;
        newLight.shadow.camera.far = _shadowCameraSettings.far;
        newLight.shadow.camera.updateProjectionMatrix();
        scene.add(newLight);
        newLight.target.position.copy(_lightTargetPosition);
        scene.add(newLight.target);
        dirLight = newLight;
        boxGroup.traverse((node) => {
            if (node.isMesh && node.material) {
                if (Array.isArray(node.material)) {
                    node.material.forEach(mat => mat.needsUpdate = true);
                } else {
                    node.material.needsUpdate = true;
                }
            }
        });
    });

    performanceFolder.add(settings, 'maxPixelRatio', 0.5, 2.0, 0.1).name('Pixel Ratio Cap').onChange(value => {
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, value));
    });

    // --- MODIFICATION: Added Wireframe Toggle ---
    performanceFolder.add(settings, 'wireframe').name('Show Wireframe').onChange(value => {
        // Traverse all meshes and update their material's wireframe property
        // boxGroup contains the clock and the shadow box, so this covers everything
        boxGroup.traverse((node) => {
            if (node.isMesh && node.material) {
                if (Array.isArray(node.material)) {
                    // Handle meshes with multiple materials
                    node.material.forEach(mat => mat.wireframe = value);
                } else {
                    // Handle single material
                    node.material.wireframe = value;
                }
            }
        });
    });
    // --- END MODIFICATION ---

    // --- Console Log Sub-Menu ---
    const consoleFolder = gui.addFolder('Console Log Outputs'); //
    consoleFolder.close(); //
    const listMeshesController = consoleFolder.add(settings, 'listMeshBodies').name('List All Mesh Bodies'); //
    listMeshesController.onChange(value => { //
        if (value) { //
            if (clockModel && Object.keys(collectedParts).length > 0) { //
                console.log("--- All Mesh Bodies in GLTF Model ---"); //
                const meshNames = Object.keys(collectedParts).sort(); //
                meshNames.forEach(name => console.log(name)); //
                console.log(`--- Total: ${meshNames.length} meshes ---`); //
            } else {
                console.warn("Model not yet loaded. Cannot list mesh bodies."); //
            }
            setTimeout(() => { //
                settings.listMeshBodies = false; //
                listMeshesController.updateDisplay(); //
            }, 200); //
        }
    });
    
    // Listeners for GUI toggle
    window.addEventListener('mousedown', onPointerDown); //
    window.addEventListener('mouseup', onPointerUp); //
    window.addEventListener('touchstart', onPointerDown, { passive: true }); //
    window.addEventListener('touchend', onPointerUp); //

    function onPointerDown(event) { //
        const pointer = event.touches ? event.touches[0] : event; //
        pointerDownTime = Date.now(); //
        pointerDownPos.set(pointer.clientX, pointer.clientY); //
    }

    function onPointerUp(event) { //
        if (!pointerDownTime) return; //

        const isTouchEvent = !!event.changedTouches; //
        const pointer = isTouchEvent ? event.changedTouches[0] : event; //

        const duration = Date.now() - pointerDownTime; //
        const distance = pointerDownPos.distanceTo(new THREE.Vector2(pointer.clientX, pointer.clientY)); //
        
        pointerDownTime = null; //

        if (duration < 200 && distance < 15) { //
            if (gui.domElement.contains(pointer.target)) return; //
            
            if (isTouchEvent) { //
                event.preventDefault(); //
            }
            
            gui.domElement.style.display = (gui.domElement.style.display === 'none') ? 'block' : 'none'; //
        }
    }

    // Initialize clock
    settings.resetClock(); //
    updateClockGears(); // Run once on init to set all gears
});

// --- Scene Setup ---
const scene = new THREE.Scene(); //
const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 1, 1000); //
const renderer = new THREE.WebGLRenderer({ antialias: true }); //

// Set pixel ratio based on the settings object for performance tuning.
renderer.setPixelRatio(Math.min(window.devicePixelRatio, settings.maxPixelRatio)); // Original was window.devicePixelRatio
renderer.setSize(window.innerWidth, window.innerHeight); //
renderer.outputColorSpace = THREE.SRGBColorSpace; //
renderer.toneMapping = THREE.ACESFilmicToneMapping; //
renderer.toneMappingExposure = 0.7; //
renderer.shadowMap.enabled = true; //
renderer.shadowMap.type = THREE.VSMShadowMap; //
document.body.appendChild(renderer.domElement); //

const controls = new OrbitControls(camera, renderer.domElement); //
controls.enableDamping = true; //

controls.addEventListener('start', () => { //
    isUserInteracting = true; //
    isResettingCamera = false; //
});
controls.addEventListener('end', () => { //
    isUserInteracting = false; //
});

const loadingManager = new THREE.LoadingManager(); //
loadingManager.onLoad = () => { //
    console.log("All assets loaded successfully."); //
    layoutScene(); //
};

const rgbeLoader = new RGBELoader(loadingManager).setPath('textures/'); //
rgbeLoader.load('PolyHaven_colorful_studio_2k.hdr', (texture) => { //
    texture.mapping = THREE.EquirectangularReflectionMapping; //
    scene.environment = texture; //
});

let dirLight = new THREE.DirectionalLight(0xffffff, 2.5); // Changed to let
dirLight.position.set(10, 28, 25); //
dirLight.castShadow = true; //
// Set initial shadow resolution from the settings object
dirLight.shadow.mapSize.width = settings.shadowResolution; 
dirLight.shadow.mapSize.height = settings.shadowResolution; 
const d = 15; //
dirLight.shadow.camera.left = -d; //
dirLight.shadow.camera.right = d; //
dirLight.shadow.camera.top = d; //
dirLight.shadow.camera.bottom = -d; //
dirLight.shadow.bias = -0.001; //
dirLight.shadow.normalBias = 0.01; //
scene.add(dirLight); //
scene.add(dirLight.target); //

// --- Create a master "clockUnit" group ---
const clockUnit = new THREE.Group(); //
clockUnit.position.z = 0; //

const zShift = 1.0; //

// --- PBR Material Definitions ---
const textureLoader = new THREE.TextureLoader(loadingManager).setPath('textures/'); //
const woodBaseColor = textureLoader.load('Wood03_2K_BaseColor.png'); //
const woodNormal = textureLoader.load('Wood03_2K_Normal.png'); //
const woodRoughness = textureLoader.load('Wood03_2K_Roughness.png'); //
const woodHeight = textureLoader.load('Wood03_2K_Height.png'); //
woodBaseColor.colorSpace = THREE.SRGBColorSpace; //
const wallMaterial = new THREE.MeshStandardMaterial({ //
    map: woodBaseColor, normalMap: woodNormal, roughnessMap: woodRoughness, //
    displacementMap: woodHeight, displacementScale: 0.05 //
});
const steelBaseColor = textureLoader.load('BrushedIron02_2K_BaseColor.png'); //
const steelNormal = textureLoader.load('BrushedIron02_2K_Normal.png'); //
const steelRoughness = textureLoader.load('BrushedIron02_2K_Roughness.png'); //
steelBaseColor.colorSpace = THREE.SRGBColorSpace; //
const steelTextures = [steelBaseColor, steelNormal, steelRoughness]; //
steelTextures.forEach(texture => { //
    texture.wrapS = THREE.RepeatWrapping; //
    texture.wrapT = THREE.RepeatWrapping; //
});
const brushedSteelMaterial = new THREE.MeshStandardMaterial({ //
    map: steelBaseColor, normalMap: steelNormal, roughnessMap: steelRoughness, //
    metalness: 0.9, roughness: 0.4, color: 0xe0e0e0 //
});

// --- MODIFICATION START: Reverted materials back to their intended (non-debug) properties ---
const lightBrushedSteelMaterial = new THREE.MeshStandardMaterial({
    map: steelBaseColor,        // Use the same texture
    normalMap: steelNormal,     // Use the same normal map
    roughnessMap: steelRoughness, // Use the same roughness map
    metalness: 1.0,             // This is the intended value
    roughness: 0.15,            // This is the intended value
    color: 0xe0e0e0,            // Keep the same base color
    normalScale: new THREE.Vector2(0.3, 0.3) // This is the intended value
});

const mediumBrushedSteelMaterial = new THREE.MeshStandardMaterial({
    map: steelBaseColor,        // Use the same texture
    normalMap: steelNormal,     // Use the same normal map
    roughnessMap: steelRoughness, // Use the same roughness map
    metalness: 0.95,            // This is the intended value
    roughness: 0.3375,          // This is the intended value
    color: 0xe0e0e0,            // Keep the same base color
    normalScale: new THREE.Vector2(1.0, 1.0) // This is the intended value
});
// --- MODIFICATION END ---

function cloneMaterialWithTextures(material) { //
    const newMaterial = material.clone(); //
    newMaterial.map = material.map.clone(); //
    newMaterial.normalMap = material.normalMap.clone(); //
    newMaterial.roughnessMap = material.roughnessMap.clone(); //
    newMaterial.displacementMap = material.displacementMap.clone(); //
    return newMaterial; //
}
const topBottomMaterial = cloneMaterialWithTextures(wallMaterial); //
const leftRightMaterial = cloneMaterialWithTextures(wallMaterial); //
const allWallTextures = [ //
    wallMaterial.map, wallMaterial.normalMap, wallMaterial.roughnessMap, wallMaterial.displacementMap, //
    topBottomMaterial.map, topBottomMaterial.normalMap, topBottomMaterial.roughnessMap, topBottomMaterial.displacementMap, //
    leftRightMaterial.map, leftRightMaterial.normalMap, leftRightMaterial.roughnessMap, leftRightMaterial.displacementMap //
];
allWallTextures.forEach(texture => { //
    texture.wrapS = THREE.RepeatWrapping; //
    texture.wrapT = THREE.RepeatWrapping; //
});
const wallGeometry = new THREE.PlaneGeometry(1, 1, 100, 100); //
const wall = new THREE.Mesh(wallGeometry, wallMaterial); //
wall.receiveShadow = true; //
const wallThickness = 0.01; //
const boxGroup = new THREE.Group(); //
scene.add(boxGroup); //
// Create a new group for the shadow box walls. This allows us to toggle
// their visibility from the GUI for performance.
shadowBoxWalls = new THREE.Group();
boxGroup.add(shadowBoxWalls);
boxGroup.add(clockUnit); // Add the clock itself to the main group
shadowBoxWalls.add(wall); // Add the back wall to our new group
const topWall = new THREE.Mesh(new THREE.BoxGeometry(1, 1, wallThickness), topBottomMaterial); //
const bottomWall = new THREE.Mesh(new THREE.BoxGeometry(1, 1, wallThickness), topBottomMaterial); //
const leftWall = new THREE.Mesh(new THREE.BoxGeometry(1, 1, wallThickness), leftRightMaterial); //
// --- MODIFICATION: Fixed typo from rightRightMaterial to leftRightMaterial ---
const rightWall = new THREE.Mesh(new THREE.BoxGeometry(1, 1, wallThickness), leftRightMaterial); //
[topWall, bottomWall, leftWall, rightWall].forEach(w => { //
    w.castShadow = true; //
    w.receiveShadow = true; //
    shadowBoxWalls.add(w); // Add the four side walls to our new group
});

// --- Materials for GLB parts ---
// --- MODIFICATION: Changed brassMaterial color from 0xED9149 (reddish) to 0xEEC94D (gold) ---
const brassMaterial = new THREE.MeshStandardMaterial({ color: 0xEEC94D, metalness: 0.95, roughness: 0.1 }); //
const blackAluminumMaterial = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, metalness: 0.6, roughness: 0.4 }); //
const lumeMaterial = new THREE.MeshStandardMaterial({ color: 0x90ee90, emissive: 0x90ee90, emissiveIntensity: 0.6, roughness: 0.8, transparent: true, opacity: 0.5 }); //
const polishedAluminumMaterial = new THREE.MeshStandardMaterial({ color: 0xe5e5e5, metalness: 0.98, roughness: 0.1 }); //
const purpleSapphireMaterial = new THREE.MeshStandardMaterial({ //
    color: 0x6A0DAD, // Deep purple color
    metalness: 0.1, //
    roughness: 0.05, //
    ior: 1.77, // Index of Refraction for sapphire
    transmission: 1.0, // Allow light to pass through
    transparent: true, //
    opacity: 0.75, //
    depthWrite: false // Helps with rendering transparent objects correctly
});


// --- GLB Model Loader ---
const gltfLoader = new GLTFLoader(loadingManager); //
gltfLoader.setPath('textures/').load('ETA6497-1.glb', (gltf) => { //
    clockModel = gltf.scene || gltf.scenes[0]; //
    if (!clockModel) { //
        console.error("GLTFLoader Error: Could not find a valid scene in the GLB file."); //
        return; //
    }
    clockUnit.add(clockModel); //
    clockModel.position.set(0, 0, -4.0 + zShift); //
    clockModel.rotation.set(0, 0, 0); //
    clockModel.scale.set(modelScale, modelScale, modelScale); //
    
    clockModel.traverse(child => { //
        if (child.isMesh) { //
            child.castShadow = true; //
            child.receiveShadow = true; //
            collectedParts[child.name] = child; //
        }
    });
    newHourHand = new THREE.Group(); //
    newMinuteHand = new THREE.Group(); //
    newSecondHand = new THREE.Group(); //
    const hourOuter = collectedParts['HourHandOuterBody']; //
    const hourLume = collectedParts['HourHandLumeBody']; //
    if (hourOuter) newHourHand.add(hourOuter); //
    if (hourLume) newHourHand.add(hourLume); //
    const minuteOuter = collectedParts['MinuteHandOuterBody']; //
    const minuteLume = collectedParts['MinuteHandLumeBody']; //
    if (minuteOuter) newMinuteHand.add(minuteOuter); //
    if (minuteLume) newMinuteHand.add(minuteLume); //
    const secondOuter = collectedParts['SecondsHandOuterBody']; //
    const secondLume = collectedParts['SecondsHandLumeBody']; //
    if (secondOuter) newSecondHand.add(secondOuter); //
    if (secondLume) newSecondHand.add(secondLume); //
    clockModel.add(newHourHand); //
    clockModel.add(newMinuteHand); //
    for (const name in collectedParts) { //
        const part = collectedParts[name]; //
        if (name.startsWith('HourHandOuterBody') || name.startsWith('MinuteHandOuterBody') || name.startsWith('SecondsHandOuterBody')) { part.material = blackAluminumMaterial; } //
        else if (name.startsWith('HourHandLumeBody') || name.startsWith('MinuteHandLumeBody') || name.startsWith('SecondsHandLumeBody') || name.includes('PipLumeBody')) { part.material = lumeMaterial; } //
        else if (name.includes('Jewel')) { //
            part.material = purpleSapphireMaterial; //
        }
        // --- MODIFICATION: Assign materials to case parts (removed geometry calculations) ---
        else if (name === 'CaseCenterRingBody' || name === 'CaseCrownClipBase' || name === 'CaseCrownClipRing') {
            // NOTE: Removed computeVertexNormals/computeTangents. Textures will only 
            // appear if the model parts have UV coordinates from the export.
            part.material = lightBrushedSteelMaterial; // Apply light material
        }
        else if (name === 'CaseBottomBody' || name === 'CaseTopBody') {
            // NOTE: Removed computeVertexNormals/computeTangents.
            part.material = mediumBrushedSteelMaterial; // Apply new medium material
        }
        // --- MODIFICATION END ---
        else if ([ //
            'BalancingBridgeBody', 'BarrelBridge_Body', 'BarrelDrum_Gear_Body', //
            'PalletBridgeBody', 'RollerTable', 'TrainWheelBridgeBody' //
        ].includes(name)) { 
            part.material = brushedSteelMaterial;  // THIS IS THE WORKING CONTROL GROUP
        }
        // --- MODIFICATION: Removed 'HairSpringBody' from this list (it's now brass/gold) ---
        else if ([ //
            'BarrelArborBody', 'BarrelMainSpringBody', 'ClickBody', 'CrownWheelBody', //
            'DriverCannonPinion_Gear_Body', 'Incabloc1_1', 'Incabloc1_Base', //
            'Incabloc2_2', 'IncablocDisc_2', 'PalletForkBody', 'RatchetWheelBody', //
            'RegulatorCurvePin_1', 'RegulatorCurvePin_2', 'RegulatorPiece1_Body', 'RegulatorPiece2_Body', //
            'RegulatorPiece3_Body', 'SettingLeverJumperBody', 'SettingLever_Body', 'SettingWheelBody', //
            'SlidingPinion', 'WindingKnob', 'WindingPinion', 'WindingStem', 'YokeBody' //
        ].includes(name)) { 
            part.material = polishedAluminumMaterial;  //
        }
        else if (name.includes('Screw')) { //
            part.material = polishedAluminumMaterial; //
        }
        // --- MODIFICATION: Added 'HairSpringBody' to this list to apply the (new gold) brassMaterial ---
        else if (['SecondWheel', 'Minute_Wheel_Body', 'HourWheel_Body', 'EscapeWheelBody', 'CenterWheelBody', 'ThirdWheelBody', 'BalanceWheelBody', 'SecondWheelSmallGear', 'ThirdWheelTopGear', 'HairSpringBody'].includes(name) || name.includes('PipOuter')) { part.material = brassMaterial; } //
    }
    const palletBridgeMesh = collectedParts['PalletBridgeBody']; //
    if (palletBridgeMesh) { //
        const transparentMaterial = palletBridgeMesh.material.clone(); //
        transparentMaterial.transparent = true; //
        transparentMaterial.opacity = 0.5; //
        palletBridgeMesh.material = transparentMaterial; //
    }
    const partsToPivot = [ 'SecondWheel', 'Minute_Wheel_Body', 'HourWheel_Body', 'BalanceWheelBody', 'EscapeWheelBody', 'CenterWheelBody', 'ThirdWheelBody', 'HairSpringBody', 'SecondWheelSmallGear', 'ThirdWheelTopGear' ]; //
    
    partsToPivot.forEach(name => { //
        const part = collectedParts[name]; //
        if (part) { //
            if (name === 'HairSpringBody') { //
                hairSpringMesh = part; //
                const positions = part.geometry.attributes.position.array; //
                const vertexCount = positions.length / 3; //
                let tempVertex = new THREE.Vector3(); //
                part.geometry.computeBoundingBox(); //
                part.geometry.boundingBox.getCenter(colletOriginalPos); //
                hairspringBounds.minZ = part.geometry.boundingBox.min.z; //
                hairspringBounds.maxZ = part.geometry.boundingBox.max.z; //
                let trueMaxRadius = 0;
                for (let i = 0; i < vertexCount; i++) {
                    tempVertex.set(positions[i * 3], positions[i * 3 + 1], positions[i * 3 + 2]); //
                    const radius = tempVertex.distanceTo(colletOriginalPos); //
                    if (radius > trueMaxRadius) {
                        trueMaxRadius = radius; //
                    }
                }
                maxRadius = trueMaxRadius; //

                // --- MODIFICATION: This now clones the brassMaterial assigned earlier
                const hairspringMaterial = part.material.clone();
                hairSpringMesh.material = hairspringMaterial;

                const hairspringUniforms = {
                    u_sineValue: { value: 0.0 },
                    u_colletOriginalPos: { value: colletOriginalPos }, //
                    u_maxRadius: { value: maxRadius }, //
                    u_hairspringBoundsZ: { value: new THREE.Vector2(hairspringBounds.minZ, hairspringBounds.maxZ) }, //
                    u_weightMultipliers: { value: new THREE.Vector2(hairspringAnimationSettings.bottomWeightMultiplier, hairspringAnimationSettings.topWeightMultiplier) }, //
                    u_maxAmplitude: { value: hairspringAnimationSettings.maxAmplitude } //
                };

                hairspringMaterial.onBeforeCompile = (shader) => {
                    Object.assign(shader.uniforms, hairspringUniforms);

                    shader.vertexShader = `
                        uniform float u_sineValue;
                        uniform vec3 u_colletOriginalPos;
                        uniform float u_maxRadius;
                        uniform vec2 u_hairspringBoundsZ; // .x = minZ, .y = maxZ
                        uniform vec2 u_weightMultipliers; // .x = bottom, .y = top
                        uniform float u_maxAmplitude;
                    ` + shader.vertexShader;

                    shader.vertexShader = shader.vertexShader.replace(
                        '#include <begin_vertex>',
                        `
                        #include <begin_vertex>
                        
                        float dist_c = distance(transformed, u_colletOriginalPos);
                        float radial_weight = dist_c / u_maxRadius;
                        
                        float z_range = u_hairspringBoundsZ.y - u_hairspringBoundsZ.x;
                        float vertical_multiplier = 0.0;

                        if (z_range > 0.001) {
                            float normalized_z = 1.0 - ((transformed.z - u_hairspringBoundsZ.x) / z_range);
                            vertical_multiplier = mix(u_weightMultipliers.x, u_weightMultipliers.y, normalized_z);
                        }

                        float weight = clamp(radial_weight * vertical_multiplier, 0.0, 1.0);
                        float finalAmplitude = u_sineValue * u_maxAmplitude * weight;
                        
                        vec3 displacementDirection = vec3(0.0);
                        if (dist_c > 0.001) {
                            displacementDirection = normalize(transformed - u_colletOriginalPos);
                        }

                        transformed.x += displacementDirection.x * finalAmplitude;
                        transformed.z += displacementDirection.z * finalAmplitude; 
                        `
                    );

                    hairSpringMesh.userData.shader = shader;
                };
            }
            const center = new THREE.Vector3(); //
            new THREE.Box3().setFromObject(part).getCenter(center); //
            const pivot = new THREE.Group(); //
            part.parent.add(pivot); //
            pivot.position.copy(center); //
            pivot.add(part); //
            part.position.sub(center); //
            switch (name) { //
                case 'SecondWheel': secondWheel = pivot; break; //
                case 'Minute_Wheel_Body': minuteWheel = pivot; break; //
                case 'HourWheel_Body': hourWheel = pivot; break; //
                case 'BalanceWheelBody': //
                    balanceWheel = pivot; //
                    const rollerJewelMesh = collectedParts['RollerJewel']; //
                    if (rollerJewelMesh) { //
                        pivot.add(rollerJewelMesh); //
                        rollerJewelMesh.position.sub(center); //
                    }
                    break;
                case 'EscapeWheelBody': escapeWheel = pivot; break; //
                case 'CenterWheelBody': centerWheel = pivot; break; //
                case 'ThirdWheelBody': thirdWheel = pivot; break; //
                case 'HairSpringBody': hairSpring = pivot; break; //
                case 'SecondWheelSmallGear': secondWheelSmallGear = pivot; break; //
                case 'ThirdWheelTopGear': thirdWheelTopGear = pivot; break; //
            }
        }
    });

    const palletForkBodyMesh = collectedParts['PalletForkBody']; //
    const palletJewelBodyMesh = collectedParts['Plate_Jewel_Body']; //
    if (palletForkBodyMesh && palletJewelBodyMesh) { //
        const jewelCenter = new THREE.Vector3(); //
        new THREE.Box3().setFromObject(palletJewelBodyMesh).getCenter(jewelCenter); //
        const pivot = new THREE.Group(); //
        palletForkBodyMesh.parent.add(pivot); //
        pivot.position.copy(jewelCenter); //
        if (collectedParts['PalletForkJewel1']) pivot.add(collectedParts['PalletForkJewel1']); //
        if (collectedParts['PalletForkJewel2']) pivot.add(collectedParts['PalletForkJewel2']); //
        pivot.add(palletForkBodyMesh); //
        pivot.children.forEach(child => child.position.sub(jewelCenter)); //
        palletFork = pivot; //
        // --- MODIFICATION: Reverted to original. Offset is now handled by sine wave phase shift. ---
        palletFork.rotation.z = PALLET_FORK_ANGLE * palletForkState; //
    }

    if (escapeWheel) { //
        escapeWheel.rotation.z = ESCAPE_WHEEL_OFFSET * palletForkState; //
    }

    if (secondWheel) { //
        const pivot = new THREE.Group(); //
        clockModel.add(pivot); //
        const center = new THREE.Vector3(); //
        new THREE.Box3().setFromObject(secondWheel).getCenter(center); //
        pivot.position.copy(center); //
        pivot.add(newSecondHand); //
        newSecondHand.position.sub(center); //
        newSecondHand = pivot; //
    }
});

// --- RE-USABLE VECTORS FOR ANIMATION LOOP ---
const p_orig = new THREE.Vector3(); //
const displacementDirection = new THREE.Vector3(); //

// --- MODIFICATION: Function to update all gear rotations based on a discrete tick ---
function updateClockGears() {
    
    // --- MODIFICATION: Single Source of Truth ---
    // ALL time/rotation is derived from the discrete tick counter.
    const totalTicks = simulationTotalTicks;
    // Derive master "sim time" ONLY from ticks * constant beat value (0.2s).
    // This ensures all gear ratios, hands, and displays are always mechanically synced.
    // The "slow mo" effect happens because ticks occur less frequently in real-time.
    const simulatedSeconds = totalTicks * BEAT_TIME_VALUE; 
    
    const simulatedMinutes = simulatedSeconds / 60.0;
    const simulatedHours = simulatedSeconds / 3600.0; 
    
    // Drive ALL hands AND gears from this single, unified time source.
    const secondHandRotation = -((simulatedSeconds / 60.0) * Math.PI * 2); // CCW
    if (newSecondHand) newSecondHand.rotation.z = secondHandRotation; 
    if (secondWheel) secondWheel.rotation.z = secondHandRotation; 
    if (secondWheelSmallGear) secondWheelSmallGear.rotation.z = secondHandRotation; 
    
    const minuteHandRotation = -((simulatedMinutes / 60.0) * Math.PI * 2);
    if (newMinuteHand) newMinuteHand.rotation.z = minuteHandRotation; 
    if (minuteWheel) minuteWheel.rotation.z = -minuteHandRotation; // CW
    if (centerWheel) centerWheel.rotation.z = minuteHandRotation; // CCW
    
    if (thirdWheel) thirdWheel.rotation.z = ((simulatedMinutes / 7.5) * Math.PI * 2); // CW
    if (thirdWheelTopGear) thirdWheelTopGear.rotation.z = -((simulatedMinutes / 7.5) * Math.PI * 2); // CCW

    const hourHandRotation = -(((simulatedHours % 12) / 12.0) * Math.PI * 2);
    if (newHourHand) newHourHand.rotation.z = hourHandRotation; 
    if (hourWheel) hourWheel.rotation.z = -hourHandRotation; // CW

    // --- THIS IS THE FINAL CORRECT LOGIC ---
    if (escapeWheel) {
        // Base offset (from slider) is constant and does not flip.
        const baseRotation = ESCAPE_WHEEL_OFFSET; 
        
        // Escape wheel is also driven by the master totalTicks counter.
        // This ensures its 10:1 ratio with the secondWheel is ALWAYS preserved.
        const trueRotation = totalTicks * ESCAPE_WHEEL_STEP;

        // Final position is the sum of the constant base offset and the accumulated tick rotation.
        escapeWheel.rotation.z = baseRotation + trueRotation;
    }
}
// --- END MODIFICATION ---

// --- SCENE LAYOUT AND UTILITY FUNCTIONS ---
function layoutScene() { //
    camera.position.z = 60; //
    camera.updateProjectionMatrix(); //
    const boxDepth = 8.5; //
    const backWallZ = -boxDepth; //
    const wallCenterZ = -boxDepth / 2; //
    const boxFrontZ = 0.0; //
    const fov = camera.fov * (Math.PI / 180); //
    const viewPlaneDistance = camera.position.z - boxFrontZ; //
    const viewPlaneHeight = 2 * Math.tan(fov / 2) * viewPlaneDistance; //
    const viewPlaneWidth = viewPlaneHeight * camera.aspect; //
    const backPlaneDistance = camera.position.z - backWallZ; //
    const backPlaneHeight = 2 * Math.tan(fov / 2) * backPlaneDistance; //
    const backPlaneWidth = backPlaneHeight * camera.aspect; //
    const unitsPerTexture = 15; //
    const wallTextures = [wallMaterial.map, wallMaterial.normalMap, wallMaterial.roughnessMap, wallMaterial.displacementMap]; //
    const tbTextures = [topBottomMaterial.map, topBottomMaterial.normalMap, topBottomMaterial.roughnessMap, topBottomMaterial.displacementMap]; //
    const lrTextures = [leftRightMaterial.map, leftRightMaterial.normalMap, leftRightMaterial.roughnessMap, leftRightMaterial.displacementMap]; //
    wallTextures.forEach(t => t.repeat.set(backPlaneWidth / unitsPerTexture, backPlaneHeight / unitsPerTexture)); //
    tbTextures.forEach(t => t.repeat.set(viewPlaneWidth / unitsPerTexture, boxDepth / unitsPerTexture)); //
    lrTextures.forEach(t => t.repeat.set(boxDepth / unitsPerTexture, viewPlaneHeight / unitsPerTexture)); //
    wall.position.z = backWallZ; //
    wall.scale.set(backPlaneWidth, backPlaneHeight, 1); //
    topWall.scale.set(viewPlaneWidth, boxDepth, 1); //
    topWall.position.set(0, viewPlaneHeight / 2, wallCenterZ); //
    topWall.rotation.set(Math.PI / 2, 0, 0); //
    bottomWall.scale.set(viewPlaneWidth, boxDepth, 1); //
    bottomWall.position.set(0, -viewPlaneHeight / 2, wallCenterZ); //
    bottomWall.rotation.set(-Math.PI / 2, 0, 0); //
    leftWall.scale.set(boxDepth, viewPlaneHeight, 1); //
    leftWall.position.set(-viewPlaneWidth / 2, 0, wallCenterZ); //
    leftWall.rotation.set(0, Math.PI / 2, 0); //
    rightWall.scale.set(boxDepth, viewPlaneHeight, 1); //
    rightWall.position.set(viewPlaneWidth / 2, 0, wallCenterZ); //
    rightWall.rotation.set(0, -Math.PI / 2, 0); //
    const clockNativeDiameter = 22; //
    const padding = 5; //
    const availableWidth = viewPlaneWidth - (padding * 2); //
    const availableHeight = viewPlaneHeight - (padding * 2); //
    const scale = Math.min(availableWidth, availableHeight) / clockNativeDiameter; //
    clockUnit.scale.set(scale, scale, scale); //
    const shadowVolumeBox = new THREE.Box3().setFromObject(boxGroup); //
    const shadowVolumeCenter = new THREE.Vector3(); //
    shadowVolumeBox.getCenter(shadowVolumeCenter); //
    const shadowVolumeRadius = shadowVolumeBox.getSize(new THREE.Vector3()).length() / 2; //
	const paddedRadius = shadowVolumeRadius * 1.2; //
    const lightPositionOffset = { x: 10, y: 28, z: 25 }; //
    dirLight.target.position.copy(shadowVolumeCenter); //
    dirLight.position.set( //
        shadowVolumeCenter.x + lightPositionOffset.x, //
        shadowVolumeCenter.y + lightPositionOffset.y, //
        shadowVolumeCenter.z + lightPositionOffset.z //
    );
    dirLight.target.updateMatrixWorld(); //
    dirLight.shadow.camera.left = -paddedRadius; //
    dirLight.shadow.camera.right = paddedRadius; //
    dirLight.shadow.camera.top = paddedRadius; //
    dirLight.shadow.camera.bottom = -paddedRadius; //
    const lightDistanceToCenter = dirLight.position.distanceTo(shadowVolumeCenter); //
    dirLight.shadow.camera.near = Math.max(0.1, lightDistanceToCenter - shadowVolumeRadius); //
    dirLight.shadow.camera.far = lightDistanceToCenter + shadowVolumeRadius; //
    dirLight.shadow.camera.updateProjectionMatrix(); //

    // --- Cache all calculated light/shadow values ---
    _lightPosition.copy(dirLight.position);
    _lightTargetPosition.copy(dirLight.target.position);
    _shadowCameraSettings.left = dirLight.shadow.camera.left;
    _shadowCameraSettings.right = dirLight.shadow.camera.right;
    _shadowCameraSettings.top = dirLight.shadow.camera.top;
    _shadowCameraSettings.bottom = dirLight.shadow.camera.bottom;
    _shadowCameraSettings.near = dirLight.shadow.camera.near;
    _shadowCameraSettings.far = dirLight.shadow.camera.far;
}
let tiltX = 0, tiltY = 0; //
function handleOrientation(event) { //
  tiltY = event.beta || 0; //
  tiltX = event.gamma || 0; //
}
function enableTilt() { //
    if (typeof DeviceOrientationEvent?.requestPermission === 'function') { //
        DeviceOrientationEvent.requestPermission().then(permissionState => { //
            if (permissionState === 'granted') { //
                window.addEventListener('deviceorientation', handleOrientation); //
            } else {
                settings.tiltEnabled = false; //
                gui.controllers.forEach(c => c.updateDisplay()); //
            }
        });
    } else {
        window.addEventListener('deviceorientation', handleOrientation); //
    }
}
function disableTilt() { //
    window.removeEventListener('deviceorientation', handleOrientation); //
    tiltX = 0; //
    tiltY = 0; //
}
window.addEventListener('resize', () => { //
    camera.aspect = window.innerWidth / window.innerHeight; //
    renderer.setSize(window.innerWidth, window.innerHeight); //
    layoutScene(); //
});

// --- Animation Loop ---
let lastFPSTime = performance.now(); //
let frameCount = 0; //
const dateOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }; //

function animate() { //
    requestAnimationFrame(animate); //

    const now = performance.now(); //
    const delta = clock.getDelta(); //

    // --- FPS Counter Logic ---
    frameCount++; //
    if (now >= lastFPSTime + 1000) { //
        if (settings.showFPS) { //
            fpsCounter.textContent = `FPS: ${frameCount}`; //
        }
        frameCount = 0; //
        lastFPSTime = now; //
    }

    // --- Camera Reset Animation Handler ---
    if (isResettingCamera && !isUserInteracting) { //
        const lerpFactor = Math.min(delta * 4.0, 1.0);  //
        camera.position.lerp(cameraResetTargetPos, lerpFactor); //
        controls.target.lerp(cameraResetTargetTarget, lerpFactor); //
        if (camera.position.distanceTo(cameraResetTargetPos) < 0.01) { //
            camera.position.copy(cameraResetTargetPos); //
            controls.target.copy(cameraResetTargetTarget); //
            isResettingCamera = false; //
        }
    }

    controls.update(); //

    const time = now / 1000; //

    // Update UI Text (if visible)
    if (settings.showDateTime) { //
        // NOTE: simulatedSeconds is now derived inside updateClockGears()
        // We need to calculate it here *only* for the display.
        // This value is canonical and is the same one used for the gears/hands.
        const currentSimulatedSeconds = simulationTotalTicks * BEAT_TIME_VALUE;
        const totalSeconds = Math.floor(currentSimulatedSeconds); //
        
        // This code uses the *real* wall clock date, which is fine.
        const nowForDate = new Date(); //
        digitalDate.textContent = nowForDate.toLocaleDateString(undefined, dateOptions); //
        
        // This code uses the *simulated* clock time, which starts at 0.
        const hours = Math.floor((totalSeconds / 3600) % 24); //
        const minutes = Math.floor((totalSeconds / 60) % 60); //
        const seconds = totalSeconds % 60; //
        const formattedHours = ('0' + hours).slice(-2); //
        const formattedMinutes = ('0' + minutes).slice(-2); //
        const formattedSeconds = ('0' + seconds).slice(-2); //
        digitalClock.textContent = `${formattedHours}:${formattedMinutes}:${formattedSeconds}`; //
    }

    // --- DRIVE TRAIN AND HANDS (driven by SIMULATED time) ---
    // --- MODIFICATION: This logic is now inside updateClockGears() and is ONLY called on a tick. ---
    // (This block is now empty)
    // --- END MODIFICATION ---

    if (!settings.clockRunning) { //
        renderer.render(scene, camera); //
        return; //
    }


    // --- BALANCE WHEEL & SIMULATION LOGIC ---
    if (balanceWheel) { //
        const frequency = settings.beatRate / 2.0; //
        const sineValue = Math.sin((time * Math.PI * 2 * frequency) + STARTING_PHASE_OFFSET); //
        const amplitudeRadians = THREE.MathUtils.degToRad(290); //
        balanceWheel.rotation.z = -amplitudeRadians * sineValue; //

        const currentAngleDeg = THREE.MathUtils.radToDeg(balanceWheel.rotation.z); //
        if (balanceWheelAngles.start === null) { //
            balanceWheelAngles.start = currentAngleDeg; //
        }
        balanceWheelAngles.min = Math.min(balanceWheelAngles.min, currentAngleDeg); //
        balanceWheelAngles.max = Math.max(balanceWheelAngles.max, currentAngleDeg); //


        // --- ESCAPEMENT LOGIC ---
        const currentSign = Math.sign(sineValue); //
        if (currentSign !== Math.sign(previousSineValue) && !isPalletForkAnimating) { //
            
            if (previousSineValue > 0 && currentSign <= 0) { //
                palletForkState = -1; //
            } else if (previousSineValue < 0 && currentSign >= 0) { //
                palletForkState = 1; //
            }

            palletForkTargetAngle = (PALLET_FORK_ANGLE * palletForkState) + PALLET_FORK_OFFSET; //
            
            // --- MODIFICATION: Unify logic for all beat rates. ---
            // This is the ONLY logic that should run when a tick is *detected*.
            // ALWAYS trigger the smooth pallet animation. The *completion* of this animation
            // is what increments the clock tick and moves the gears. This ensures
            // the pallet always moves *before* the escape wheel snaps, fixing the desync.
            isPalletForkAnimating = true; 
            palletForkAnimStartTime = time; 
            palletForkStartAngle = palletFork.rotation.z; 
            // (DO NOT increment tick or call updateClockGears() here)
        }
        previousSineValue = sineValue; //

        // --- PALLET FORK SMOOTH ANIMATION HANDLER ---
        if (isPalletForkAnimating && palletFork) { //
            const elapsedTime = time - palletForkAnimStartTime; //
            let progress = elapsedTime / palletForkAnimDuration; //
            if (progress >= 1.0) { //
                progress = 1.0; //
                isPalletForkAnimating = false; //
                
                // --- MODIFICATION: This is the "consequence" of the tick ---
                // Now that the pallet animation is finished, increment the master tick
                // counter and update the entire gear train.
                simulationTotalTicks++;
                updateClockGears();
            }
            const easedProgress = 1 - Math.pow(1 - progress, 3); //
            palletFork.rotation.z = THREE.MathUtils.lerp(palletForkStartAngle, palletForkTargetAngle, easedProgress); //
        }

        // --- HAIRSPRING ANIMATION (GPU) ---
        if (hairSpringMesh && hairSpringMesh.userData.shader) {
            hairSpringMesh.userData.shader.uniforms.u_sineValue.value = sineValue;
        }
    }

    renderer.render(scene, camera); //
}

// Start the animation
animate(); //



