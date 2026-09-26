// Sample a Mixamo FBX into Ribbons' 12 bone directions (+ hip travel), same convention as the
// canvas's MOCAP_HIPHOP: dancer faces +z, Ribbons R = Mixamo *Left* (at +x), metres, 30 fps.
import fs from 'fs';
globalThis.self = globalThis;
const THREE = await import('three');
THREE.TextureLoader.prototype.load = () => new THREE.Texture();
const { FBXLoader } = await import('three/examples/jsm/loaders/FBXLoader.js');

export function extract(file, fps = 30) {
  const buf = fs.readFileSync(file);
  const obj = new FBXLoader().parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), '');
  const clip = obj.animations.reduce((a, b) => (b.duration > a.duration ? b : a));
  const mixer = new THREE.AnimationMixer(obj);
  mixer.clipAction(clip).play();
  const bone = {};
  obj.traverse((o) => { if (o.isBone) bone[o.name.replace(/^mixamorig:?/, '')] = o; });
  const P = (name) => {
    if (name === 'hipMid') return P('LeftUpLeg').add(P('RightUpLeg')).multiplyScalar(0.5);
    if (name === 'shMid') return P('LeftArm').add(P('RightArm')).multiplyScalar(0.5);
    const v = new THREE.Vector3(); bone[name].getWorldPosition(v); return v;
  };
  const dir = (a, b) => { const v = P(b).sub(P(a)).normalize(); return [v.x, v.y, v.z].map((x) => +x.toFixed(3)); };
  const n = Math.round(clip.duration * fps);
  const frames = [], hx = [], hy = [], hz = [];
  let legLen = 0;
  for (let i = 0; i < n; i++) {
    mixer.setTime(Math.min(i / fps, clip.duration));
    obj.updateMatrixWorld(true);
    if (i === 0) legLen = (P('LeftUpLeg').distanceTo(P('LeftLeg')) + P('LeftLeg').distanceTo(P('LeftFoot'))) / 100;
    frames.push({
      sp: dir('hipMid', 'shMid'), nk: dir('Neck', 'Head'), sl: dir('RightArm', 'LeftArm'), hl: dir('RightUpLeg', 'LeftUpLeg'),
      uaR: dir('LeftArm', 'LeftForeArm'), faR: dir('LeftForeArm', 'LeftHand'), thR: dir('LeftUpLeg', 'LeftLeg'), shR: dir('LeftLeg', 'LeftFoot'),
      uaL: dir('RightArm', 'RightForeArm'), faL: dir('RightForeArm', 'RightHand'), thL: dir('RightUpLeg', 'RightLeg'), shL: dir('RightLeg', 'RightFoot'),
    });
    const h = P('Hips');
    hx.push(h.x / 100); hy.push(h.y / 100); hz.push(h.z / 100);
  }
  return { fps, n, duration: clip.duration, legLen: +legLen.toFixed(3), frames, hx, hy, hz };
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split('/').pop()) && process.argv[2]) {
  const r = extract(process.argv[2]);
  const ref = JSON.parse(fs.readFileSync(process.argv[3]));
  console.log('n', r.n, 'ref n', ref.n, 'legLen', r.legLen, 'ref', ref.legLen);
  let worst = {};
  for (let i = 0; i < Math.min(r.n, ref.n); i++) for (const k in ref.frames[i]) {
    const d = Math.hypot(...ref.frames[i][k].map((x, j) => x - r.frames[i][k][j]));
    worst[k] = Math.max(worst[k] || 0, d);
  }
  console.log('max vector error per bone', JSON.stringify(worst));
  const mean = (a) => a.reduce((s, x) => s + x, 0) / a.length;
  console.log('hipsDx ref[0..3]', ref.hipsDx.slice(0, 3), 'mine minus mean', r.hx.slice(0, 3).map((x) => +(x - mean(r.hx)).toFixed(3)), 'minus first', r.hx.slice(0, 3).map((x) => +(x - r.hx[0]).toFixed(3)));
  console.log('hipsDy ref', ref.hipsDy.slice(0, 3), 'mine-mean', r.hy.slice(0, 3).map((x) => +(x - mean(r.hy)).toFixed(3)));
  console.log('hipsDz ref', ref.hipsDz.slice(0, 3), 'mine-mean', r.hz.slice(0, 3).map((x) => +(x - mean(r.hz)).toFixed(3)));
}
