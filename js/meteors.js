import * as THREE from 'three';
import {glowTex} from './giants.js';
import {trailTexture} from './textures.js';
import {MALPHAS,moundTop} from './world.js';
import {mulberry32} from './util.js';

const PVS=`attribute float aSize;attribute float aAlpha;attribute vec3 aColor;varying float vA;varying vec3 vC;uniform float uScale;
#include <common>
#include <fog_pars_vertex>
void main(){vA=aAlpha;vC=aColor;vec4 mvPosition=modelViewMatrix*vec4(position,1.);gl_PointSize=aSize*uScale/-mvPosition.z;gl_Position=projectionMatrix*mvPosition;
#include <fog_vertex>
}`;
const PFS=`uniform sampler2D uMap;varying float vA;varying vec3 vC;
#include <common>
#include <fog_pars_fragment>
void main(){vec4 t=texture2D(uMap,gl_PointCoord);gl_FragColor=vec4(vC,t.a*vA);if(gl_FragColor.a<.01)discard;
#include <fog_fragment>
}`;
function particleSystem(N,additive){const g=new THREE.BufferGeometry();const pos=new Float32Array(N*3),size=new Float32Array(N),alpha=new Float32Array(N),col=new Float32Array(N*3);
  g.setAttribute('position',new THREE.BufferAttribute(pos,3));g.setAttribute('aSize',new THREE.BufferAttribute(size,1));g.setAttribute('aAlpha',new THREE.BufferAttribute(alpha,1));g.setAttribute('aColor',new THREE.BufferAttribute(col,3));
  const mat=new THREE.ShaderMaterial({uniforms:THREE.UniformsUtils.merge([THREE.UniformsLib.fog,{uScale:{value:500},uMap:{value:glowTex()}}]),vertexShader:PVS,fragmentShader:PFS,transparent:true,depthWrite:false,fog:!additive,
    blending:additive?THREE.AdditiveBlending:THREE.NormalBlending});mat.uniforms.uMap.value=glowTex();
  const pts=new THREE.Points(g,mat);pts.frustumCulled=false;
  const P=[];for(let i=0;i<N;i++)P.push({life:0,max:1,v:new THREE.Vector3(),s0:1,s1:1,a0:1,c:[1,1,1],drag:0,grav:0});
  return {pts,P,next:0,N,
    emit(p,v,{life=3,s0=20,s1=60,a0=.6,c=[.5,.4,.3],drag=.5,grav=0}){const i=this.next;this.next=(this.next+1)%N;const q=P[i];q.life=life;q.max=life;q.v.copy(v);q.s0=s0;q.s1=s1;q.a0=a0;q.c=c;q.drag=drag;q.grav=grav;
      pos[i*3]=p.x;pos[i*3+1]=p.y;pos[i*3+2]=p.z;},
    update(dt){for(let i=0;i<N;i++){const q=P[i];if(q.life<=0){alpha[i]=0;continue;}q.life-=dt;const u=1-q.life/q.max;
      q.v.multiplyScalar(Math.exp(-q.drag*dt));q.v.y-=q.grav*dt;pos[i*3]+=q.v.x*dt;pos[i*3+1]+=q.v.y*dt;pos[i*3+2]+=q.v.z*dt;
      size[i]=q.s0+(q.s1-q.s0)*Math.sqrt(u);alpha[i]=q.a0*(u<.1?u/.1:1-(u-.1)/.9);col[i*3]=q.c[0];col[i*3+1]=q.c[1];col[i*3+2]=q.c[2];}
      g.attributes.position.needsUpdate=true;g.attributes.aSize.needsUpdate=true;g.attributes.aAlpha.needsUpdate=true;g.attributes.aColor.needsUpdate=true;}};}

export class Meteors{
  constructor(scene,malphas){this.scene=scene;this.malphas=malphas;this.R=mulberry32(1234);this.active=[];this.timer=4;this.onImpact=null;
    const tt=trailTexture();
    this.pool=[];for(let i=0;i<6;i++){const g=new THREE.Group();
      const core=new THREE.Mesh(new THREE.SphereGeometry(14,12,8),new THREE.MeshBasicMaterial({color:0xfff2c8,fog:false}));g.add(core);
      const glow=new THREE.Sprite(new THREE.SpriteMaterial({map:glowTex(),color:0xff9a40,blending:THREE.AdditiveBlending,depthWrite:false,fog:false}));glow.scale.setScalar(260);g.add(glow);
      const tm=new THREE.MeshBasicMaterial({map:tt,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide,fog:false});
      const tg=new THREE.PlaneGeometry(70,900);tg.translate(0,-450,0);const trail=new THREE.Group();for(let k=0;k<3;k++){const m=new THREE.Mesh(tg,tm);m.rotation.y=k*Math.PI/3;trail.add(m);}g.add(trail);
      g.userData={trail,active:false};g.visible=false;scene.add(g);this.pool.push(g);}
    this.light=new THREE.PointLight(0xff7a30,0,4000,1.0);scene.add(this.light);
    this.flash=new THREE.Sprite(new THREE.SpriteMaterial({map:glowTex(),color:0xffb060,blending:THREE.AdditiveBlending,depthWrite:false,transparent:true,fog:false,opacity:0}));scene.add(this.flash);
    this.fire=new THREE.Mesh(new THREE.SphereGeometry(1,20,14),new THREE.MeshBasicMaterial({color:0xff7020,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,opacity:0,fog:false}));scene.add(this.fire);
    const ringM=new THREE.MeshBasicMaterial({color:0xffc080,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide,opacity:0,fog:false});
    this.ring=new THREE.Mesh(new THREE.RingGeometry(.86,1,96),ringM);this.ring.rotation.x=-Math.PI/2;scene.add(this.ring);
    this.groundRing=new THREE.Mesh(new THREE.RingGeometry(.7,1,96),new THREE.MeshBasicMaterial({color:0x8a7660,transparent:true,depthWrite:false,side:THREE.DoubleSide,opacity:0}));
    this.groundRing.rotation.x=-Math.PI/2;this.groundRing.position.set(MALPHAS.x,moundTop()+6,MALPHAS.z);scene.add(this.groundRing);
    this.dust=particleSystem(1400,false);scene.add(this.dust.pts);this.embers=particleSystem(800,true);scene.add(this.embers.pts);
    this.wounds=[];for(let i=0;i<8;i++){const s=new THREE.Sprite(new THREE.SpriteMaterial({map:glowTex(),color:0xff5010,blending:THREE.AdditiveBlending,depthWrite:false,transparent:true,opacity:0}));s.scale.setScalar(90);this.wounds.push({s,t:99});}
    this.wi=0;this.fxT=99;this.ringT=99;this.impactPos=new THREE.Vector3();}
  setScale(s){this.dust.pts.material.uniforms.uScale.value=s;this.embers.pts.material.uniforms.uScale.value=s;}
  spawn(){const g=this.pool.find(p=>!p.userData.active);if(!g)return;const R=this.R;const tgt=this.malphas.targets[Math.floor(R()*this.malphas.targets.length)];
    const T=tgt.getWorldPosition(new THREE.Vector3());const dir=new THREE.Vector3(-.35+R()*.5,1,.15+R()*.4).normalize();
    g.userData.start=T.clone().addScaledVector(dir,3200);g.userData.end=T;g.userData.tgt=tgt;g.userData.t=0;g.userData.dur=2.4+R()*.6;g.userData.active=true;g.visible=true;
    g.userData.trail.quaternion.setFromUnitVectors(new THREE.Vector3(0,-1,0),dir.clone());g.position.copy(g.userData.start);this.onSpawn&&this.onSpawn(g.position);}
  update(dt,t,night,camPos){this.timer-=dt;if(this.timer<=0){this.spawn();this.timer=night>.5?3.5+this.R()*2.5:8+this.R()*5;}
    for(const g of this.pool){const u=g.userData;if(!u.active)continue;u.t+=dt;const k=Math.min(1,u.t/u.dur);const e=Math.pow(k,1.25);
      u.tgt.getWorldPosition(u.end);g.position.lerpVectors(u.start,u.end,e);
      if(k>=1){u.active=false;g.visible=false;this.impact(u.end.clone(),u.tgt);}}
    // fx
    this.fxT+=dt;const f=this.fxT;
    this.light.intensity=f<.08?f/.08*3000:3000*Math.exp(-(f-.08)*3.2);if(f>4)this.light.intensity=0;
    this.flash.material.opacity=Math.max(0,1-f/.9);this.flash.scale.setScalar(300+f*900);
    this.fire.material.opacity=Math.max(0,.6-f/1.0);this.fire.scale.setScalar(25+Math.sqrt(f)*170);
    this.ringT+=dt;const r=this.ringT;this.ring.material.opacity=Math.max(0,.4-r/2.2);this.ring.scale.setScalar(20+r*520);
    this.groundRing.material.opacity=Math.max(0,.45-r/6)*(r<.3?r/.3:1);this.groundRing.scale.setScalar(200+r*300);
    for(const w of this.wounds){w.t+=dt;const a=w.t<.3?1:Math.max(0,1-(w.t-.3)/5);w.s.material.opacity=a;w.s.material.color.setRGB(1,.25+.4*Math.max(0,1-w.t/1.5),.05);w.s.scale.setScalar(60+40*a);}
    this.dust.update(dt);this.embers.update(dt);}
  impact(p,tgt){this.fxT=0;this.ringT=0;this.light.position.copy(p).add(new THREE.Vector3(0,40,60));this.flash.position.copy(p);this.fire.position.copy(p);this.ring.position.copy(p);this.impactPos.copy(p);
    const R=this.R;const v=new THREE.Vector3();
    for(let i=0;i<140;i++){v.set(R()-.5,R()*.8-.1,R()-.5).normalize().multiplyScalar(80+R()*260);this.embers.emit(p,v,{life:1.5+R()*2.5,s0:14,s1:6,a0:1,c:[1,.55+R()*.3,.2],drag:.8,grav:90});}
    for(let i=0;i<70;i++){v.set(R()-.5,R()*.6,R()-.5).normalize().multiplyScalar(40+R()*120);this.dust.emit(p,v,{life:4+R()*4,s0:40,s1:220,a0:.5,c:[.35,.3,.27],drag:.6,grav:-4});}
    const base=new THREE.Vector3(MALPHAS.x,moundTop()+8,MALPHAS.z);
    for(let i=0;i<160;i++){const a=R()*Math.PI*2;const rr=170+R()*120;const q=base.clone().add(new THREE.Vector3(Math.cos(a)*rr,R()*10,Math.sin(a)*rr));
      v.set(Math.cos(a),.15+R()*.2,Math.sin(a)).multiplyScalar(90+R()*150);this.dust.emit(q,v,{life:4+R()*3,s0:50,s1:180,a0:.45,c:[.45,.38,.3],drag:.7,grav:-3});}
    const w=this.wounds[this.wi];this.wi=(this.wi+1)%this.wounds.length;tgt.add(w.s);w.s.position.set(0,0,0);w.t=0;
    this.malphas.hit(1);this.onImpact&&this.onImpact(p);}
}
