module.exports = function(THREE) {
  let {
    Geometry,
    BufferGeometry,
    Float32BufferAttribute
  } = THREE;

  const clamp = (num, min, max) => Math.min(Math.max(num, min), max);

  // UnindexedIsometricPlaneGeometry

  function UnindexedIsometricPlaneGeometry(width, height, widthSegments, heightSegments) {
    Geometry.call(this);

    this.type = 'UnindexedIsometricPlaneGeometry';

    this.parameters = {
      width: width,
      height: height,
      widthSegments: widthSegments,
      heightSegments: heightSegments
    };

    this.fromBufferGeometry(new UnindexedIsometricPlaneBufferGeometry(width, height, widthSegments, heightSegments));
    this.mergeVertices();
  }

  UnindexedIsometricPlaneGeometry.prototype = Object.create(Geometry.prototype);
  UnindexedIsometricPlaneGeometry.prototype.constructor = UnindexedIsometricPlaneGeometry;

  // UnindexedIsometricPlaneBufferGeometry

  function UnindexedIsometricPlaneBufferGeometry(width, height, widthSegments, heightSegments) {
    BufferGeometry.call(this);

    this.type = 'UnindexedIsometricPlaneBufferGeometry';

    this.parameters = {
      width: width,
      height: height,
      widthSegments: widthSegments,
      heightSegments: heightSegments
    };

    let width_half = width / 2;
    let height_half = height / 2;

    // buffers

    let vertices = [];
    let uvs = [];
    let bcs = [];

    // generate vertices, normals and uvs

    let prevDict = {};
    let currDict = {};

    let index = 0;

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

        vertices.push(
          x1 * width - width_half, t * height - height_half, 0,
          x3 * width - width_half, t * height - height_half, 0,
          x2 * width - width_half, m * height - height_half, 0,

          x2 * width - width_half, m * height - height_half, 0,
          x3 * width - width_half, t * height - height_half, 0,
          x4 * width - width_half, m * height - height_half, 0,

          x1 * width - width_half, b * height - height_half, 0,
          x2 * width - width_half, m * height - height_half, 0,
          x3 * width - width_half, b * height - height_half, 0,

          x2 * width - width_half, m * height - height_half, 0,
          x4 * width - width_half, m * height - height_half, 0,
          x3 * width - width_half, b * height - height_half, 0
        );

        uvs.push(
          x1, t,    x3, t,    x2, m,
          x2, m,    x3, t,    x4, m,

          x1, b,    x2, m,    x3, b,
          x2, m,    x4, m,    x3, b
        );

        bcs.push(
          0, 0,   1, 0,   0, 1,
          0, 0,   1, 0,   0, 1,

          0, 0,   1, 0,   0, 1,
          0, 0,   1, 0,   0, 1
        );
      }
    }

    this.addAttribute('position', new Float32BufferAttribute(vertices, 3));
    this.addAttribute('uv', new Float32BufferAttribute(uvs, 2));
    this.addAttribute('bc', new Float32BufferAttribute(bcs, 2));
  }

  UnindexedIsometricPlaneBufferGeometry.prototype = Object.create(BufferGeometry.prototype);
  UnindexedIsometricPlaneBufferGeometry.prototype.constructor = UnindexedIsometricPlaneBufferGeometry;

  return {
    UnindexedIsometricPlaneGeometry,
    UnindexedIsometricPlaneBufferGeometry
  };
};
