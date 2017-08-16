#extension GL_OES_standard_derivatives : enable

precision mediump float;

uniform vec3 cameraPosition;

uniform sampler2D comboMap;
uniform sampler2D mixMap;
uniform sampler2D layer0;
uniform sampler2D layer1;
uniform sampler2D layer2;
uniform sampler2D layer3;
uniform sampler2D layer4;
uniform float texScale;
uniform vec3 mousePosition;
uniform vec3 sunPosition;

varying vec3 vPosition;
varying vec2 vTexCoord;
varying vec2 vBaryCoord;
varying vec4 vViewSpacePosition;

float edgeFactor(vec2 vBC, float width) {
  vec3 bary = vec3(vBC.x, vBC.y, 1.0 - vBC.x - vBC.y) * 3.0;
  vec3 d = fwidth(bary);
  vec3 a3 = smoothstep(d * (width - 0.5), d * (width + 0.5), bary);
  return min(min(a3.x, a3.y), a3.z);
}

void main() {
  vec3 N = normalize(texture2D(comboMap, vTexCoord).xyz);
  vec3 L = normalize(sunPosition);
  vec4 rgba = texture2D(mixMap, vTexCoord);
  vec3 color = texture2D(layer0, vTexCoord * texScale).rgb;
  color = mix(color, texture2D(layer1, vTexCoord * texScale).rgb, rgba.r);
  color = mix(color, texture2D(layer2, vTexCoord * texScale).rgb, rgba.g);
  color = mix(color, texture2D(layer3, vTexCoord * texScale).rgb, rgba.b);
  color = mix(color, texture2D(layer4, vTexCoord * texScale).rgb, rgba.a);

  vec3 c = color * max(dot(N, L), 0.0);

  vec3 mpos = vec3(mousePosition.x, vPosition.y, mousePosition.z);

  vec3 fogColor = vec3(0.5, 0.5, 0.5);
  float dist = length(vViewSpacePosition);
  float be = 0.025 * smoothstep(0.0, 6.0, 32.0 - vViewSpacePosition.z);
  float bi = 0.075 * smoothstep(0.0, 80.0, 10.0 - vViewSpacePosition.z);
  float ext = exp(-dist * be);
  float insc = exp(-dist * bi);

  if (length(vPosition - mpos) < 15.0) {
    c = mix(mix(vec3(0.0), c, edgeFactor(vBaryCoord, 0.5)), c, pow(length(vPosition - mpos) / 15.0, 8.0));
  }

  if (false) {
    c = c * ext + fogColor * (1.0 - insc);
  }

  gl_FragColor = vec4(c, 1.0);
}
