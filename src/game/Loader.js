import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
let loader;
function getLoader() {
  if (!loader) {
    loader = new GLTFLoader(); const d = new DRACOLoader();
    d.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');
    loader.setDRACOLoader(d); loader.setMeshoptDecoder(MeshoptDecoder);
  }
  return loader;
}
/** True if the file really exists (dev servers return index.html for missing files). */
export async function exists(url) {
  try { const r = await fetch(url, { method: 'HEAD' }); return r.ok && !/text\/html/.test(r.headers.get('content-type') || ''); } catch { return false; }
}
export function loadGLB(url, onProgress) {
  return new Promise((resolve) => {
    getLoader().load(url, (g) => resolve(g), (e) => { if (onProgress && e.total) onProgress(e.loaded / e.total); },
      (err) => { console.warn('[GLB] failed to load', url, err); resolve(null); });
  });
}
