// 3D Javacript Clock using three.js
// PBR Rendering Engine - From Scratch
// MIT License. - Jeff Miller / Gemini
// 8/4/25
//
// LATEST: Added a diagnostic test to check for missing UV coordinates in the OBJ model.

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

        // --- DIAGNOSTIC TEST SPHERE ---
        // Create a test sphere with guaranteed UVs and apply the PBR material.
        console.log("Creating diagnostic test sphere with brushedSteelMaterial...");
        const testSphereGeo = new THREE.SphereGeometry(4, 64, 64);
        const testSphere = new THREE.Mesh(testSphereGeo, brushedSteelMaterial);
        testSphere.position.set(12, 0, 0); // Position it off to the side for comparison
        testSphere.castShadow = true;
        testSphere.receiveShadow = true;
        scene.add(testSphere);

        // --- Model Processing ---
        clockModel.scale.set(3.5, 3.5, 3.5);
        clockModel.position.set(0, 0, 0);

        clockModel.traverse((child) => {
            if (child.isMesh) {
                // --- DIAGNOSTIC CHECK ---
                // Check if the geometry attribute for UVs exists.
                if (!child.geometry.attributes.uv) {
                    console.warn(`WARNING: Mesh "${child.name}" is missing UV coordinates! Textures will not render correctly on this part.`);
                }
                
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
        animate();
    };

    // --- Start Loading The Model ---
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
function animate() {
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
}

// --- Run ---
init();
