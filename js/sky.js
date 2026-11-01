import * as THREE from 'three';
import {clamp,lerp,mulberry32} from './util.js';

// colour stops by sun elevation (degrees)
const STOPS=[
 {e:-20,top:0x03050d,hor:0x0a1224,fog:0x0b1120,sun:0x000000,si:0,hs:0x34466e,hg:0x0a0a12,hi:.32,moon:.55,exp:1.0},
 {e:-6, top:0x111a36,hor:0x4a3a5a,fog:0x2a2a40,sun:0x000000,si:0,hs:0x4a5a88,hg:0x141018,hi:.38,moon:.35,exp:1.0},
 {e:0,  top:0x2c3c70,hor:0xff8048,fog:0x9a6a5a,sun:0xff5a20,si:.9,hs:0x8a8ab0,hg:0x3a2a22,hi:.6,moon:0,exp:.95},
 {e:6,  top:0x40649e,hor:0xffbe86,fog:0xc8a08a,sun:0xffa060,si:2.2,hs:0xa8b8d8,hg:0x4a3a2a,hi:.9,moon:0,exp:.9},
 {e:20, top:0x3a78c8,hor:0xb4d0ea,fog:0xaec4d8,sun:0xfff0dc,si:3.0,hs:0xbcd4f0,hg:0x4a4430,hi:1.05,moon:0,exp:.85},
 {e:70, top:0x2a68c8,hor:0xc2daf0,fog:0xb8cce0,sun:0xfffaf0,si:3.3,hs:0xc8dcf4,hg:0x4a4630,hi:1.1,moon:0,exp:.85}];
const ca=new THREE.Color(),cb=new THREE.Color();
function sample(e){let i=0;while(i<STOPS.length-2&&e>STOPS[i+1].e)i++;const A=STOPS[i],B=STOPS[i+1];const t=clamp((e-A.e)/(B.e-A.e),0,1);
  const c=k=>ca.setHex(A[k]).lerp(cb.setHex(B[k]),t).clone();const n=k=>lerp(A[k],B[k],t);
  return {top:c('top'),hor:c('hor'),fog:c('fog'),sun:c('sun'),si:n('si'),hs:c('hs'),hg:c('hg'),hi:n('hi'),moon:n('moon'),exp:n('exp')};}

export const DAY_END=.64;
export function sunElevation(t){return t<DAY_END?Math.sin(Math.PI*t/DAY_END)*62:-Math.sin(Math.PI*(t-DAY_END)/(1-DAY_END))*38;}
export function phaseName(t){const e=sunElevation(t);if(t<DAY_END){if(t<.09)return '夜明け';if(t>DAY_END-.1)return '夕暮れ';return '昼';}return e>-6?'黄昏':'夜';}

export function buildSky(scene){
  const uniforms={uTop:{value:new THREE.Color()},uHor:{value:new THREE.Color()},uSunDir:{value:new THREE.Vector3(0,1,0)},uSunCol:{value:new THREE.Color()},
    uMoonDir:{value:new THREE.Vector3(0,1,0)},uMoon:{value:0},uTime:{value:0},uNight:{value:0}};
  const mat=new THREE.ShaderMaterial({uniforms,side:THREE.BackSide,depthWrite:false,fog:false,
    vertexShader:'varying vec3 vDir;void main(){vDir=normalize(position);vec4 p=modelViewMatrix*vec4(position,1.);gl_Position=projectionMatrix*p;gl_Position.z=gl_Position.w;}',
    fragmentShader:`uniform vec3 uTop,uHor,uSunDir,uSunCol,uMoonDir;uniform float uMoon,uTime,uNight;varying vec3 vDir;
    float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
    float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y);}
    float fbm(vec2 p){float s=0.,a=.5;for(int i=0;i<5;i++){s+=a*n(p);p*=2.1;a*=.5;}return s;}
    void main(){vec3 d=normalize(vDir);float y=d.y;
      vec3 col=mix(uHor,uTop,pow(clamp(y,0.,1.),.45));
      if(y<0.)col=mix(uHor,uHor*.6,clamp(-y*4.,0.,1.));
      float s=max(dot(d,uSunDir),0.);
      col+=uSunCol*(pow(s,8.)*.35+pow(s,64.)*.6)*(1.-clamp(y,0.,1.)*.5);
      col+=uSunCol*smoothstep(.9994,.9997,s)*6.;
      float m=max(dot(d,uMoonDir),0.);col+=vec3(.9,.95,1.)*uMoon*(smoothstep(.9996,.9998,m)*2.+pow(m,200.)*.15);
      if(y>0.){vec2 uv=d.xz/(y+.12)*1.2+vec2(uTime*.004,uTime*.002);float c=smoothstep(.5,.85,fbm(uv*1.3));
        vec3 cc=mix(uHor*1.05,vec3(1.)*(1.-uNight*.85),clamp(y*3.,0.,1.));cc+=uSunCol*pow(s,4.)*.6;
        col=mix(col,cc*mix(1.,.25,uNight),c*smoothstep(0.,.2,y)*.75);}
      gl_FragColor=vec4(col,1.);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`});
  const sky=new THREE.Mesh(new THREE.SphereGeometry(9000,32,16),mat);sky.renderOrder=-10;sky.frustumCulled=false;scene.add(sky);
  // stars
  const R=mulberry32(5);const N=3000;const sp=new Float32Array(N*3);
  for(let i=0;i<N;i++){const u=R()*2-1,a=R()*Math.PI*2;const y=Math.abs(u)*.98+.02;const r=Math.sqrt(1-y*y);sp[i*3]=Math.cos(a)*r*8500;sp[i*3+1]=y*8500;sp[i*3+2]=Math.sin(a)*r*8500;}
  const sg=new THREE.BufferGeometry();sg.setAttribute('position',new THREE.BufferAttribute(sp,3));
  const starMat=new THREE.PointsMaterial({color:0xffffff,size:2,sizeAttenuation:false,transparent:true,depthWrite:false,fog:false,opacity:0});
  const stars=new THREE.Points(sg,starMat);stars.frustumCulled=false;scene.add(stars);
  const hemi=new THREE.HemisphereLight(0xffffff,0x444444,1);scene.add(hemi);
  const sun=new THREE.DirectionalLight(0xffffff,3);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);
  const sc=sun.shadow.camera;sc.left=-70;sc.right=70;sc.top=70;sc.bottom=-70;sc.near=10;sc.far=5000;sun.shadow.bias=-.0004;sun.shadow.normalBias=.4;
  scene.add(sun);scene.add(sun.target);
  scene.fog=new THREE.FogExp2(0xaabbcc,.0003);
  const sunDir=new THREE.Vector3(),moonDir=new THREE.Vector3();
  return {sky,stars,sun,hemi,sunDir,uniforms,
    update(t,focus,renderer,time){const e=sunElevation(t);const er=e*Math.PI/180;
      const phi=Math.PI*clamp(t/DAY_END,0,1);const hx=Math.cos(phi),hz=.75*Math.sin(phi)-.1;const hl=Math.hypot(hx,hz);
      sunDir.set(hx/hl*Math.cos(er),Math.sin(er),hz/hl*Math.cos(er));
      const mphi=Math.PI*clamp((t-DAY_END)/(1-DAY_END),0,1);const me=Math.max(.15,Math.sin(mphi))*0.75;moonDir.set(Math.cos(mphi)*Math.cos(me),Math.sin(me),.4*Math.cos(me)).normalize();
      const S=sample(e);const night=clamp((-e-2)/10,0,1);this.night=night;this.elev=e;
      uniforms.uTop.value.copy(S.top);uniforms.uHor.value.copy(S.hor);uniforms.uSunDir.value.copy(sunDir);uniforms.uSunCol.value.copy(S.sun);
      uniforms.uMoonDir.value.copy(moonDir);uniforms.uMoon.value=night;uniforms.uTime.value=time;uniforms.uNight.value=night;
      starMat.opacity=night*.95;
      const useSun=e>-1.5;const L=useSun?sunDir:moonDir;
      sun.color.copy(useSun?S.sun:new THREE.Color(0x9ab4ff));sun.intensity=useSun?S.si*clamp((e+1.5)/3,0,1):S.moon;
      sun.target.position.copy(focus);sun.position.copy(focus).addScaledVector(L,2500);sun.target.updateMatrixWorld();
      hemi.color.copy(S.hs);hemi.groundColor.copy(S.hg);hemi.intensity=S.hi;
      scene.fog.color.copy(S.fog);scene.fog.density=lerp(.00026,.00034,1-clamp(e/20,0,1));
      renderer.toneMappingExposure=S.exp;return S;}};}
