import * as THREE from 'three';
import {VILLAGE,START} from './world.js';
import {groundAt} from './terrain.js';
import {mulberry32,mergeGeos,box} from './util.js';
import {thatchTexture,plasterTexture} from './textures.js';
import {glowTex} from './giants.js';

export function buildVillage(scene,colliders){
  const R=mulberry32(11);
  const wallG=[],timberG=[],roofG=[],winG=[],doorG=[];
  const houses=[];
  // houses arranged along the main street (path runs north-south through x≈0)
  const spots=[[-22,1040,0],[22,1030,Math.PI],[-24,1005,0],[24,995,Math.PI],[-26,965,0],[26,955,Math.PI],[-20,925,0],[22,915,Math.PI],
    [-55,1010,.3],[58,985,-.4+Math.PI],[-60,950,-.2],[60,940,Math.PI+.2],[-48,900,.5],[52,895,Math.PI-.5],[-80,985,.1],[85,960,Math.PI]];
  for(const [x,z,ry] of spots){const w=7+R()*3,d=5.5+R()*2,h=3.2+R()*.8;const y=groundAt(x,z);
    const M=new THREE.Matrix4().compose(new THREE.Vector3(x,y,z),new THREE.Quaternion().setFromEuler(new THREE.Euler(0,ry+Math.PI/2,0)),new THREE.Vector3(1,1,1));
    const push=(arr,g)=>{g.applyMatrix4(M);arr.push(g);};
    push(wallG,box(new THREE.Vector3(0,h/2-.3,0),w,h+.6,d));
    for(const sx of [-1,1])for(const sz of [-1,1])push(timberG,box(new THREE.Vector3(sx*(w/2),h/2-.3,sz*(d/2)),.35,h+.6,.35));
    push(timberG,box(new THREE.Vector3(0,h-.1,d/2+.02),w+.3,.3,.15));push(timberG,box(new THREE.Vector3(0,h-.1,-d/2-.02),w+.3,.3,.15));
    // thatched gable roof (triangular prism)
    const roof=new THREE.CylinderGeometry(1,1,1,3,1);roof.rotateZ(Math.PI/2);roof.rotateX(Math.PI/2-Math.PI/6*0);
    const rg=new THREE.CylinderGeometry(d*.78,d*.78,w+1.6,3,1);rg.rotateZ(Math.PI/2);rg.rotateX(-Math.PI/2);rg.scale(1,.85,1);rg.translate(0,h+d*.33,0);push(roofG,rg);
    push(doorG,box(new THREE.Vector3(w*.15,1.0,d/2+.05),1.2,2.1,.12));
    push(winG,box(new THREE.Vector3(-w*.25,1.8,d/2+.05),1.0,.8,.1));push(winG,box(new THREE.Vector3(w/2+.05,1.8,0),.1,.8,1.0));push(winG,box(new THREE.Vector3(-w/2-.05,1.8,0),.1,.8,1.0));
    push(timberG,box(new THREE.Vector3(w*.3,h+d*.45,-d*.15),.8,2.6,.8));
    colliders.push({type:'b',x,z,hw:w/2+.4,hd:d/2+.4,rot:ry+Math.PI/2});houses.push({x,z});}
  const thatch=thatchTexture();thatch.repeat.set(1.5,1.5);const plaster=plasterTexture();
  const mats={wall:new THREE.MeshStandardMaterial({color:0xd8ccb4,map:plaster,roughness:.95}),timber:new THREE.MeshStandardMaterial({color:0x4a3322,roughness:.9}),
    roof:new THREE.MeshStandardMaterial({color:0xc9a870,map:thatch,roughness:1,flatShading:true}),door:new THREE.MeshStandardMaterial({color:0x3a2616,roughness:.9}),
    win:new THREE.MeshStandardMaterial({color:0x2a2016,emissive:0xffa040,emissiveIntensity:.2})};
  for(const [arr,m] of [[wallG,mats.wall],[timberG,mats.timber],[roofG,mats.roof],[doorG,mats.door],[winG,mats.win]]){const mesh=new THREE.Mesh(mergeGeos(arr),m);mesh.castShadow=true;mesh.receiveShadow=true;scene.add(mesh);}
  // well
  const wy=groundAt(VILLAGE.x+8,VILLAGE.z-10);const well=new THREE.Group();
  const stone=new THREE.MeshStandardMaterial({color:0x8a8478,roughness:1});
  well.add(new THREE.Mesh(new THREE.CylinderGeometry(1.3,1.4,1,14,1,true),stone));const top=new THREE.Mesh(new THREE.TorusGeometry(1.3,.15,6,16),stone);top.rotation.x=Math.PI/2;top.position.y=.5;well.add(top);
  for(const s of [-1,1]){const p=new THREE.Mesh(new THREE.BoxGeometry(.2,2.6,.2),mats.timber);p.position.set(s*1.3,1.3,0);well.add(p);}
  const wr=new THREE.Mesh(new THREE.ConeGeometry(1.9,1,4),mats.roof);wr.position.y=3;wr.rotation.y=Math.PI/4;well.add(wr);
  well.position.set(VILLAGE.x+8,wy+.5,VILLAGE.z-10);well.traverse(o=>{o.castShadow=true;});scene.add(well);colliders.push({type:'c',x:VILLAGE.x+8,z:VILLAGE.z-10,r:1.7});
  // fences
  const fenceG=[];for(let i=0;i<70;i++){const a=i/70*Math.PI*2;const x=VILLAGE.x+Math.cos(a)*118,z=VILLAGE.z+Math.sin(a)*96;if(Math.abs(x)<10)continue;
    fenceG.push(box(new THREE.Vector3(x,groundAt(x,z)+.6,z),.18,1.2,.18));const a2=(i+1)/70*Math.PI*2;const x2=VILLAGE.x+Math.cos(a2)*118,z2=VILLAGE.z+Math.sin(a2)*96;if(Math.abs(x2)<10)continue;
    const L=Math.hypot(x2-x,z2-z);const rail=box(new THREE.Vector3((x+x2)/2,groundAt(x,z)+.85,(z+z2)/2),L,.1,.08,[0,-Math.atan2(z2-z,x2-x),0]);fenceG.push(rail);}
  const fence=new THREE.Mesh(mergeGeos(fenceG),mats.timber);fence.castShadow=true;scene.add(fence);
  // haystacks & crates
  const hayG=[];for(let i=0;i<10;i++){const a=R()*6.28,r=70+R()*35;const x=VILLAGE.x+Math.cos(a)*r,z=VILLAGE.z+Math.sin(a)*r;if(Math.abs(x)<12)continue;const g=new THREE.ConeGeometry(1.8,2.6,9);g.translate(x,groundAt(x,z)+1.2,z);hayG.push(g);colliders.push({type:'c',x,z,r:1.8});}
  const hay=new THREE.Mesh(mergeGeos(hayG),mats.roof);hay.castShadow=true;scene.add(hay);
  // lantern posts along the street and the start of the path
  const lampPos=[];for(let i=0,z=1045;z>=800;z-=22,i++){lampPos.push([i%2?-5:5,z]);}
  lampPos.push([-5,780],[5,740],[-5,700]);
  const lampG=[],lampHead=[];
  for(const [x,z] of lampPos){const y=groundAt(x,z);lampG.push(box(new THREE.Vector3(x,y+1.6,z),.14,3.2,.14));lampG.push(box(new THREE.Vector3(x+(x<0?.4:-.4),y+3.15,z),.9,.1,.1));
    lampHead.push(box(new THREE.Vector3(x+(x<0?.75:-.75),y+2.8,z),.35,.5,.35));colliders.push({type:'c',x,z,r:.3});}
  const posts=new THREE.Mesh(mergeGeos(lampG),mats.timber);posts.castShadow=true;scene.add(posts);
  const lampMat=new THREE.MeshStandardMaterial({color:0x332211,emissive:0xffa040,emissiveIntensity:1});
  scene.add(new THREE.Mesh(mergeGeos(lampHead),lampMat));
  const glowMat=new THREE.SpriteMaterial({map:glowTex(),color:0xffaa50,blending:THREE.AdditiveBlending,depthWrite:false,transparent:true,opacity:.0});
  const glows=[];for(const [x,z] of lampPos){const s=new THREE.Sprite(glowMat);s.position.set(x+(x<0?.75:-.75),groundAt(x,z)+2.8,z);s.scale.setScalar(3.2);scene.add(s);glows.push(s);}
  const villageLight=new THREE.PointLight(0xffa050,0,90,1.4);villageLight.position.set(VILLAGE.x,groundAt(VILLAGE.x,VILLAGE.z)+8,VILLAGE.z);scene.add(villageLight);
  // ---- Elrick (grandfather NPC)
  const el=buildElrick();const ex=3.2,ez=START.z-9;el.position.set(ex,groundAt(ex,ez),ez);el.rotation.y=Math.PI*.85;scene.add(el);colliders.push({type:'c',x:ex,z:ez,r:.6});
  return {elrick:el,
    update(t,night,focus){mats.win.emissiveIntensity=.15+night*2.2;lampMat.emissiveIntensity=.3+night*3;glowMat.opacity=.15+night*.85;villageLight.intensity=night*900;
      el.children[0].position.y=Math.sin(t*1.3)*.01;el.userData.head.rotation.y=Math.sin(t*.5)*.25;
      if(focus){const dx=focus.x-el.position.x,dz=focus.z-el.position.z;if(dx*dx+dz*dz<64){const target=Math.atan2(dx,dz);let d=target-el.rotation.y;d=Math.atan2(Math.sin(d),Math.cos(d));el.rotation.y+=d*.05;}}}};}

function buildElrick(){const g=new THREE.Group();const body=new THREE.Group();g.add(body);
  const robe=new THREE.MeshStandardMaterial({color:0x4a5a3a,roughness:.95}),skin=new THREE.MeshStandardMaterial({color:0xd8a888,roughness:.8}),
    white=new THREE.MeshStandardMaterial({color:0xeeeeea,roughness:.9}),wood=new THREE.MeshStandardMaterial({color:0x5a3a20,roughness:.9}),belt=new THREE.MeshStandardMaterial({color:0x6a3a20});
  const add=(geo,mat,x,y,z,parent=body)=>{const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);m.castShadow=true;parent.add(m);return m;};
  add(new THREE.CylinderGeometry(.2,.38,1.25,12),robe,0,.62,0);add(new THREE.CylinderGeometry(.21,.21,.08,12),belt,0,1.0,0);
  add(new THREE.CylinderGeometry(.24,.2,.4,12),robe,0,1.38,0);
  const head=new THREE.Group();head.position.set(0,1.72,.02);body.add(head);g.userData.head=head;
  add(new THREE.SphereGeometry(.15,14,10),skin,0,0,0,head);add(new THREE.SphereGeometry(.155,14,10,0,Math.PI*2,0,Math.PI*.55),white,0,.02,-.015,head);
  const beard=add(new THREE.ConeGeometry(.12,.38,10),white,0,-.2,.08,head);beard.rotation.x=Math.PI+.25;
  add(new THREE.SphereGeometry(.03,6,6),skin,0,0,.15,head);
  for(const s of [-1,1]){add(new THREE.SphereGeometry(.018,6,6),new THREE.MeshBasicMaterial({color:0x111111}),s*.055,.03,.135,head);add(new THREE.BoxGeometry(.06,.015,.02),white,s*.055,.07,.14,head);}
  const hat=add(new THREE.ConeGeometry(.2,.32,10),robe,0,.2,0,head);hat.rotation.x=-.25;
  for(const s of [-1,1]){const a=add(new THREE.CylinderGeometry(.06,.07,.55,8),robe,s*.27,1.3,.08);a.rotation.x=-.5;a.rotation.z=s*.15;}
  const staff=add(new THREE.CylinderGeometry(.03,.035,1.9,6),wood,.34,.95,.32);staff.rotation.z=-.05;
  const lan=add(new THREE.BoxGeometry(.14,.18,.14),new THREE.MeshStandardMaterial({color:0x221100,emissive:0xffa040,emissiveIntensity:2}),.36,1.9,.32);
  return g;}
