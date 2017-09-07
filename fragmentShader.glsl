#extension GL_OES_standard_derivatives : enable

precision mediump float;

uniform mat3 normalMatrix;

uniform sampler2D comboMap;
uniform sampler2D mixMap;
uniform sampler2D diffuseLayer0;
uniform sampler2D diffuseLayer1;
uniform sampler2D diffuseLayer2;
uniform sampler2D diffuseLayer3;
uniform sampler2D diffuseLayer4;
uniform sampler2D normalLayer0;
uniform sampler2D normalLayer1;
uniform sampler2D normalLayer2;
uniform sampler2D normalLayer3;
uniform sampler2D normalLayer4;
uniform sampler2D specularCombo0;
uniform sampler2D specularCombo1;
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

const float RADIUS_FACTOR = 0.13;
const float SHININESS_FACTOR = 8.0;
const vec3 LIGHT_COLOR = vec3(1.0);
const vec3 AMBIENT_COLOR = vec3(0.01);

const int WITH_NORMALMAP_UNSIGNED = 1;
const int WITH_NORMALMAP_2CHANNEL = 0;
const int WITH_NORMALMAP_GREEN_UP = 1;

vec3 mixLayers(sampler2D layer0, sampler2D layer1, sampler2D layer2, sampler2D layer3, sampler2D layer4, sampler2D mixMap, vec2 texCoord, float texScale) {
  vec4 rgba = texture2D(mixMap, texCoord);
  vec3 m = texture2D(layer0, texCoord * texScale).rgb;
  m = mix(m, texture2D(layer1, texCoord * texScale).rgb, rgba.r);
  m = mix(m, texture2D(layer2, texCoord * texScale).rgb, rgba.g);
  m = mix(m, texture2D(layer3, texCoord * texScale).rgb, rgba.b);
  m = mix(m, texture2D(layer4, texCoord * texScale).rgb, rgba.a);
  return m;
}

float mixSpecularCombo(sampler2D specularCombo0, sampler2D specularCombo1, sampler2D mixMap, vec2 texCoord, float texScale) {
  vec4 rgba = texture2D(mixMap, texCoord);
  vec3 s0 = texture2D(specularCombo0, texCoord * texScale).rgb;
  vec2 s1 = texture2D(specularCombo1, texCoord * texScale).rg;
  float m = s0.r;
  m = mix(m, s0.g, rgba.r);
  m = mix(m, s0.b, rgba.g);
  m = mix(m, s1.r, rgba.b);
  m = mix(m, s1.g, rgba.a);
  return m;
}

float edgeFactor(vec2 vBC, float width) {
  vec3 bary = vec3(vBC.x, vBC.y, 1.0 - vBC.x - vBC.y) * 3.0;
  vec3 d = fwidth(bary);
  vec3 a3 = smoothstep(d * (width - 0.5), d * (width + 0.5), bary);
  return min(min(a3.x, a3.y), a3.z);
}

mat3 cotangent_frame(vec3 N, vec3 p, vec2 uv) {
    // get edge vectors of the pixel triangle
    vec3 dp1 = dFdx(p);
    vec3 dp2 = dFdy(p);
    vec2 duv1 = dFdx(uv);
    vec2 duv2 = dFdy(uv);

    // solve the linear system
    vec3 dp2perp = cross(dp2, N);
    vec3 dp1perp = cross(N, dp1);
    vec3 T = dp2perp * duv1.x + dp1perp * duv2.x;
    vec3 B = dp2perp * duv1.y + dp1perp * duv2.y;

    // construct a scale-invariant frame
    float invmax = inversesqrt(max(dot(T,T), dot(B,B)));
    return mat3(T * invmax, B * invmax, N);
}

vec3 perturb_normal(vec3 N, vec3 V, vec2 texcoord) {
    // assume N, the interpolated vertex normal and
    // V, the view vector (vertex to eye)
    vec3 map = mixLayers(normalLayer0, normalLayer1, normalLayer2, normalLayer3, normalLayer4, mixMap, vTexCoord, texScale);
    if (WITH_NORMALMAP_UNSIGNED == 1) {
      map = map * 255./127. - 128./127.;
    }
    if (WITH_NORMALMAP_2CHANNEL == 1) {
      map.z = sqrt(1. - dot(map.xy, map.xy));
    }
    if (WITH_NORMALMAP_GREEN_UP == 1) {
      map.y = -map.y;
    }
    mat3 TBN = cotangent_frame(N, -V, texcoord);
    return normalize(TBN * map);
}

void main() {
  vec3 N = texture2D(comboMap, vTexCoord).rgb * 2.0 - 1.0;
  N = normalize(normalMatrix * normalize(N)); // reversing the positive rgb values transformation
  N = perturb_normal(N, -vV, vTexCoord * texScale);
  vec3 L = normalize(vL);
  vec3 V = normalize(vV);
  vec3 H = normalize(L + V);
  float NdotL = max(dot(N, L), 0.0);
  float NdotH = max(dot(N, H), 0.0);
  NdotH = NdotL != 0.0 ? NdotH : 0.0;
  NdotH = pow(NdotH, SHININESS_FACTOR);

  vec3 ambient = AMBIENT_COLOR;
  vec3 diffuseColor = mixLayers(diffuseLayer0, diffuseLayer1, diffuseLayer2, diffuseLayer3, diffuseLayer4, mixMap, vTexCoord, texScale);
  vec3 diffuse = diffuseColor * NdotL;
  float specularIntensity = mixSpecularCombo(specularCombo0, specularCombo1, mixMap, vTexCoord, texScale);
  vec3 specular = LIGHT_COLOR * specularIntensity * NdotH;
  vec3 c = ambient + diffuse + specular;

  vec3 mpos = vec3(mousePosition.x, vPosition.y, mousePosition.z);

  vec3 fogColor = vec3(0.5, 0.5, 0.5);
  float dist = length(vViewSpacePosition);
  float be = 0.0003 * smoothstep(0.0, 6.0, 32.0 - vViewSpacePosition.z);
  float bi = 0.0009 * smoothstep(0.0, 80.0, 10.0 - vViewSpacePosition.z);
  float ext = exp(-dist * be);
  float insc = exp(-dist * bi);

  if (controlsEnabled == 0 && length(vPosition - mpos) < radius * RADIUS_FACTOR) {
    c = mix(mix(vec3(0.0), c, edgeFactor(vBaryCoord, 0.5)), c, pow(length(vPosition - mpos) / (radius * RADIUS_FACTOR), 8.0));
  }

  if (true) {
    c = c * ext + fogColor * (1.0 - insc);
  }

  gl_FragColor = vec4(c, 1.0);
}
