let THREE = require('three');
let OrbitControls = require('three-orbit-controls')(THREE);
let { EffectComposer, RenderPass, BlurPass, KernelSize, SavePass } = require('postprocessing');
let { IsometricPlaneGeometry } = require('./IsometricPlaneGeometry.js')(THREE);
let { remote } = require('electron');
let fs = remote.require('fs');
let { readFile, load } = require('./utils.js');

let comboRenderTarget;
let comboCamera, comboScene;
let comboGeometry, comboMaterial, comboMesh;

let camera, controls, scene, renderer;
let geometry, loader, material, mesh;

let composer, hblur, vblur;

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

  camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 1, 10000);
  camera.position.z = 1000;

  controls = new OrbitControls(camera);

  scene = new THREE.Scene();

  let promises = [];
  promises.push(load(loader, './heightmap.png'));
  promises.push(readFile(fs, './comboVertexShader.glsl', 'utf8'));
  promises.push(readFile(fs, './comboFragmentShader.glsl', 'utf8'));

  Promise.all(promises)
  .then(values => {
    let heightmap = values[0];
    let comboVertexShader = values[1];
    let comboFragmentShader = values[2];

    comboGeometry = new THREE.PlaneGeometry(window.innerWidth, window.innerHeight);
    var comboMaterial = new THREE.RawShaderMaterial({
      uniforms: {
        displacementMap: { type: "t", value: heightmap },
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

    geometry = new IsometricPlaneGeometry(512, 512, 256, 256);
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
        texScale: { type: "f", value: 32.0 }
      },
      vertexShader: vertexShader.toString(),
      fragmentShader: fragmentShader.toString(),
    });
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
};

const animate = () => {
  requestAnimationFrame(animate);

  composer.render(); // TODO: render to texture only when terrain gets modified instead of every frame
  renderer.render(scene, camera);
};

const onWindowResize = () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
};

init();
animate();
