// Water shader copied unchanged from the original city for visual parity.
import * as THREE from 'three';
export function makeWaterMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uDeep: { value: new THREE.Color("#1d6173") },
      uShallow: { value: new THREE.Color("#5ea8ae") },
      uFoam: { value: new THREE.Color("#d2eee8") },
    },
    vertexShader: /* glsl */ `
      varying vec3 vWorld;
      void main() {
        vec4 world = modelMatrix * vec4(position, 1.0);
        vWorld = world.xyz;
        gl_Position = projectionMatrix * viewMatrix * world;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform vec3 uDeep;
      uniform vec3 uShallow;
      uniform vec3 uFoam;
      varying vec3 vWorld;

      float hash21(vec2 p) {
        p = fract(p * vec2(123.34, 456.21));
        p += dot(p, p + 45.32);
        return fract(p.x * p.y);
      }

      float ripple(vec2 p, vec2 density, float chance, float offset) {
        vec2 q = p * density;
        vec2 id = floor(q);
        vec2 f = fract(q);
        float h = hash21(id + offset);
        float wave = abs(f.y - (0.5 + sin(f.x * 6.283 + h * 6.283 + uTime * 0.28) * 0.055));
        float dash = step(0.16, f.x) * step(f.x, 0.68) * step(wave, 0.055);
        return step(chance, h) * dash;
      }

      void main() {
        vec2 p = vWorld.xz;
        vec3 col = mix(uDeep, uShallow, 0.17);

        float marks = max(
          ripple(p, vec2(0.62, 0.92), 0.935, 0.0),
          ripple(p, vec2(0.31, 0.5), 0.976, 7.0) * 0.8
        );
        col = mix(col, uFoam, marks * 0.14);

        col = floor(col * 32.0 + 0.5) / 32.0;
        gl_FragColor = vec4(col, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
    side: THREE.DoubleSide,
  });
}

