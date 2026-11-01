import * as THREE from 'three';
import {limb,ellip,box,cone,taperTube,mergeGeos,rockify,mulberry32,lerp,clamp} from './util.js';
import {stoneTextures,skinTextures,glowTexture} from './textures.js';
import {CASSIAN,MALPHAS,plinthTop,moundTop} from './world.js';
import {groundAt} from './terrain.js';

const V=(x,y,z)=>new THREE.Vector3(x,y,z);
// build parts in "units", scale to meters, then weather with noise
function assemble(parts,K,opts){const gs=parts.map(([g,amp=1])=>{g.scale(K,K,K);return rockify(g,{...opts,amp:opts.amp*amp});});return mergeGeos(gs);}

export const glowTex=()=>_glow||(_glow=glowTexture());let _glow=null;

// ============================== CASSIAN ======================================
export function buildCassian(scene,colliders){
  const K=78;const P=[];const add=(g,a=1)=>P.push([g,a]);
  for(const s of [-1,1]){const x=s*.78;
    add(box(V(x,.28,.25),.85,.56,1.75,null,3),.5);add(ellip(V(x,.35,1.05),.42,.3,.4,12),.5);
    add(limb(V(x,.5,0),V(x,2.6,0),.44,.56,16,8));add(ellip(V(x,1.55,.26),.42,.95,.26,14),.4);
    add(ellip(V(x,2.75,.1),.58,.52,.58,16));add(ellip(V(x,2.8,.42),.4,.4,.25,12),.4);
    add(limb(V(x,2.85,0),V(x*.92,4.7,0),.62,.76,16,8));add(box(V(x*.95,3.9,.55),.7,1.3,.18,[-.08,0,0],2),.4);}
  for(let i=0;i<7;i++){const a=(i/7)*Math.PI*2+.2;add(box(V(Math.sin(a)*1.3,4.45,Math.cos(a)*1.0),1.05,1.25,.2,[-.25*Math.cos(a),a,0],2),.4);}
  add(ellip(V(0,4.95,0),1.25,.72,.88,20));add(limb(V(0,5.15,0),V(0,5.45,0),1.22,1.18,22,1),.3);
  add(ellip(V(0,6.35,.02),1.48,1.38,.96,24));add(ellip(V(0,6.45,.28),1.32,1.18,.82,24),.6);
  add(box(V(0,6.4,1.08),.12,1.6,.12,[-.05,0,0],2),.2);
  add(limb(V(0,7.35,0),V(0,7.95,.05),.58,.46,16,3));
  // helmet
  add(ellip(V(0,8.35,.02),.56,.64,.6,20),.5);add(ellip(V(0,8.28,.26),.46,.42,.42,16),.4);
  add(box(V(0,8.98,-.05),.14,.5,1.05,null,2),.3);add(box(V(0,8.32,.66),.5,.06,.06),.1);
  for(const s of [-1,1])add(ellip(V(s*.38,8.15,.22),.16,.3,.3,10),.3);
  // pauldrons
  for(const s of [-1,1]){add(ellip(V(s*1.72,7.25,0),.86,.66,.82,18));add(ellip(V(s*1.8,6.92,0),.92,.44,.86,18));add(ellip(V(s*1.86,6.62,0),.88,.3,.84,16),.6);}
  // right arm raised (character right = local -x), index finger pointing to the sky
  const S=V(-1.72,7.2,0),E=V(-1.98,9.15,.15),W=V(-2.05,10.95,.25);
  add(limb(S,E,.48,.42,16,6));add(ellip(E,.46,.44,.46,14));add(limb(E,W,.42,.36,16,6));add(limb(V(-2.0,10.0,.2),W,.46,.43,14,3),.5);
  add(ellip(V(-2.05,11.25,.27),.33,.42,.27,14),.5);add(limb(V(-2.05,11.5,.32),V(-2.08,12.25,.33),.11,.085,8,3),.15);
  add(ellip(V(-1.82,11.3,.38),.1,.22,.1,8),.2); // thumb
  for(const dx of [-.12,0,.12])add(ellip(V(-2.05+dx,11.55,.12),.08,.14,.1,8),.15);
  // left arm resting on a planted greatsword
  const S2=V(1.72,7.2,0),E2=V(2.05,5.7,.7),H2=V(.95,4.62,1.9);
  add(limb(S2,E2,.48,.42,16,6));add(ellip(E2,.45,.43,.45,14));add(limb(E2,H2,.42,.34,16,6));add(ellip(H2,.36,.3,.32,14),.4);
  add(box(V(.92,1.95,1.95),.52,3.9,.14,null,4),.12);add(box(V(.92,3.95,1.95),1.7,.16,.3,null,2),.15);
  add(limb(V(.92,3.98,1.95),V(.92,4.85,1.95),.09,.09,8,2),.1);add(ellip(V(.92,4.92,1.95),.17,.17,.17,10),.1);
  // cape
  const cape=new THREE.PlaneGeometry(1,1,14,24);const cp=cape.attributes.position;
  for(let i=0;i<cp.count;i++){const u=cp.getX(i)+.5,v=cp.getY(i)+.5;const w=lerp(4.2,3.2,v);const x=(u-.5)*w;const y=lerp(.55,7.5,v);
    const z=-lerp(1.75,.85,v)-Math.cos((u-.5)*2.6)*.35+Math.sin(u*Math.PI*7)*.12*(1-v);cp.setXYZ(i,x,y,z);}
  cape.computeVertexNormals();add(cape,.6);
  const g=assemble(P,K,{amp:3.2,freq:.024,uvScale:1/20,colA:[.70,.68,.63],colB:[.42,.44,.38],colFreq:.008});
  const st=stoneTextures();
  const mat=new THREE.MeshStandardMaterial({vertexColors:true,map:st.map,normalMap:st.normalMap,normalScale:new THREE.Vector2(1.2,1.2),roughness:.92,side:THREE.DoubleSide});
  const mesh=new THREE.Mesh(g,mat);mesh.castShadow=true;mesh.receiveShadow=true;
  const grp=new THREE.Group();grp.add(mesh);grp.position.set(CASSIAN.x,plinthTop()-2,CASSIAN.z);grp.rotation.y=Math.PI/2-.45;scene.add(grp);grp.updateMatrixWorld(true);
  // glow at the fingertip + beam to the heavens
  const tip=grp.localToWorld(V(-2.08,12.32,.33).multiplyScalar(K));
  const glowMat=new THREE.SpriteMaterial({map:glowTex(),color:0x9fd8ff,blending:THREE.AdditiveBlending,depthWrite:false,transparent:true,fog:false});
  const glow=new THREE.Sprite(glowMat);glow.scale.setScalar(150);glow.position.copy(tip);scene.add(glow);
  const glow2=new THREE.Sprite(glowMat.clone());glow2.material.color.set(0xffffff);glow2.scale.setScalar(40);glow2.position.copy(tip);scene.add(glow2);
  const beamMat=new THREE.ShaderMaterial({transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,uniforms:{uTime:{value:0},uI:{value:1}},
    vertexShader:'varying float vY;varying vec2 vUv;void main(){vUv=uv;vY=uv.y;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader:'uniform float uTime,uI;varying float vY;varying vec2 vUv;void main(){float a=(1.-vY)*(1.-vY)*0.55*uI;a*=0.75+0.25*sin(vY*60.-uTime*6.);float e=1.-abs(vUv.x*2.-1.);gl_FragColor=vec4(vec3(.55,.8,1.)*a*(0.4+0.6*e),1.);}'});
  const beam=new THREE.Mesh(new THREE.CylinderGeometry(9,3,2600,12,1,true),beamMat);beam.geometry.translate(0,1300,0);beam.position.copy(tip);scene.add(beam);
  const light=new THREE.PointLight(0x88ccff,0,900,1.1);light.position.copy(tip).add(V(0,-30,0));scene.add(light);
  // colliders: feet / sword (world space, approximate circles)
  const toW=(x,z)=>grp.localToWorld(V(x*K,0,z*K));
  for(const [x,z,r] of [[-.78,.3,1.0],[.78,.3,1.0],[-.78,-.2,.8],[.78,-.2,.8],[.92,1.95,.6],[0,-1.5,1.6],[-1.3,-1.4,1.0],[1.3,-1.4,1.0]]){const p=toW(x,z);colliders.push({type:'c',x:p.x,z:p.z,r:r*K*.5});}
  return {group:grp,tip,glow,glow2,beam,beamMat,light,
    update(t,night){const pulse=.85+.15*Math.sin(t*2.2)+.05*Math.sin(t*7.3);glow.scale.setScalar(150*pulse*(1+night*.5));glow2.scale.setScalar(40*pulse);
      beamMat.uniforms.uTime.value=t;beamMat.uniforms.uI.value=.35+night*.9;light.intensity=(150+night*700)*pulse;}};}

// ============================== MALPHAS ======================================
export function buildMalphas(scene,colliders){
  const K=82;const sk=skinTextures();sk.map.repeat.set(3,3);sk.normalMap.repeat.set(3,3);const st=stoneTextures();
  const skinMat=new THREE.MeshStandardMaterial({vertexColors:true,map:sk.map,normalMap:sk.normalMap,normalScale:new THREE.Vector2(1.4,1.4),roughness:.62,metalness:.05,
    emissive:0xff2a08,emissiveMap:sk.veins,emissiveIntensity:1.4});
  const hornMat=new THREE.MeshStandardMaterial({color:0x2a2018,roughness:.55,metalness:.1,normalMap:st.normalMap});
  const rockMat=new THREE.MeshStandardMaterial({vertexColors:true,map:st.map,normalMap:st.normalMap,roughness:.95,flatShading:true});
  const chainMat=new THREE.MeshStandardMaterial({color:0x123050,emissive:0x5ac8ff,emissiveIntensity:2.2,roughness:.3,metalness:.6});
  const eyeMat=new THREE.MeshBasicMaterial({color:0xffb040});
  const mouthMat=new THREE.MeshBasicMaterial({color:0xff3a10});
  const skinOpts={amp:1.4,freq:.035,uvScale:1/110,colA:[.40,.27,.25],colB:[.17,.11,.12],colFreq:.008};
  const mk=(parts,mat,opts=skinOpts)=>{const m=new THREE.Mesh(assemble(parts,K,opts),mat);m.castShadow=true;m.receiveShadow=true;return m;};
  const root=new THREE.Group();root.position.set(MALPHAS.x,moundTop()-20,MALPHAS.z);root.rotation.y=-(Math.PI/2-.45);scene.add(root);
  // legs (kneeling) + pelvis -- static
  const L=[];for(const s of [-1,1]){L.push([limb(V(s*.9,2.3,-.4),V(s*1.15,.75,1.2),.86,.72,18,8)]);L.push([ellip(V(s*1.15,.7,1.25),.7,.62,.7,16)]);
    L.push([limb(V(s*1.15,.6,1.2),V(s*1.1,.42,-1.3),.64,.46,16,8)]);L.push([ellip(V(s*1.1,.35,-1.55),.42,.3,.6,12)]);}
  L.push([ellip(V(0,2.4,-.35),1.38,.86,.98,22)]);
  root.add(mk(L,skinMat));
  // rock crust / rubble pinning the legs
  const R=mulberry32(99);const RB=[];
  for(let i=0;i<46;i++){const s=R()<.5?-1:1;const t=R();const p=V(s*lerp(1.15,1.0,t)+(R()-.5)*1.4,lerp(.2,1.6,R()*R()),lerp(1.4,-1.6,t)+(R()-.5)*.8);
    const g=new THREE.DodecahedronGeometry(1,1);g.applyMatrix4(new THREE.Matrix4().compose(p,new THREE.Quaternion().setFromEuler(new THREE.Euler(R()*6,R()*6,R()*6)),V(.3+R()*.6,.25+R()*.45,.3+R()*.6)));RB.push([g,1]);}
  root.add(mk(RB,rockMat,{amp:3,freq:.06,uvScale:1/14,colA:[.5,.47,.44],colB:[.25,.22,.21],colFreq:.02}));
  // torso
  const torso=new THREE.Group();torso.position.set(0,2.4*K,-.3*K);torso.rotation.x=.3;root.add(torso);
  const T=[[ellip(V(0,1.1,.1),1.18,1.02,.86,20)],[ellip(V(0,2.5,.15),1.98,1.32,1.16,24)],[ellip(V(-.75,2.62,.74),.96,.72,.5,16)],[ellip(V(.75,2.62,.74),.96,.72,.5,16)],
    [ellip(V(0,3.05,-.05),2.1,.55,.9,18)]];
  for(const s of [-1,1]){T.push([ellip(V(s*1.95,3.0,0),.98,.86,.92,18)]);for(let k=0;k<3;k++)T.push([ellip(V(s*1.15,1.55+k*.38,.55),.42,.18,.32,10)]);}
  for(let k=0;k<3;k++)for(const s of [-1,1])T.push([ellip(V(s*.28,.75+k*.42,.92),.25,.18,.12,8),.4]);
  const torsoMesh=mk(T,skinMat);torso.add(torsoMesh);
  const SP=[];for(let k=0;k<7;k++){const y=.6+k*.45;SP.push([cone(V(0,y,-1.05+Math.sin(k*.45)*.05),.2+k*.025,.7+k*.08,8,[-1.25,0,0]),.3]);}
  for(const s of [-1,1])for(let k=0;k<3;k++)SP.push([cone(V(s*(1.9+k*.12),3.6,-.15-k*.3),.16,.75,8,[-.5,0,-s*.5]),.2]);
  const spikes=mk(SP,hornMat,{...skinOpts,amp:.3});torso.add(spikes);
  const neck=mk([[limb(V(0,3.1,.2),V(0,3.95,.55),.74,.62,16,4)]],skinMat);torso.add(neck);
  const collar=new THREE.Mesh(new THREE.TorusGeometry(.86*K,.15*K,10,28),chainMat);collar.position.set(0,3.45*K,.36*K);collar.rotation.x=Math.PI/2-.4;torso.add(collar);
  // head
  const head=new THREE.Group();head.position.set(0,3.9*K,.55*K);torso.add(head);
  const HD=[[ellip(V(0,.55,.15),.74,.8,.8,22)],[ellip(V(0,.74,.72),.64,.18,.26,14)],[ellip(V(0,.36,.66),.52,.36,.46,16)],[ellip(V(0,.2,.15),.66,.45,.6,16)]];
  for(const s of [-1,1])HD.push([ellip(V(s*.55,.35,.45),.2,.3,.3,10)]);
  head.add(mk(HD,skinMat));
  const HR=[];for(const s of [-1,1]){HR.push([taperTube([V(s*.5,.95,.2),V(s*1.15,1.45,.0),V(s*1.7,2.1,.25),V(s*1.75,2.85,.85),V(s*1.45,3.25,1.3)],.32,.025,28,12),.4]);
    HR.push([taperTube([V(s*.25,1.2,.35),V(s*.42,1.75,.05),V(s*.38,2.25,-.45)],.16,.02,14,8),.2]);}
  head.add(mk(HR,hornMat,{...skinOpts,amp:.5,colA:[.3,.24,.2],colB:[.15,.12,.1]}));
  for(const s of [-1,1]){const e=new THREE.Mesh(new THREE.SphereGeometry(.11*K,12,8),eyeMat);e.position.set(s*.27*K,.6*K,.84*K);e.scale.set(1.3,.6,.6);head.add(e);}
  const mouth=new THREE.Mesh(new THREE.SphereGeometry(1,14,10),mouthMat);mouth.scale.set(.42*K,.16*K,.32*K);mouth.position.set(0,.16*K,.6*K);head.add(mouth);
  const jaw=new THREE.Group();jaw.position.set(0,.25*K,.18*K);head.add(jaw);
  const JW=[[ellip(V(0,-.12,.42),.5,.24,.5,16)]];
  jaw.add(mk(JW,skinMat));
  const TE=[];for(let k=0;k<6;k++){const a=(k/5-.5)*1.9;TE.push([cone(V(Math.sin(a)*.4,.05,.42+Math.cos(a)*.42),.05,.22,6),.05]);
    TE.push([cone(V(Math.sin(a)*.4,.12,.42+Math.cos(a)*.42),.05,.24,6,[Math.PI,0,0]),.05]);}
  const teethJ=mk(TE.filter((_,i)=>i%2===0),new THREE.MeshStandardMaterial({color:0xd8ccb0,roughness:.5}),{...skinOpts,amp:.05});jaw.add(teethJ);
  const teethU=mk(TE.filter((_,i)=>i%2===1),teethJ.material,{...skinOpts,amp:.05});teethU.position.set(0,.25*K,.18*K);head.add(teethU);
  // arms (pulled outward by chains)
  const arms=[];
  for(const s of [-1,1]){const sh=new THREE.Group();sh.position.set(s*2.3*K,2.95*K,.05*K);torso.add(sh);
    const E=V(s*1.6,-.55,.45),W=V(s*1.35,-.95,.55);
    sh.add(mk([[ellip(V(0,0,0),.8,.75,.78,16)],[limb(V(0,0,0),E,.66,.52,16,6)],[ellip(E.clone().multiplyScalar(.45).add(V(0,.12,0)),.6,.42,.45,12)]],skinMat));
    const el=new THREE.Group();el.position.copy(E).multiplyScalar(K);sh.add(el);
    const HP=W.clone().add(V(s*.35,-.25,.15));const HN=[[ellip(V(0,0,0),.5,.48,.5,14)],[limb(V(0,0,0),W,.52,.4,16,6)],[ellip(HP,.36,.24,.32,12)]];
    for(let f=0;f<4;f++){const a=(f-1.5)*.35;const b=HP.clone().add(V(s*.22,-.08,0));HN.push([taperTube([b,b.clone().add(V(s*.35*Math.cos(a),-.25,.35*Math.sin(a))),b.clone().add(V(s*.5*Math.cos(a),-.6,.5*Math.sin(a)))],.08,.015,8,6),.1]);}
    el.add(mk(HN,skinMat));
    const sha=new THREE.Mesh(new THREE.TorusGeometry(.5*K,.13*K,10,24),chainMat);sha.position.copy(W.clone().multiplyScalar(.82).multiplyScalar(K));sha.quaternion.setFromUnitVectors(V(0,0,1),W.clone().normalize());el.add(sha);
    const wrist=new THREE.Object3D();wrist.position.copy(sha.position);el.add(wrist);
    arms.push({sh,el,wrist,s});}
  root.updateMatrixWorld(true);
  // chains: attach points -> ground anchors
  const anchorsLocal=[[arms[0].wrist,V(-5.6,0,2.6)],[arms[1].wrist,V(5.6,0,2.6)],[collar,V(-2.8,0,-4.0)],[collar,V(2.8,0,-4.0)]];
  const pelvisL=new THREE.Object3D();pelvisL.position.set(-1.35*K,2.3*K,-.35*K);root.add(pelvisL);const pelvisR=new THREE.Object3D();pelvisR.position.set(1.35*K,2.3*K,-.35*K);root.add(pelvisR);
  anchorsLocal.push([pelvisL,V(-4.0,0,-1.2)],[pelvisR,V(4.0,0,-1.2)]);
  root.updateMatrixWorld(true);
  const chains=[];const pillarG=[];
  for(const [obj,al] of anchorsLocal){const aw=root.localToWorld(al.clone().multiplyScalar(K));aw.y=groundAt(aw.x,aw.z)+18;
    const st0=obj.getWorldPosition(V(0,0,0));const len=st0.distanceTo(aw);chains.push({obj,anchor:aw,n:Math.ceil(len*1.08/8),len});
    pillarG.push([limb(V(aw.x,aw.y-40,aw.z),V(aw.x,aw.y+16,aw.z),9,6,8,4),1]);pillarG.push([ellip(V(aw.x,aw.y+16,aw.z),7,5,7,8),1]);
    colliders.push({type:'c',x:aw.x,z:aw.z,r:11});}
  const pillars=new THREE.Mesh(mergeGeos(pillarG.map(([g])=>rockify(g,{amp:1.5,freq:.08,uvScale:1/10,colA:[.45,.44,.46],colB:[.25,.25,.28],colFreq:.05}))),rockMat);pillars.castShadow=true;scene.add(pillars);
  const runes=new THREE.Mesh(mergeGeos(chains.map(c=>{const g=new THREE.TorusGeometry(9.6,.9,6,20);g.rotateX(Math.PI/2);g.translate(c.anchor.x,c.anchor.y,c.anchor.z);return g;})),chainMat);scene.add(runes);
  const total=chains.reduce((a,c)=>a+c.n,0);
  const linkG=new THREE.TorusGeometry(3.2,1.0,6,12);linkG.scale(1,1.65,1);
  const links=new THREE.InstancedMesh(linkG,chainMat,total);links.castShadow=true;links.frustumCulled=false;scene.add(links);
  const gpos=new Float32Array(Math.ceil(total/2)*3);const gGeo=new THREE.BufferGeometry();gGeo.setAttribute('position',new THREE.BufferAttribute(gpos,3));
  const chainGlow=new THREE.Points(gGeo,new THREE.PointsMaterial({map:glowTex(),color:0x4ab0ff,size:38,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,opacity:.7}));chainGlow.frustumCulled=false;scene.add(chainGlow);
  // meteor target markers
  const targets=[];const addT=(par,x,y,z)=>{const o=new THREE.Object3D();o.position.set(x*K,y*K,z*K);par.add(o);targets.push(o);};
  addT(head,0,1.2,.2);addT(head,.4,.9,.4);addT(torso,-1.9,3.7,0);addT(torso,1.9,3.7,0);addT(torso,0,3.2,-.9);addT(torso,0,2.2,-1.1);addT(torso,-1.1,2.8,-.7);addT(torso,1.1,2.8,-.7);
  // colliders around kneeling body
  const toW=(x,z)=>root.localToWorld(V(x*K,0,z*K));
  for(const [x,z,r] of [[-1.15,1.2,1.0],[1.15,1.2,1.0],[-1.1,-.2,.9],[1.1,-.2,.9],[-1.1,-1.4,.8],[1.1,-1.4,.8],[0,-.4,1.4]]){const p=toW(x,z);colliders.push({type:'c',x:p.x,z:p.z,r:r*K*.62});}
  // ---- animation state
  let hitT=99,hitStrength=0;const m4=new THREE.Matrix4(),q=new THREE.Quaternion(),qa=new THREE.Quaternion(),P=V(0,0,0),Tg=V(0,0,0),UPV=V(0,1,0),SC=V(1,1,1),A=V(0,0,0);
  const api={root,torso,head,jaw,arms,targets,skinMat,chains,K,agony:0,
    hit(strength=1){hitT=0;hitStrength=Math.max(strength,hitStrength*.5);},
    update(t,dt,night){hitT+=dt;const a=(hitT<.25?hitT/.25:Math.exp(-(hitT-.25)*.75))*hitStrength;api.agony=a;
      const w=Math.sin(t*6.5),w2=Math.sin(t*9.7+1),strug=Math.sin(t*.37)*.5+Math.sin(t*.91)*.3;
      torso.rotation.x=.3-a*.32+w2*.04*a+Math.sin(t*.8)*.012;torso.rotation.z=.035*strug+a*.1*Math.sin(t*3.1);torso.rotation.y=.04*Math.sin(t*.23)+a*.12*Math.sin(t*2.2);
      const br=1+Math.sin(t*1.1)*.012;torso.scale.set(1,br,1+(br-1)*1.5);
      head.rotation.x=-.05+Math.sin(t*.5)*.04-a*.55+w*.06*a;head.rotation.y=Math.sin(t*.29)*.18+a*.35*Math.sin(t*1.6);head.rotation.z=a*.15*Math.sin(t*2.7);
      jaw.rotation.x=.08+Math.max(0,Math.sin(t*.6))*.05+a*.6;
      for(const r of arms){r.sh.rotation.z=r.s*(-.05+.04*strug-a*(.18+.06*w))*1;r.sh.rotation.x=-.05*strug-a*.18*w2;r.el.rotation.z=r.s*(a*.2*Math.sin(t*5+r.s));r.el.rotation.y=r.s*a*.15;}
      skinMat.emissiveIntensity=(.45+night*1.0)+.25*Math.sin(t*1.7)+a*2.6;
      eyeMat.color.setRGB(1,.55+a*.4,.2+a*.5);
      chainMat.emissiveIntensity=1.6+night*1.6+a*1.5*Math.abs(w);
      // chains
      root.updateMatrixWorld(true);let li=0,gi=0;
      for(const c of chains){c.obj.getWorldPosition(A);const sag=(.06-a*.045)*c.len;
        for(let i=0;i<c.n;i++){const u=(i+.5)/c.n;P.lerpVectors(A,c.anchor,u);P.y-=sag*4*u*(1-u);
          const u2=Math.min(1,u+.01);Tg.lerpVectors(A,c.anchor,u2);Tg.y-=sag*4*u2*(1-u2);Tg.sub(P).normalize();
          q.setFromUnitVectors(UPV,Tg);if(i%2)q.multiply(qa.setFromAxisAngle(UPV,Math.PI/2));
          const jit=a*.6*Math.sin(t*30+i);P.x+=jit;P.z+=jit;
          links.setMatrixAt(li++,m4.compose(P,q,SC));if(i%2===0&&gi*3<gpos.length){gpos[gi*3]=P.x;gpos[gi*3+1]=P.y;gpos[gi*3+2]=P.z;gi++;}}}
      links.instanceMatrix.needsUpdate=true;gGeo.attributes.position.needsUpdate=true;}};
  return api;}
