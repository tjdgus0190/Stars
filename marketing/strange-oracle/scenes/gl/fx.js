// 광고 5·6안 공용 (2026-10-25): 후처리(번짐 빛·색 갈라짐·번쩍임·글리치·비네트·입자)와 화면 글자층(HUD, 픽셀 좌표).
// 4안(ad4-3d.js)의 같은 부품을 떼어 낸 것. 모든 값은 시각 t의 함수로 장면이 정하고, 여기서는 그리기만 한다.
import { THREE, W, H } from "./mystic3d.js";

export const SERIF900 = '"Noto Serif KR", "Gowun Batang", serif';
export const BATANG = '"Gowun Batang", "Noto Serif KR", serif';
export const CINZEL = '"Cinzel", "Gowun Batang", serif';
export const F900 = { weight: 900, family: SERIF900 };
export const F700 = { weight: 700, family: SERIF900 };
export const FB7 = { weight: 700, family: BATANG };
export const FB4 = { weight: 400, family: BATANG };
export const FC7 = { weight: 700, family: CINZEL };

// 여러 줄을 (cx, cy) 가운데로. glow: 번짐 색, shadow: 어두운 받침
export function drawLines(x, lines, { font, size, lh = 1.3, cx, cy, fill = "#fff", glow = null, glowBlur = 0, shadow = 0, track = 0 }) {
  x.save();
  x.font = `${font.weight} ${size}px ${font.family}`;
  x.textAlign = "center";
  x.textBaseline = "middle";
  if (track) x.letterSpacing = `${track}px`;
  lines.forEach((t, i) => {
    const y = cy + (i - (lines.length - 1) / 2) * size * lh;
    if (shadow) {
      x.shadowColor = "rgba(0,0,0,0.95)";
      x.shadowBlur = shadow;
      x.fillStyle = "rgba(0,0,0,0.9)";
      x.fillText(t, cx, y);
    }
    if (glow) {
      x.shadowColor = glow;
      x.shadowBlur = glowBlur;
      x.fillStyle = glow;
      x.fillText(t, cx, y);
    }
    x.shadowBlur = 0;
    x.fillStyle = fill;
    x.fillText(t, cx, y);
  });
  x.restore();
}

// 화면 글자층: 직교 카메라, 위에서 pxY 자리에 가운데
export function createHud() {
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-W / 2, W / 2, H / 2, -H / 2, -10, 10);
  const items = [];
  function text(wPx, hPx, draw) {
    const c = document.createElement("canvas");
    c.width = wPx;
    c.height = hPx;
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthTest: false, depthWrite: false, opacity: 0 });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(wPx, hPx), mat);
    scene.add(mesh);
    const o = {
      mesh, mat, y: 0,
      redraw(arg) {
        const x = c.getContext("2d");
        x.clearRect(0, 0, wPx, hPx);
        draw(x, wPx, hPx, arg);
        tex.needsUpdate = true;
      },
      at(pxY) {
        o.y = pxY;
        mesh.position.set(0, H / 2 - pxY, 0);
        return o;
      },
      // 보임·떠오름·튀어나옴을 한 번에: a 0~1, rise(px), pop(배율 더함)
      set(a, rise = 0, pop = 0) {
        mat.opacity = a;
        mesh.visible = a > 0.001;
        mesh.position.y = H / 2 - o.y + rise;
        mesh.scale.setScalar(1 + pop);
      },
    };
    items.push(o);
    return o;
  }
  return { scene, camera, text, items, redrawAll: () => items.forEach((o) => o.redraw()) };
}

// 금빛 로고 (반짝임 shine 0~1, 밖이면 고정)
export function drawLogo(x, w, h, shine = -1, size = 132) {
  x.save();
  x.font = `700 ${size}px ${BATANG}`;
  x.textAlign = "center";
  x.textBaseline = "middle";
  x.letterSpacing = "8px";
  x.shadowColor = "rgba(255,170,80,0.55)";
  x.shadowBlur = 40;
  const g = x.createLinearGradient(0, 0, w, 0);
  g.addColorStop(0, "#b8904c");
  if (shine > 0.05 && shine < 0.95) {
    g.addColorStop(Math.max(0.01, shine - 0.12), "#e6c37a");
    g.addColorStop(shine, "#fff6dc");
    g.addColorStop(Math.min(0.99, shine + 0.12), "#e6c37a");
  } else g.addColorStop(0.5, "#ecca82");
  g.addColorStop(1, "#b8904c");
  x.fillStyle = g;
  x.fillText("낯선 점술관", w / 2, h / 2);
  x.restore();
}

// 후처리 파이프라인. stage.post = post.render 로 연결하고, 장면이 post.u(유니폼)를 매 프레임 정한다
export function createPost(stage, hud) {
  const { renderer, scene, camera } = stage;
  renderer.autoClear = false;
  const rtScene = new THREE.WebGLRenderTarget(W, H, { samples: 4, type: THREE.HalfFloatType });
  const rtHud = new THREE.WebGLRenderTarget(W, H, { samples: 4 });
  const BW = W / 4, BH = H / 4;
  const rtA = new THREE.WebGLRenderTarget(BW, BH, { type: THREE.HalfFloatType });
  const rtB = new THREE.WebGLRenderTarget(BW, BH, { type: THREE.HalfFloatType });
  const quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const quadScene = new THREE.Scene();
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), null);
  quad.frustumCulled = false;
  quadScene.add(quad);
  const VS = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;
  const bright = new THREE.ShaderMaterial({
    uniforms: { tSrc: { value: null }, uTh: { value: 1.0 } }, vertexShader: VS, depthTest: false, toneMapped: false,
    fragmentShader: `varying vec2 vUv; uniform sampler2D tSrc; uniform float uTh;
      void main(){ vec2 px = vec2(1.0/${W}.0, 1.0/${H}.0) * 1.5; vec3 c = vec3(0.0);
        c += texture2D(tSrc, vUv + px*vec2(-1,-1)).rgb; c += texture2D(tSrc, vUv + px*vec2(1,-1)).rgb; c += texture2D(tSrc, vUv + px*vec2(-1,1)).rgb; c += texture2D(tSrc, vUv + px*vec2(1,1)).rgb;
        c *= 0.25; float l = max(c.r, max(c.g, c.b)); gl_FragColor = vec4(c * smoothstep(uTh, uTh + 0.6, l), 1.0); }`,
  });
  const blur = new THREE.ShaderMaterial({
    uniforms: { tSrc: { value: null }, uDir: { value: new THREE.Vector2() } }, vertexShader: VS, depthTest: false, toneMapped: false,
    fragmentShader: `varying vec2 vUv; uniform sampler2D tSrc; uniform vec2 uDir;
      void main(){ vec3 c = texture2D(tSrc, vUv).rgb * 0.2; float w[4]; w[0]=0.18; w[1]=0.14; w[2]=0.09; w[3]=0.05;
        for (int i = 1; i <= 4; i++){ vec2 o = uDir * float(i) * 1.6; c += (texture2D(tSrc, vUv + o).rgb + texture2D(tSrc, vUv - o).rgb) * w[i-1]; }
        gl_FragColor = vec4(c, 1.0); }`,
  });
  const comp = new THREE.ShaderMaterial({
    uniforms: {
      tScene: { value: rtScene.texture }, tBloom: { value: rtA.texture }, tHud: { value: rtHud.texture },
      uChroma: { value: 0.0012 }, uFlash: { value: 0 }, uTint: { value: new THREE.Vector3(0, 0, 0) }, uGlitch: { value: 0 }, uBloom: { value: 1 },
      uVig: { value: 1 }, uFrame: { value: 0 }, uZoom: { value: 0 }, uZoomC: { value: 0.5 },
    },
    vertexShader: VS, depthTest: false,
    fragmentShader: `varying vec2 vUv;
      uniform sampler2D tScene; uniform sampler2D tBloom; uniform sampler2D tHud;
      uniform float uChroma; uniform float uFlash; uniform vec3 uTint; uniform float uGlitch; uniform float uBloom; uniform float uVig; uniform float uFrame; uniform float uZoom; uniform float uZoomC;
      float hash(float n){ return fract(sin(n) * 43758.5453); }
      void main(){
        vec2 uv = vUv; vec2 cc = uv - 0.5;
        float fr = floor(uFrame / 2.0);
        float band = floor(uv.y * 34.0 + hash(fr) * 7.0);
        float on = step(0.72, hash(band * 1.7 + fr * 3.1));
        uv.x += (hash(band + fr * 9.3) - 0.5) * 0.08 * uGlitch * on;
        vec2 dir = normalize(cc + 1e-5) * (uChroma + uGlitch * on * 0.01);
        vec3 s = vec3(0.0); vec2 toC = vec2(0.5, uZoomC) - uv;
        for (int i = 0; i < 8; i++){ vec2 o = toC * (float(i) / 7.0) * uZoom; s.r += texture2D(tScene, uv + o + dir).r; s.g += texture2D(tScene, uv + o).g; s.b += texture2D(tScene, uv + o - dir).b; }
        s /= 8.0;
        vec3 col = s + texture2D(tBloom, uv).rgb * uBloom + uTint;
        col = mix(col, vec3(2.4, 2.2, 2.1), uFlash);
        gl_FragColor = vec4(col, 1.0);
        #include <tonemapping_fragment>
        vec4 hr = texture2D(tHud, uv + dir * 0.7); vec4 hg = texture2D(tHud, uv); vec4 hb = texture2D(tHud, uv - dir * 0.7);
        gl_FragColor.rgb = gl_FragColor.rgb * (1.0 - hg.a) + vec3(hr.r, hg.g, hb.b);
        float v = smoothstep(0.95, 0.25, length(cc * vec2(0.85, 1.0)) * uVig);
        gl_FragColor.rgb *= mix(0.25, 1.0, v);
        vec2 fc = gl_FragCoord.xy + vec2(fr * 5.588238, fr * 3.17);
        gl_FragColor.rgb += (fract(52.9829189 * fract(dot(fc, vec2(0.06711056, 0.00583715)))) - 0.5) * 0.03;
        gl_FragColor.rgb = mix(gl_FragColor.rgb, vec3(1.0), uFlash * 0.6);
        #include <colorspace_fragment>
      }`,
  });
  function pass(mat, target) {
    quad.material = mat;
    renderer.setRenderTarget(target);
    renderer.clear();
    renderer.render(quadScene, quadCam);
  }
  function render() {
    renderer.setRenderTarget(rtScene);
    renderer.setClearColor(0x000000, 1);
    renderer.clear();
    renderer.render(scene, camera);
    renderer.setRenderTarget(rtHud);
    renderer.setClearColor(0x000000, 0);
    renderer.clear();
    renderer.render(hud.scene, hud.camera);
    renderer.setClearColor(0x000000, 1);
    bright.uniforms.tSrc.value = rtScene.texture;
    pass(bright, rtA);
    for (let i = 0; i < 2; i++) {
      blur.uniforms.tSrc.value = rtA.texture;
      blur.uniforms.uDir.value.set(1 / BW, 0);
      pass(blur, rtB);
      blur.uniforms.tSrc.value = rtB.texture;
      blur.uniforms.uDir.value.set(0, 1 / BH);
      pass(blur, rtA);
    }
    pass(comp, null);
  }
  return { u: comp.uniforms, render };
}

export const decay = (t, t0, k) => (t >= t0 ? Math.exp(-(t - t0) * k) : 0);
