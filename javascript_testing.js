// 3D Javacript ETA 6497 Clock using three.js
// MIT License. - Work in Progress
// Jeff Miller 2025. 8/24/25

/*
ToDo:
- Fix the wheel default angles so the gears mesh regardless of the start time.
- Add PBR textures for the 3D Model. Will try Blender PBR Textures.
- Fix BalancingBridgeBody showing up twice in the mesh body ListFormat
- Add back top watch plate and set a transparency based on direction
*/

/* References and Notes
- AI support: Google Gemini
- HDRI: https://polyhaven.com/a/colorful_studio
- PBR Textures: https://www.cgbookcase.com/
- Modified ETA 6497-1 Watch Movement CAD: Steen Winther: https://grabcad.com/library/eta-6497-1-complete-watch-movement
- ETA 6497 Custom Clock Hands and Clock Case made in Fusion 360
- 5 Hz Tick Sound - Clock Ticking by RedDog0607: https://pixabay.com/sound-effects/clock-ticking-365218/
- Development and Debugging Tools: Google Gemini
- File encoding is set to UF-8

- Local Server: python -m http.server run in a terminal in local javascript directory with index.html
- 	http://localhost:8000 in a local browser tab

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
		- Note: Be careful using F360 appearance and material properties together. It can create two separate meshes when exporting from Blender
			- *** This may be mute depending on how well custom Blender PBR texture exporting works 

 -	Export .GLB, +Y transform out of Blender and save in three.js folder


ETA 6497 Watch Movement Notes:
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
	- Third Wheel: Rotates every 7.5 minutes clockwise from dial side
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

import * as THREE from 'three';
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'; // Use GLTFLoader
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
        camera.position.set(0, 0, 60); // As set in layoutScene
        controls.target.set(0, 0, 0);
    }
};

// --- 3D Model Variables ---
let clockModel;
let modelScale = 3.5;
let secondWheel, minuteWheel, hourWheel, balanceWheel, escapeWheel, centerWheel, thirdWheel, palletFork, hairSpring;
let newHourHand, newMinuteHand, newSecondHand;
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

    // --- GUI Setup ---
    gui = new GUI();
    gui.domElement.style.display = 'none'; // Start hidden

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

        // Only toggle if it's a short, stationary press (a "tap")
        if (duration < 200 && distance < 5) {
            // Do nothing if the tap is on the GUI itself, allowing interaction with controls
            if (gui.domElement.contains(event.target)) {
                return;
            }

            // Toggle display
            if (gui.domElement.style.display === 'none') {
                gui.domElement.style.display = 'block';

                // User interaction is required to start audio (only runs on the first open)
                if (tickSound && tickSound.paused) {
                    tickSound.play().catch(() => {}); // Play and immediately pause to 'unlock'
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
    // This function runs once all assets managed by the manager are loaded
    console.log("All assets loaded successfully.");
    layoutScene(); // Perform initial layout after assets are ready
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
dirLight.shadow.bias = -0.001; //was -0.0001
dirLight.shadow.normalBias = 0.01; //was 0.005

scene.add(dirLight);
scene.add(dirLight.target); // Add the light's target to the scene to be able to move it

// --- Create a master "clockUnit" group ---
const clockUnit = new THREE.Group();
clockUnit.position.z = 0;

const zShift = 1.0;

// --- PBR Material Definitions ---
const textureLoader = new THREE.TextureLoader(loadingManager).setPath('textures/');

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

// 2. Brushed Steel PBR Material
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
    color: 0xe0e0e0 // Added to give it a brighter, more metallic silver look
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

// --- Box Creation ---
    // give walls a little thickness so they can cast shadows on adjacent walls
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


// --- RE-ADDED: Materials for GLB parts ---
const brassMaterial = new THREE.MeshStandardMaterial({ color: 0xED9149, metalness: 0.8, roughness: 0.2 });
const blackAluminumMaterial = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, metalness: 0.6, roughness: 0.4 });
//const lumeMaterial = new THREE.MeshStandardMaterial({ color: 0x90ee90, emissive: 0x90ee90, emissiveIntensity: 0.6, roughness: 0.8 });
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
    clockModel.rotation.set(0, 0, 0); // NO ROTATION NEEDED
    clockModel.scale.set(modelScale, modelScale, modelScale);

    // --- Log all mesh names to the console ---
    console.log("--- All Meshes in GLB File ---");
    clockModel.traverse(child => {
        if (child.isMesh) {
            console.log(child.name);
        }
    });
    console.log("--------------------------------");
    

    // --- RE-ADDED: Part identification and setup ---
    const collectedParts = {};
    clockModel.traverse(child => {
        if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
            collectedParts[child.name] = child;
        }
    });

    // Create new groups for the hands to ensure all parts rotate together
    newHourHand = new THREE.Group();
    newMinuteHand = new THREE.Group();
    newSecondHand = new THREE.Group();
    
    // Find the original hand meshes and add them to the new groups
    const hourOuter = collectedParts['HourHandOuterBody'];
    const hourLume = collectedParts['HourHandLumeBody'];
    if (hourOuter) newHourHand.add(hourOuter);
    if (hourLume) newHourHand.add(hourLume);

    // --- FIX: Corrected the name for the minute hand's lume body ---
    const minuteOuter = collectedParts['MinuteHandOuterBody'];
    const minuteLume = collectedParts['MinuteHandLumeBody'];
    if (minuteOuter) newMinuteHand.add(minuteOuter);
    if (minuteLume) newMinuteHand.add(minuteLume);

    // --- FIX: Corrected the name for the seconds hand's lume body ---
    const secondOuter = collectedParts['SecondsHandOuterBody'];
    const secondLume = collectedParts['SecondsHandLumeBody']; // Need to troubleshoot two lume bodies
    if (secondOuter) newSecondHand.add(secondOuter);
    if (secondLume) newSecondHand.add(secondLume);

    // Add the new, complete hand groups to the scene
    clockModel.add(newHourHand);
    clockModel.add(newMinuteHand);
    // The seconds hand is added later, after being moved to its pivot
    
    // Apply materials to the original meshes
    for (const name in collectedParts) {
        const part = collectedParts[name];
        if (name.startsWith('HourHandOuterBody') || name.startsWith('MinuteHandOuterBody') || name.startsWith('SecondsHandOuterBody')) { part.material = blackAluminumMaterial; }
        else if (name.startsWith('HourHandLumeBody') || name.startsWith('MinuteHandLumeBody') || name.startsWith('SecondsHandLumeBody')) { part.material = lumeMaterial; }
        else if (['BarrelBridge_Body', 'TrainWheelBridgeBody', 'BalancingBridgeBody'].includes(name)) { part.material = brushedSteelMaterial; }
        else if (['SecondWheel', 'Minute_Wheel_Body', 'HourWheel_Body', 'EscapeWheelBody', 'CenterWheelBody', 'ThirdWheelBody', 'BalanceWheelBody'].includes(name)) { part.material = brassMaterial; }
    }

    const partsToPivot = [ 'SecondWheel', 'Minute_Wheel_Body', 'HourWheel_Body', 'BalanceWheelBody', 'EscapeWheelBody', 'CenterWheelBody', 'ThirdWheelBody', 'HairSpringBody' ];
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
                case 'SecondWheel': secondWheel = pivot; break;
                case 'Minute_Wheel_Body': minuteWheel = pivot; break;
                case 'HourWheel_Body': hourWheel = pivot; break;
                case 'BalanceWheelBody': balanceWheel = pivot; break;
                case 'EscapeWheelBody': escapeWheel = pivot; break;
                case 'CenterWheelBody': centerWheel = pivot; break;
                case 'ThirdWheelBody': thirdWheel = pivot; break;
                case 'HairSpringBody': hairSpring = pivot; break;
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
    
    // --- FIX: Re-engineered the seconds hand pivot to prevent orbiting ---
    if (secondWheel) {
        const pivot = new THREE.Group(); // This is the new, true pivot point
        clockModel.add(pivot);

        const center = new THREE.Vector3();
        new THREE.Box3().setFromObject(secondWheel).getCenter(center);
        pivot.position.copy(center);

        // Add the assembled hand (body + lume) to the new pivot
        pivot.add(newSecondHand);
        // Offset the hand group by the INVERSE of the pivot's position
        newSecondHand.position.sub(center);

        // The animated object is now the pivot, not the hand group itself
        newSecondHand = pivot;
    }
});


// Rewritten function for dynamic scaling and layout
function layoutScene() {
    // --- 1. Set a fixed camera Z position ---
    camera.position.z = 60;
    camera.updateProjectionMatrix();

    // --- 2. Build the box to fit the viewport and contain the clock ---
    const boxDepth = 8.5;
    const backWallZ = -boxDepth;
    const wallCenterZ = -boxDepth / 2;
    const boxFrontZ = 0.0;

    const fov = camera.fov * (Math.PI / 180);
    // Calculate view plane size at the FRONT of the box so it aligns with the screen edge
    const viewPlaneDistance = camera.position.z - boxFrontZ;
    const viewPlaneHeight = 2 * Math.tan(fov / 2) * viewPlaneDistance;
    const viewPlaneWidth = viewPlaneHeight * camera.aspect;

    // The back wall must be scaled larger to appear the same size as the front opening
    const backPlaneDistance = camera.position.z - backWallZ;
    const backPlaneHeight = 2 * Math.tan(fov / 2) * backPlaneDistance;
    const backPlaneWidth = backPlaneHeight * camera.aspect;

    // --- 3. Dynamically set texture repeats for realism ---
    const unitsPerTexture = 15;
    const wallTextures = [wallMaterial.map, wallMaterial.normalMap, wallMaterial.roughnessMap, wallMaterial.displacementMap];
    const tbTextures = [topBottomMaterial.map, topBottomMaterial.normalMap, topBottomMaterial.roughnessMap, topBottomMaterial.displacementMap];
    const lrTextures = [leftRightMaterial.map, leftRightMaterial.normalMap, leftRightMaterial.roughnessMap, leftRightMaterial.displacementMap];

    wallTextures.forEach(t => t.repeat.set(backPlaneWidth / unitsPerTexture, backPlaneHeight / unitsPerTexture));
    tbTextures.forEach(t => t.repeat.set(viewPlaneWidth / unitsPerTexture, boxDepth / unitsPerTexture));
    lrTextures.forEach(t => t.repeat.set(boxDepth / unitsPerTexture, viewPlaneHeight / unitsPerTexture));

    // --- 4. Position and scale walls ---
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

    // --- 5. Scale clock to fit inside box with padding ---
    const clockNativeDiameter = 22;
    const padding = 5;
    const availableWidth = viewPlaneWidth - (padding * 2);
    const availableHeight = viewPlaneHeight - (padding * 2);

    const scale = Math.min(availableWidth, availableHeight) / clockNativeDiameter;
    clockUnit.scale.set(scale, scale, scale);


// --- 6. Update shadow camera using a precise bounding volume ---
    // This is a more robust method that guarantees the entire box is captured.

    // First, calculate a bounding box that contains the entire boxGroup (walls and all).
    const shadowVolumeBox = new THREE.Box3().setFromObject(boxGroup);

    // From that box, get its center point and a radius that encloses it.
    const shadowVolumeCenter = new THREE.Vector3();
    shadowVolumeBox.getCenter(shadowVolumeCenter);
    const shadowVolumeRadius = shadowVolumeBox.getSize(new THREE.Vector3()).length() / 2;
	// pad the shadow frustum to ensure corners get included
	const paddedRadius = shadowVolumeRadius * 1.2;

    // Define the light's direction relative to the target.
    const lightPositionOffset = { x: 10, y: 28, z: 25 };

    // Aim the light at the calculated center of the entire volume.
    dirLight.target.position.copy(shadowVolumeCenter);

    // Position the light relative to this new, precise target.
    dirLight.position.set(
        shadowVolumeCenter.x + lightPositionOffset.x,
        shadowVolumeCenter.y + lightPositionOffset.y,
        shadowVolumeCenter.z + lightPositionOffset.z
    );

    // CRITICAL: Update the target's matrix before rendering shadows.
    dirLight.target.updateMatrixWorld();

    // Configure the shadow camera's size (frustum) using the calculated radius.
    // This ensures the view is wide and tall enough to see the whole box.
    dirLight.shadow.camera.left = -paddedRadius;
    dirLight.shadow.camera.right = paddedRadius;
    dirLight.shadow.camera.top = paddedRadius;
    dirLight.shadow.camera.bottom = -paddedRadius;

    // Configure the near and far planes based on the light's distance to the volume.
    // This ensures the camera's depth includes the entire box, but no more than necessary.
    const lightDistanceToCenter = dirLight.position.distanceTo(shadowVolumeCenter);
    dirLight.shadow.camera.near = Math.max(0.1, lightDistanceToCenter - shadowVolumeRadius); // Cannot be negative
    dirLight.shadow.camera.far = lightDistanceToCenter + shadowVolumeRadius;

    // Apply all the new settings.
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
                // User denied permission, so toggle the GUI back to off.
                settings.tiltEnabled = false;
                gui.controllers.forEach(c => c.updateDisplay()); // Refresh GUI to show it's off
            }
        });
    } else {
        // Non-iOS device
        window.addEventListener('deviceorientation', handleOrientation);
    }
}

function disableTilt() {
    window.removeEventListener('deviceorientation', handleOrientation);
    // Reset tilt values so the clock doesn't get stuck
    tiltX = 0;
    tiltY = 0;
}


const tickSound = new Audio('/textures/clock-ticking-5Hz.mp3');
tickSound.volume = 0.0; // Controlled by GUI

// --- Animation Loop ---
function animate() {
  requestAnimationFrame(animate);

  controls.update();

  const maxTilt = 15;
  const x = THREE.MathUtils.clamp(tiltX, -maxTilt, maxTilt);
  const y = THREE.MathUtils.clamp(tiltY, -maxTilt, maxTilt);
  const rotY = THREE.MathUtils.degToRad(x) * 0.5;
  const rotX = THREE.MathUtils.degToRad(y) * 0.5;
  
  // NOTE: The tilt rotation values rotX and rotY are calculated but not applied
  // to an object. If tilt is desired to rotate the box, you would add:
  // boxGroup.rotation.x = rotX;
  // boxGroup.rotation.y = rotY;

  const now = new Date();
  const time = now.getTime() / 1000; // Time in seconds for sine waves

  // --- Time Calculations ---
  // Continuous time for smooth motion (minutes, hours)
  const continuousSeconds = now.getSeconds() + now.getMilliseconds() / 1000;
  const minutes = now.getMinutes() + continuousSeconds / 60;
  const hours = now.getHours() % 12 + minutes / 60;

  // Quantized time for stepped motion (escapement)
  // The movement ticks 5 times per second (18,000 VPH), so each step is 0.2 seconds.
  const intervalIndex = Math.floor(continuousSeconds * 5);
  const quantizedSeconds = intervalIndex / 5.0;


  // --- Animation Logic ---
  // Smoothly rotating parts
  if (newMinuteHand) newMinuteHand.rotation.z = -THREE.MathUtils.degToRad((minutes / 60) * 360);
  if (newHourHand) newHourHand.rotation.z = -THREE.MathUtils.degToRad((hours / 12) * 360);
  if (minuteWheel) minuteWheel.rotation.z = ((minutes / 60) * Math.PI * 2); 
  if (hourWheel) hourWheel.rotation.z = -((hours / 12) * Math.PI * 2);
  if (centerWheel) centerWheel.rotation.z = -((minutes / 60) * Math.PI * 2);
  if (thirdWheel) thirdWheel.rotation.z = (((minutes % 7.5) / 7.5) * Math.PI * 2);
  
  // Stepped rotation for escapement parts
  if (newSecondHand) newSecondHand.rotation.z = -THREE.MathUtils.degToRad((quantizedSeconds / 60) * 360);
  if (secondWheel) secondWheel.rotation.z = -((quantizedSeconds / 60) * Math.PI * 2);
  if (escapeWheel) escapeWheel.rotation.z = (((quantizedSeconds % 5) / 5) * Math.PI * 2);
  
  // Pallet Fork: Oscillates 5 times per second (5 Hz)
  if (palletFork) {
    palletFork.rotation.z = -THREE.MathUtils.degToRad(22) * Math.sin(time * Math.PI * 10);
  }

  // Balance Wheel: Oscillates at 2.5 Hz (18,000 VPH)
  if (balanceWheel) {
    const sineValue = Math.sin(time * Math.PI * 2 * (2.5 * balanceWheelSpeedMultiplier));
    balanceWheel.rotation.z = -(Math.PI / 2) * sineValue;
    if (hairSpring) hairSpring.scale.set(1 + 0.1 * sineValue, 1 + 0.1 * sineValue, 1);
  }

  const pad = (n) => n.toString().padStart(2, '0');
  const spanStyles = `background-color: rgba(0, 0, 0, 0.5); padding: 0.1em 0.3em; border-radius: 4px;`;

  const currentSecond = Math.floor(now.getSeconds());
  if (animate.lastSecond !== currentSecond) {
    if(tickSound && settings.soundEnabled) { // Check if sound is enabled in settings
        tickSound.currentTime = 0;
        tickSound.play().catch(() => {});
    }
    animate.lastSecond = currentSecond;
  }

  renderer.render(scene, camera);
}

// --- Initial Setup Calls ---
// layoutScene() is now called by the LoadingManager's onLoad callback

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  renderer.setSize(window.innerWidth, window.innerHeight);
  layoutScene();
});

animate();
