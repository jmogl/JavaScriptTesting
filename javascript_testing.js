// 3D Javacript Clock using three.js
// MIT License. - Work in Progress
// Jeff Miller 2025. 8/10/25
// MODIFIED: Reintroduced animation logic to the clean baseline.
// - GLB model is now correctly oriented by default from Blender export.
// - All parts are identified, and pivots are created after loading.
// - All animations are set to the Z-axis, which is now the correct perpendicular axis.
// MODIFIED: Added back the console log for all mesh names and restored the pallet fork animation.
// MODIFIED: Corrected hand animation logic: fixed lume body name typos and implemented a proper pivot for the seconds hand to prevent orbiting.



/*
ToDo:
- Fix the wheel default angles so the gears mesh regardless of the start time.
- Try Blender PBR Textures
- Update the rotation rate for the balance wheel
- Add a GUI
- Fix BalancingBridgeBody showing up twice in the mesh body ListFormat
- Add back in the top and set a transparency based on direction
*/


/* References and Notes
- HDRI: https://polyhaven.com/a/colorful_studio
- PBR Textures: https://www.cgbookcase.com/
- ETA 6497-1 Watch Movement CAD: Steen Winther: https://grabcad.com/library/eta-6497-1-complete-watch-movement
- ETA 6497 Custom Hands made in Fusion 360
- 5 Hz Tick Sound - Clock Ticking by RedDog0607: https://pixabay.com/sound-effects/clock-ticking-365218/
- Development and Debugging Tools: Google Gemini and ChatGPT
- File encoding is set to UF-8

- Local Server: python -m http.server run in a terminal in local javascript directory with index.html
- 	http://localhost:8000 in local browser tab

- Fusion 360 to .OBJ to Blender to .GLB
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
- Movement is 36.6mm in diameter and 4.5mm thick (Currently using a custom scale)
- 18,000 vibrations per hour (VPH) (balance wheel swing)
	- 3600 seconds/hour
	- One tick sound for ballance wheel full swing
	- Tick per second = 18,000 VPH / 3600 sec/hr = 5 ticks per second
- Wheels
	- Center Wheel: Carries Minute hand and rotates once per hour
	- Third Wheel: Rotates every 7.5 minutes clockwise from dial side
	- Fourth Wheel: Carries small seconds hand and rotates once per minute. Also drives the escapement
	- Escape Wheel: Advances by half a tooth per beat (15 teeth), resulting in a full rotation every 5 seconds counter clockwise.
	- Balance Wheel: 270 to 310 degrees, 2.5 Hz or 1 per 0.4 seconds.
*/

import * as THREE from 'three';
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'; // Use GLTFLoader
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

// --- Declare UI element variables in the global scope ---
let digitalDate, digitalClock;

// --- 3D Model Variables ---
let clockModel;
let modelScale = 3.5;
// --- RE-ADDED: Animation variables ---
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
        else if (['SecondsWheel', 'Minute_Wheel_Body', 'HourWheel_Body', 'EscapeWheel', 'CenterWheelBody', 'ThirdWheel', 'BalanceWheelBody'].includes(name)) { part.material = brassMaterial; }
    }

    const partsToPivot = [ 'SecondsWheel', 'Minute_Wheel_Body', 'HourWheel_Body', 'BalanceWheelBody', 'EscapeWheel', 'CenterWheelBody', 'ThirdWheel', 'HairSpringBody' ];
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
function setupTiltControls() {
    if (typeof DeviceOrientationEvent?.requestPermission === 'function') {
        const button = document.createElement('button');
        Object.assign(button.style, { position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', padding: '1em 2em', fontSize: '1em', color: 'white', backgroundColor: 'rgba(0,0,0,0.7)', border: '1px solid white', borderRadius: '8px', cursor: 'pointer', zIndex: '1001' });
        button.textContent = 'Enable Tilt';
        document.body.appendChild(button);
        button.addEventListener('click', async () => {
            if (tickSound) {
                tickSound.play();
                tickSound.pause();
            }
            try { if (await DeviceOrientationEvent.requestPermission() === 'granted') { window.addEventListener('deviceorientation', handleOrientation); } } finally { document.body.removeChild(button); }
        });
    } else {
        window.addEventListener('deviceorientation', handleOrientation);
    }
}

const tickSound = new Audio('/textures/clock-ticking-5Hz.mp3');
tickSound.volume = 0.0; // 0.2

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
  const seconds = now.getSeconds() + now.getMilliseconds() / 1000;
  const minutes = now.getMinutes() + seconds / 60;
  const hours = now.getHours() % 12 + minutes / 60;

  // --- RE-ADDED: Animation logic ---
  // With the model correctly oriented, the perpendicular axis for rotation is Z.
  // A negative value produces a clockwise rotation from the dial side.
  if (newSecondHand) newSecondHand.rotation.z = -THREE.MathUtils.degToRad((seconds / 60) * 360);
  if (newMinuteHand) newMinuteHand.rotation.z = -THREE.MathUtils.degToRad((minutes / 60) * 360);
  if (newHourHand) newHourHand.rotation.z = -THREE.MathUtils.degToRad((hours / 12) * 360);

  if (secondWheel) secondWheel.rotation.z = -((seconds / 60) * Math.PI * 2);
  if (minuteWheel) minuteWheel.rotation.z = ((minutes / 60) * Math.PI * 2);
  if (hourWheel) hourWheel.rotation.z = -((hours / 12) * Math.PI * 2);
  if (escapeWheel) escapeWheel.rotation.z = (((seconds % 5) / 5) * Math.PI * 2);
  if (centerWheel) centerWheel.rotation.z = -((minutes / 60) * Math.PI * 2);
  if (thirdWheel) thirdWheel.rotation.z = (((minutes % 7.5) / 7.5) * Math.PI * 2);
  
  if (palletFork) {
    const time = now.getTime() / 1000;
    palletFork.rotation.z = -THREE.MathUtils.degToRad(22) * Math.sin(time * Math.PI * 8);
  }

  if (balanceWheel) {
    const time = now.getTime() / 1000;
    const sineValue = Math.sin(time * Math.PI * 2 * (3 * balanceWheelSpeedMultiplier));
    balanceWheel.rotation.z = -(Math.PI / 2) * sineValue;
    if (hairSpring) hairSpring.scale.set(1 + 0.1 * sineValue, 1 + 0.1 * sineValue, 1);
  }

  const pad = (n) => n.toString().padStart(2, '0');
  const spanStyles = `background-color: rgba(0, 0, 0, 0.5); padding: 0.1em 0.3em; border-radius: 4px;`;

  const currentSecond = Math.floor(now.getSeconds());
  if (animate.lastSecond !== currentSecond) {
    if(tickSound) {
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

setupTiltControls();
animate();
