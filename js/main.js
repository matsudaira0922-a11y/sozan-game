import * as THREE from 'three';
import {buildTerrain,buildVegetation,groundAt,walkHeight} from './terrain.js';
import {buildSky,phaseName} from './sky.js';
import {buildCassian,buildMalphas,glowTex} from './giants.js';
import {buildVillage} from './village.js';
import {Player} from './player.js';
import {Meteors} from './meteors.js';
import {Audio} from './audio.js';
import {START,VILLAGE,CASSIAN,MALPHAS,BRIDGE_X,riverZ,plinthTop,PLINTH} from './world.js';
import {nextFrame,rockify,mulberry32} from './util.js';

const params=new URLSearchParams(location.search);
const $=id=>document.getElementById(id);
const isTouch=('ontouchstart' in window)||matchMedia('(pointer: coarse)').matches;if(isTouch)document.body.classList.add('touch');
const setProg=(p,txt)=>{$('ld-fill').style.width=(p*100).toFixed(1)+'%';if(txt)$('ld-text').textContent=txt;};

const canvas=$('c');
const renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});
let pixelRatio=Math.min(window.devicePixelRatio||1,2);renderer.setPixelRatio(pixelRatio);renderer.setSize(innerWidth,innerHeight);
renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
const scene=new THREE.Scene();
const camera=new THREE.PerspectiveCamera(55,innerWidth/innerHeight,.25,15000);
const colliders=[];const audio=new Audio();

let sky,cassian,malphas,village,player,meteors;let started=false;
let tod=parseFloat(params.get('t')||'0.03');let timeScale=1;const DAY_LEN=540;let gameTime=0;let paused=false;let freeCam=null;

const POIS=[
  {id:'village',title:'谷間の村オルド',x:VILLAGE.x,z:VILLAGE.z,r:120,text:'オルドの朝は、地響きと共に始まります。村人たちは、空を見上げることを忘れません。'},
  {id:'elrick',title:'祖父エルリック',manual:true,text:'勇者の血を引く者として育てられた、リナのおじいちゃん。'},
  {id:'stele',title:'古い石碑',x:86,z:162,r:22,text:'かつて、この地は戦火に包まれていました。魔王の闇の軍勢が世界を飲み込もうとした時、勇者カシアンは究極の選択を迫られたのです。'},
  {id:'bridge',title:'星見の橋',x:BRIDGE_X,z:riverZ(BRIDGE_X),r:30,text:'村人たちは、赤く燃える隕石の光を道標にして夜道を歩き、その地響きを心臓の鼓動のように感じて生きてきました。'},
  {id:'crater',title:'古いクレーター',x:175,z:-640,r:45,text:'天から隕石を呼び寄せ、標的が滅びるまで降らせ続ける禁忌の術——「終わりのない裁き」。'},
  {id:'cassian',title:'勇者カシアン',x:CASSIAN.x,z:CASSIAN.z,r:300,text:'魔王を封じるため、自らの肉体を魔法の触媒へと変えた勇者。天を指す右腕から、今もなお魔力が放たれています。'},
  {id:'malphas',title:'魔王マルファス',x:MALPHAS.x,z:MALPHAS.z,r:340,text:'不老不死の呪いを受けた魔王。その肉体は今も生きたまま、光の鎖と崩れた岩に縛られ、永劫の苦しみの中にいます。'},
  {id:'plinth',title:'カシアンの足元',x:CASSIAN.x,z:CASSIAN.z,r:PLINTH.r-8,needY:true,text:'彼が石のままでい続ける限り、隕石の雨が止むことはありません。勇者は宿敵を見据え、永遠に見張り続けているのです。'}];
const found=new Set();
const DIALOG=[['エルリック','おはよう、リナ。今朝も大地がよく揺れておるのう。'],['リナ','おじいちゃん、あの山たちはいつかお休みできるの？'],
  ['エルリック','あれは山ではないんだよ、リナ。あれは終わらない戦いそのものなのだ。'],['エルリック','彼らが眠りにつく時、それは世界の終わりか、あるいは本当の平和が訪れる時だろう。'],
  ['エルリック','左に立つのが勇者カシアン。右で鎖に縛られておるのが魔王マルファスじゃ。'],['エルリック','この道をまっすぐ北へたどれば、二人の足元まで行ける。隕石は魔王にしか落ちん。気をつけて行っておいで。']];
const DIALOG_AGAIN=[['エルリック','道に迷ったら、カシアンの指先の青い光を目指すのじゃ。']];
let dlg=null,talked=false,endingShown=false,endingPending=-1;

async function init(){
  setProg(.02,'大地を生成しています…');await nextFrame();
  sky=buildSky(scene);
  await buildTerrain(scene,p=>setProg(.05+p*.4));
  setProg(.48,'森と川を育てています…');await nextFrame();
  const veg=buildVegetation(scene,colliders);
  setProg(.6,'勇者カシアンを刻んでいます…');await nextFrame();
  cassian=buildCassian(scene,colliders);
  setProg(.72,'魔王マルファスを縛っています…');await nextFrame();
  malphas=buildMalphas(scene,colliders);
  setProg(.84,'村オルドを建てています…');await nextFrame();
  village=buildVillage(scene,colliders);buildLandmarks();
  meteors=new Meteors(scene,malphas);
  meteors.onImpact=onImpact;meteors.onSpawn=p=>{audio.whoosh(p.distanceTo(player.pos));};
  player=new Player(scene,camera,colliders,audio);player.place(START.x,START.z,0);
  $('found-total').textContent=POIS.length;
  setProg(.95,'光を灯しています…');await nextFrame();
  update(0.016);renderer.compile(scene,camera);renderer.render(scene,camera);
  setProg(1,'準備ができました');
  window.SOZAN.ready=true;window.SOZAN.stats={veg,tris:renderer.info.render.triangles,calls:renderer.info.render.calls};
  if(params.has('autostart'))startGame();else{const b=$('start-btn');b.classList.remove('hidden');b.onclick=startGame;}
  requestAnimationFrame(loop);}

function buildLandmarks(){
  // stele with glowing runes
  const sx=86,sz=162;const y=groundAt(sx,sz);const g=rockify(new THREE.BoxGeometry(2.4,7,1,3,8,2),{amp:.12,freq:.6,uvScale:.4,colA:[.55,.55,.56],colB:[.33,.33,.35],colFreq:.3});
  const m=new THREE.Mesh(g,new THREE.MeshStandardMaterial({vertexColors:true,roughness:.9,flatShading:true}));m.position.set(sx,y+3.2,sz);m.rotation.y=.4;m.castShadow=true;scene.add(m);
  const rm=new THREE.MeshStandardMaterial({color:0x102030,emissive:0x5ac8ff,emissiveIntensity:2});const R=mulberry32(8);
  for(let i=0;i<9;i++){const r=new THREE.Mesh(new THREE.BoxGeometry(.25+R()*.9,.12,.05),rm);r.position.set((R()-.5)*1.2,1.5-i*.42,.53);m.add(r);}
  colliders.push({type:'c',x:sx,z:sz,r:1.6});
  // old crater: ring of scorched rocks with embers
  const cx=175,cz=-640;const rocks=[];
  for(let i=0;i<34;i++){const a=i/34*Math.PI*2+R()*.2,r=30+R()*8;const x=cx+Math.cos(a)*r,z=cz+Math.sin(a)*r;const s=2+R()*4;
    const rg=rockify(new THREE.DodecahedronGeometry(s,1),{amp:s*.2,freq:1/s,uvScale:.3,colA:[.3,.27,.25],colB:[.15,.13,.12],colFreq:.2});rg.translate(x,groundAt(x,z)+s*.3,z);rocks.push(rg);colliders.push({type:'c',x,z,r:s*.9});}
  for(const rg of rocks){const mm=new THREE.Mesh(rg,new THREE.MeshStandardMaterial({vertexColors:true,roughness:.95,flatShading:true}));mm.castShadow=true;scene.add(mm);}
  const em=new THREE.SpriteMaterial({map:glowTex(),color:0xff5a20,blending:THREE.AdditiveBlending,depthWrite:false,transparent:true,opacity:.7});
  for(let i=0;i<14;i++){const a=R()*6.28,r=R()*22;const s=new THREE.Sprite(em);s.position.set(cx+Math.cos(a)*r,groundAt(cx+Math.cos(a)*r,cz+Math.sin(a)*r)+.6,cz+Math.sin(a)*r);s.scale.setScalar(2+R()*3);scene.add(s);}
  const core=new THREE.Mesh(new THREE.DodecahedronGeometry(5,0),new THREE.MeshStandardMaterial({color:0x221510,emissive:0xff3a0a,emissiveIntensity:.8,flatShading:true}));core.position.set(cx,groundAt(cx,cz)+2,cz);scene.add(core);colliders.push({type:'c',x:cx,z:cz,r:5});}

function onImpact(p){const d=player.pos.distanceTo(p);const delay=audio.impact(d)||0;audio.roar(d,delay*.5);
  const amp=.9/(1+d/350)+.06;setTimeout(()=>{player.addShake(amp);flash(Math.min(.9,1.2/(1+d/600)));},Math.min(1200,d/1.8));}
let flashT=99,flashA=0;function flash(a){flashT=0;flashA=a;}

// ---------- UI
let capTimer=0;const capQueue=[];
function caption(title,text,dur=7){capQueue.push([title,text,dur]);}
function toast(text,dur=2.5){const t=$('toast');t.textContent=text;t.classList.remove('hidden');clearTimeout(t._h);t._h=setTimeout(()=>t.classList.add('hidden'),dur*1000);}
function discover(id){if(found.has(id))return;found.add(id);const p=POIS.find(q=>q.id===id);$('found-n').textContent=found.size;audio.chime();caption(p.title,p.text);
  toast(`発見！ ${p.title}（${found.size}/${POIS.length}）`);updateObjective();
  if(found.has('cassian')&&found.has('malphas')&&!endingShown&&endingPending<0)endingPending=9;}
function updateObjective(){let t;if(!talked)t='エルリックおじいちゃんと話そう（近づいて E／話す）';
  else if(!found.has('cassian')&&!found.has('malphas'))t='道をたどって北へ。双山のふもとを目指そう';
  else if(!(found.has('cassian')&&found.has('malphas')))t=found.has('cassian')?'右の魔王マルファスのふもとへも行ってみよう':'左の勇者カシアンのふもとへも行ってみよう';
  else if(!found.has('plinth'))t='岩の坂道を登って、カシアンの足元まで行ってみよう';
  else t=`自由に探索しよう（発見 ${found.size}/${POIS.length}）`;$('obj-text').textContent=t;}
function openDialog(lines){dlg={lines,i:0};player.frozen=true;$('dialog').classList.remove('hidden');showLine();}
function showLine(){const [n,t]=dlg.lines[dlg.i];$('dlg-name').textContent=n;$('dlg-text').textContent=t;audio.blip();}
function advanceDialog(){if(!dlg)return;dlg.i++;if(dlg.i>=dlg.lines.length){dlg=null;player.frozen=false;$('dialog').classList.add('hidden');if(!talked){talked=true;discover('elrick');}updateObjective();if(document.pointerLockElement===null&&!isTouch){}return;}showLine();}
function nearElrick(){const e=village.elrick.position;return Math.hypot(player.pos.x-e.x,player.pos.z-e.z)<4;}
function talk(){if(dlg){advanceDialog();return;}if(nearElrick())openDialog(talked?DIALOG_AGAIN:DIALOG);}
function showEnding(){endingShown=true;$('end-text').textContent='太陽が沈み、双山のシルエットが夜の帳に溶け込んでいきます。\n一つ、また一つと、天から炎の礫が振り下ろされます。\n勇者と魔王。憎しみと使命。\n二つの魂は、石の檻の中で、永遠に終わることのない対話を続けています。\n世界がこの残酷で美しい均衡を保ち続ける限り。';
  $('ending').classList.remove('hidden');if(document.exitPointerLock)document.exitPointerLock();player.frozen=true;}
$('end-btn').onclick=()=>{$('ending').classList.add('hidden');player.frozen=false;updateObjective();};
$('dialog').addEventListener('click',e=>{e.stopPropagation();advanceDialog();});
$('btn-mute').onclick=e=>{e.stopPropagation();toggleMute();};
$('btn-time').onclick=e=>{e.stopPropagation();timeScale=timeScale>1?1:40;$('btn-time').classList.toggle('on',timeScale>1);};
function toggleMute(){audio.setMuted(!audio.muted);$('btn-mute').textContent=audio.muted?'🔇':'🔊';}

function startGame(){if(started)return;started=true;$('loading').classList.add('hidden');$('hud').classList.remove('hidden');if(isTouch)$('touch-ui').classList.remove('hidden');
  try{audio.start();}catch(e){}updateObjective();caption('永劫の双山','谷間の村オルド。北の空には、雲を突き抜ける二つの巨大な「山」がそびえ立っています。',8);}

// ---------- input
addEventListener('keydown',e=>{if(!player)return;player.keys[e.code]=true;if(e.code==='KeyE'||e.code==='Enter')talk();if(e.code==='KeyM')toggleMute();
  if(e.code==='KeyT'){timeScale=40;$('btn-time').classList.add('on');}if(e.code==='KeyG')meteors.spawn();if(e.code==='Space'&&dlg){advanceDialog();}
  if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))e.preventDefault();});
addEventListener('keyup',e=>{if(!player)return;player.keys[e.code]=false;if(e.code==='KeyT'){timeScale=1;$('btn-time').classList.remove('on');}});
addEventListener('blur',()=>{if(player)player.keys={};});
canvas.addEventListener('click',()=>{if(!started||isTouch)return;if(dlg){advanceDialog();return;}if(nearElrick()){talk();return;}if(!document.pointerLockElement)canvas.requestPointerLock?.();});
addEventListener('mousemove',e=>{if(!player||isTouch)return;if(document.pointerLockElement===canvas||(e.buttons&1)){player.yaw-=e.movementX*.0026;player.pitch=Math.max(-.55,Math.min(1.25,player.pitch+e.movementY*.0022));}});
addEventListener('wheel',e=>{if(player)player.dist=Math.max(2.5,Math.min(18,player.dist*(1+Math.sign(e.deltaY)*.1)));},{passive:true});
// touch: joystick + drag look
const joy=$('joy'),knob=$('joy-knob');let joyId=null,lookId=null,lx=0,ly=0;
joy.addEventListener('pointerdown',e=>{joyId=e.pointerId;joy.setPointerCapture(e.pointerId);moveJoy(e);});
joy.addEventListener('pointermove',e=>{if(e.pointerId===joyId)moveJoy(e);});
const endJoy=e=>{if(e.pointerId!==joyId)return;joyId=null;player.joy.x=player.joy.y=0;knob.style.transform='';};joy.addEventListener('pointerup',endJoy);joy.addEventListener('pointercancel',endJoy);
function moveJoy(e){const r=joy.getBoundingClientRect();let dx=(e.clientX-r.left-r.width/2)/(r.width/2),dy=(e.clientY-r.top-r.height/2)/(r.height/2);const L=Math.hypot(dx,dy);if(L>1){dx/=L;dy/=L;}
  player.joy.x=dx;player.joy.y=-dy;knob.style.transform=`translate(${dx*42}px,${dy*42}px)`;}
canvas.addEventListener('pointerdown',e=>{if(e.pointerType!=='touch'||!started)return;if(dlg){advanceDialog();return;}lookId=e.pointerId;lx=e.clientX;ly=e.clientY;});
canvas.addEventListener('pointermove',e=>{if(e.pointerId!==lookId)return;player.yaw-=(e.clientX-lx)*.006;player.pitch=Math.max(-.55,Math.min(1.25,player.pitch+(e.clientY-ly)*.005));lx=e.clientX;ly=e.clientY;});
const endLook=e=>{if(e.pointerId===lookId)lookId=null;};canvas.addEventListener('pointerup',endLook);canvas.addEventListener('pointercancel',endLook);
$('t-jump').addEventListener('pointerdown',e=>{e.stopPropagation();player.jumpReq=true;});
$('t-run').addEventListener('pointerdown',e=>{e.stopPropagation();player.runToggle=!player.runToggle;$('t-run').classList.toggle('on',player.runToggle);});
$('t-talk').addEventListener('pointerdown',e=>{e.stopPropagation();talk();});
addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);});

// ---------- main loop
const clock=new THREE.Clock();let fpsAcc=0,fpsN=0,fpsCheck=0;
function update(dt){gameTime+=dt;tod=(tod+dt*timeScale/DAY_LEN)%1;
  if(!freeCam)player.update(dt,gameTime);
  const S=sky.update(tod,player.pos,renderer,gameTime);const night=sky.night;
  sky.sky.position.copy(camera.position);sky.stars.position.copy(camera.position);
  cassian.update(gameTime,night);malphas.update(gameTime,dt,night);village.update(gameTime,night,player.pos);
  meteors.setScale(renderer.domElement.height/(2*Math.tan(camera.fov*Math.PI/360)));meteors.update(dt,gameTime,night,camera.position);
  // roar rumble while Malphas writhes
  const dM=Math.hypot(player.pos.x-MALPHAS.x,player.pos.z-MALPHAS.z);if(malphas.agony>.3)player.addShake(malphas.agony*dt*.25/(1+dM/500));
  flashT+=dt;$('flash').style.opacity=Math.max(0,flashA*(1-flashT/1.2)).toFixed(3);
  // POIs
  if(started){for(const p of POIS){if(p.manual||found.has(p.id))continue;const d=Math.hypot(player.pos.x-p.x,player.pos.z-p.z);if(d<p.r&&(!p.needY||player.pos.y>plinthTop()-4))discover(p.id);}
    if(endingPending>0){endingPending-=dt;if(endingPending<=0&&!dlg)showEnding();}
    const ne=nearElrick();$('prompt').classList.toggle('hidden',!ne||!!dlg);$('prompt').textContent=isTouch?'「話す」ボタンで会話':'E：話す';$('t-talk').classList.toggle('hidden',!ne&&!dlg);
    if(player.boundaryMsg>0){player.boundaryMsg=0;if(!toastBoundaryT||gameTime-toastBoundaryT>4){toastBoundaryT=gameTime;toast('険しい山々に阻まれて、これ以上は進めない');}}
    // captions
    capTimer-=dt;if(capTimer<=0){const c=$('caption');if(capQueue.length){const [ti,tx,du]=capQueue.shift();$('cap-title').textContent=ti;$('cap-text').textContent=tx;c.classList.remove('hidden');c.classList.add('show');capTimer=du;}else c.classList.remove('show');}
    $('tod').textContent=phaseName(tod);
    audio.setAmbience(night,Math.min(Math.hypot(player.pos.x-CASSIAN.x,player.pos.z-CASSIAN.z),dM));}
  if(freeCam){camera.position.copy(freeCam.pos);camera.lookAt(freeCam.look);}}
let toastBoundaryT=0;
function loop(){requestAnimationFrame(loop);if(paused)return;const dt=Math.min(.05,clock.getDelta());update(dt);renderer.render(scene,camera);
  // adaptive resolution
  fpsAcc+=dt;fpsN++;if(fpsN>=90){const avg=fpsAcc/fpsN;fpsAcc=0;fpsN=0;fpsCheck++;
    if(avg>1/42&&pixelRatio>.8){pixelRatio=Math.max(.75,pixelRatio-.25);renderer.setPixelRatio(pixelRatio);}
    else if(avg<1/58&&pixelRatio<Math.min(devicePixelRatio||1,2)&&fpsCheck>3){pixelRatio=Math.min(Math.min(devicePixelRatio||1,2),pixelRatio+.25);renderer.setPixelRatio(pixelRatio);}}}

// ---------- debug / test hooks
window.SOZAN={ready:false,
  setTime(t){tod=t;},teleport(x,z,yaw=0,pitch=.12,dist=6.5){player.place(x,z,yaw);player.pitch=pitch;player.dist=dist;player.snapCamera();},
  freeCam(px,py,pz,lx,ly,lz){freeCam=px===undefined?null:{pos:new THREE.Vector3(px,py,pz),look:new THREE.Vector3(lx,ly,lz)};if(freeCam){camera.position.copy(freeCam.pos);camera.lookAt(freeCam.look);sky.sky.position.copy(camera.position);sky.stars.position.copy(camera.position);}},
  meteor(){meteors.spawn();},pause(p=true){paused=p;},
  advance(sec,step=1/30){for(let t=0;t<sec;t+=step)update(step);},
  render(){renderer.render(scene,camera);return {tris:renderer.info.render.triangles,calls:renderer.info.render.calls};},
  setPixelRatio(p){pixelRatio=p;renderer.setPixelRatio(p);},
  start(){startGame();},talk(){talk();},info(){return {pos:player.pos.toArray(),tod,found:[...found],agony:malphas.agony};},
  get player(){return player;},ground:(x,z)=>walkHeight(x,z)};
init().catch(e=>{console.error(e);$('ld-text').textContent='読み込みエラー: '+e.message;});
