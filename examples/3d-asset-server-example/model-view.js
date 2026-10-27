// 八百万図AIツールボックス — 3D Asset Server 作例：取得した木箱を three.js で見る表示部。MIT License, Copyright (c) 2026 Studio Yebisu.
// 同梱した three 0.180.0（改変なし）の原典の GLTFLoader で、保存済みの5ファイルを読む。
// 読み込む前に5ファイルすべてのバイト数と SHA-256 を記録と照合し、照合済みのバイトだけを渡す。
// 代わりの形・サムネイル・外部の画像は使わない。描画は読み込み・カメラ・大きさが変わったときだけで、自動回転はしない。

import * as THREE from "three";
import { GLTFLoader } from "./vendor/three/examples/jsm/loaders/GLTFLoader.js";

const MIME = {
  gltf: "model/gltf+json",
  bin: "application/octet-stream",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};
const STEP = Math.PI / 6; // one button press = 30°
const START = Object.freeze({ azimuth: Math.PI / 5, elevation: 0.36 });
const FOV = 32;
const BACKGROUND = 0xf3eee5;
// Any URL the loader asks for that is not one of the verified files ends here and fails to load.
const BLOCKED = "about:invalid#unverified";

class ViewError extends Error {}

const extension = (path) => path.slice(path.lastIndexOf(".") + 1).toLowerCase();
const dirOf = (path) => path.slice(0, path.lastIndexOf("/") + 1);
const formatInt = (n) => n.toLocaleString("ja-JP");

function normalize(path) {
  const out = [];
  for (const part of path.split("/")) {
    if (part === "" || part === ".") continue;
    if (part === "..") {
      if (!out.length) return null;
      out.pop();
    } else {
      out.push(part);
    }
  }
  return out.join("/");
}

/**
 * Mount the viewer once. `el` holds the existing DOM nodes:
 * view (#model-view), status (#model-status), retry, rotateLeft, rotateRight, reset, wireframe.
 * `sha256(ArrayBuffer) -> Promise<hex>` is the page's own digest.
 */
export function mountModelView(el, sha256) {
  const canvas = document.createElement("canvas");
  canvas.className = "model-canvas";
  canvas.setAttribute("role", "img");
  canvas.setAttribute("aria-label", "取得した3Dモデルの表示");
  el.view.replaceChildren(canvas);

  const view = {
    renderer: null,
    scene: new THREE.Scene(),
    camera: new THREE.PerspectiveCamera(FOV, 4 / 3, 0.01, 100),
    pivot: new THREE.Group(),
    model: null,
    radius: 1,
    azimuth: START.azimuth,
    elevation: START.elevation,
    wireframe: false,
    loading: false,
    lost: false,
    current: null,
    token: 0,
  };
  view.scene.background = new THREE.Color(BACKGROUND);
  view.scene.add(view.pivot);
  // Soft sky/ground light plus a warm key and a cool fill that travel with the camera, so the visible side stays readable.
  view.scene.add(new THREE.HemisphereLight(0xfff7ec, 0x6d5c4a, 1.5));
  const key = new THREE.DirectionalLight(0xfff0dc, 2.4);
  key.position.set(2.5, 3.5, 3);
  const fill = new THREE.DirectionalLight(0xe2eaff, 0.8);
  fill.position.set(-3.5, 1, 1.5);
  view.camera.add(key, fill);
  view.scene.add(view.camera);

  function setStatus(state, message, details = {}) {
    el.status.dataset.state = state;
    el.status.textContent = message;
    for (const key of ["meshes", "triangles", "file"]) {
      if (details[key] === undefined) delete el.status.dataset[key];
      else el.status.dataset[key] = String(details[key]);
    }
    el.retry.hidden = !(state === "error" || state === "context-lost");
    el.retry.disabled = view.loading;
    const usable = state === "ready";
    for (const button of [el.rotateLeft, el.rotateRight, el.reset, el.wireframe]) button.disabled = !usable;
  }

  function render() {
    if (!view.renderer || view.lost || !view.model) return;
    view.renderer.render(view.scene, view.camera);
  }

  // Distance at which the model's bounding sphere fits the narrower of the two view angles.
  function placeCamera() {
    const halfV = THREE.MathUtils.degToRad(FOV) / 2;
    const halfH = Math.atan(Math.tan(halfV) * view.camera.aspect);
    const distance = (view.radius / Math.sin(Math.min(halfV, halfH))) * 1.05;
    const cosE = Math.cos(view.elevation);
    view.camera.position.set(
      distance * cosE * Math.sin(view.azimuth),
      distance * Math.sin(view.elevation),
      distance * cosE * Math.cos(view.azimuth),
    );
    view.camera.near = Math.max(distance / 100, 0.001);
    view.camera.far = distance * 100;
    view.camera.lookAt(0, 0, 0);
    view.camera.updateProjectionMatrix();
  }

  function resize() {
    if (!view.renderer) return;
    const width = Math.floor(el.view.clientWidth);
    const height = Math.floor(el.view.clientHeight);
    if (width < 1 || height < 1) return; // hidden while another case is shown
    view.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    view.renderer.setSize(width, height, false);
    view.camera.aspect = width / height;
    placeCamera();
    render();
  }

  function ensureRenderer() {
    if (view.renderer) return true;
    try {
      view.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "default" });
    } catch (error) {
      view.renderer = null;
      return false;
    }
    view.renderer.outputColorSpace = THREE.SRGBColorSpace;
    view.renderer.toneMapping = THREE.NeutralToneMapping;
    view.renderer.toneMappingExposure = 1;
    return true;
  }

  canvas.addEventListener("webglcontextlost", (event) => {
    event.preventDefault();
    view.lost = true;
    setStatus("context-lost", "WebGL の描画が中断されました（ブラウザーが描画の資源を回収しました）。「3Dをもう一度読み込む」で、照合からやり直せます。ファイルと記録はこのまま使えます。");
  });
  canvas.addEventListener("webglcontextrestored", () => {
    view.lost = false;
    if (view.current) load(view.current);
  });

  if ("ResizeObserver" in window) {
    new ResizeObserver(() => resize()).observe(el.view);
  } else {
    window.addEventListener("resize", resize);
  }

  el.rotateLeft.addEventListener("click", () => {
    view.azimuth -= STEP;
    placeCamera();
    render();
  });
  el.rotateRight.addEventListener("click", () => {
    view.azimuth += STEP;
    placeCamera();
    render();
  });
  el.reset.addEventListener("click", () => {
    view.azimuth = START.azimuth;
    view.elevation = START.elevation;
    placeCamera();
    render();
  });
  el.wireframe.addEventListener("click", () => {
    view.wireframe = !view.wireframe;
    el.wireframe.setAttribute("aria-pressed", String(view.wireframe));
    applyWireframe();
    render();
  });
  el.retry.addEventListener("click", () => {
    if (view.current) load(view.current);
  });

  function applyWireframe() {
    view.model?.traverse((object) => {
      if (!object.isMesh) return;
      for (const material of [].concat(object.material)) material.wireframe = view.wireframe;
    });
  }

  function disposeModel() {
    if (!view.model) return;
    view.pivot.remove(view.model);
    view.model.traverse((object) => {
      if (!object.isMesh) return;
      object.geometry?.dispose();
      for (const material of [].concat(object.material)) {
        for (const value of Object.values(material)) if (value && value.isTexture) value.dispose();
        material.dispose();
      }
    });
    view.model = null;
  }

  async function fetchVerified(files, token) {
    const verified = new Map();
    for (const file of files) {
      let response;
      try {
        response = await fetch(file.public_path, { cache: "no-store" });
      } catch (error) {
        throw new ViewError(`${file.path} を取得できませんでした。`);
      }
      if (!response.ok) throw new ViewError(`${file.path} を取得できませんでした（HTTP ${response.status}）。`);
      const buffer = await response.arrayBuffer();
      if (token !== view.token) return null;
      if (buffer.byteLength !== file.bytes) {
        throw new ViewError(`${file.path} のバイト数（${formatInt(buffer.byteLength)}）が記録（${formatInt(file.bytes)}）と違います。`);
      }
      if ((await sha256(buffer)) !== file.sha256) throw new ViewError(`${file.path} の SHA-256 が記録と違います。`);
      verified.set(file.path, buffer);
    }
    return verified;
  }

  // The resource URLs the original GLTFLoader will ask for, each pointing at a verified local file.
  function mapResources(gltfJson, entryPath, base, verified) {
    const map = new Map();
    const baseDir = dirOf(entryPath);
    const add = (uri) => {
      if (typeof uri !== "string") return;
      let decoded;
      try {
        decoded = decodeURIComponent(uri);
      } catch (error) {
        throw new ViewError(`glTF の参照「${uri}」を読めません。`);
      }
      const path = normalize(baseDir + decoded);
      if (!path || !verified.has(path)) throw new ViewError(`glTF の参照「${uri}」が、照合済みのファイルにありません。`);
      const blob = new Blob([verified.get(path)], { type: MIME[extension(path)] || "application/octet-stream" });
      map.set(base + uri, URL.createObjectURL(blob));
    };
    for (const buffer of gltfJson.buffers ?? []) add(buffer.uri);
    for (const image of gltfJson.images ?? []) add(image.uri);
    return map;
  }

  function parse(gltfBuffer, base, resources) {
    const manager = new THREE.LoadingManager();
    const unexpected = [];
    manager.setURLModifier((url) => {
      if (resources.has(url)) return resources.get(url);
      unexpected.push(url);
      return BLOCKED;
    });
    const loader = new GLTFLoader(manager);
    return new Promise((resolve, reject) => {
      loader.parse(gltfBuffer, base, (gltf) => {
        if (unexpected.length) reject(new ViewError(`照合していない参照を読もうとしました：${unexpected.join("、")}`));
        else resolve(gltf);
      }, (error) => reject(new ViewError(`原典の GLTFLoader が読み込みを止めました：${error && error.message ? error.message : String(error)}`)));
    });
  }

  function countScene(root) {
    let meshes = 0;
    let triangles = 0;
    root.traverse((object) => {
      if (!object.isMesh) return;
      meshes += 1;
      const geometry = object.geometry;
      const count = geometry.index ? geometry.index.count : geometry.attributes.position?.count ?? 0;
      triangles += Math.floor(count / 3);
    });
    return { meshes, triangles };
  }

  function frame(root) {
    const box = new THREE.Box3().setFromObject(root);
    if (box.isEmpty()) throw new ViewError("モデルの大きさを測れませんでした（空のシーン）。");
    const center = box.getCenter(new THREE.Vector3());
    root.position.sub(center); // display only: centres the scene; the files are untouched
    view.radius = box.getSize(new THREE.Vector3()).length() / 2 || 1;
    view.azimuth = START.azimuth;
    view.elevation = START.elevation;
    placeCamera();
  }

  /**
   * model: { entry, files: [{ path, public_path, bytes, sha256 }], expected: { triangles, meshes } }
   */
  async function load(model) {
    view.current = model;
    const token = ++view.token;
    view.loading = true;
    disposeModel();
    canvas.hidden = true;
    const entryFile = model.files.find((file) => file.public_path === model.entry);
    setStatus("loading", `${model.files.length}ファイルを取得し、バイト数と SHA-256 を記録と照合しています…`);
    const resources = new Map();
    try {
      if (!entryFile) throw new ViewError("記録の glTF の入り口が、ファイル一覧にありません。");
      if (!ensureRenderer()) {
        setStatus("webgl-unavailable", "このブラウザーでは WebGL が使えないため、3D を表示できません。下の記録と5ファイルの保存はこのまま使えます。");
        return;
      }
      const verified = await fetchVerified(model.files, token);
      if (!verified) return;
      let gltfJson;
      try {
        gltfJson = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(verified.get(entryFile.path)));
      } catch (error) {
        throw new ViewError("glTF を JSON として読めません。");
      }
      const base = new URL(dirOf(model.entry), document.baseURI).href;
      for (const [key, value] of mapResources(gltfJson, entryFile.path, base, verified)) resources.set(key, value);
      setStatus("loading", "照合済みの5ファイルを、原典の GLTFLoader で読み込んでいます…");
      const gltf = await parse(verified.get(entryFile.path), base, resources);
      if (token !== view.token) return;

      const root = gltf.scene;
      const counts = countScene(root);
      view.pivot.add(root);
      view.model = root;
      frame(root);
      applyWireframe();
      canvas.hidden = false;
      resize();
      render();

      const expected = model.expected || {};
      const same = counts.triangles === expected.triangles && counts.meshes === expected.meshes;
      const compare = same
        ? "glTF から数えた記録の値と一致"
        : `記録の値（メッシュ ${expected.meshes}・三角形 ${expected.triangles}）と違います`;
      setStatus(same ? "ready" : "error",
        `表示中：${entryFile.path}・メッシュ ${formatInt(counts.meshes)}・三角形 ${formatInt(counts.triangles)}（${compare}）`,
        { meshes: counts.meshes, triangles: counts.triangles, file: model.entry });
      if (!same) canvas.hidden = true;
    } catch (error) {
      if (token !== view.token) return;
      disposeModel();
      canvas.hidden = true;
      const detail = error && error.message ? error.message : String(error);
      const message = error instanceof ViewError ? error.message : `3D を表示できませんでした：${detail}`;
      setStatus("error", `${message} 一部だけの表示や代わりの形は出していません。`);
    } finally {
      for (const url of resources.values()) URL.revokeObjectURL(url);
      if (token === view.token) {
        view.loading = false;
        el.retry.disabled = false;
      }
    }
  }

  return {
    load,
    show() {
      resize();
    },
  };
}
