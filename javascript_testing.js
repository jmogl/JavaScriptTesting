// 3D Javacript Clock using three.js
// PBR Rendering Engine - From Scratch
// MIT License. - Jeff Miller / Gemini
// 8/4/25
//
// This file is a complete reset focusing on a clean, correct PBR workflow.
// It removes all legacy code, UI, and animation to isolate the rendering.

import * as THREE from 'three';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';

// --- Core Scene Variables ---
let scene, camera, renderer;
let clockModel;

// --- Initialize the Scene ---
function init() {
    // --- Renderer Setup ---
    // This is the foundation. We set up the renderer for physically correct output.
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    // CRITICAL: 1. Set the output color space for correct display on monitors.
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    // CRITICAL: 2. Use ACES Filmic tone mapping for realistic contrast and highlight handling.
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.8;
    // Enable shadows
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    document.body.appendChild(renderer.domElement);

    // --- Scene and Camera ---
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(35, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 0, 40);

    // --- Lighting Setup ---
    // CRITICAL: 3. Use an HDRI for environment/reflections AND a DirectionalLight for shadows.
    const rgbeLoader = new RGBELoader();
    rgbeLoader.setPath('textures/');
    rgbeLoader.load('PolyHaven_colorful_Studio_2k.hdr', (texture) => {
        texture.mapping = THREE.EquirectangularReflectionMapping;
        scene.environment = texture;
        // Also set the background to the HDRI for a cohesive look.
        scene.background = texture;
    });

    // Add a DirectionalLight to cast sharp shadows.
    const dirLight = new THREE.DirectionalLight(0xffffff, 4.0);
    dirLight.position.set(10, 20, 10);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    const d = 10;
    dirLight.shadow.camera.left = -d;
    dirLight.shadow.camera.right = d;
    dirLight.shadow.camera.top = d;
    dirLight.shadow.camera.bottom = -d;
    dirLight.shadow.bias = -0.0005;
    scene.add(dirLight);

    // --- PBR Material Definitions ---
    const textureLoader = new THREE.TextureLoader().setPath('textures/');

    // 1. Wood Wall PBR Material
    const woodBaseColor = textureLoader.load('Wood03_2K_BaseColor.png');
    const woodNormal = textureLoader.load('Wood03_2K_Normal.png');
    const woodRoughness = textureLoader.load('Wood03_2K_Roughness.png');
    const woodHeight = textureLoader.load('Wood03_2K_Height.png');
    // CRITICAL: Tag the color texture with the correct color space.
    woodBaseColor.colorSpace = THREE.SRGBColorSpace;
    
    const wallMaterial = new THREE.MeshStandardMaterial({
        map: woodBaseColor,
        normalMap: woodNormal,
        roughnessMap: woodRoughness,
        displacementMap: woodHeight,
        displacementScale: 0.05 // A small value for subtle depth
    });

    // Add the wall to the scene
    // Increase segments for displacement map to work correctly.
    const wallGeometry = new THREE.PlaneGeometry(50, 50, 100, 100); 
    const wall = new THREE.Mesh(wallGeometry, wallMaterial);
    wall.position.z = -5;
    wall.receiveShadow = true;
    scene.add(wall);

    // 2. Brushed Steel PBR Material
    const steelBaseColor = textureLoader.load('BrushedIron02_2K_BaseColor.png');
    const steelMetallic = textureLoader.load('BrushedIron02_2K_Metallic.png');
    const steelNormal = textureLoader.load('BrushedIron02_2K_Normal.png');
    const steelRoughness = textureLoader.load('BrushedIron02_2K_Roughness.png');
    // CRITICAL: Tag the color texture.
    steelBaseColor.colorSpace = THREE.SRGBColorSpace;

    const brushedSteelMaterial = new THREE.MeshStandardMaterial({
        map: steelBaseColor,
        metalnessMap: steelMetallic,
        roughnessMap: steelRoughness,
        normalMap: steelNormal,
        // Use the roughness property to scale the map, making it less mirror-like.
        roughness: 2.5
    });
    
    // 3. Placeholder material for other clock parts
    const placeholderMaterial = new THREE.MeshPhysicalMaterial({
        color: 0x555555,
        roughness: 0.5,
        metalness: 1.0,
        transparent: true,
        opacity: 0.3,
        ior: 1.5,
        transmission: 0.5
    });


    // --- Model Loading ---
    // Load the OBJ directly, without the problematic MTL file.
    const objLoader = new OBJLoader().setPath('textures/');
    objLoader.load('ETA6497-1_OBJ.obj', (object) => {
        clockModel = object;
        clockModel.scale.set(3.5, 3.5, 3.5);
        clockModel.position.set(0, 0, 0);

        // Loop through the model and assign our new PBR materials.
        clockModel.traverse((child) => {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;

                // Apply materials based on mesh name
                if (child.name === 'BarrelBridge_Body' || child.name === 'TrainWheelBridgeBody') {
                    child.material = brushedSteelMaterial;
                } else {
                    // All other parts get the placeholder material for now.
                    child.material = placeholderMaterial;
                }
            }
        });
        
        scene.add(clockModel);
    });
    
    // --- Event Listeners ---
    window.addEventListener('resize', onWindowResize);
}

// --- Helper Functions ---
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
    requestAnimationFrame(animate);

    // Simple rotation for viewing the model
    if (clockModel) {
        clockModel.rotation.y += 0.002;
    }

    renderer.render(scene, camera);
}

// --- Run ---
init();
animate();
