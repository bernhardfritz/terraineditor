let { Pass } = require("postprocessing");

module.exports = (THREE) => {
  let { MyMaterial } = require("./MyMaterial.js")(THREE);

  class MyPass extends Pass {

  	constructor() {

  		super();

  		this.name = "MyPass";
  		this.needsSwap = true;
  		this.material = new MyMaterial();
  		this.quad.material = this.material;

  	}

  	render(renderer, readBuffer, writeBuffer) {

  		this.material.uniforms.tDiffuse.value = readBuffer.texture;
  		renderer.render(this.scene, this.camera, this.renderToScreen ? null : writeBuffer);

  	}

  }

  return {
    MyPass
  };
};
