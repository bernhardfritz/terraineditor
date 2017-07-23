precision mediump float;

uniform sampler2D comboMap;
uniform sampler2D map;

varying vec2 vTexCoord;

void main() {
  vec3 N = normalize(texture2D(comboMap, vTexCoord).xyz);
  vec3 L = vec3(-1.0, -1.0, 1.0);
  vec3 color = texture2D(map, vTexCoord).xyz;

  gl_FragColor = vec4(color * max(dot(N, L), 0.0), 1.0);
}
