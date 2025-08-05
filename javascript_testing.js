// 3D Javacript Clock using three.js
// PBR Rendering Engine - From Scratch
// MIT License. - Jeff Miller / Gemini
// 8/4/25
//
// This file is a complete reset focusing on a clean, correct PBR workflow.
// LATEST: Fixed a ReferenceError bug caused by an out-of-scope LoadingManager.

import * as THREE from 'three';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';

// --- Core Scene Variables ---
let scene, camera, renderer;
let clockModel;

// --- Initialize the Scene ---
function init() {
    // --- Renderer Setup ---
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.8;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    document.body.appendChild(renderer.domElement);

    // --- Scene and Camera ---
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(35, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 0, 40);

    // --- LoadingManager Setup ---
    const loadingManager = new THREE.LoadingManager();

    // --- Asset Loaders ---
    // Pass the manager to each loader.
    const rgbeLoader = new RGBELoader(loadingManager);
    const textureLoader = new THREE.TextureLoader(loadingManager).setPath('textures/');
    const objLoader = new OBJLoader(loadingManager).setPath('textures/');

    // --- Lighting Setup ---
    rgbeLoader.setPath('textures/');
    rgbeLoader.load('PolyHaven_colorful_studio_2k.hdr', (texture) => {
        texture.mapping = THREE.EquirectangularReflectionMapping;
        scene.environment = texture;
        scene.background = texture;
    });

    const dirLight = new THREE.DirectionalLight(0xffffff, 3.0);
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

    // --- PBR Texture Loading ---
    const woodBaseColor = textureLoader.load('Wood03_2K_BaseColor.png');
    const woodNormal = textureLoader.load('Wood03_2K_Normal.png');
    const woodRoughness = textureLoader.load('Wood03_2K_Roughness.png');
    const woodHeight = textureLoader.load('Wood03_2K_Height.png');
    woodBaseColor.colorSpace = THREE.SRGBColorSpace;

    const steelBaseColor = textureLoader.load('BrushedIron02_2K_BaseColor.png');
    const steelMetallic = textureLoader.load('BrushedIron02_2K_Metallic.png');
    const steelNormal = textureLoader.load('BrushedIron02_2K_Normal.png');
    const steelRoughness = textureLoader.load('BrushedIron02_2K_Roughness.png');
    steelBaseColor.colorSpace = THREE.SRGBColorSpace;
    
    // --- This function runs once ALL assets from the manager are loaded ---
    loadingManager.onLoad = () => {
        console.log("All assets loaded, now building the scene...");

        // 1. Wood Wall Material & Mesh
        const wallMaterial = new THREE.MeshStandardMaterial({
            map: woodBaseColor,
            normalMap: woodNormal,
            roughnessMap: woodRoughness,
            displacementMap: woodHeight,
            displacementScale: 0.05
        });

        const woodTextureRepeat = 10;
        [woodBaseColor, woodNormal, woodRoughness, woodHeight].forEach( texture => {
            texture.wrapS = THREE.RepeatWrapping;
            texture.wrapT = THREE.RepeatWrapping;
            texture.repeat.set(woodTextureRepeat, woodTextureRepeat);
        });

        const wallGeometry = new THREE.PlaneGeometry(50, 50, 100, 100); 
        const wall = new THREE.Mesh(wallGeometry, wallMaterial);
        wall.position.z = -5;
        wall.receiveShadow = true;
        scene.add(wall);

        // 2. Brushed Steel PBR Material
        const brushedSteelMaterial = new THREE.MeshStandardMaterial({
            map: steelBaseColor,
            metalnessMap: steelMetallic,
            roughnessMap: steelRoughness,
            normalMap: steelNormal,
            roughness: 10.0
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

        // --- Model Processing ---
        // The `clockModel` variable is ready to be used here.
        clockModel.scale.set(3.5, 3.5, 3.5);
        clockModel.position.set(0, 0, 0);

        clockModel.traverse((child) => {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;

                if (child.name === 'BarrelBridge_Body' || child.name === 'TrainWheelBridgeBody') {
                    child.material = brushedSteelMaterial;
                } else {
                    child.material = placeholderMaterial;
                }
            }
        });
        
        scene.add(clockModel);

        // Start the animation loop only after everything is built.
        animate();
    };

    // --- Start Loading The Model ---
    // The objLoader will store its result in the global `clockModel` variable.
    objLoader.load('ETA6497-1_OBJ.obj', (object) => {
        clockModel = object;
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

// --- Animation Loop ---
// This function is now correctly called only by the LoadingManager
function animate() {
    requestAnimationFrame(animate);

    if (clockModel) {
        clockModel.rotation.y += 0.002;
    }

    renderer.render(scene, camera);
}


// --- Run ---
init();

