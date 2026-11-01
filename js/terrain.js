import * as THREE from 'three';
import {H,riverZ,riverSurf,pathDist,VILLAGE,CASSIAN,MALPHAS,valleyR,BRIDGE_X,bridgeY,onBridge,plinthTop,RAMP_A,RAMP_B,PLINTH,moundTop} from './world.js';
import {fbm2,mulberry32,smoothstep,lerp,clamp,rockify,nextFrame,mergeGeos} from './util.js';
import {groundTextures} from './textures.js';

export const SIZE=6400,SEG=560;
const CELL=SIZE/SEG,HALF=SIZE/2,ROW=SEG+1;
let heights=null;

export function groundAt(x,z){ // mesh-accurate terrain height (matches rendered triangles)
  const gx=(x+HALF)/CELL,gz=(z+HALF)/CELL;let ix=Math.floor(gx),iz=Math.floor(gz);
  ix=clamp(ix,0,SEG-1);iz=clamp(iz,0,SEG-1);const fx=clamp(gx-ix,0,1),fz=clamp(gz-iz,0,1);
  const ha=heights[iz*ROW+ix],hb=heights[(iz+1)*ROW+ix],hc=heights[(iz+1)*ROW+ix+1],hd=heights[iz*ROW+ix+1];
  if(fx+fz<=1)return ha+(hd-ha)*fx+(hb-ha)*fz;return hc+(hb-hc)*(1-fx)+(hd-hc)*(1-fz);}
export function walkHeight(x,z){let h=groundAt(x,z);if(onBridge(x,z))h=Math.max(h,bridgeY(z));
  const rz=riverZ(x);if(Math.abs(z-rz)<26)h=Math.max(h,riverSurf(x)-0.45);return h;}
export function inWater(x,z){const rz=riverZ(x);return Math.abs(z-rz)<20&&!onBridge(x,z)&&groundAt(x,z)<riverSurf(x)-0.1;}

export async function buildTerrain(scene,progress){
  const g=new THREE.PlaneGeometry(SIZE,SIZE,SEG,SEG);g.rotateX(-Math.PI/2);
  const pos=g.attributes.position;heights=new Float32Array(pos.count);
  for(let i=0;i<pos.count;i++){const x=pos.getX(i),z=pos.getZ(i);const h=H(x,z);heights[i]=h;pos.setY(i,h);if(i%40000===0){progress(i/pos.count);await nextFrame();}}
  g.computeVertexNormals();
  const nrm=g.attributes.normal;const col=new Float32Array(pos.count*3);const C=new THREE.Color();
  const grass=new THREE.Color(0x4d6b2a),dry=new THREE.Color(0x8a8a46),dirt=new THREE.Color(0x7a6244),rock=new THREE.Color(0x6e6a64),dark=new THREE.Color(0x3d3a38),snow=new THREE.Color(0xe8ecf2),sand=new THREE.Color(0x8c8064),burnt=new THREE.Color(0x2e2522);
  const pT=plinthTop(),mT=moundTop();
  for(let i=0;i<pos.count;i++){const x=pos.getX(i),z=pos.getZ(i),h=heights[i];const ny=nrm.getY(i);
    C.copy(grass).lerp(dry,clamp(.5+fbm2(x*.004,z*.004,3)*1.6,0,1)*.7);
    C.multiplyScalar(.85+fbm2(x*.03,z*.03,2)*.35);
    const pd=pathDist(x,z);C.lerp(dirt,(1-smoothstep(3,9,pd+fbm2(x*.2,z*.2,2)*2))*.9);
    const rz=riverZ(x);const d=Math.abs(z-rz);if(d<28)C.lerp(sand,1-smoothstep(16,28,d));
    C.lerp(rock,smoothstep(.88,.72,ny));C.lerp(dark,smoothstep(.65,.45,ny)*.6);
    const r=valleyR(x,z);C.lerp(snow,smoothstep(520,760,h+fbm2(x*.01,z*.01,2)*80)*smoothstep(.95,1.1,r));
    const dc=Math.hypot(x-CASSIAN.x,z-CASSIAN.z);if(dc<PLINTH.r+30&&h>pT-6)C.copy(rock).multiplyScalar(.85+fbm2(x*.1,z*.1,2)*.4);
    const dm=Math.hypot(x-MALPHAS.x,z-MALPHAS.z);C.lerp(burnt,(1-smoothstep(180,460,dm+fbm2(x*.02,z*.02,2)*60))*.85);
    col[i*3]=C.r;col[i*3+1]=C.g;col[i*3+2]=C.b;}
  g.setAttribute('color',new THREE.BufferAttribute(col,3));
  const uv=g.attributes.uv;for(let i=0;i<uv.count;i++)uv.setXY(i,pos.getX(i)/6,pos.getZ(i)/6);
  const gt=groundTextures();
  const mat=new THREE.MeshStandardMaterial({vertexColors:true,map:gt.map,normalMap:gt.normalMap,normalScale:new THREE.Vector2(.4,.4),roughness:.95,metalness:0});
  const mesh=new THREE.Mesh(g,mat);mesh.receiveShadow=true;mesh.name='terrain';scene.add(mesh);
  buildWater(scene);buildBridge(scene);
  return mesh;}

let waterMat;
function buildWater(scene){
  const pos=[],idx=[];const step=8;let n=0;
  for(let x=-1700;x<=1700;x+=step){const rz=riverZ(x),s=riverSurf(x);pos.push(x,s,rz-22,x,s,rz+22);if(n>0){const a=(n-1)*2;idx.push(a,a+1,a+2,a+1,a+3,a+2);}n++;}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setIndex(idx);g.computeVertexNormals();
  waterMat=new THREE.MeshStandardMaterial({color:0x2a4a5a,roughness:.08,metalness:.6,transparent:true,opacity:.82});
  const m=new THREE.Mesh(g,waterMat);m.receiveShadow=true;scene.add(m);}
export function waterTint(c){if(waterMat)waterMat.color.copy(c);}

function buildBridge(scene){
  const wood=new THREE.MeshStandardMaterial({color:0x6b4a2e,roughness:.9});const G=[];const rz=riverZ(BRIDGE_X);const N=34;
  const put=(g,x,y,z,rx=0)=>{g.rotateX(rx);g.translate(x,y,z);G.push(g);};
  for(let i=0;i<N;i++){const z=rz-34+(i+.5)*68/N;const y=bridgeY(z);put(new THREE.BoxGeometry(5.2,.25,68/N*.9),BRIDGE_X,y-.12,z);
    if(i%3===0)for(const s of [-1,1]){put(new THREE.BoxGeometry(.2,1.1,.2),BRIDGE_X+s*2.5,y+.45,z);put(new THREE.BoxGeometry(.35,4,.35),BRIDGE_X+s*2.3,y-2.2,z);}}
  for(const s of [-1,1])for(let i=0;i<N;i++){const z0=rz-34+i*68/N,z1=z0+68/N;const y0=bridgeY(z0),y1=bridgeY(z1);
    put(new THREE.BoxGeometry(.12,.12,Math.hypot(68/N,y1-y0)),BRIDGE_X+s*2.5,(y0+y1)/2+.95,(z0+z1)/2,-Math.atan2(y1-y0,68/N));}
  const m=new THREE.Mesh(mergeGeos(G),wood);m.castShadow=true;m.receiveShadow=true;scene.add(m);}

// --- vegetation & rocks -------------------------------------------------------
export function treeOK(x,z){const r=valleyR(x,z);if(r>1.02)return false;
  if(pathDist(x,z)<16)return false;if(Math.hypot(x-VILLAGE.x,z-VILLAGE.z)<190)return false;
  if(Math.abs(z-riverZ(x))<30)return false;if(Math.hypot(x-CASSIAN.x,z-CASSIAN.z)<330)return false;if(Math.hypot(x-MALPHAS.x,z-MALPHAS.z)<470)return false;
  if(Math.hypot(x,z+1250)<220)return false;
  const [d]=[Math.hypot(x-(RAMP_A.x+RAMP_B.x)/2,z-(RAMP_A.z+RAMP_B.z)/2)];if(d<110)return false;return true;}

export function buildVegetation(scene,colliders){
  const R=mulberry32(42);const pts=[];
  for(let i=0;i<60000&&pts.length<9000;i++){const x=(R()-.5)*2900,z=(R()-.5)*3400-40;
    const dens=fbm2(x*.0035+11,z*.0035,3);if(dens<.02+R()*.25)continue;if(!treeOK(x,z))continue;
    const h=groundAt(x,z);if(h>420)continue;
    const nx=groundAt(x+3,z)-groundAt(x-3,z),nz=groundAt(x,z+3)-groundAt(x,z-3);if(Math.hypot(nx,nz)>4)continue;pts.push([x,h,z,R()]);}
  // a few lone trees near the village and along the way for scale
  for(let i=0;i<120;i++){const x=(R()-.5)*700,z=1100-R()*900;const dv=Math.hypot(x-VILLAGE.x,z-VILLAGE.z);if(!(treeOK(x,z)||(dv>150&&dv<190&&pathDist(x,z)>16)))continue;pts.push([x,groundAt(x,z),z,R()]);}
  const conif=pts.filter(p=>p[3]<.62),broad=pts.filter(p=>p[3]>=.62);
  const barkM=new THREE.MeshStandardMaterial({color:0x4a3626,roughness:1});
  const pineM=new THREE.MeshStandardMaterial({color:0x2c4a26,roughness:.9,flatShading:true});
  const leafM=new THREE.MeshStandardMaterial({color:0x4a6a2a,roughness:.9,flatShading:true});
  const trunkG=new THREE.CylinderGeometry(.25,.45,1,6);trunkG.translate(0,.5,0);
  const c1=new THREE.ConeGeometry(1,1,7);c1.translate(0,.5,0);
  const blob=new THREE.IcosahedronGeometry(1,1);
  const m4=new THREE.Matrix4(),q=new THREE.Quaternion(),S=new THREE.Vector3(),P=new THREE.Vector3(),E=new THREE.Euler(),col=new THREE.Color();
  const trunks=new THREE.InstancedMesh(trunkG,barkM,pts.length);
  const cones=new THREE.InstancedMesh(c1,pineM,conif.length*2);
  const blobs=new THREE.InstancedMesh(blob,leafM,broad.length*2);
  let ti=0,ci=0,bi=0;
  for(const p of conif){const s=.8+((p[3]*997)%1)*.9;const H=14*s;
    trunks.setMatrixAt(ti++,m4.compose(P.set(p[0],p[1]-.5,p[2]),q.identity(),S.set(s,H*.45,s)));
    cones.setMatrixAt(ci,m4.compose(P.set(p[0],p[1]+H*.22,p[2]),q.setFromEuler(E.set(0,p[3]*9,0)),S.set(3.6*s,H*.55,3.6*s)));col.setHSL(.27+((p[3]*37)%1)*.06,.4,.17+((p[3]*53)%1)*.07);cones.setColorAt(ci++,col);
    cones.setMatrixAt(ci,m4.compose(P.set(p[0],p[1]+H*.5,p[2]),q,S.set(2.6*s,H*.5,2.6*s)));cones.setColorAt(ci++,col);
    colliders.push({type:'c',x:p[0],z:p[2],r:.6*s});}
  for(const p of broad){const s=.8+((p[3]*991)%1)*.8;const H=8*s;
    trunks.setMatrixAt(ti++,m4.compose(P.set(p[0],p[1]-.5,p[2]),q.identity(),S.set(s*1.2,H*.7,s*1.2)));
    col.setHSL(.18+((p[3]*37)%1)*.1,.45,.22+((p[3]*53)%1)*.08);
    blobs.setMatrixAt(bi,m4.compose(P.set(p[0],p[1]+H*.8,p[2]),q.setFromEuler(E.set(p[3]*3,p[3]*7,0)),S.set(4.5*s,3.6*s,4.5*s)));blobs.setColorAt(bi++,col);
    blobs.setMatrixAt(bi,m4.compose(P.set(p[0]+1.8*s,p[1]+H*.62,p[2]+1*s),q,S.set(3*s,2.6*s,3*s)));blobs.setColorAt(bi++,col);
    colliders.push({type:'c',x:p[0],z:p[2],r:.7*s});}
  for(const m of [trunks,cones,blobs]){m.castShadow=true;m.receiveShadow=true;m.frustumCulled=false;m.instanceMatrix.needsUpdate=true;scene.add(m);}
  // grass tufts
  const gg=new THREE.BufferGeometry();const gp=[],gc=[],gn=[];const GR=mulberry32(77);
  for(let k=0;k<7;k++){const a=GR()*Math.PI*2,r=GR()*.18,h=.35+GR()*.4,w=.05+GR()*.03,lean=.15+GR()*.25;const bx=Math.cos(a)*r,bz=Math.sin(a)*r;const px=-Math.sin(a)*w,pz=Math.cos(a)*w;
    gp.push(bx-px,0,bz-pz,bx+px,0,bz+pz,bx+Math.cos(a)*lean,h,bz+Math.sin(a)*lean);gc.push(.45,.5,.4,.45,.5,.4,1.15,1.15,1);gn.push(0,1,0,0,1,0,0,1,0);}
  gg.setAttribute('position',new THREE.Float32BufferAttribute(gp,3));gg.setAttribute('color',new THREE.Float32BufferAttribute(gc,3));gg.setAttribute('normal',new THREE.Float32BufferAttribute(gn,3));
  const gm=new THREE.MeshStandardMaterial({vertexColors:true,side:THREE.DoubleSide,roughness:1});
  const NG=36000;const grassI=new THREE.InstancedMesh(gg,gm,NG);let gi=0;
  for(let i=0;i<200000&&gi<NG;i++){const x=(R()-.5)*1400,z=1150-R()*2100;if(valleyR(x,z)>.95)continue;if(pathDist(x,z)<3.5)continue;if(Math.abs(z-riverZ(x))<20)continue;
    if(Math.hypot(x-MALPHAS.x,z-MALPHAS.z)<420)continue;if(Math.hypot(x-CASSIAN.x,z-CASSIAN.z)<PLINTH.r+40)continue;
    const near=Math.hypot(x-VILLAGE.x,z-VILLAGE.z);if(near>400&&pathDist(x,z)>60&&R()<.7)continue;
    const s=.7+R()*1.1;grassI.setMatrixAt(gi,m4.compose(P.set(x,groundAt(x,z)-.05,z),q.setFromEuler(E.set(0,R()*6,0)),S.set(s,s*(.7+R()*.6),s)));
    col.setHSL(.19+R()*.07,.42,.30+R()*.12);grassI.setColorAt(gi++,col);}
  grassI.count=gi;grassI.frustumCulled=false;scene.add(grassI);
  // boulders: scattered + ramp edges + Malphas rubble
  const rockG=rockify(new THREE.DodecahedronGeometry(1,1),{amp:.25,freq:1.3,uvScale:.5,colA:[.42,.39,.36],colB:[.24,.22,.21],colFreq:.7});
  const rockM=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.95,flatShading:true,color:0x8c8074});
  const rocks=[];
  for(let i=0;i<500;i++){const x=(R()-.5)*2400,z=(R()-.5)*3000;if(!treeOK(x,z)||valleyR(x,z)>.97)continue;rocks.push([x,z,1+R()*3.5,R()]);}
  // ramp edges
  for(let i=0;i<=40;i++){const t=i/40;const x=lerp(RAMP_A.x,RAMP_B.x,t),z=lerp(RAMP_A.z,RAMP_B.z,t);const dx=RAMP_B.z-RAMP_A.z,dz=-(RAMP_B.x-RAMP_A.x);const L=Math.hypot(dx,dz);
    for(const s of [-1,1]){const o=11+R()*4;rocks.push([x+dx/L*o*s,z+dz/L*o*s,2+R()*3.5,R(),true]);}}
  // plinth rim boulders
  for(let i=0;i<70;i++){const a=R()*Math.PI*2;const r=PLINTH.r+14+R()*40;rocks.push([CASSIAN.x+Math.cos(a)*r,CASSIAN.z+Math.sin(a)*r,6+R()*12,R()]);}
  // crumbling rock around Malphas
  for(let i=0;i<140;i++){const a=R()*Math.PI*2;const r=90+R()*300;rocks.push([MALPHAS.x+Math.cos(a)*r,MALPHAS.z+Math.sin(a)*r,4+R()*R()*32,R()]);}
  const rockI=new THREE.InstancedMesh(rockG,rockM,rocks.length);
  rocks.forEach((r,i)=>{const y=groundAt(r[0],r[1]);rockI.setMatrixAt(i,m4.compose(P.set(r[0],y+r[2]*.15,r[1]),q.setFromEuler(E.set(r[3]*5,r[3]*11,r[3]*3)),S.set(r[2]*1.2,r[2]*.8,r[2])));
    if(r[2]>1.5)colliders.push({type:'c',x:r[0],z:r[1],r:r[2]*.95,h:y+r[2]*.9});});
  rockI.castShadow=true;rockI.receiveShadow=true;rockI.frustumCulled=false;scene.add(rockI);
  return {trees:pts.length,grass:gi,rocks:rocks.length};}
