let THREE = require('three');
let OrbitControls = require('three-orbit-controls')(THREE);
let { EffectComposer, RenderPass, BlurPass, KernelSize, SavePass } = require('postprocessing');
let { IsometricPlaneGeometry } = require('./IsometricPlaneGeometry.js')(THREE);
let { remote } = require('electron');
let fs = remote.require('fs');

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

  loader.load(
    './heightmap.png',
    heightmap => {
      fs.readFile('./comboVertexShader.glsl', 'utf8', (err, comboVertexShader) => {
        fs.readFile('./comboFragmentShader.glsl', 'utf8', (err, comboFragmentShader) => {
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
      });
    }
  );

  loader.load(
    './test.jpg',
    texture => {
      fs.readFile('./vertexShader.glsl', 'utf8', (err, vertexShader) => {
        fs.readFile('./fragmentShader.glsl', 'utf8', (err, fragmentShader) => {
          geometry = new IsometricPlaneGeometry(512, 512, 256, 256);
          var material = new THREE.RawShaderMaterial({
            uniforms: {
              comboMap: { type: "t", value: comboRenderTarget.texture },
              displacementScale: { type: "f", value: 128.0 },
              map: { type: "t", value: texture}
            },
            vertexShader: vertexShader.toString(),
            fragmentShader: fragmentShader.toString(),
          });
          mesh = new THREE.Mesh(geometry, material);
          scene.add(mesh);
        });
      });
    }
  );

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
