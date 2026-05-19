import { useRef, useMemo, Suspense, useEffect } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { EffectComposer, Bloom } from '@react-three/postprocessing'
import * as THREE from 'three'
import { AppState } from '../types'

// ─── Simplex 3D noise (Stefan Gustavson) ──────────────────────────────────────
const NOISE_GLSL = /* glsl */ `
vec4 _permute(vec4 x){return mod(((x*34.0)+10.0)*x,289.0);}
vec4 _taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}
float snoise(vec3 v){
  const vec2 C=vec2(1.0/6.0,1.0/3.0);
  const vec4 D=vec4(0.0,0.5,1.0,2.0);
  vec3 i=floor(v+dot(v,C.yyy));
  vec3 x0=v-i+dot(i,C.xxx);
  vec3 g=step(x0.yzx,x0.xyz);
  vec3 l=1.0-g;
  vec3 i1=min(g.xyz,l.zxy);
  vec3 i2=max(g.xyz,l.zxy);
  vec3 x1=x0-i1+C.xxx;
  vec3 x2=x0-i2+C.yyy;
  vec3 x3=x0-D.yyy;
  i=mod(i,289.0);
  vec4 p=_permute(_permute(_permute(
    i.z+vec4(0.0,i1.z,i2.z,1.0))+
    i.y+vec4(0.0,i1.y,i2.y,1.0))+
    i.x+vec4(0.0,i1.x,i2.x,1.0));
  float n_=1.0/7.0;
  vec3 ns=n_*D.wyz-D.xzx;
  vec4 j=p-49.0*floor(p*ns.z*ns.z);
  vec4 x_=floor(j*ns.z);
  vec4 y_=floor(j-7.0*x_);
  vec4 xs=x_*ns.x+ns.yyyy;
  vec4 ys=y_*ns.x+ns.yyyy;
  vec4 h=1.0-abs(xs)-abs(ys);
  vec4 b0=vec4(xs.xy,ys.xy);
  vec4 b1=vec4(xs.zw,ys.zw);
  vec4 s0=floor(b0)*2.0+1.0;
  vec4 s1=floor(b1)*2.0+1.0;
  vec4 sh=-step(h,vec4(0.0));
  vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy;
  vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
  vec3 p0=vec3(a0.xy,h.x);
  vec3 p1=vec3(a0.zw,h.y);
  vec3 p2=vec3(a1.xy,h.z);
  vec3 p3=vec3(a1.zw,h.w);
  vec4 norm=_taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
  p0*=norm.x;p1*=norm.y;p2*=norm.z;p3*=norm.w;
  vec4 m=max(0.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0);
  m=m*m;
  return 42.0*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
}
`

// ─── Main sphere shaders ───────────────────────────────────────────────────────
const vertexShader = /* glsl */ `
${NOISE_GLSL}
uniform float uTime;
uniform float uNoiseAmp;
uniform float uNoiseFreq;
uniform float uBass;
uniform float uMid;

varying vec3 vNormal;
varying vec3 vWorldPos;
varying float vDisplace;

void main(){
  vec3 p=position*uNoiseFreq;
  float n1=snoise(p+uTime*0.40);
  float n2=snoise(p*2.1-uTime*0.28+3.7);
  float n3=snoise(p*0.5+uTime*0.18+7.3);
  float noise=n1*0.60+n2*0.28+n3*0.12;

  float amp=uNoiseAmp+uBass*0.14+uMid*0.04;
  float d=noise*amp;
  vDisplace=d;

  vec3 displaced=position+normal*d;
  vNormal=normalMatrix*normal;
  vWorldPos=(modelMatrix*vec4(displaced,1.0)).xyz;
  gl_Position=projectionMatrix*modelViewMatrix*vec4(displaced,1.0);
}
`

const fragmentShader = /* glsl */ `
uniform float uTime;
uniform float uBass;
uniform float uMid;
uniform float uTreble;

varying vec3 vNormal;
varying vec3 vWorldPos;
varying float vDisplace;

void main(){
  vec3 N=normalize(vNormal);
  vec3 V=normalize(cameraPosition-vWorldPos);
  float NdV=max(dot(N,V),0.0);
  float fresnel=pow(1.0-NdV,2.0);

  // Color ramp stops
  vec3 cNavy  =vec3(0.000,0.102,0.302); // #001A4D
  vec3 cBlue  =vec3(0.000,0.467,1.000); // #0077FF
  vec3 cCyan  =vec3(0.000,0.831,1.000); // #00D4FF
  vec3 cViolet=vec3(0.482,0.380,1.000); // #7B61FF
  vec3 cPink  =vec3(1.000,0.380,0.863); // #FF61DC

  // Noise-based ramp position, slow time drift
  float shift=(vDisplace*3.0+sin(uTime*0.3)*0.5)*0.5+0.5;
  shift=clamp(shift,0.0,1.0);

  vec3 base;
  if(shift<0.25)      base=mix(cNavy,  cBlue,  shift/0.25);
  else if(shift<0.50) base=mix(cBlue,  cCyan,  (shift-0.25)/0.25);
  else if(shift<0.75) base=mix(cCyan,  cViolet,(shift-0.50)/0.25);
  else                base=mix(cViolet,cPink,  (shift-0.75)/0.25);

  // Fresnel edge → bright cyan/pink mix
  vec3 edgeColor=mix(cCyan,cPink,fresnel);
  base=mix(base,edgeColor,pow(fresnel,1.5)*0.7);

  // Specular highlight
  vec3 L=normalize(vec3(1.0,2.0,2.0));
  vec3 H=normalize(L+V);
  float spec=pow(max(dot(N,H),0.0),32.0)*0.5;
  base+=vec3(spec);

  // Displacement brightens ridges
  base+=vDisplace*0.8;

  // Audio response
  base+=vec3(0.0,0.55,1.0)*uTreble*0.35;
  base*=1.0+uBass*0.25;

  gl_FragColor=vec4(base,1.0);
}
`

// ─── Outer glow shaders ────────────────────────────────────────────────────────
const glowVert = /* glsl */ `
varying vec3 vN;
varying vec3 vV;
void main(){
  vN=normalize(normalMatrix*normal);
  vec4 mv=modelViewMatrix*vec4(position,1.0);
  vV=normalize(-mv.xyz);
  gl_Position=projectionMatrix*mv;
}
`

const glowFrag = /* glsl */ `
uniform vec3  uGlowColor;
uniform float uIntensity;
varying vec3 vN;
varying vec3 vV;
void main(){
  float i=pow(1.0-abs(dot(vN,vV)),2.2)*uIntensity;
  gl_FragColor=vec4(uGlowColor,i*0.55);
}
`

// ─── Inner sphere component (runs inside Canvas) ───────────────────────────────
interface ErisSphereProps {
  state: AppState
  analyser: AnalyserNode | null
  reducedMotion: boolean
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t
}

function ErisSphere({ state, analyser, reducedMotion }: ErisSphereProps) {
  const meshRef  = useRef<THREE.Mesh>(null!)
  const glowRef  = useRef<THREE.Mesh>(null!)
  const matRef   = useRef<THREE.ShaderMaterial>(null!)
  const glowMatRef = useRef<THREE.ShaderMaterial>(null!)
  const dataArr  = useRef<Uint8Array | null>(null)

  useEffect(() => {
    if (analyser) {
      dataArr.current = new Uint8Array(analyser.frequencyBinCount)
    } else {
      dataArr.current = null
    }
  }, [analyser])

  const uniforms = useMemo(() => ({
    uTime:      { value: 0 },
    uNoiseAmp:  { value: 0.04 },
    uNoiseFreq: { value: 2.4 },
    uBass:      { value: 0 },
    uMid:       { value: 0 },
    uTreble:    { value: 0 },
  }), [])

  const glowUniforms = useMemo(() => ({
    uGlowColor: { value: new THREE.Color('#00E5FF') },
    uIntensity: { value: 1.0 },
  }), [])

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime()
    const mat = matRef.current
    if (!mat) return

    // ── Read audio data ──
    let bass = 0, mid = 0, treble = 0
    if (analyser && dataArr.current && state === 'speaking') {
      analyser.getByteFrequencyData(dataArr.current as Uint8Array<ArrayBuffer>)
      const bins = dataArr.current
      let b = 0, m = 0, tr = 0
      for (let i = 0; i < 6; i++)   b  += bins[i]
      for (let i = 6; i < 48; i++)  m  += bins[i]
      for (let i = 48; i < 128; i++) tr += bins[i]
      bass = b / (6 * 255); mid = m / (42 * 255); treble = tr / (80 * 255)
    }

    // ── Smooth audio uniforms ──
    mat.uniforms.uBass.value   = lerp(mat.uniforms.uBass.value, bass, 0.18)
    mat.uniforms.uMid.value    = lerp(mat.uniforms.uMid.value, mid, 0.18)
    mat.uniforms.uTreble.value = lerp(mat.uniforms.uTreble.value, treble, 0.18)

    // ── State-driven targets ──
    let targetAmp  = 0.04
    let targetRot  = 0.004
    let targetGlow = 1.0
    let targetScale = 1.0

    if (reducedMotion) {
      mat.uniforms.uTime.value = 0
    } else {
      mat.uniforms.uTime.value = t

      switch (state) {
        case 'idle':
          targetAmp  = 0.038 + Math.sin(t * 0.5) * 0.012  // breathing
          targetRot  = 0.003
          targetScale = 1.0 + Math.sin(t * 0.5) * 0.02
          break
        case 'recording':
          targetAmp  = 0.09
          targetRot  = 0.014
          targetGlow = 1.6
          targetScale = 1.03
          break
        case 'transcribing':
        case 'processing':
          targetAmp  = 0.055 + Math.sin(t * 6) * 0.015   // shimmer
          targetRot  = 0.022
          targetGlow = 1.3
          break
        case 'speaking':
          targetAmp  = 0.07 + bass * 0.14
          targetRot  = 0.008 + mid * 0.018
          targetGlow = 1.2 + treble * 0.8
          targetScale = 1.0 + bass * 0.06
          break
      }
    }

    mat.uniforms.uNoiseAmp.value = lerp(mat.uniforms.uNoiseAmp.value, targetAmp, 0.05)

    if (meshRef.current) {
      meshRef.current.rotation.y += targetRot
      meshRef.current.rotation.x = Math.sin(t * 0.08) * 0.06
      meshRef.current.scale.setScalar(
        lerp(meshRef.current.scale.x, targetScale, 0.06)
      )
    }

    if (glowMatRef.current) {
      glowMatRef.current.uniforms.uIntensity.value = lerp(
        glowMatRef.current.uniforms.uIntensity.value,
        targetGlow,
        0.06,
      )
    }
    if (glowRef.current) {
      const gs = 1.18 + bass * 0.08 + treble * 0.04
      glowRef.current.scale.setScalar(lerp(glowRef.current.scale.x, gs, 0.06))
    }
  })

  return (
    <>
      {/* Point lights for internal depth */}
      <pointLight color="#0077FF" intensity={3} position={[1.5, 1.5, 1.5]} />
      <pointLight color="#00D4FF" intensity={2} position={[-1.5, -1, 1.5]} />
      <pointLight color="#ffffff" intensity={0.6} position={[0, 2, 0]} />

      {/* Main sphere */}
      <mesh ref={meshRef}>
        <sphereGeometry args={[1, 96, 64]} />
        <shaderMaterial
          ref={matRef}
          vertexShader={vertexShader}
          fragmentShader={fragmentShader}
          uniforms={uniforms}
        />
      </mesh>

      {/* Outer glow — back-face additive sphere */}
      <mesh ref={glowRef}>
        <sphereGeometry args={[1.18, 32, 32]} />
        <shaderMaterial
          ref={glowMatRef}
          vertexShader={glowVert}
          fragmentShader={glowFrag}
          uniforms={glowUniforms}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          side={THREE.BackSide}
        />
      </mesh>
    </>
  )
}

// ─── Exported canvas wrapper ───────────────────────────────────────────────────
interface SphereCanvasProps {
  state: AppState
  analyser: AnalyserNode | null
  sizePx: number
}

export function SphereCanvas({ state, analyser, sizePx }: SphereCanvasProps) {
  const reducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches

  return (
    <Canvas
      style={{ width: sizePx, height: sizePx, background: 'transparent' }}
      camera={{ position: [0, 0, 3], fov: 42 }}
      gl={{ antialias: true, alpha: true }}
      dpr={[1, 2]}
      onCreated={({ scene }) => { scene.background = null }}
    >
      <Suspense fallback={null}>
        <ErisSphere state={state} analyser={analyser} reducedMotion={reducedMotion} />
        <EffectComposer>
          <Bloom
            intensity={0.6}
            luminanceThreshold={0.7}
            luminanceSmoothing={0.85}
            radius={0.4}
            mipmapBlur
          />
        </EffectComposer>
      </Suspense>
    </Canvas>
  )
}
