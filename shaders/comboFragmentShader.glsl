#extension GL_OES_standard_derivatives : enable

precision mediump float;

uniform sampler2D displacementMap;
uniform float displacementScale;
uniform mat3 normalMatrix;

varying vec2 vTexCoord;

float getDisplacement(float dx, float dy) {
	return texture2D(displacementMap, vTexCoord + vec2(dFdx(vTexCoord.x) * dx, dFdy(vTexCoord.y) * dy)).r;
}

void main() {
  vec3 normal;
  normal.x = -0.5 * (getDisplacement(1.0, 0.0) - getDisplacement(-1.0, 0.0));
	normal.y = 1.0 / displacementScale;
	normal.z = -0.5 * (getDisplacement(0.0, 1.0) - getDisplacement(0.0, -1.0));
	normal.z = -normal.z;
	normal = normalize(normalMatrix * normal);
	normal = (normal + 1.0) * 0.5; // this is necessary since rgb values need to be positive

  gl_FragColor = vec4(normal, getDisplacement(0.0, 0.0));
}
