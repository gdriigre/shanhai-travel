// 首页风景之间的流动融合；不支持 WebGL 时由原有图片切换接管。
window.createSceneMorph = function createSceneMorph(scene, beforeNode) {
  const canvas = document.createElement("canvas");
  canvas.className = "scene-morph";
  canvas.hidden = true;
  canvas.setAttribute("aria-hidden", "true");
  const gl = canvas.getContext("webgl", { alpha: false, antialias: false, powerPreference: "low-power" });
  if (!gl) return null;
  const vertex = `
    attribute vec2 aPosition;
    varying vec2 vUv;
    void main() { vUv = aPosition * .5 + .5; gl_Position = vec4(aPosition, 0., 1.); }
  `;
  const fragment = `
    precision mediump float;
    uniform sampler2D tCurrent;
    uniform sampler2D tNext;
    uniform vec2 uResolution;
    uniform vec2 uCurrentSize;
    uniform vec2 uNextSize;
    uniform vec2 uCurrentPosition;
    uniform vec2 uNextPosition;
    uniform float uProgress;
    uniform float uTime;
    varying vec2 vUv;
    float hash21(vec2 p) {
      vec3 p3 = fract(vec3(p.xyx) * .1031);
      p3 += dot(p3, p3.yzx + 33.33);
      return fract((p3.x + p3.y) * p3.z);
    }
    float noise(vec2 p) {
      vec2 i = floor(p), f = fract(p), u = f * f * (3. - 2. * f);
      return mix(mix(hash21(i), hash21(i + vec2(1., 0.)), u.x),
                 mix(hash21(i + vec2(0., 1.)), hash21(i + vec2(1., 1.)), u.x), u.y);
    }
    float fbm(vec2 p) {
      float v = 0., a = .5;
      for (int i = 0; i < 5; i++) { v += a * noise(p); p *= 2.; a *= .5; }
      return v;
    }
    vec2 coverUV(vec2 uv, vec2 res, vec2 img, vec2 position) {
      float ratio = (res.x / max(res.y, 1.)) / (img.x / max(img.y, 1.));
      vec2 s = ratio > 1. ? vec2(1., 1. / ratio) : vec2(ratio, 1.);
      return uv * s + (1. - s) * position;
    }
    void main() {
      float p = clamp(uProgress, 0., 1.);
      float envelope = sin(p * 3.14159265);
      vec2 uv = vUv + vec2(sin(uTime * .25 + vUv.y * 4.), cos(uTime * .22 + vUv.x * 4.)) * envelope * .0032;
      uv = (uv - .5) / 1.025 + .5;
      float n = fbm(uv * 2.4 + uTime * .03);
      float warp = fbm(uv * 4.08 - uTime * .02);
      vec2 displacement = vec2(n, warp) - .5;
      vec2 uvC = coverUV(uv + displacement * .23 * p, uResolution, uCurrentSize, uCurrentPosition);
      vec2 uvN = coverUV(uv - displacement * .23 * (1. - p), uResolution, uNextSize, uNextPosition);
      float mixAmount = smoothstep(n - .15, n + .15, p);
      if (p < .001) mixAmount = 0.;
      if (p > .999) mixAmount = 1.;
      float shift = .007 * envelope;
      vec3 c = vec3(texture2D(tCurrent, uvC + vec2(shift, 0.)).r, texture2D(tCurrent, uvC).g, texture2D(tCurrent, uvC - vec2(shift, 0.)).b);
      vec3 ncol = vec3(texture2D(tNext, uvN + vec2(shift, 0.)).r, texture2D(tNext, uvN).g, texture2D(tNext, uvN - vec2(shift, 0.)).b);
      gl_FragColor = vec4(mix(c, ncol, mixAmount), 1.);
    }
  `;
  const compile = (type, source) => {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)) return shader;
    gl.deleteShader(shader);
    return null;
  };
  const vs = compile(gl.VERTEX_SHADER, vertex);
  const fs = compile(gl.FRAGMENT_SHADER, fragment);
  if (!vs || !fs) { if (vs) gl.deleteShader(vs); if (fs) gl.deleteShader(fs); return null; }
  const program = gl.createProgram();
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  gl.deleteShader(vs);
  gl.deleteShader(fs);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) { gl.deleteProgram(program); return null; }
  gl.useProgram(program);
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, -1,1, 1,-1, 1,1]), gl.STATIC_DRAW);
  const position = gl.getAttribLocation(program, "aPosition");
  gl.enableVertexAttribArray(position);
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
  const locations = {};
  ["tCurrent", "tNext", "uResolution", "uCurrentSize", "uNextSize", "uCurrentPosition", "uNextPosition", "uProgress", "uTime"].forEach((name) => { locations[name] = gl.getUniformLocation(program, name); });
  scene.insertBefore(canvas, beforeNode);
  const imageCache = new Map();
  let token = 0, frameId = 0, textures = [];
  const load = (url) => {
    if (!imageCache.has(url)) {
      const promise = new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = () => reject(new Error("风景图片加载失败"));
        image.src = url;
      });
      imageCache.set(url, promise);
      promise.catch(() => imageCache.delete(url));
    }
    return imageCache.get(url);
  };
  const cancel = () => {
    token++;
    cancelAnimationFrame(frameId);
    frameId = 0;
    textures.forEach((texture) => gl.deleteTexture(texture));
    textures = [];
    canvas.hidden = true;
  };
  const makeTexture = (image, unit) => {
    const texture = gl.createTexture();
    textures.push(texture);
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
  };
  const imagePosition = (value) => {
    const parts = String(value || "center center").split(/\s+/);
    const parse = (part) => part === "left" || part === "top" ? 0 : part === "right" || part === "bottom" ? 1 : part?.endsWith("%") ? Number.parseFloat(part) / 100 : .5;
    return [parse(parts[0]), 1 - parse(parts[1])];
  };
  const run = async (from, to, callbacks) => {
    cancel();
    const activeToken = token;
    try {
      const [current, next] = await Promise.all([load(from), load(to)]);
      if (activeToken !== token) return;
      if (gl.isContextLost()) throw new Error("动画暂不可用");
      makeTexture(current, 0);
      makeTexture(next, 1);
      gl.uniform1i(locations.tCurrent, 0);
      gl.uniform1i(locations.tNext, 1);
      gl.uniform2f(locations.uCurrentSize, current.naturalWidth, current.naturalHeight);
      gl.uniform2f(locations.uNextSize, next.naturalWidth, next.naturalHeight);
      const currentPosition = imagePosition(callbacks.currentPosition);
      const nextPosition = imagePosition(callbacks.nextPosition);
      gl.uniform2fv(locations.uCurrentPosition, currentPosition);
      gl.uniform2fv(locations.uNextPosition, nextPosition);
      const start = performance.now();
      const frame = (now) => {
        if (activeToken !== token) return;
        if (gl.isContextLost()) { cancel(); callbacks.onError(); return; }
        const rect = scene.getBoundingClientRect();
        const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
        const width = Math.max(1, Math.round(rect.width * dpr));
        const height = Math.max(1, Math.round(rect.height * dpr));
        if (canvas.width !== width || canvas.height !== height) { canvas.width = width; canvas.height = height; gl.viewport(0, 0, width, height); }
        const linear = Math.min((now - start) / 1150, 1);
        const progress = linear * linear * (3 - 2 * linear);
        gl.uniform2f(locations.uResolution, width, height);
        gl.uniform1f(locations.uProgress, progress);
        gl.uniform1f(locations.uTime, now / 1000);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
        if (linear < 1) frameId = requestAnimationFrame(frame);
        else { callbacks.onFinish(); cancel(); }
      };
      // Draw the old scene before showing the canvas so it never flashes black.
      frame(start);
      canvas.hidden = false;
      callbacks.onStart();
    } catch (error) {
      if (activeToken !== token) return;
      cancel();
      callbacks.onError(error);
    }
  };
  canvas.addEventListener("webglcontextlost", (event) => { event.preventDefault(); });
  return { run, cancel };
};
