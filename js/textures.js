import * as THREE from 'three';
import {fbm2p,noise2p,mulberry32,clamp} from './util.js';

function canvas(s){const c=document.createElement('canvas');c.width=c.height=s;return c;}
function tex(c,{repeat=true,srgb=true}={}){const t=new THREE.CanvasTexture(c);if(repeat){t.wrapS=t.wrapT=THREE.RepeatWrapping;}
  t.colorSpace=srgb?THREE.SRGBColorSpace:THREE.NoColorSpace;t.anisotropy=8;t.generateMipmaps=true;t.minFilter=THREE.LinearMipmapLinearFilter;return t;}
// height field (tileable) -> {albedo, normal}
function heightField(s,fn){const h=new Float32Array(s*s);for(let y=0;y<s;y++)for(let x=0;x<s;x++)h[y*s+x]=fn(x/s,y/s);return h;}
function normalFrom(h,s,strength){const c=canvas(s);const ctx=c.getContext('2d');const im=ctx.createImageData(s,s);
  for(let y=0;y<s;y++)for(let x=0;x<s;x++){const l=h[y*s+(x-1+s)%s],r=h[y*s+(x+1)%s],u=h[((y-1+s)%s)*s+x],d=h[((y+1)%s)*s+x];
    let nx=(l-r)*strength,ny=(u-d)*strength,nz=1;const L=Math.hypot(nx,ny,nz);nx/=L;ny/=L;nz/=L;const i=(y*s+x)*4;
    im.data[i]=(nx*.5+.5)*255;im.data[i+1]=(ny*.5+.5)*255;im.data[i+2]=(nz*.5+.5)*255;im.data[i+3]=255;}
  ctx.putImageData(im,0,0);return tex(c,{srgb:false});}
function albedoFrom(h,s,fn){const c=canvas(s);const ctx=c.getContext('2d');const im=ctx.createImageData(s,s);
  for(let i=0;i<s*s;i++){const [r,g,b]=fn(h[i],i%s/s,Math.floor(i/s)/s);im.data[i*4]=r;im.data[i*4+1]=g;im.data[i*4+2]=b;im.data[i*4+3]=255;}
  ctx.putImageData(im,0,0);return c;}

export function stoneTextures(){const s=256;
  const h=heightField(s,(u,v)=>{const a=fbm2p(u*8,v*8,8,5);const cr=Math.abs(noise2p(u*6,v*6,6)+0.3*noise2p(u*14,v*14,14));return a*.6-Math.max(0,.08-cr)*6;});
  const map=tex(albedoFrom(h,s,(x)=>{const v=clamp(170+x*120,40,255);return [v,v*.98,v*.93];}));
  return {map,normalMap:normalFrom(h,s,6)};}

export function skinTextures(){const s=512;
  const h=heightField(s,(u,v)=>fbm2p(u*6,v*6,6,5)*.7+Math.abs(noise2p(u*10,v*10,10))*.5);
  const map=tex(albedoFrom(h,s,(x)=>{const v=clamp(150+x*140,40,255);return [v,v*.85,v*.82];}));
  const normalMap=normalFrom(h,s,9);
  // glowing veins
  const c=canvas(s);const ctx=c.getContext('2d');ctx.fillStyle='#000';ctx.fillRect(0,0,s,s);
  const R=mulberry32(7);ctx.lineCap='round';
  function branch(x,y,a,w,len,depth){for(let i=0;i<len;i++){const nx=x+Math.cos(a)*4,ny=y+Math.sin(a)*4;
      for(const ox of [-s,0,s])for(const oy of [-s,0,s]){ctx.beginPath();ctx.moveTo(x+ox,y+oy);ctx.lineTo(nx+ox,ny+oy);ctx.lineWidth=w;ctx.stroke();}
      x=nx;y=ny;a+=(R()-.5)*.7;w*=.985;if(depth<3&&R()<.05)branch(x,y,a+(R()-.5)*2,w*.7,len*.5|0,depth+1);}}
  ctx.shadowColor='#ff3000';ctx.shadowBlur=6;ctx.strokeStyle='#ff6a2a';
  for(let k=0;k<7;k++)branch(R()*s,R()*s,R()*6.28,2.6,50+R()*50,0);
  ctx.shadowBlur=0;ctx.strokeStyle='#ffd080';
  const veins=tex(c);
  return {map,normalMap,veins};}

export function groundTextures(){const s=256;
  const h=heightField(s,(u,v)=>fbm2p(u*16,v*16,16,4)*.7+fbm2p(u*64,v*64,64,2)*.3);
  const map=tex(albedoFrom(h,s,(x)=>{const v=clamp(215+x*65,90,255);return [v,v,v];}));
  return {map,normalMap:normalFrom(h,s,3)};}

export function thatchTexture(){const s=256;const c=canvas(s);const ctx=c.getContext('2d');const R=mulberry32(3);
  ctx.fillStyle='#8a6a3a';ctx.fillRect(0,0,s,s);
  for(let i=0;i<2600;i++){const x=R()*s,y=R()*s,l=10+R()*26;const t=R();ctx.strokeStyle=`rgb(${120+t*90|0},${90+t*70|0},${40+t*40|0})`;ctx.lineWidth=1+R()*1.5;
    ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+(R()-.5)*3,y+l);ctx.stroke();}
  for(let y=0;y<s;y+=32){ctx.fillStyle='rgba(40,25,10,.35)';ctx.fillRect(0,y,s,3);}
  return tex(c);}
export function plasterTexture(){const s=128;const h=heightField(s,(u,v)=>fbm2p(u*8,v*8,8,4));
  return tex(albedoFrom(h,s,(x)=>{const v=clamp(205+x*90,100,255);return [v,v*.95,v*.86];}));}
export function glowTexture(inner='rgba(255,255,255,1)',mid='rgba(255,255,255,0.35)'){const s=128;const c=canvas(s);const ctx=c.getContext('2d');
  const g=ctx.createRadialGradient(s/2,s/2,0,s/2,s/2,s/2);g.addColorStop(0,inner);g.addColorStop(.18,mid);g.addColorStop(1,'rgba(255,255,255,0)');
  ctx.fillStyle=g;ctx.fillRect(0,0,s,s);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t;}
export function trailTexture(){const c=document.createElement('canvas');c.width=32;c.height=256;const ctx=c.getContext('2d');
  const g=ctx.createLinearGradient(0,0,0,256);g.addColorStop(0,'rgba(255,255,255,0)');g.addColorStop(.7,'rgba(255,160,60,.5)');g.addColorStop(1,'rgba(255,240,200,1)');
  ctx.fillStyle=g;ctx.fillRect(0,0,32,256);const h=ctx.createLinearGradient(0,0,32,0);
  const im=ctx.getImageData(0,0,32,256);for(let y=0;y<256;y++)for(let x=0;x<32;x++){const f=1-Math.pow(Math.abs(x-15.5)/16,2);im.data[(y*32+x)*4+3]*=f;}
  ctx.putImageData(im,0,0);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t;}
