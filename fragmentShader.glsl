#extension GL_OES_standard_derivatives : enable

precision mediump float;

uniform mat3 normalMatrix;

uniform sampler2D comboMap;
uniform sampler2D mixMap;
uniform sampler2D layer0;
uniform sampler2D layer1;
uniform sampler2D layer2;
uniform sampler2D layer3;
uniform sampler2D layer4;
uniform float texScale;
uniform vec3 mousePosition;
uniform float radius;
uniform int controlsEnabled;

varying vec3 vPosition;
varying vec2 vTexCoord;
varying vec2 vBaryCoord;
varying vec3 vViewSpacePosition;
varying vec3 vL;
varying vec3 vV;

const float radiusFactor = 0.13;

float edgeFactor(vec2 vBC, float width) {
  vec3 bary = vec3(vBC.x, vBC.y, 1.0 - vBC.x - vBC.y) * 3.0;
  vec3 d = fwidth(bary);
  vec3 a3 = smoothstep(d * (width - 0.5), d * (width + 0.5), bary);
  return min(min(a3.x, a3.y), a3.z);
}

void main() {
  vec3 N = normalize(normalMatrix * normalize(texture2D(comboMap, vTexCoord).rgb * 2.0 - 1.0)); // reversing the positive rgb values transformation
  vec3 L = normalize(vL);
  vec3 V = normalize(vV);
  vec3 H = normalize(L + V);
  vec4 rgba = texture2D(mixMap, vTexCoord);
  vec3 color = texture2D(layer0, vTexCoord * texScale).rgb;
  color = mix(color, texture2D(layer1, vTexCoord * texScale).rgb, rgba.r);
  color = mix(color, texture2D(layer2, vTexCoord * texScale).rgb, rgba.g);
  color = mix(color, texture2D(layer3, vTexCoord * texScale).rgb, rgba.b);
  color = mix(color, texture2D(layer4, vTexCoord * texScale).rgb, rgba.a);

  vec3 ambient = vec3(0.05, 0.05, 0.05);
  vec3 diffuse = color * max(dot(N, L), 0.0);
  float shininess = 8.0;
  vec3 lightColor = vec3(1.0, 1.0, 1.0);
  vec3 specular = lightColor * pow(max(dot(N, H), 0.0), shininess);
  vec3 c = ambient + diffuse + 0.025 * specular;

  vec3 mpos = vec3(mousePosition.x, vPosition.y, mousePosition.z);

  vec3 fogColor = vec3(0.5, 0.5, 0.5);
  float dist = length(vViewSpacePosition);
  float be = 0.025 * smoothstep(0.0, 6.0, 32.0 - vViewSpacePosition.z);
  float bi = 0.075 * smoothstep(0.0, 80.0, 10.0 - vViewSpacePosition.z);
  float ext = exp(-dist * be);
  float insc = exp(-dist * bi);

  if (controlsEnabled == 0 && length(vPosition - mpos) < radius * radiusFactor) {
    c = mix(mix(vec3(0.0), c, edgeFactor(vBaryCoord, 0.5)), c, pow(length(vPosition - mpos) / (radius * radiusFactor), 8.0));
  }

  if (false) {
    c = c * ext + fogColor * (1.0 - insc);
  }

  gl_FragColor = vec4(c, 1.0);
}
