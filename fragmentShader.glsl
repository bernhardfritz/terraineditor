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

const int WITH_NORMALMAP_UNSIGNED = 1;
const int WITH_NORMALMAP_2CHANNEL = 0;
const int WITH_NORMALMAP_GREEN_UP = 1;

vec3 mixLayers(sampler2D layer0, sampler2D layer1, sampler2D layer2, sampler2D layer3, sampler2D layer4, sampler2D mixMap, vec2 texCoord, float texScale) {
  vec4 rgba = texture2D(mixMap, texCoord);
  vec3 color = texture2D(layer0, texCoord * texScale).rgb;
  color = mix(color, texture2D(layer1, texCoord * texScale).rgb, rgba.r);
  color = mix(color, texture2D(layer2, texCoord * texScale).rgb, rgba.g);
  color = mix(color, texture2D(layer3, texCoord * texScale).rgb, rgba.b);
  color = mix(color, texture2D(layer4, texCoord * texScale).rgb, rgba.a);
  return color;
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
  vec3 N = normalize(normalMatrix * normalize(texture2D(comboMap, vTexCoord).rgb * 2.0 - 1.0)); // reversing the positive rgb values transformation
  N = perturb_normal(N, -vV, vTexCoord * texScale);
  vec3 L = normalize(vL);
  vec3 V = normalize(vV);
  vec3 H = normalize(L + V);
  vec4 rgba = texture2D(mixMap, vTexCoord);
  vec3 color = mixLayers(diffuseLayer0, diffuseLayer1, diffuseLayer2, diffuseLayer3, diffuseLayer4, mixMap, vTexCoord, texScale);

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
