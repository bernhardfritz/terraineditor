const readFile = (fs, path, encoding) => {
  return new Promise( (resolve, reject) => {
    fs.readFile(path, encoding, (err, data) => {
      if (err) reject(err);
      else resolve(data);
    });
  });
};

const load = (loader, url) => {
  return new Promise( (resolve, reject) => {
    loader.load(url, texture => {
      resolve(texture);
    }, xhr => {
      // do nothing
    }, xhr => {
      reject(xhr);
    });
  });
};

module.exports = {
  readFile,
  load
};
