// Print "<file> <longest animation seconds>" for each FBX (Mixamo files can carry an empty first take).
import fs from 'fs';
globalThis.self = globalThis;
const THREE = await import('three');
THREE.TextureLoader.prototype.load = () => new THREE.Texture();
const { FBXLoader } = await import('three/examples/jsm/loaders/FBXLoader.js');
const loader = new FBXLoader();
for (const f of process.argv.slice(2)) {
  try {
    const buf = fs.readFileSync(f);
    const obj = loader.parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), '');
    const d = Math.max(0, ...obj.animations.map(a => a.duration));
    console.log(f.split('/').pop(), d.toFixed(3));
  } catch (e) { console.log(f.split('/').pop(), 'ERR', e.message); }
}
