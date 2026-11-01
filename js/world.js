// World layout + analytic height field (shared by mesh generation and gameplay)
import {fbm2,noise2,smoothstep,lerp,clamp} from './util.js';

export const VILLAGE={x:0,z:980};
export const START={x:0,z:1065};
export const CASSIAN={x:-500,z:-1250};
export const MALPHAS={x:500,z:-1250};
export const WATER_X=[-1500,1500];
export const BRIDGE_X=12;
export const riverZ=x=>330+70*Math.sin(x*0.0028)+22*Math.sin(x*0.011+1.3);

export function lowH(x,z){return fbm2(x*0.0009+3.1,z*0.0009-7.7,3)*70+fbm2(x*0.0024,z*0.0024,2)*14;}
export const riverSurf=x=>lowH(x,riverZ(x))-1.0;

const PATH=[[0,1060],[0,980],[28,860],[-24,720],[18,560],[BRIDGE_X,riverZ(BRIDGE_X)+70],[BRIDGE_X,riverZ(BRIDGE_X)-70],[70,170],[25,-120],[-45,-420],[10,-720],[0,-1000],[0,-1180]];
const BRANCH=[[10,-720],[-280,-1000]];
// Cassian plinth + ramp
export const PLINTH={r:195,h:40};
export const RAMP_A={x:-280,z:-1000};
let _plinthTop=null,_rampA=null;
export function plinthTop(){if(_plinthTop===null)_plinthTop=lowH(CASSIAN.x,CASSIAN.z)+PLINTH.h;return _plinthTop;}
export const RAMP_B=(()=>{const dx=RAMP_A.x-CASSIAN.x,dz=RAMP_A.z-CASSIAN.z,L=Math.hypot(dx,dz);return {x:CASSIAN.x+dx/L*(PLINTH.r-6),z:CASSIAN.z+dz/L*(PLINTH.r-6)};})();
export const MOUND={r:210,h:22};
export function moundTop(){return lowH(MALPHAS.x,MALPHAS.z)+MOUND.h;}

function segDist(px,pz,ax,az,bx,bz){const vx=bx-ax,vz=bz-az;const t=clamp(((px-ax)*vx+(pz-az)*vz)/(vx*vx+vz*vz),0,1);return [Math.hypot(px-ax-vx*t,pz-az-vz*t),t];}
export function pathDist(x,z){let d=1e9;for(const P of [PATH,BRANCH])for(let i=0;i<P.length-1;i++){const [dd]=segDist(x,z,P[i][0],P[i][1],P[i+1][0],P[i+1][1]);if(dd<d)d=dd;}return d;}
export const PATH_POINTS=PATH;

// valley ellipse coordinate (1 = rim)
export function valleyR(x,z){return Math.hypot(x/1350,(z+200)/1950);}

function baseH(x,z){
  let h=lowH(x,z);
  h+=fbm2(x*0.011,z*0.011,3)*3.0;
  const r=valleyR(x,z);const rim=smoothstep(0.80,1.30,r);
  h+=rim*rim*(560+360*fbm2(x*0.0021+9,z*0.0021,5))+rim*Math.abs(noise2(x*0.006,z*0.006))*70;
  return h;}

function rampH(x,z){const hA=lowH(RAMP_A.x,RAMP_A.z);const [d,t]=segDist(x,z,RAMP_A.x,RAMP_A.z,RAMP_B.x,RAMP_B.z);return [d,lerp(hA,plinthTop(),smoothstep(0,1,t)*0.15+t*0.85)];}

export function H(x,z){
  let h=baseH(x,z);
  // path groove
  const pd=pathDist(x,z);const wp=1-smoothstep(5,30,pd);
  if(wp>0)h=lerp(h,lowH(x,z)-0.25,wp);
  // village flat
  const dv=Math.hypot(x-VILLAGE.x,z-VILLAGE.z);const wv=1-smoothstep(120,200,dv);
  if(wv>0)h=lerp(h,lowH(VILLAGE.x,VILLAGE.z)+fbm2(x*0.02,z*0.02,2)*0.6,wv);
  // river
  const rz=riverZ(x),d=Math.abs(z-rz);
  if(d<70){const s=riverSurf(x);const bank=Math.max(h,s+1.2+(d-20)*0.04);const bed=s-1.3;const t=smoothstep(13,24,d);const hh=lerp(bed,bank,t);h=lerp(hh,h,smoothstep(45,70,d));}
  // Cassian plinth (rocky cliff) + ramp
  const dc=Math.hypot(x-CASSIAN.x,z-CASSIAN.z);
  if(dc<PLINTH.r+90){const top=plinthTop()+fbm2(x*0.05,z*0.05,2)*0.8;const edge=smoothstep(PLINTH.r-6,PLINTH.r+38,dc+fbm2(x*.03,z*.03,2)*14);
    const hp=lerp(top,h,edge);h=Math.max(h,hp);}
  const [rd,rh]=rampH(x,z);
  if(rd<26){const w=1-smoothstep(9,22,rd);h=Math.max(h,lerp(h,rh,w));}
  // Malphas mound of crumbling rock
  const dm=Math.hypot(x-MALPHAS.x,z-MALPHAS.z);
  if(dm<MOUND.r*2){const w=1-smoothstep(MOUND.r*0.55,MOUND.r*1.9,dm);h=Math.max(h,lerp(h,moundTop()+fbm2(x*0.03,z*0.03,3)*6,w));}
  return h;}

export function onBridge(x,z){return Math.abs(x-BRIDGE_X)<2.6&&Math.abs(z-riverZ(BRIDGE_X))<34;}
export function bridgeY(z){const rz=riverZ(BRIDGE_X);const t=clamp((z-(rz-34))/68,0,1);return riverSurf(BRIDGE_X)+2.3+Math.sin(t*Math.PI)*1.6;}
