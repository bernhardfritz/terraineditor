let THREE = require('three');
let { PointerLockControls } = require('./PointerLockControls.js')(THREE);
let { EffectComposer, RenderPass, BlurPass, KernelSize, SavePass } = require('postprocessing');
let { UnindexedIsometricPlaneBufferGeometry } = require('./UnindexedIsometricPlaneGeometry.js')(THREE);
let { remote } = require('electron');
let fs = remote.require('fs');
let { readFile, load, image } = require('./utils.js');
let { Sky } = require('./sky.js')(THREE);
let dat = require('./dat.gui.min.js');
let Stats = require('./stats.min.js');

let comboRenderTarget, comboCamera, comboScene, comboMesh;

let camera, controls, scene, renderer;
let geometry, loader, material, mesh;

let composer, hblur, vblur;

let mousePosition;

let heightmapCanvas, heightmapContext, heightmapTexture;

let isLeftMouseButtonDown = false;
let isRightMouseButtonDown = false;

let moveForward = false;
let moveBackward = false;
let moveLeft = false;
let moveRight = false;
let moveUp = false;
let moveDown = false;
let prevTime = performance.now();

let modeLabel;

let Options = function() {
  this.radius = 10;
  this.strength = 10;
};

let gui;
let stats;

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
  controls.getObject().translateZ(512);
  controls.getObject().translateY(100);
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

  stats = new Stats();
  stats.showPanel(0); // 0: fps, 1: ms, 2: mb, 3+: custom
  document.body.appendChild(stats.dom);

  modeLabel = document.getElementById('modeLabel');

  heightmapCanvas = document.getElementById('heightmapCanvas');
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

    heightmapCanvas.width = heightmap.width;
    heightmapCanvas.height = heightmap.height;
    heightmapContext.drawImage(heightmap, 0, 0);
    heightmapTexture = new THREE.Texture(heightmapCanvas);
    heightmapTexture.needsUpdate = true;

    let comboGeometry = new THREE.PlaneGeometry(window.innerWidth, window.innerHeight);
    let comboMaterial = new THREE.RawShaderMaterial({
      uniforms: {
        displacementMap: { type: "t", value: heightmapTexture },
        displacementScale: { type: "f", value: 196.0 }
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
        displacementScale: { type: "f", value: 196.0 },
        mixMap: { type: "t", value: mixMap },
        layer0: { type: "t", value: layer0 },
        layer1: { type: "t", value: layer1 },
        layer2: { type: "t", value: layer2 },
        layer3: { type: "t", value: layer3 },
        layer4: { type: "t", value: layer4 },
        texScale: { type: "f", value: 32.0 },
        mousePosition: { type: "vec3", value: mousePosition },
        sunPosition: { type: "vec3", value: sky.sunPosition },
        radius: { type: "f", value: 100.0 },
        controlsEnabled: { type: "i", value: controls.enabled ? 1 : 0 }
      },
      vertexShader: vertexShader.toString(),
      fragmentShader: fragmentShader.toString(),
    });

    let radiusController = gui.add(options, 'radius', 1, 100);
    radiusController.onChange(value => {
      material.uniforms.radius.value = value * 10;
    });
    gui.add(options, 'strength', 1, 100);

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

  stats.begin();

  let time = performance.now();
  let delta = time - prevTime;

  if (controls.enabled) {
    let velocity = delta / 5;
    if (moveForward) controls.getObject().translateZ(-velocity);
    if (moveBackward) controls.getObject().translateZ(velocity);
    if (moveLeft) controls.getObject().translateX(-velocity);
    if (moveRight) controls.getObject().translateX(velocity);
    if (moveUp) controls.getObject().translateY(velocity);
    if (moveDown) controls.getObject().translateY(-velocity);
  } else if ((isLeftMouseButtonDown || isRightMouseButtonDown)) {
    if (isRightMouseButtonDown) {
      heightmapContext.globalCompositeOperation = 'difference';
      heightmapContext.fillStyle = 'white';
      heightmapContext.fillRect(0, 0, heightmapCanvas.width, heightmapCanvas.height);
    }
    heightmapContext.beginPath();
    let centerX = ((mousePosition.x / 256 + 1) / 2) * heightmapCanvas.width;
    let centerY = ((mousePosition.z / 256 + 1) / 2) * heightmapCanvas.height;
    let radiusFactor = heightmapCanvas.width / 4096; // this factor ensures that the visual representation of the editing radius coincides with the actual transformation area
    heightmapContext.arc(centerX, centerY, material.uniforms.radius.value * radiusFactor, 0, 2 * Math.PI, false);
    let radialGradient = heightmapContext.createRadialGradient(centerX, centerY, 0, centerX, centerY, material.uniforms.radius.value);
    let c1 = Math.round((options.strength + 10) / 11);
    let c2 = c1 - 1;
    radialGradient.addColorStop(0, `rgba(${c1}, ${c1}, ${c1}, 1)`);
    radialGradient.addColorStop(1, `rgba(${c2}, ${c2}, ${c2}, 1)`);
    heightmapContext.globalCompositeOperation = 'lighter';
    heightmapContext.fillStyle = radialGradient;
    heightmapContext.fill();
    if (isRightMouseButtonDown) {
      heightmapContext.globalCompositeOperation = 'difference';
      heightmapContext.fillStyle = 'white';
      heightmapContext.fillRect(0, 0, heightmapCanvas.width, heightmapCanvas.height);
    }
    heightmapTexture.needsUpdate = true;
  }

  prevTime = time;

  composer.render(); // TODO: render to texture only when terrain gets modified instead of every frame
  renderer.render(scene, camera);

  stats.end();
};

const onWindowResize = () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
};

const onMouseDown = (event) => {
  switch (event.button) {
    case 0: // left
      isLeftMouseButtonDown = true;
      break;
    case 1: // middle
      break;
    case 2: // right
      isRightMouseButtonDown = true;
      break;
  }
};

const onMouseUp = (event) => {
  switch (event.button) {
    case 0: // left
      isLeftMouseButtonDown = false;
      break;
    case 1: // middle
      break;
    case 2: // right
      isRightMouseButtonDown = false;
      break;
  }
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
  if (material) {
    material.uniforms.controlsEnabled.value = controls.enabled ? 1 : 0;
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
  modeLabel.classList.remove('border-left-red');
  modeLabel.classList.remove('border-left-green');
  modeLabel.classList.remove('border-left-blue');
  modeLabel.classList.remove('border-left-purple');
  if (controls.enabled) {
    document.exitPointerLock();
    modeLabel.textContent = 'EDIT MODE';
    modeLabel.classList.add('border-left-red');
  } else {
    document.body.requestPointerLock();
    modeLabel.textContent = 'CAMERA MODE';
    modeLabel.classList.add('border-left-blue');
  }
};

init();
animate();
