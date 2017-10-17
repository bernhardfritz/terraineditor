const fragment = [
  'uniform sampler2D tDiffuse;',
  'uniform float opacity;',

  'varying vec2 vUv;',

  'const float gamma = 2.2;',

  'const float brightness = 0.0;',
  'const float contrast = 1.5;',
  'const float saturation = 1.5;',

  'const float A = 0.15;',
  'const float B = 0.50;',
  'const float C = 0.10;',
  'const float D = 0.20;',
  'const float E = 0.02;',
  'const float F = 0.30;',
  'const float W = 11.2;',
  'const float exposure = 2.;',
  'const float white = ((W * (A * W + C * B) + D * E) / (W * (A * W + B) + D * F)) - E / F;',

  'vec3 MyUncharted2ToneMapping(vec3 color) {',
    'color *= exposure;',
    'color = ((color * (A * color + C * B) + D * E) / (color * (A * color + B) + D * F)) - E / F;',
    'color /= white;',
    'color = pow(color, vec3(1. / gamma));',
    'return color;',
  '}',

  'mat4 brightnessMatrix(float brightness) {',
    'return mat4(1, 0, 0, 0,',
                '0, 1, 0, 0,',
                '0, 0, 1, 0,',
                'brightness, brightness, brightness, 1 );',
  '}',

  'mat4 contrastMatrix(float contrast) {',
    'float t = (1.0 - contrast) / 2.0;',

    'return mat4(contrast, 0, 0, 0,',
                '0, contrast, 0, 0,',
                '0, 0, contrast, 0,',
                't, t, t, 1 );',
  '}',

  'mat4 saturationMatrix(float saturation) {',
    'vec3 luminance = vec3(0.3086, 0.6094, 0.0820);',

    'float oneMinusSat = 1.0 - saturation;',

    'vec3 red = vec3( luminance.x * oneMinusSat );',
    'red += vec3( saturation, 0, 0 );',

    'vec3 green = vec3( luminance.y * oneMinusSat);',
    'green += vec3( 0, saturation, 0 );',

    'vec3 blue = vec3( luminance.z * oneMinusSat );',
    'blue += vec3( 0, 0, saturation );',

    'return mat4(red,     0,',
                'green,   0,',
                'blue,    0,',
                '0, 0, 0, 1 );',
  '}',

  'void main() {',
    'vec4 texel = texture2D(tDiffuse, vUv);',

    'texel = vec4(MyUncharted2ToneMapping(texel.rgb), texel.a);',

    'texel = brightnessMatrix( brightness ) *',
        		'contrastMatrix( contrast ) *',
        		'saturationMatrix( saturation ) *',
        		'texel;',

    'gl_FragColor = opacity * texel;',

  '}'
].join('\n');

const vertex = [
  'varying vec2 vUv;',

  'void main() {',

  '  vUv = uv;',
  '  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);',

  '}'
].join('\n');

module.exports = (THREE) => {
  /**
   * A simple copy shader material.
   */

  class MyMaterial extends THREE.ShaderMaterial {

  	/**
  	 * Constructs a new copy material.
  	 */

  	constructor() {

      super({

  			type: "MyMaterial",

  			uniforms: {

  				tDiffuse: new THREE.Uniform(null),
  				opacity: new THREE.Uniform(1.0)

  			},

  			fragmentShader: fragment,
  			vertexShader: vertex,

  			depthWrite: false,
  			depthTest: false

  		});

  	}

  }

  return {
    MyMaterial
  };
};
