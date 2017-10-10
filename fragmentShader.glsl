#extension GL_OES_standard_derivatives : enable

precision mediump float;

uniform mat3 normalMatrix;

uniform sampler2D comboMap;
uniform sampler2D splatMap;
uniform sampler2D diffuseLayers[4];
uniform sampler2D normalLayers[4];
uniform sampler2D specularLayers[4];
uniform float texScale;
uniform vec3 mousePosition;
uniform float radius;
uniform int mode;

varying vec3 vPosition;
varying vec2 vTexCoord;
varying vec2 vBaryCoord;
varying vec3 vViewSpacePosition;
varying vec3 vL;
varying vec3 vV;

const float RADIUS_FACTOR = 0.13;
const float SHININESS_FACTOR = 8.0;
const vec3 LIGHT_COLOR = vec3(1.0, 0.894117647058824, 0.8);
const vec3 AMBIENT_COLOR = 0.01 * LIGHT_COLOR;
const float RING_THRESHOLD = 0.33;

const int WITH_NORMALMAP_UNSIGNED = 1;
const int WITH_NORMALMAP_2CHANNEL = 0;
const int WITH_NORMALMAP_GREEN_UP = 1;

vec3 mixLayersToVec3(sampler2D[4] layers, sampler2D splatMap, vec2 texCoord, float texScale) {
  vec3 rgb = texture2D(splatMap, texCoord).rgb;
  vec3 m = texture2D(layers[0], texCoord * texScale).rgb;
  m = mix(m, texture2D(layers[1], texCoord * texScale).rgb, rgb.r);
  m = mix(m, texture2D(layers[2], texCoord * texScale).rgb, rgb.g);
  m = mix(m, texture2D(layers[3], texCoord * texScale).rgb, rgb.b);
  return m;
}

float mixLayersToFloat(sampler2D[4] layers, sampler2D splatMap, vec2 texCoord, float texScale) {
  vec3 rgb = texture2D(splatMap, texCoord).rgb;
  float m = texture2D(layers[0], texCoord * texScale).r;
  m = mix(m, texture2D(layers[1], texCoord * texScale).r, rgb.r);
  m = mix(m, texture2D(layers[2], texCoord * texScale).r, rgb.g);
  m = mix(m, texture2D(layers[3], texCoord * texScale).r, rgb.b);
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
    vec3 map = mixLayersToVec3(normalLayers, splatMap, vTexCoord, texScale);
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
  vec3 vN = texture2D(comboMap, vTexCoord).rgb * 2.0 - 1.0;
  vec3 N = normalize(normalMatrix * normalize(vN)); // reversing the positive rgb values transformation
  N = perturb_normal(N, -vV, vTexCoord * texScale);
  vec3 L = normalize(vL);
  vec3 V = normalize(vV);
  vec3 H = normalize(L + V);
  float NdotL = max(dot(N, L), 0.0);
  float NdotH = max(dot(N, H), 0.0);
  NdotH = NdotL != 0.0 ? NdotH : 0.0;
  NdotH = pow(NdotH, SHININESS_FACTOR);

  vec3 ambient = AMBIENT_COLOR;
  vec3 diffuseColor = mixLayersToVec3(diffuseLayers, splatMap, vTexCoord, texScale);
  vec3 diffuse = diffuseColor * NdotL;
  float specularIntensity = mixLayersToFloat(specularLayers, splatMap, vTexCoord, texScale);
  vec3 specular = LIGHT_COLOR * specularIntensity * NdotH;
  vec3 c = ambient + diffuse + specular;

  vec3 mpos = vec3(mousePosition.x, vPosition.y, mousePosition.z);

  vec3 fogColor = vec3(0.5, 0.5, 0.5);
  float dist = length(vViewSpacePosition);
  float be = 0.0003 * smoothstep(0.0, 6.0, 32.0 - vViewSpacePosition.z);
  float bi = 0.0009 * smoothstep(0.0, 80.0, 10.0 - vViewSpacePosition.z);
  float ext = exp(-dist * be);
  float insc = exp(-dist * bi);

  if (mode == 2 && length(vPosition - mpos) < radius * RADIUS_FACTOR) {
    c = mix(mix(vec3(0.0), c, edgeFactor(vBaryCoord, 0.5)), c, pow(length(vPosition - mpos) / (radius * RADIUS_FACTOR), 8.0));
  }

  if (mode == 3 && abs(length(vPosition - mpos) - radius * RADIUS_FACTOR) < RING_THRESHOLD) {
    c = vec3(0.0, 0.0, 0.0);
  }

  if (false) {
    c = c * ext + fogColor * (1.0 - insc);
  }

  gl_FragColor = vec4(c, 1.0);
}
