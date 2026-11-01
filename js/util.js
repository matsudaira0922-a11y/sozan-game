import * as THREE from 'three';

export function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
function h2(i,j){let h=(Math.imul(i,374761393)+Math.imul(j,668265263))|0;h=Math.imul(h^(h>>>13),1274126177);h^=h>>>16;return (h>>>0)/4294967296;}
function h3(i,j,k){let h=(Math.imul(i,374761393)+Math.imul(j,668265263)+Math.imul(k,1440662683))|0;h=Math.imul(h^(h>>>13),1274126177);h^=h>>>16;return (h>>>0)/4294967296;}
const fade=t=>t*t*t*(t*(t*6-15)+10);
export function noise2(x,y){const xi=Math.floor(x),yi=Math.floor(y);const u=fade(x-xi),v=fade(y-yi);
 const a=h2(xi,yi),b=h2(xi+1,yi),c=h2(xi,yi+1),d=h2(xi+1,yi+1);return (a+(b-a)*u+(c-a)*v+(a-b-c+d)*u*v)*2-1;}
export function noise2p(x,y,p){const xi=Math.floor(x),yi=Math.floor(y);const u=fade(x-xi),v=fade(y-yi);
 const m=i=>((i%p)+p)%p;const a=h2(m(xi),m(yi)),b=h2(m(xi+1),m(yi)),c=h2(m(xi),m(yi+1)),d=h2(m(xi+1),m(yi+1));return (a+(b-a)*u+(c-a)*v+(a-b-c+d)*u*v)*2-1;}
export function noise3(x,y,z){const xi=Math.floor(x),yi=Math.floor(y),zi=Math.floor(z);const u=fade(x-xi),v=fade(y-yi),w=fade(z-zi);
 const L=(a,b,t)=>a+(b-a)*t;
 const x00=L(h3(xi,yi,zi),h3(xi+1,yi,zi),u),x10=L(h3(xi,yi+1,zi),h3(xi+1,yi+1,zi),u),x01=L(h3(xi,yi,zi+1),h3(xi+1,yi,zi+1),u),x11=L(h3(xi,yi+1,zi+1),h3(xi+1,yi+1,zi+1),u);
 return L(L(x00,x10,v),L(x01,x11,v),w)*2-1;}
export function fbm2(x,y,o=4){let s=0,a=0.5,f=1,n=0;for(let i=0;i<o;i++){s+=a*noise2(x*f+i*17.1,y*f-i*9.3);n+=a;a*=0.5;f*=2.03;}return s/n;}
export function fbm2p(x,y,p,o=4){let s=0,a=0.5,f=1,n=0;for(let i=0;i<o;i++){s+=a*noise2p(x*f,y*f,p*f);n+=a;a*=0.5;f*=2;}return s/n;}
export function fbm3(x,y,z,o=4){let s=0,a=0.5,f=1,n=0;for(let i=0;i<o;i++){s+=a*noise3(x*f,y*f,z*f);n+=a;a*=0.5;f*=2.03;}return s/n;}
export const clamp=(x,a,b)=>Math.min(b,Math.max(a,x));
export const lerp=(a,b,t)=>a+(b-a)*t;
export const smoothstep=(a,b,x)=>{const t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t);};
export const nextFrame=()=>new Promise(r=>setTimeout(r,0));

// --- geometry helpers -----------------------------------------------------
const UP=new THREE.Vector3(0,1,0);
export function limb(a,b,r1,r2,rs=14,hs=6){
  const len=a.distanceTo(b);const g=new THREE.CylinderGeometry(r2,r1,len,rs,hs,false);
  const mid=a.clone().add(b).multiplyScalar(.5);const q=new THREE.Quaternion().setFromUnitVectors(UP,b.clone().sub(a).normalize());
  g.applyMatrix4(new THREE.Matrix4().compose(mid,q,new THREE.Vector3(1,1,1)));return g;}
export function ellip(p,sx,sy,sz,seg=20,rot=null){
  const g=new THREE.SphereGeometry(1,seg,Math.max(6,Math.round(seg*.7)));
  const e=rot?new THREE.Euler(rot[0],rot[1],rot[2]):new THREE.Euler();
  g.applyMatrix4(new THREE.Matrix4().compose(p,new THREE.Quaternion().setFromEuler(e),new THREE.Vector3(sx,sy,sz)));return g;}
export function box(p,sx,sy,sz,rot=null,seg=1){
  const g=new THREE.BoxGeometry(sx,sy,sz,seg,seg,seg);
  const e=rot?new THREE.Euler(rot[0],rot[1],rot[2]):new THREE.Euler();
  g.applyMatrix4(new THREE.Matrix4().compose(p,new THREE.Quaternion().setFromEuler(e),new THREE.Vector3(1,1,1)));return g;}
export function cone(p,r,h,seg=10,rot=null){
  const g=new THREE.ConeGeometry(r,h,seg,3);
  const e=rot?new THREE.Euler(rot[0],rot[1],rot[2]):new THREE.Euler();
  g.applyMatrix4(new THREE.Matrix4().compose(p,new THREE.Quaternion().setFromEuler(e),new THREE.Vector3(1,1,1)));return g;}
// tapered tube along a curve (horns, tails)
export function taperTube(points,r0,r1,tubSeg=24,radSeg=10){
  const curve=new THREE.CatmullRomCurve3(points);
  const frames=curve.computeFrenetFrames(tubSeg,false);
  const pos=[],idx=[];
  for(let i=0;i<=tubSeg;i++){const t=i/tubSeg;const P=curve.getPointAt(t);const r=lerp(r0,r1,Math.pow(t,0.9));
    const N=frames.normals[i],B=frames.binormals[i];
    for(let j=0;j<=radSeg;j++){const a=j/radSeg*Math.PI*2;const c=Math.cos(a),s=Math.sin(a);
      pos.push(P.x+r*(c*N.x+s*B.x),P.y+r*(c*N.y+s*B.y),P.z+r*(c*N.z+s*B.z));}}
  for(let i=0;i<tubSeg;i++)for(let j=0;j<radSeg;j++){const a=i*(radSeg+1)+j,b=(i+1)*(radSeg+1)+j;idx.push(a,b,a+1,b,b+1,a+1);}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setIndex(idx);
  g.setAttribute('uv',new THREE.Float32BufferAttribute(new Float32Array(pos.length/3*2),2));g.computeVertexNormals();return g;}

export function mergeGeos(list){
  let nv=0,ni=0;const gs=list.map(g=>{if(!g.index){const n=g.attributes.position.count;const ix=new Uint32Array(n);for(let i=0;i<n;i++)ix[i]=i;g.setIndex(new THREE.BufferAttribute(ix,1));}return g;});
  gs.forEach(g=>{nv+=g.attributes.position.count;ni+=g.index.count;});
  const P=new Float32Array(nv*3),N=new Float32Array(nv*3),U=new Float32Array(nv*2),I=new Uint32Array(ni);
  const hasC=gs.some(g=>g.attributes.color);const C=hasC?new Float32Array(nv*3).fill(1):null;
  let vo=0,io=0;
  for(const g of gs){const n=g.attributes.position.count;P.set(g.attributes.position.array.subarray?g.attributes.position.array.slice(0,n*3):g.attributes.position.array,vo*3);
    if(g.attributes.normal)N.set(g.attributes.normal.array.slice(0,n*3),vo*3);
    if(g.attributes.uv)U.set(g.attributes.uv.array.slice(0,n*2),vo*2);
    if(C&&g.attributes.color)C.set(g.attributes.color.array.slice(0,n*3),vo*3);
    const ia=g.index.array;for(let i=0;i<ia.length;i++)I[io+i]=ia[i]+vo;io+=ia.length;vo+=n;}
  const m=new THREE.BufferGeometry();m.setAttribute('position',new THREE.BufferAttribute(P,3));m.setAttribute('normal',new THREE.BufferAttribute(N,3));
  m.setAttribute('uv',new THREE.BufferAttribute(U,2));if(C)m.setAttribute('color',new THREE.BufferAttribute(C,3));m.setIndex(new THREE.BufferAttribute(I,1));return m;}

// displace along normal with 3D noise (in world/meter units) and set box-projected UVs + vertex color variation
export function rockify(g,{amp=1,freq=0.05,uvScale=0.05,colA=[.5,.5,.5],colB=[.35,.35,.33],colFreq=0.01,offset=0,keepNormals=false}={}){
  g.computeVertexNormals();
  const p=g.attributes.position,n=g.attributes.normal;const cnt=p.count;
  const col=new Float32Array(cnt*3),uv=new Float32Array(cnt*2);
  for(let i=0;i<cnt;i++){const x=p.getX(i),y=p.getY(i),z=p.getZ(i);const nx=n.getX(i),ny=n.getY(i),nz=n.getZ(i);
    const d=fbm3(x*freq+offset,y*freq,z*freq,3)*amp;
    p.setXYZ(i,x+nx*d,y+ny*d,z+nz*d);
    const ax=Math.abs(nx),ay=Math.abs(ny),az=Math.abs(nz);
    if(ay>=ax&&ay>=az){uv[i*2]=x*uvScale;uv[i*2+1]=z*uvScale;}else if(ax>=az){uv[i*2]=z*uvScale;uv[i*2+1]=y*uvScale;}else{uv[i*2]=x*uvScale;uv[i*2+1]=y*uvScale;}
    const c=clamp(.5+fbm3(x*colFreq+5,y*colFreq*1.5,z*colFreq,4)*1.3,0,1);
    for(let k=0;k<3;k++)col[i*3+k]=lerp(colA[k],colB[k],c);}
  g.setAttribute('color',new THREE.BufferAttribute(col,3));g.setAttribute('uv',new THREE.BufferAttribute(uv,2));
  if(!keepNormals)g.computeVertexNormals();return g;}
