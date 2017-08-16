let THREE = require('three');
let { PointerLockControls } = require('./PointerLockControls.js')(THREE);
let { EffectComposer, RenderPass, BlurPass, KernelSize, SavePass } = require('postprocessing');
let { UnindexedIsometricPlaneBufferGeometry } = require('./UnindexedIsometricPlaneGeometry.js')(THREE);
let { remote } = require('electron');
let fs = remote.require('fs');
let { readFile, load, image } = require('./utils.js');

let comboRenderTarget;
let comboCamera, comboScene;
let comboGeometry, comboMaterial, comboMesh;

let camera, controls, scene, renderer;
let geometry, loader, material, mesh;

let skyGeometry, skyMesh;

let composer, hblur, vblur;

let mousePosition;

let sunPosition;

let heightmapCanvas, heightmapContext, heightmapTexture;

let isMouseDown = false;

let dir;

let moveForward = false;
let moveBackward = false;
let moveLeft = false;
let moveRight = false;
let moveUp = false;
let moveDown = false;
let prevTime = performance.now();
var velocity = new THREE.Vector3();

const init = () => {
  loader = new THREE.TextureLoader();

  var renderTargetParams = {
    minFilter: THREE.LinearFilter,
    stencilBuffer: false,
    depthBuffer: false
  };
  comboRenderTarget = new THREE.WebGLRenderTarget(window.innerWidth, window.innerHeight, renderTargetParams);
  comboCamera = new THREE.OrthographicCamera(-window.innerWidth / 2, window.innerWidth / 2, window.innerHeight / 2, -window.innerHeight / 2, 1, 10000);
  comboCamera.position.z = 1000;
  comboScene = new THREE.Scene();

  camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 1, 2000000);

  controls = new PointerLockControls(camera);
  controls.getObject().translateZ(1000);

  scene = new THREE.Scene();

  scene.add(controls.getObject());

  mousePosition = new THREE.Vector3();

  dir = new THREE.Vector3();

  let inclination = 0.0;
  let azimuth = 0.15;
  var theta = Math.PI * ( inclination - 0.5 );
  var phi = 2 * Math.PI * ( azimuth - 0.5 );
  sunPosition = new THREE.Vector3();
  let distance = 400000.0;
  sunPosition.x = distance * Math.cos( phi );
  sunPosition.y = distance * Math.sin( phi ) * Math.sin( theta );
  sunPosition.z = distance * Math.sin( phi ) * Math.cos( theta );

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

    document.body.appendChild(heightmapCanvas);

    comboGeometry = new THREE.PlaneGeometry(window.innerWidth, window.innerHeight);
    var comboMaterial = new THREE.RawShaderMaterial({
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
    var material = new THREE.RawShaderMaterial({
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
        sunPosition: { type: "vec3", value: sunPosition }
      },
      vertexShader: vertexShader.toString(),
      fragmentShader: fragmentShader.toString(),
    });
    geometry.rotateX( - Math.PI / 2 );
    mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);
  });

  // TODO: make use of lights provided by three.js in custom shaders
  // var ambientLight = new THREE.AmbientLight(0x222222);
  // scene.add(ambientLight);
  //
  // var directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
  // scene.add(directionalLight);
  //
  // var pointLight = new THREE.PointLight(0xffffff);
  // pointLight.position.set(-150, -150, 100);
  // scene.add(pointLight);

  promises = [];
  promises.push(readFile(fs, './skyVertexShader.glsl', 'utf8'));
  promises.push(readFile(fs, './skyFragmentShader.glsl', 'utf8'));

  Promise.all(promises)
  .then(values => {
    let vertexShader = values[0];
    let fragmentShader = values[1];
    skyGeometry = new THREE.SphereBufferGeometry(450000, 32, 15);
    let skyMaterial = new THREE.ShaderMaterial({
      vertexShader: vertexShader,
      fragmentShader: fragmentShader,
      uniforms: {
        luminance: { type: "f", value: 1 },
    		turbidity: { type: "f", value: 10 },
    		rayleigh: { type: "f", value: 2 },
    		mieCoefficient: { type: "f", value: 0.005 },
    		mieDirectionalG: { type: "f", value: 0.8 },
    		sunPosition: { type: "vec3", value: sunPosition }
      },
      side: THREE.BackSide
    });
    skyMesh = new THREE.Mesh(skyGeometry, skyMaterial);
    scene.add(skyMesh);
  });

  renderer = new THREE.WebGLRenderer({ alpha: true });
  renderer.context.getExtension('OES_standard_derivatives');
  renderer.setSize(window.innerWidth, window.innerHeight);

  composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass( comboScene, comboCamera ) );
  // TODO: it might be necessary to blur the generated normal map
  // var blurPass = new BlurPass();
  // blurPass.kernelSize = KernelSize.VERY_SMALL;
  // blurPass.resolutionScale = 1.0;
  // blurPass.renderToScreen = true;
  // composer.addPass(blurPass);
  composer.addPass(new SavePass(comboRenderTarget));

  document.body.appendChild(renderer.domElement);

  window.addEventListener('resize', onWindowResize, false);

  document.addEventListener('mousedown', onMouseDown, false);
  document.addEventListener('mouseup', onMouseUp, false);
  document.addEventListener('mousemove', onMouseMove, false);

  togglePointerLock();

  document.addEventListener( 'pointerlockchange', onPointerLockChange, false );
  document.addEventListener( 'pointerlockerror', onPointerLockError, false );

  document.addEventListener( 'keydown', onKeyDown, false );
	document.addEventListener( 'keyup', onKeyUp, false );
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

  controls.getDirection(dir);

  vector.unproject( camera );

  vector.y -= 10;

  let pos = new THREE.Vector3(controls.getObject().position.x, controls.getObject().position.y - 10, controls.getObject().position.z);

  let customDir = vector.sub(pos).normalize();

  let ray = new THREE.Ray(pos, customDir);

  let distance = ray.distanceToPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0)));

  mousePosition.copy(pos.clone().add(customDir.multiplyScalar(distance)));

  if (isMouseDown) {
    heightmapContext.beginPath();
    let centerX = ((mousePosition.x / 256 + 1) / 2) * 2048;
    let centerY = ((mousePosition.z / 256 + 1) / 2) * 2048;
    let radius = 100;
    heightmapContext.arc(centerX, centerY, radius, 0, 2 * Math.PI, false);
    let gradient = heightmapContext.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
    let strength = 1;
    gradient.addColorStop(0, `rgba(${strength}, ${strength}, ${strength}, 1.0)`);
    gradient.addColorStop(1, `rgba(0, 0, 0, 1.0)`);
    heightmapContext.globalCompositeOperation = "lighter";
    heightmapContext.fillStyle = gradient;
    heightmapContext.fill();
    heightmapTexture.needsUpdate = true;
  }
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
