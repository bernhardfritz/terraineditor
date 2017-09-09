let THREE = require('three');
let { PointerLockControls } = require('./PointerLockControls.js')(THREE);
let { EffectComposer, RenderPass, BlurPass, KernelSize, SavePass, ToneMappingPass, BloomPass, BokehPass, SMAAPass } = require('postprocessing');
let { UnindexedIsometricPlaneBufferGeometry } = require('./UnindexedIsometricPlaneGeometry.js')(THREE);
let { remote } = require('electron');
let fs = remote.require('fs');
let { readFile, load, image } = require('./utils.js');
let { Sky } = require('./sky.js')(THREE);
let dat = require('./dat.gui.min.js');
let Stats = require('./stats.min.js');
let { MyPass } = require('./MyPass.js')(THREE);

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

let composer2;

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
  sky.azimuth = 0.27;

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
  promises.push(load(loader, './free_3d_textures_pack_08_by_nobiax-d3awoah/pattern_42/diffus.png'));
  promises.push(load(loader, './free_3d_textures_pack_08_by_nobiax-d3awoah/pattern_43/diffus.png'));
  promises.push(load(loader, './free_3d_textures_pack_08_by_nobiax-d3awoah/pattern_44/diffus.png'));
  promises.push(load(loader, './free_3d_textures_pack_08_by_nobiax-d3awoah/pattern_45/diffus.png'));
  promises.push(load(loader, './free_3d_textures_pack_08_by_nobiax-d3awoah/pattern_46/diffus.png'));
  promises.push(load(loader,'./free_3d_textures_pack_08_by_nobiax-d3awoah/pattern_42/normal.png'));
  promises.push(load(loader, './free_3d_textures_pack_08_by_nobiax-d3awoah/pattern_43/normal.png'));
  promises.push(load(loader, './free_3d_textures_pack_08_by_nobiax-d3awoah/pattern_44/normal.png'));
  promises.push(load(loader, './free_3d_textures_pack_08_by_nobiax-d3awoah/pattern_45/normal.png'));
  promises.push(load(loader, './free_3d_textures_pack_08_by_nobiax-d3awoah/pattern_46/normal.png'));
  promises.push(image('./free_3d_textures_pack_08_by_nobiax-d3awoah/pattern_42/specular.png'));
  promises.push(image('./free_3d_textures_pack_08_by_nobiax-d3awoah/pattern_43/specular.png'));
  promises.push(image('./free_3d_textures_pack_08_by_nobiax-d3awoah/pattern_44/specular.png'));
  promises.push(image('./free_3d_textures_pack_08_by_nobiax-d3awoah/pattern_45/specular.png'));
  promises.push(image('./free_3d_textures_pack_08_by_nobiax-d3awoah/pattern_46/specular.png'));
  promises.push(readFile(fs, './vertexShader.glsl', 'utf8'));
  promises.push(readFile(fs, './fragmentShader.glsl', 'utf8'));

  Promise.all(promises)
  .then(values => {
    let mixMap  = values[0];
    let diffuseLayer0 = values[1];
    let diffuseLayer1 = values[2];
    let diffuseLayer2 = values[3];
    let diffuseLayer3 = values[4];
    let diffuseLayer4 = values[5];
    let normalLayer0 = values[6];
    let normalLayer1 = values[7];
    let normalLayer2 = values[8];
    let normalLayer3 = values[9];
    let normalLayer4 = values[10];
    let specularImage0 = values[11];
    let specularImage1 = values[12];
    let specularImage2 = values[13];
    let specularImage3 = values[14];
    let specularImage4 = values[15];
    let vertexShader = values[16];
    let fragmentShader = values[17];

    let specularCanvas0 = document.createElement('canvas');
    let specularCanvas1 = document.createElement('canvas');
    let specularCanvas2 = document.createElement('canvas');
    let specularCanvas3 = document.createElement('canvas');
    let specularCanvas4 = document.createElement('canvas');
    let specularComboCanvas0 = document.createElement('canvas');
    let specularComboCanvas1 = document.createElement('canvas');

    document.body.appendChild(specularCanvas0);
    document.body.appendChild(specularCanvas1);
    document.body.appendChild(specularCanvas2);
    document.body.appendChild(specularCanvas3);
    document.body.appendChild(specularCanvas4);
    document.body.appendChild(specularComboCanvas0);
    document.body.appendChild(specularComboCanvas1);

    specularCanvas0.width = specularImage0.width;
    specularCanvas0.height = specularImage0.height;
    specularCanvas1.width = specularImage1.width;
    specularCanvas1.height = specularImage1.height;
    specularCanvas2.width = specularImage2.width;
    specularCanvas2.height = specularImage2.height;
    specularCanvas3.width = specularImage3.width;
    specularCanvas3.height = specularImage3.height;
    specularCanvas4.width = specularImage4.width;
    specularCanvas4.height = specularImage4.height;
    specularComboCanvas0.width = specularImage0.width;
    specularComboCanvas0.height = specularImage0.height;
    specularComboCanvas1.width = specularImage1.width;
    specularComboCanvas1.height = specularImage1.height;

    let specularContext0 = specularCanvas0.getContext('2d');
    let specularContext1 = specularCanvas1.getContext('2d');
    let specularContext2 = specularCanvas2.getContext('2d');
    let specularContext3 = specularCanvas3.getContext('2d');
    let specularContext4 = specularCanvas4.getContext('2d');
    let specularComboContext0 = specularComboCanvas0.getContext('2d');
    let specularComboContext1 = specularComboCanvas1.getContext('2d');

    specularContext0.drawImage(specularImage0, 0, 0);
    specularContext1.drawImage(specularImage1, 0, 0);
    specularContext2.drawImage(specularImage2, 0, 0);
    specularContext3.drawImage(specularImage3, 0, 0);
    specularContext4.drawImage(specularImage4, 0, 0);

    let specularImageData0 = specularContext0.getImageData(0, 0, specularCanvas0.width, specularCanvas0.height);
    let specularImageData1 = specularContext1.getImageData(0, 0, specularCanvas1.width, specularCanvas1.height);
    let specularImageData2 = specularContext2.getImageData(0, 0, specularCanvas2.width, specularCanvas2.height);
    let specularImageData3 = specularContext3.getImageData(0, 0, specularCanvas3.width, specularCanvas3.height);
    let specularImageData4 = specularContext4.getImageData(0, 0, specularCanvas4.width, specularCanvas4.height);
    let specularComboImageData0 = specularComboContext0.createImageData(specularComboCanvas0.width, specularComboCanvas0.height);
    let specularComboImageData1 = specularComboContext1.createImageData(specularComboCanvas1.width, specularComboCanvas1.height);

    for (var i = 0; i < specularImageData0.data.length; i += 4) {
      specularComboImageData0.data[i + 0] = specularImageData0.data[i + 0];
      specularComboImageData0.data[i + 1] = specularImageData1.data[i + 0];
      specularComboImageData0.data[i + 2] = specularImageData2.data[i + 0];
      specularComboImageData0.data[i + 3] = 255;
      specularComboImageData1.data[i + 0] = specularImageData3.data[i + 0];
      specularComboImageData1.data[i + 1] = specularImageData4.data[i + 0];
      specularComboImageData1.data[i + 2] = 0;
      specularComboImageData1.data[i + 3] = 255;
    }

    specularComboContext0.putImageData(specularComboImageData0, 0, 0);
    specularComboContext1.putImageData(specularComboImageData1, 0, 0);

    let specularCombo0 = new THREE.Texture(specularComboCanvas0);
    let specularCombo1 = new THREE.Texture(specularComboCanvas1);

    specularCombo0.needsUpdate = true;
    specularCombo1.needsUpdate = true;

    diffuseLayer0.wrapS = diffuseLayer0.wrapT = THREE.RepeatWrapping;
    diffuseLayer1.wrapS = diffuseLayer1.wrapT = THREE.RepeatWrapping;
    diffuseLayer2.wrapS = diffuseLayer2.wrapT = THREE.RepeatWrapping;
    diffuseLayer3.wrapS = diffuseLayer3.wrapT = THREE.RepeatWrapping;
    diffuseLayer4.wrapS = diffuseLayer4.wrapT = THREE.RepeatWrapping;
    normalLayer0.wrapS = normalLayer0.wrapT = THREE.RepeatWrapping;
    normalLayer1.wrapS = normalLayer1.wrapT = THREE.RepeatWrapping;
    normalLayer2.wrapS = normalLayer2.wrapT = THREE.RepeatWrapping;
    normalLayer3.wrapS = normalLayer3.wrapT = THREE.RepeatWrapping;
    normalLayer4.wrapS = normalLayer4.wrapT = THREE.RepeatWrapping;
    specularCombo0.wrapS = specularCombo0.wrapT = THREE.RepeatWrapping;
    specularCombo1.wrapS = specularCombo1.wrapT = THREE.RepeatWrapping;

    // let maxAnisotropy = renderer.getMaxAnisotropy();
    // diffuseLayer0.anisotropy = maxAnisotropy;
    // diffuseLayer1.anisotropy = maxAnisotropy;
    // diffuseLayer2.anisotropy = maxAnisotropy;
    // diffuseLayer3.anisotropy = maxAnisotropy;
    // diffuseLayer4.anisotropy = maxAnisotropy;

    geometry = new UnindexedIsometricPlaneBufferGeometry(512, 512, 256, 256);
    material = new THREE.RawShaderMaterial({
      uniforms: {
        comboMap: { type: "t", value: comboRenderTarget.texture },
        displacementScale: { type: "f", value: 196.0 },
        mixMap: { type: "t", value: mixMap },
        diffuseLayer0: { type: "t", value: diffuseLayer0 },
        diffuseLayer1: { type: "t", value: diffuseLayer1 },
        diffuseLayer2: { type: "t", value: diffuseLayer2 },
        diffuseLayer3: { type: "t", value: diffuseLayer3 },
        diffuseLayer4: { type: "t", value: diffuseLayer4 },
        normalLayer0: {type: "t", value: normalLayer0 },
        normalLayer1: {type: "t", value: normalLayer1 },
        normalLayer2: {type: "t", value: normalLayer2 },
        normalLayer3: {type: "t", value: normalLayer3 },
        normalLayer4: {type: "t", value: normalLayer4 },
        specularCombo0: {type: "t", value: specularCombo0 },
        specularCombo1: {type: "t", value: specularCombo1 },
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

  composer2 = new EffectComposer(renderer);
  composer2.addPass(new RenderPass(scene, camera));
  let bloomPass = new BloomPass({
    resolutionScale: 1.0,
    kernelSize: 5,
    intensity: 0.18,
    distinction: 0.5,
    screenMode: true
  });
  // bloomPass.renderToScreen = true;
  composer2.addPass(bloomPass);
  let myPass = new MyPass();
  // myPass.renderToScreen = true;
  composer2.addPass(myPass);
  let smaa = new SMAAPass(window.Image);
  smaa.renderToScreen = true;
  composer2.addPass(smaa);

  let bloomFolder = gui.addFolder('Bloom');
  // bloomFolder.add(bloomPass, 'resolutionScale', 0.0, 1.0).step(0.01);
  bloomFolder.add(bloomPass, 'kernelSize', 0, 5).step(1);
  bloomFolder.add(bloomPass, 'intensity', 0.0, 3.0).step(0.01);
  bloomFolder.add(bloomPass, 'distinction', 0.0, 10.0).step(0.01);

  document.body.appendChild(renderer.domElement);

  window.addEventListener('resize', onWindowResize, false);

  document.addEventListener('mousedown', onMouseDown, false);
  document.addEventListener('mouseup', onMouseUp, false);
  document.addEventListener('mousemove', onMouseMove, false);

  document.addEventListener('pointerlockchange', onPointerLockChange, false);
  document.addEventListener('pointerlockerror', onPointerLockError, false);

  document.addEventListener('keydown', onKeyDown, false);
	document.addEventListener('keyup', onKeyUp, false);

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

  // sky.azimuth = sky.azimuth + delta / 10000;
  // if (sky.azimuth > 1.0) {
  //   sky.azimuth = 0.0;
  // }

  prevTime = time;

  composer.render(); // TODO: render to texture only when terrain gets modified instead of every frame
  composer2.render();
  // renderer.render(scene, camera);

  stats.end();
};

const onWindowResize = () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
  composer2.setSize(window.innerWidth, window.innerHeight);
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
