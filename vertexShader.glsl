precision highp float;

attribute vec3 position;
attribute vec2 uv;
attribute vec2 bc;

uniform mat4 projectionMatrix;
uniform mat4 modelViewMatrix;
uniform vec3 cameraPosition;

uniform sampler2D comboMap;
uniform float displacementScale;
uniform vec3 sunPosition;

varying vec3 vPosition;
varying vec2 vTexCoord;
varying vec2 vBaryCoord;
varying vec3 vViewSpacePosition;
varying vec3 vL;
varying vec3 vV;

void main() {
  float displacement = texture2D(comboMap, uv).a * displacementScale;

  vec3 newPosition = position + vec3(0, 1, 0) * displacement;
  vec4 viewSpacePosition = modelViewMatrix * vec4(newPosition, 1.0);

  vPosition = newPosition;
  vTexCoord = uv;
  vBaryCoord = bc;
  vViewSpacePosition = viewSpacePosition.xyz;
  vL = normalize(vec3(modelViewMatrix * vec4(normalize(sunPosition), 0.0)));
  vV = normalize(vec3(modelViewMatrix * vec4(normalize(cameraPosition - vPosition), 0.0)));

  gl_Position = projectionMatrix * viewSpacePosition;
}
