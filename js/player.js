import * as THREE from 'three';
import {walkHeight,inWater,groundAt} from './terrain.js';
import {valleyR} from './world.js';
import {clamp,lerp} from './util.js';

export function buildRina(){
  const g=new THREE.Group();const body=new THREE.Group();g.add(body);
  const M=(c,o={})=>new THREE.MeshStandardMaterial({color:c,roughness:.85,...o});
  const skin=M(0xf0c8a8),dress=M(0x34507a),apron=M(0xe8e0cc),hair=M(0x4a2a18),shoe=M(0x3a2414),scarf=M(0xc8201c,{roughness:.7}),dark=new THREE.MeshBasicMaterial({color:0x1a1010});
  const add=(geo,mat,x,y,z,p=body)=>{const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);m.castShadow=true;p.add(m);return m;};
  const legs=[],arms=[];
  for(const s of [-1,1]){const hip=new THREE.Group();hip.position.set(s*.075,.62,0);body.add(hip);add(new THREE.CylinderGeometry(.05,.045,.58,8),skin,0,-.29,0,hip);add(new THREE.BoxGeometry(.1,.08,.18),shoe,0,-.6,.03,hip);legs.push(hip);}
  add(new THREE.CylinderGeometry(.13,.3,.52,14),dress,0,.78,0);add(new THREE.CylinderGeometry(.1,.2,.42,10,1,true,-.9,1.8),apron,0,.76,.03);
  add(new THREE.CylinderGeometry(.135,.13,.32,12),dress,0,1.17,0);
  for(const s of [-1,1]){const sh=new THREE.Group();sh.position.set(s*.17,1.28,0);body.add(sh);add(new THREE.CylinderGeometry(.05,.042,.44,8),dress,0,-.2,0,sh);add(new THREE.SphereGeometry(.045,8,6),skin,0,-.45,0,sh);arms.push(sh);}
  const head=new THREE.Group();head.position.set(0,1.47,0);body.add(head);
  add(new THREE.SphereGeometry(.14,16,12),skin,0,0,0,head);
  add(new THREE.SphereGeometry(.152,16,12,0,Math.PI*2,0,Math.PI*.58),hair,0,.02,-.012,head);
  add(new THREE.SphereGeometry(.13,12,8),hair,0,-.02,-.05,head);
  const braid=new THREE.Group();braid.position.set(0,-.02,-.13);head.add(braid);
  add(new THREE.CylinderGeometry(.035,.022,.32,6),hair,0,-.16,-.02,braid).rotation.x=.25;
  for(const s of [-1,1])add(new THREE.SphereGeometry(.02,6,6),dark,s*.05,.0,.128,head);
  add(new THREE.SphereGeometry(.012,6,6),M(0xe8a890),0,-.04,.14,head);
  // red scarf
  const sc=add(new THREE.TorusGeometry(.11,.045,8,16),scarf,0,1.33,0);sc.rotation.x=Math.PI/2;
  const tails=[];for(const s of [-1,1]){const t=new THREE.Group();t.position.set(s*.05,1.32,-.1);body.add(t);const m=add(new THREE.BoxGeometry(.08,.34,.02),scarf,0,-.17,0,t);tails.push(t);}
  return {g,body,legs,arms,head,tails,braid};}

export class Player{
  constructor(scene,camera,colliders,audio){
    this.rig=buildRina();this.obj=this.rig.g;scene.add(this.obj);this.camera=camera;this.colliders=colliders;this.audio=audio;
    this.pos=new THREE.Vector3();this.vel=new THREE.Vector3();this.vy=0;this.onGround=true;this.facing=0;
    this.yaw=Math.PI;this.pitch=.12;this.dist=6.5;this.camPos=new THREE.Vector3();this.camLook=new THREE.Vector3();
    this.phase=0;this.speed=0;this.keys={};this.joy={x:0,y:0};this.runToggle=false;this.shake=0;this.shakeT=0;this.lastStep=0;this.locked=false;this.frozen=false;this.boundaryMsg=0;}
  place(x,z,yaw){this.pos.set(x,walkHeight(x,z),z);if(yaw!==undefined){this.yaw=yaw;this.facing=yaw+Math.PI;}this.obj.position.copy(this.pos);this.snapCamera();}
  snapCamera(){this.computeCam();this.camera.position.copy(this.camPos);this.camera.lookAt(this.camLook);}
  computeCam(){const t=this.pos.clone();t.y+=1.35;const cp=Math.cos(this.pitch);
    const off=new THREE.Vector3(Math.sin(this.yaw)*cp,Math.sin(this.pitch),Math.cos(this.yaw)*cp).multiplyScalar(this.dist);
    // pull in if terrain blocks
    let d=1;const endBlocked=groundAt(t.x+off.x,t.z+off.z)+.35>t.y+off.y;if(!endBlocked)for(let k=1;k<8;k++){const f=k/8;if(groundAt(t.x+off.x*f,t.z+off.z*f)+.35>t.y+off.y*f){d=Math.max(.3,f-.1);break;}}
    this.camPos.copy(t).addScaledVector(off,d);const gh=groundAt(this.camPos.x,this.camPos.z)+.45;if(this.camPos.y<gh)this.camPos.y=gh;
    this.camLook.copy(t);this.camLook.y+=.15;}
  collide(nx,nz){for(const c of this.colliders){if(c.type==='c'){const dx=nx-c.x,dz=nz-c.z;const r=c.r+.28;const d2=dx*dx+dz*dz;if(d2<r*r){const d=Math.sqrt(d2)||1e-4;nx=c.x+dx/d*r;nz=c.z+dz/d*r;}}
    else{const cs=Math.cos(c.rot),sn=Math.sin(c.rot);const lx=(nx-c.x)*cs-(nz-c.z)*sn,lz=(nx-c.x)*sn+(nz-c.z)*cs;const hw=c.hw+.28,hd=c.hd+.28;
      if(Math.abs(lx)<hw&&Math.abs(lz)<hd){let px=lx,pz=lz;if(hw-Math.abs(lx)<hd-Math.abs(lz))px=Math.sign(lx||1)*hw;else pz=Math.sign(lz||1)*hd;
        nx=c.x+px*cs+pz*sn;nz=c.z-px*sn+pz*cs;}}}return [nx,nz];}
  update(dt,t){const k=this.keys;
    let ix=(k.KeyD||k.ArrowRight?1:0)-(k.KeyA||k.ArrowLeft?1:0)+this.joy.x,iz=(k.KeyW||k.ArrowUp?1:0)-(k.KeyS||k.ArrowDown?1:0)+this.joy.y;
    if(this.frozen){ix=0;iz=0;}
    const mag=Math.min(1,Math.hypot(ix,iz));const run=(k.ShiftLeft||k.ShiftRight||this.runToggle||Math.hypot(this.joy.x,this.joy.y)>.95);
    const wet=inWater(this.pos.x,this.pos.z);let target=mag*(run?13:5)*(wet?.5:1);
    this.speed=lerp(this.speed,target,1-Math.exp(-dt*8));
    if(mag>.05){const fx=-Math.sin(this.yaw),fz=-Math.cos(this.yaw);const rx=-fz,rz=fx;
      let dx=fx*iz+rx*ix,dz=fz*iz+rz*ix;const L=Math.hypot(dx,dz);dx/=L;dz/=L;const tf=Math.atan2(dx,dz);let d=tf-this.facing;d=Math.atan2(Math.sin(d),Math.cos(d));this.facing+=d*(1-Math.exp(-dt*12));
      this.moveDir=[dx,dz];}
    if(this.speed>.02&&this.moveDir){let nx=this.pos.x+this.moveDir[0]*this.speed*dt,nz=this.pos.z+this.moveDir[1]*this.speed*dt;
      const h0=walkHeight(this.pos.x,this.pos.z),h1=walkHeight(nx,nz);const slope=(h1-h0)/Math.max(1e-3,Math.hypot(nx-this.pos.x,nz-this.pos.z));
      if(slope>1.15&&this.onGround){nx=this.pos.x;nz=this.pos.z;}
      [nx,nz]=this.collide(nx,nz);
      const r=valleyR(nx,nz);if(r>.93){const s=.93/r;nx*=s;nz=(nz+60)*s-60;this.boundaryMsg=2;}
      this.pos.x=nx;this.pos.z=nz;}
    const gh=walkHeight(this.pos.x,this.pos.z);
    if((k.Space||this.jumpReq)&&this.onGround){this.vy=6.2;this.onGround=false;this.audio&&this.audio.jump();}this.jumpReq=false;
    if(!this.onGround){this.vy-=18*dt;this.pos.y+=this.vy*dt;if(this.pos.y<=gh){this.pos.y=gh;this.onGround=true;this.vy=0;this.audio&&this.audio.step(1,this.pos);}}
    else{if(gh<this.pos.y-.6){this.onGround=false;this.vy=0;}else this.pos.y=lerp(this.pos.y,gh,1-Math.exp(-dt*25));}
    // animation
    const R=this.rig;const sp=this.speed;this.phase+=dt*(sp>.1?(4+sp*.75):0);
    const sw=Math.sin(this.phase)*Math.min(1,sp/5)*(sp>8?.95:.6);
    R.legs[0].rotation.x=sw;R.legs[1].rotation.x=-sw;R.arms[0].rotation.x=-sw*.9;R.arms[1].rotation.x=sw*.9;
    R.arms[0].rotation.z=-.08;R.arms[1].rotation.z=.08;
    R.body.position.y=Math.abs(Math.cos(this.phase))*.05*Math.min(1,sp/5)+Math.sin(t*2)*.006;R.body.rotation.x=Math.min(.25,sp*.018);
    if(!this.onGround){R.legs[0].rotation.x=.5;R.legs[1].rotation.x=-.2;R.arms[0].rotation.z=-.6;R.arms[1].rotation.z=.6;}
    for(const [i,tl] of R.tails.entries()){tl.rotation.x=.25+Math.min(1.2,sp*.09)+Math.sin(t*9+i)*(.05+sp*.012);tl.rotation.z=Math.sin(t*6+i*2)*.1;}
    R.braid.rotation.x=Math.min(.8,sp*.05)+Math.sin(this.phase*2)*.05;
    const stepIdx=Math.floor(this.phase/Math.PI);if(this.onGround&&sp>.6&&stepIdx!==this.lastStep){this.lastStep=stepIdx;this.audio&&this.audio.step(Math.min(1,sp/10),this.pos,wet);}
    this.obj.position.copy(this.pos);this.obj.rotation.y=this.facing;
    // camera
    this.computeCam();const a=1-Math.exp(-dt*10);this.camera.position.lerp(this.camPos,a);
    this.camera.lookAt(this.camLook);
    if(this.shake>0){this.shakeT+=dt;const s=this.shake;this.camera.position.x+=(Math.sin(this.shakeT*53)+Math.sin(this.shakeT*31))*s*.5;this.camera.position.y+=Math.sin(this.shakeT*47)*s*.5;
      this.camera.rotation.z+=Math.sin(this.shakeT*23)*s*.02;this.shake=Math.max(0,this.shake-dt*s*1.3-dt*.02);}
  }
  addShake(a){this.shake=Math.min(1.2,this.shake+a);}
}
