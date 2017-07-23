precision highp float;

attribute vec3 position;
attribute vec3 normal;
attribute vec2 uv;

uniform mat4 projectionMatrix;
uniform mat4 modelViewMatrix;
uniform mat4 normalMatrix;

uniform sampler2D comboMap;
uniform float displacementScale;

varying vec2 vTexCoord;

void main() {
  float displacement = texture2D(comboMap, uv).a * displacementScale;

  vec3 newPosition = position + normal * displacement;

  vTexCoord = uv;

  gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
}
