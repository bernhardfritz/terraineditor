precision mediump float;

uniform sampler2D comboMap;
uniform sampler2D mixMap;
uniform sampler2D layer0;
uniform sampler2D layer1;
uniform sampler2D layer2;
uniform sampler2D layer3;
uniform sampler2D layer4;

uniform float texScale;

varying vec2 vTexCoord;

void main() {
  vec3 N = normalize(texture2D(comboMap, vTexCoord).xyz);
  vec3 L = vec3(-1.0, -1.0, 1.0);
  vec4 rgba = texture2D(mixMap, vTexCoord).rgba;
  vec3 color = texture2D(layer0, vTexCoord * texScale).rgb;
  color = mix(color, texture2D(layer1, vTexCoord * texScale).rgb, rgba.r);
  color = mix(color, texture2D(layer2, vTexCoord * texScale).rgb, rgba.g);
  color = mix(color, texture2D(layer3, vTexCoord * texScale).rgb, rgba.b);
  color = mix(color, texture2D(layer4, vTexCoord * texScale).rgb, rgba.a);

  gl_FragColor = vec4(color * max(dot(N, L), 0.0), 1.0);
}
