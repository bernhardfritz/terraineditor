let THREE = require('three');
let { PointerLockControls } = require('./PointerLockControls.js')(THREE);
let { EffectComposer, RenderPass, BlurPass, KernelSize, SavePass } = require('postprocessing');
let { UnindexedIsometricPlaneBufferGeometry } = require('./UnindexedIsometricPlaneGeometry.js')(THREE);
let { remote } = require('electron');
let fs = remote.require('fs');
let { readFile, load, image } = require('./utils.js');
let { Sky } = require('./sky.js')(THREE);
let dat = require('./dat.gui.min.js');

let comboRenderTarget, comboCamera, comboScene, comboMesh;

let camera, controls, scene, renderer;
let geometry, loader, material, mesh;

let composer, hblur, vblur;

let mousePosition;

let heightmapCanvas, heightmapContext, heightmapTexture;

let isMouseDown = false;

let moveForward = false;
let moveBackward = false;
let moveLeft = false;
let moveRight = false;
let moveUp = false;
let moveDown = false;
let prevTime = performance.now();
let velocity = new THREE.Vector3();

let Options = function() {
  this.radius = 10;
};

let gui;

const init = () => {
  loader = new THREE.TextureLoader();

  scene = new THREE.Scene();

  var renderTargetParams = {
    minFilter: THREE.LinearFilter,
    stencilBuffer: false,
    depthBuffer: false
  };
  comboRenderTarget = new THREE.WebGLRenderTarget(window.innerWidth, window.innerHeight, renderTargetParams);
  comboCamera = new THREE.OrthographicCamera(-window.innerWidth / 2, window.innerWidth / 2, window.innerHeight / 2, -window.innerHeight / 2, 1, 10000);
  comboCamera.position.z = 1000;
  comboScene = new THREE.Scene();

  camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 1, 10000);

  controls = new PointerLockControls(camera);
  controls.getObject().translateZ(1000);
  scene.add(controls.getObject());

  mousePosition = new THREE.Vector3();

  sky = new Sky();
  sky.init(scene, controls.getObject());
  sky.azimuth = 0.15;

  options = new Options();

  gui = new dat.GUI();

  let skyFolder = gui.addFolder('Sky');
  skyFolder.add(sky, 'turbidity', 1.0, 20.0).step(0.1);
  skyFolder.add(sky, 'rayleigh', 0.0, 4).step(0.001);
  skyFolder.add(sky, 'mieCoefficient', 0.0, 0.1).step(0.001);
  skyFolder.add(sky, 'mieDirectionalG', 0.0, 1).step(0.001);
  skyFolder.add(sky, 'luminance', 0.0, 2);
  skyFolder.add(sky, 'inclination', 0, 1).step(0.0001);
  skyFolder.add(sky, 'azimuth', 0, 1).step(0.0001);

  heightmapCanvas = document.createElement('canvas');
  heightmapContext = heightmapCanvas.getContext('2d');

  let promises = [];
  promises.push(image('./heightmap.png'));
  promises.push(readFile(fs, './comboVertexShader.glsl', 'utf8'));
  promises.push(readFile(fs, './comboFragmentShader.glsl', 'utf8'));

  Promise.all(promises)
  .then(values => {
    let heightmap = values[0];
    let comboVertexShader = values[1];
    let comboFragmentShader = values[2];

    heightmapCanvas.width = heightmapCanvas.height = 2048;
    heightmapContext.drawImage(heightmap, 0, 0);
    heightmapTexture = new THREE.Texture(heightmapCanvas);
    heightmapTexture.needsUpdate = true;

    // document.body.appendChild(heightmapCanvas);

    let comboGeometry = new THREE.PlaneGeometry(window.innerWidth, window.innerHeight);
    let comboMaterial = new THREE.RawShaderMaterial({
      uniforms: {
        displacementMap: { type: "t", value: heightmapTexture },
        displacementScale: { type: "f", value: 128.0 }
      },
      vertexShader: comboVertexShader.toString(),
      fragmentShader: comboFragmentShader.toString()
    });
    comboMesh = new THREE.Mesh(comboGeometry, comboMaterial);
    comboScene.add(comboMesh);
  });

  promises = [];
  promises.push(load(loader, './rgba_new.png'));
  promises.push(load(loader, './ulrick-wery/ulrick-wery-desert-01-soil.jpg'));
  promises.push(load(loader, './ulrick-wery/ulrick-wery-desert-04-sand.jpg'));
  promises.push(load(loader, './ulrick-wery/ulrick-wery-tileableset-grassflower.jpg'));
  promises.push(load(loader, './ulrick-wery/ulrick-wery-tileableset2-soil.jpg'));
  promises.push(load(loader, './ulrick-wery/ulrick-wery-tileableset-grassstone.jpg'));
  promises.push(readFile(fs, './vertexShader.glsl', 'utf8'));
  promises.push(readFile(fs, './fragmentShader.glsl', 'utf8'));

  Promise.all(promises)
  .then(values => {
    let mixMap  = values[0];
    let layer0 = values[1];
    let layer1 = values[2];
    let layer2 = values[3];
    let layer3 = values[4];
    let layer4 = values[5];
    let vertexShader = values[6];
    let fragmentShader = values[7];

    layer0.wrapS = layer0.wrapT = THREE.RepeatWrapping;
    layer1.wrapS = layer1.wrapT = THREE.RepeatWrapping;
    layer2.wrapS = layer2.wrapT = THREE.RepeatWrapping;
    layer3.wrapS = layer3.wrapT = THREE.RepeatWrapping;
    layer4.wrapS = layer4.wrapT = THREE.RepeatWrapping;

    geometry = new UnindexedIsometricPlaneBufferGeometry(512, 512, 256, 256);
    material = new THREE.RawShaderMaterial({
      uniforms: {
        comboMap: { type: "t", value: comboRenderTarget.texture },
        displacementScale: { type: "f", value: 128.0 },
        mixMap: { type: "t", value: mixMap },
        layer0: { type: "t", value: layer0 },
        layer1: { type: "t", value: layer1 },
        layer2: { type: "t", value: layer2 },
        layer3: { type: "t", value: layer3 },
        layer4: { type: "t", value: layer4 },
        texScale: { type: "f", value: 32.0 },
        mousePosition: { type: "vec3", value: mousePosition },
        sunPosition: { type: "vec3", value: sky.sunPosition },
        radius: { type: "f", value: 100.0 }
      },
      vertexShader: vertexShader.toString(),
      fragmentShader: fragmentShader.toString(),
    });

    let radiusController = gui.add(options, 'radius', 1, 100);
    radiusController.onChange(value => {
      material.uniforms.radius.value = value * 10;
    });

    geometry.rotateX( - Math.PI / 2 );
    mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);
  });

  renderer = new THREE.WebGLRenderer({ alpha: true });
  renderer.context.getExtension('OES_standard_derivatives');
  renderer.setSize(window.innerWidth, window.innerHeight);

  composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass( comboScene, comboCamera ) );
  composer.addPass(new SavePass(comboRenderTarget));

  document.body.appendChild(renderer.domElement);

  window.addEventListener('resize', onWindowResize, false);

  document.addEventListener('mousedown', onMouseDown, false);
  document.addEventListener('mouseup', onMouseUp, false);
  document.addEventListener('mousemove', onMouseMove, false);

  document.addEventListener( 'pointerlockchange', onPointerLockChange, false);
  document.addEventListener( 'pointerlockerror', onPointerLockError, false);

  document.addEventListener( 'keydown', onKeyDown, false );
	document.addEventListener( 'keyup', onKeyUp, false );

  togglePointerLock();
};

const animate = () => {
  requestAnimationFrame(animate);

  if (controls.enabled) {
    let time = performance.now();
    let delta = time - prevTime;
    let velocity = delta / 5;

    if (moveForward) controls.getObject().translateZ(-velocity);
    if (moveBackward) controls.getObject().translateZ(velocity);
    if (moveLeft) controls.getObject().translateX(-velocity);
    if (moveRight) controls.getObject().translateX(velocity);
    if (moveUp) controls.getObject().translateY(velocity);
    if (moveDown) controls.getObject().translateY(-velocity);

    prevTime = time;
  }

  if (isMouseDown) {
    heightmapContext.beginPath();
    let centerX = ((mousePosition.x / 256 + 1) / 2) * 2048;
    let centerY = ((mousePosition.z / 256 + 1) / 2) * 2048;
    heightmapContext.arc(centerX, centerY, material.uniforms.radius.value, 0, 2 * Math.PI, false);
    let radialGradient = heightmapContext.createRadialGradient(centerX, centerY, 0, centerX, centerY, material.uniforms.radius.value);
    radialGradient.addColorStop(0, `rgba(1, 1, 1, 1)`);
    radialGradient.addColorStop(1, `rgba(0, 0, 0, 1)`);
    heightmapContext.globalCompositeOperation = "lighter";
    heightmapContext.fillStyle = radialGradient;
    heightmapContext.fill();
    heightmapTexture.needsUpdate = true;
  }

  composer.render(); // TODO: render to texture only when terrain gets modified instead of every frame
  renderer.render(scene, camera);
};

const onWindowResize = () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
};

const onMouseDown = (event) => {
  isMouseDown = true;
};

const onMouseUp = (event) => {
  isMouseDown = false;
};

const onMouseMove = (event) => {
  let vector = new THREE.Vector3();

  vector.set(
    ( event.clientX / window.innerWidth ) * 2 - 1,
    - ( event.clientY / window.innerHeight ) * 2 + 1,
    0.5 );

  vector.unproject( camera );

  vector.y -= 10;

  let pos = new THREE.Vector3(controls.getObject().position.x, controls.getObject().position.y - 10, controls.getObject().position.z);

  let customDir = vector.sub(pos).normalize();

  let ray = new THREE.Ray(pos, customDir);

  let distance = ray.distanceToPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0)));

  mousePosition.copy(pos.clone().add(customDir.multiplyScalar(distance)));
};

const onPointerLockChange = (event) => {
  if ( document.pointerLockElement === document.body ) {
    controls.enabled = true;
  } else {
    controls.enabled = false;
  }
};

const onPointerLockError = (event) => {

};

const onKeyDown = (event) => {
  switch(event.keyCode) {
    case 16: // shift
      moveDown = true;
      break;
    case 27: // esc
      togglePointerLock();
      break;
    case 32: // space
      moveUp = true;
      break;
    case 65: // a
      moveLeft = true;
      break;
    case 68: // d
      moveRight = true;
      break;
    case 83: // s
      moveBackward = true;
      break;
    case 87: // w
      moveForward = true;
      break;
  }
};

const onKeyUp = (event) => {
  switch(event.keyCode) {
    case 16: // shift
      moveDown = false;
      break;
    case 32: // space
      moveUp = false;
      break;
    case 65: // a
      moveLeft = false;
      break;
    case 68: // d
      moveRight = false;
      break;
    case 83: // s
      moveBackward = false;
      break;
    case 87: // w
      moveForward = false;
      break;
  }
};

const togglePointerLock = () => {
  if (document.pointerLockElement) {
    document.exitPointerLock();
  } else {
    document.body.requestPointerLock();
  }
};

init();
animate();
