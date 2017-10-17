const fs = require('fs');
const { readFile } = require('./utils.js');

module.exports = function(THREE) {
  const distance = 9000.0;

  class Sky {
    constructor() {
      this._uniforms = {
        turbidity: { type: "f", value: 10.0 },
        rayleigh: { type: "f", value: 2.0 },
        mieCoefficient: { type: "f", value: 0.005 },
        mieDirectionalG: { type: "f", value: 0.8 },
        luminance: { type: "f", value: 1.0 },
        sunPosition: { type: "vec3", value: new THREE.Vector3() }
      };
      this._inclination = 0.0;
      this._azimuth = 0.0;
    }

    init(scene, target) {
      this.updateSun();

      let promises = [];
      promises.push(readFile(fs, './shaders/skyVertexShader.glsl', 'utf8'));
      promises.push(readFile(fs, './shaders/skyFragmentShader.glsl', 'utf8'));

      Promise.all(promises)
      .then(values => {
        let vertexShader = values[0];
        let fragmentShader = values[1];
        let geometry = new THREE.SphereBufferGeometry(9990, 32, 15);
        let material = new THREE.ShaderMaterial({
          vertexShader: vertexShader,
          fragmentShader: fragmentShader,
          uniforms: this._uniforms,
          side: THREE.BackSide
        });
        let mesh = new THREE.Mesh(geometry, material);
        target.add(mesh);
        // let sunGeometry = new THREE.SphereBufferGeometry(200, 32, 15);
        // let sunMaterial = new THREE.MeshBasicMaterial( { color: 0xffffff } );
        // this._sunMesh = new THREE.Mesh(sunGeometry, sunMaterial);
        // this._sunMesh.position.copy(this.sunPosition);
        // scene.add(this._sunMesh);
      });
    }

    updateSun() {
      let theta = Math.PI * (this.inclination - 0.5);
      let phi = 2 * Math.PI * (this.azimuth - 0.5);
      this.sunPosition.x = distance * Math.cos(phi);
      this.sunPosition.y = distance * Math.sin(phi) * Math.sin(theta);
      this.sunPosition.z = distance * Math.sin(phi) * Math.cos(theta);
      if (this._sunMesh) {
        this._sunMesh.position.copy(this.sunPosition);
      }
    }

    get turbidity() {
      return this._uniforms.turbidity.value;
    }

    set turbidity(turbidity) {
      this._uniforms.turbidity.value = turbidity;
    }

    get rayleigh() {
      return this._uniforms.rayleigh.value;
    }

    set rayleigh(rayleigh) {
      this._uniforms.rayleigh.value = rayleigh;
    }

    get mieCoefficient() {
      return this._uniforms.mieCoefficient.value;
    }

    set mieCoefficient(mieCoefficient) {
      this._uniforms.mieCoefficient.value = mieCoefficient;
    }

    get mieDirectionalG() {
      return this._uniforms.mieDirectionalG.value;
    }

    set mieDirectionalG(mieDirectionalG) {
      this._uniforms.mieDirectionalG.value = mieDirectionalG;
    }

    get luminance() {
      return this._uniforms.luminance.value;
    }

    set luminance(luminance) {
      this._uniforms.luminance.value = luminance;
    }

    get inclination() {
      return this._inclination;
    }

    set inclination(inclination) {
      this._inclination = inclination;
      this.updateSun();
    }

    get azimuth() {
      return this._azimuth;
    }

    set azimuth(azimuth) {
      this._azimuth = azimuth;
      this.updateSun();
    }

    get sunPosition() {
      return this._uniforms.sunPosition.value;
    }
  }

  return {
    Sky
  };
};
