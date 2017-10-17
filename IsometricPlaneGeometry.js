module.exports = function(THREE) {
  const {
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

    let width_half = width / 2;
    let height_half = height / 2;

    // buffers

    let indices = [];
    let vertices = [];
    let normals = [];
    let uvs = [];

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

        let data = [];

        data.push({
          vertex: [x1 * width - width_half, t * height - height_half],
          uv: [x1, t]
        });
        data.push({
          vertex: [x3 * width - width_half, t * height - height_half],
          uv: [x3, t]
        });
        data.push({
          vertex: [x2 * width - width_half, m * height - height_half],
          uv: [x2, m]
        });
        if (x < widthSegments) {
          data.push({
            vertex: [x2 * width - width_half, m * height - height_half],
            uv: [x2, m]
          });
          data.push({
            vertex: [x3 * width - width_half, t * height - height_half],
            uv: [x3, t]
          });
          data.push({
            vertex: [x4 * width - width_half, m * height - height_half],
            uv: [x4, m]
          });
        }
        data.push({
          vertex: [x1 * width - width_half, b * height - height_half],
          uv: [x1, b]
        });
        data.push({
          vertex: [x2 * width - width_half, m * height - height_half],
          uv: [x2, m]
        });
        data.push({
          vertex: [x3 * width - width_half, b * height - height_half],
          uv: [x3, b]
        });
        if (x < widthSegments) {
          data.push({
            vertex: [x2 * width - width_half, m * height - height_half],
            uv: [x2, m]
          });
          data.push({
            vertex: [x4 * width - width_half, m * height - height_half],
            uv: [x4, m]
          });
          data.push({
            vertex: [x3 * width - width_half, b * height - height_half],
            uv: [x3, b]
          });
        }

        for (let i = 0; i < data.length; i++) {
          if (!(data[i].vertex in currDict)) {
            if (!(data[i].vertex in prevDict)) {
              currDict[data[i].vertex] = index++;
              vertices.push(...data[i].vertex, 0);
              uvs.push(...data[i].uv);
              normals.push(0, 0, 1);
            } else {
              currDict[data[i].vertex] = prevDict[data[i].vertex];
            }
          }
          indices.push(currDict[data[i].vertex]);
        }
      }

      prevDict = currDict;
      currDict = {};
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
