import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { FXAAPass } from "three/addons/postprocessing/FXAAPass.js";

/**
 * Tilt-shift / miniature-faking post stack.
 *
 * The scene is rendered into a linear HDR buffer, a two-pass separable defocus
 * is applied with a screen-space circle of confusion (a horizontal focus band),
 * then OutputPass restores the renderer tone mapping / sRGB output and a small
 * grade pass adds the "toy photograph" look. The DOM HUD is untouched because
 * only the WebGL canvas goes through the composer.
 */

const TiltShiftBlurShader = {
  name: "TiltShiftBlurShader",
  uniforms: {
    tDiffuse: { value: null },
    uResolution: { value: new THREE.Vector2(1, 1) },
    uDirection: { value: new THREE.Vector2(1, 0) },
    uFocus: { value: 0.5 }, // focus band centre, 0 = bottom, 1 = top
    uBand: { value: 0.08 }, // half height of the sharp core
    uFeather: { value: 0.30 }, // distance over which blur ramps up
    uMaxBlur: { value: 0.022 }, // max sigma, as a fraction of screen height
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform vec2 uResolution;
    uniform vec2 uDirection;
    uniform float uFocus;
    uniform float uBand;
    uniform float uFeather;
    uniform float uMaxBlur;
    varying vec2 vUv;

    void main() {
      float aspect = uResolution.x / uResolution.y;
      float distanceToBand = abs(vUv.y - uFocus);
      float coc = smoothstep(uBand, uBand + uFeather, distanceToBand);
      float sigma = coc * uMaxBlur;

      vec2 stepUv = vec2(uDirection.x / aspect, uDirection.y) * sigma;
      vec3 color = vec3(0.0);
      float weightSum = 0.0;

      const int TAPS = 7;
      for (int i = -TAPS; i <= TAPS; i++) {
        float t = 2.0 * float(i) / float(TAPS);
        float weight = exp(-0.5 * t * t);
        color += texture2D(tDiffuse, vUv + stepUv * t).rgb * weight;
        weightSum += weight;
      }

      gl_FragColor = vec4(color / weightSum, 1.0);
    }
  `,
};

const MiniatureGradeShader = {
  name: "MiniatureGradeShader",
  uniforms: {
    tDiffuse: { value: null },
    uResolution: { value: new THREE.Vector2(1, 1) },
    uSaturation: { value: 1.15 },
    uContrast: { value: 1.05 },
    uWarmth: { value: 0.006 },
    uVignette: { value: 0.16 },
    uAberration: { value: 0.0012 },
    uGrain: { value: 0.006 },
    uTime: { value: 0 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform vec2 uResolution;
    uniform float uSaturation;
    uniform float uContrast;
    uniform float uWarmth;
    uniform float uVignette;
    uniform float uAberration;
    uniform float uGrain;
    uniform float uTime;
    varying vec2 vUv;

    void main() {
      // Slight lateral chromatic aberration, stronger toward the frame edge.
      vec2 radial = vUv - 0.5;
      vec3 color;
      color.r = texture2D(tDiffuse, vUv - radial * uAberration).r;
      color.g = texture2D(tDiffuse, vUv).g;
      color.b = texture2D(tDiffuse, vUv + radial * uAberration).b;

      float luma = dot(color, vec3(0.2126, 0.7152, 0.0722));
      color = mix(vec3(luma), color, uSaturation);
      color = (color - 0.5) * uContrast + 0.5;
      color *= vec3(1.0 + uWarmth, 1.0, 1.0 - uWarmth * 0.7);

      vec2 q = vUv - 0.5;
      color *= 1.0 - uVignette * smoothstep(0.05, 0.5, dot(q, q));

      float grain = fract(sin(dot(vUv * uResolution + uTime, vec2(12.9898, 78.233))) * 43758.5453);
      color += (grain - 0.5) * uGrain;

      gl_FragColor = vec4(clamp(color, 0.0, 1.0), 1.0);
    }
  `,
};

export function createMiniatureEffect(renderer, scene, initialCamera) {
  const composer = new EffectComposer(renderer);

  const renderPass = new RenderPass(scene, initialCamera);

  const blurHorizontal = new ShaderPass(TiltShiftBlurShader);
  blurHorizontal.uniforms.uDirection.value.set(1, 0);

  const blurVertical = new ShaderPass(TiltShiftBlurShader);
  blurVertical.uniforms.uDirection.value.set(0, 1);

  const outputPass = new OutputPass();

  const gradePass = new ShaderPass(MiniatureGradeShader);

  const fxaaPass = new FXAAPass();

  composer.addPass(renderPass);
  composer.addPass(blurHorizontal);
  composer.addPass(blurVertical);
  composer.addPass(outputPass);
  composer.addPass(gradePass);
  composer.addPass(fxaaPass);

  const blurPasses = [blurHorizontal, blurVertical];
  const gradeUniforms = gradePass.uniforms;

  let width = 1;
  let height = 1;

  function setSize(nextWidth, nextHeight) {
    width = Math.max(1, Math.round(nextWidth));
    height = Math.max(1, Math.round(nextHeight));
    composer.setSize(width, height);
    for (const pass of blurPasses) {
      pass.uniforms.uResolution.value.set(width, height);
    }
    gradeUniforms.uResolution.value.set(width, height);
  }

  function setFocus(value) {
    const focus = THREE.MathUtils.clamp(value, 0.1, 0.9);
    for (const pass of blurPasses) pass.uniforms.uFocus.value = focus;
  }

  function setBlurStrength(value) {
    for (const pass of blurPasses) pass.uniforms.uMaxBlur.value = value;
  }

  function render(deltaTime, camera) {
    renderPass.camera = camera;
    gradeUniforms.uTime.value += deltaTime;
    composer.render(deltaTime);
  }

  function dispose() {
    composer.dispose();
  }

  return {
    render,
    setSize,
    setFocus,
    setBlurStrength,
    dispose,
    uniforms: {
      blurHorizontal: blurHorizontal.uniforms,
      blurVertical: blurVertical.uniforms,
      grade: gradeUniforms,
    },
    get size() {
      return { width, height };
    },
  };
}
