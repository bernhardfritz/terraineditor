let THREE = require('three');
let OrbitControls = require('three-orbit-controls')(THREE);
let { IsometricPlaneGeometry } = require('./IsometricPlaneGeometry.js')(THREE);

let camera, controls, scene, renderer;
let group, geometry, loader, material, mesh;

const init = () => {
  camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 1, 10000);
  camera.position.z = 1000;

  controls = new OrbitControls(camera);

  scene = new THREE.Scene();

  group = new THREE.Group();
  scene.add(group);

  loader = new THREE.TextureLoader();
  loader.load(
    './test.jpg',
    texture => {
      // texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
      // texture.repeat.set( 4, 4 );
      geometry = new IsometricPlaneGeometry(512, 512, 10, 10);
      mesh = THREE.SceneUtils.createMultiMaterialObject(geometry, [
        new THREE.MeshBasicMaterial({ map: texture }),
        new THREE.MeshBasicMaterial({
          color: 0x000000,
          wireframe: true
        })
      ]);
      group.add(mesh);
    }
  );

  renderer = new THREE.WebGLRenderer();
  renderer.setSize(window.innerWidth, window.innerHeight);

  document.body.appendChild(renderer.domElement);

  window.addEventListener('resize', onWindowResize, false);
};

const animate = () => {
  requestAnimationFrame(animate);

  // mesh.rotation.x += 0.01;
  // mesh.rotation.y += 0.02;

  renderer.render(scene, camera);
};

const onWindowResize = () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
};

init();
animate();
