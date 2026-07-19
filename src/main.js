import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

function createRadialGradientTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  const gradient = ctx.createRadialGradient(256, 256, 0, 256, 256, 256);
  gradient.addColorStop(0, 'rgba(160, 160, 160, 1)');
  gradient.addColorStop(0.5, 'rgba(120, 120, 120, 0.6)');
  gradient.addColorStop(1, 'rgba(80, 80, 80, 0)');

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 512, 512);

  return new THREE.CanvasTexture(canvas);
}

// 1. シーン
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);

// 2. カメラ
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);

// 3. レンダラー
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

document.getElementById('app').appendChild(renderer.domElement);

// 4. マウス操作
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

controls.autoRotate = true;
controls.autoRotateSpeed = 1.0;

let idleTimer = null;
controls.addEventListener('start', () => {
  controls.autoRotate = false;
  if (idleTimer) clearTimeout(idleTimer);
});
controls.addEventListener('end', () => {
  idleTimer = setTimeout(() => {
    controls.autoRotate = true;
  }, 3000);
});

// 5. ライト
const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
scene.add(ambientLight);

const keyLight = new THREE.DirectionalLight(0xffffff, 3.0);
keyLight.position.set(3, 10, 4);
keyLight.castShadow = true;
keyLight.shadow.mapSize.width = 2048;
keyLight.shadow.mapSize.height = 2048;
scene.add(keyLight);

const fillLight = new THREE.DirectionalLight(0xaaccff, 0.8);
fillLight.position.set(-5, 2, -5);
scene.add(fillLight);

const rimLight = new THREE.DirectionalLight(0xffffff, 1.2);
rimLight.position.set(0, 5, -10);
scene.add(rimLight);

// 6. 地面
const groundTexture = createRadialGradientTexture();
const groundGeometry = new THREE.CircleGeometry(1, 64);
const groundMaterial = new THREE.MeshStandardMaterial({
  map: groundTexture,
  transparent: true,
  roughness: 0.9,
  depthWrite: false,
});
const ground = new THREE.Mesh(groundGeometry, groundMaterial);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

// ローディング画面の要素を取得
const loadingOverlay = document.getElementById('loading-overlay');

// 7. モデルを読み込む
const loader = new GLTFLoader();
loader.load(
  '/millennium_falcon/scene.gltf',
  (gltf) => {
    const model = gltf.scene;
    scene.add(model);

    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());

    const maxDim = Math.max(size.x, size.y, size.z);

    ground.scale.set(maxDim * 0.7, maxDim * 0.7, 1);

    const floatGap = maxDim * 0.04;
    model.position.x -= center.x;
    model.position.z -= center.z;
    model.position.y -= box.min.y;
    model.position.y += floatGap;

    model.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });

    const cameraDistance = maxDim * 1.8;
    camera.position.set(cameraDistance, cameraDistance * 0.6, cameraDistance);
    camera.lookAt(0, size.y * 0.3, 0);
    controls.target.set(0, size.y * 0.3, 0);
    controls.update();

    const shadowRange = maxDim * 1.5;
    keyLight.shadow.camera.left = -shadowRange;
    keyLight.shadow.camera.right = shadowRange;
    keyLight.shadow.camera.top = shadowRange;
    keyLight.shadow.camera.bottom = -shadowRange;
    keyLight.shadow.camera.near = 0.1;
    keyLight.shadow.camera.far = shadowRange * 4;
    keyLight.shadow.camera.updateProjectionMatrix();

    loadingOverlay.classList.add('hidden');

    console.log('モデルの読み込み成功! サイズ:', size);
  },
  undefined, // ★変更: 進捗コールバックを削除(% 計算・表示は一切行わない)
  (error) => {
    console.error('読み込みエラー:', error);
    document.getElementById('loading-text').textContent = 'モデルの読み込みに失敗しました';
  }
);

// ウィンドウリサイズ対応
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// 8. アニメーションループ
function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}
animate();