module.exports = function(THREE) {
  let {
    Geometry,
    BufferGeometry,
    Float32BufferAttribute
  } = THREE;

  const clamp = (num, min, max) => Math.min(Math.max(num, min), max);

  // IsometricPlaneGeometry

  function IsometricPlaneGeometry(width, height, widthSegments, heightSegments) {
    Geometry.call(this);

    this.type = 'IsometricPlaneGeometry';

    this.parameters = {
      width: width,
      height: height,
      widthSegments: widthSegments,
      heightSegments: heightSegments
    };

    this.fromBufferGeometry(new IsometricPlaneBufferGeometry(width, height, widthSegments, heightSegments));
    this.mergeVertices();
  }

  IsometricPlaneGeometry.prototype = Object.create(Geometry.prototype);
  IsometricPlaneGeometry.prototype.constructor = IsometricPlaneGeometry;

  // IsometricPlaneBufferGeometry

  function IsometricPlaneBufferGeometry(width, height, widthSegments, heightSegments) {
    BufferGeometry.call(this);

    this.type = 'IsometricPlaneBufferGeometry';

    this.parameters = {
      width: width,
      height: height,
      widthSegments: widthSegments,
      heightSegments: heightSegments
    };

    var width_half = width / 2;
    var height_half = height / 2;

    // buffers

    var indices = [];
    var vertices = [];
    var normals = [];
    var uvs = [];

    // generate vertices, normals and uvs

    let dict = {};

    let index = 0;

    const store = e => {
      if (!(e.vertex in dict)) {
        dict[e.vertex] = index++;
        vertices.push(...e.vertex, 0);
        uvs.push(...e.uv);
        normals.push(0, 0, 1);
      }
      indices.push(dict[e.vertex]);
    };

    let x, y, x1, x2, x3, x4, t, m, b;

    for (x = 0; x <= widthSegments; x++) {
      x1 = clamp((x - 0.5) / widthSegments, 0, 1);
      x2 = clamp((x + 0.0) / widthSegments, 0, 1);
      x3 = clamp((x + 0.5) / widthSegments, 0, 1);
      x4 = clamp((x + 1.0) / widthSegments, 0, 1);
      for (y = 0; y < heightSegments; y += 2) {
        t = (y + 0) / heightSegments;
        m = (y + 1) / heightSegments;
        b = (y + 2) / heightSegments;

        [{
            vertex: [x1 * width - width_half, t * height - height_half],
            uv: [x1, t]
          },
          {
            vertex: [x3 * width - width_half, t * height - height_half],
            uv: [x3, t]
          },
          {
            vertex: [x2 * width - width_half, m * height - height_half],
            uv: [x2, m]
          },
          {
            vertex: [x2 * width - width_half, m * height - height_half],
            uv: [x2, m]
          },
          {
            vertex: [x3 * width - width_half, t * height - height_half],
            uv: [x3, t]
          },
          {
            vertex: [x4 * width - width_half, m * height - height_half],
            uv: [x4, m]
          },
          {
            vertex: [x1 * width - width_half, b * height - height_half],
            uv: [x1, b]
          },
          {
            vertex: [x2 * width - width_half, m * height - height_half],
            uv: [x2, m]
          },
          {
            vertex: [x3 * width - width_half, b * height - height_half],
            uv: [x3, b]
          },
          {
            vertex: [x2 * width - width_half, m * height - height_half],
            uv: [x2, m]
          },
          {
            vertex: [x4 * width - width_half, m * height - height_half],
            uv: [x4, m]
          },
          {
            vertex: [x3 * width - width_half, b * height - height_half],
            uv: [x3, b]
          }
        ].forEach(store);
      }
    }

    this.setIndex(indices);
    this.addAttribute('position', new Float32BufferAttribute(vertices, 3));
    this.addAttribute('normal', new Float32BufferAttribute(normals, 3));
    this.addAttribute('uv', new Float32BufferAttribute(uvs, 2));
  }

  IsometricPlaneBufferGeometry.prototype = Object.create(BufferGeometry.prototype);
  IsometricPlaneBufferGeometry.prototype.constructor = IsometricPlaneBufferGeometry;

  return {
    IsometricPlaneGeometry,
    IsometricPlaneBufferGeometry
  };
};
