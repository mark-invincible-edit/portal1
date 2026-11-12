import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import * as CANNON from 'cannon-es';
import {Player} from './player.js';
import {Portals} from './portals.js';
import {Cube,Turret,Button,Door} from './entities.js';
import {LEVELS} from './levels.js';
import {ui} from './ui.js';

// local: "./assets/"   remote: "https://raw.githubusercontent.com/mark-invincible-edit/portal1/main/assets/"
const ASSET_BASE="./assets/";
const ASSETS = {
  models: {
    portalGun: "portal_gun.glb",
    cube:      "portal_cube.glb",
    turret:    "portal_turret.glb",
    radio:     "portal_radio.glb"      // decorative prop only
  },
  textures: {
    floor:        "tiles.png",
    wall:         "concretewall.png",
    metalWall:    "metaltiles.png",     // NOT portalable
    portalBlue:   "blueportal.png",
    portalOrange: "orangeportal.png",
    muzzleFlash:  "muzzleflash.png"
  },
  sounds: {   // these files do NOT exist yet, load them optionally
    portalBlueShoot:   "sounds/portal_blue_shoot.ogg",
    portalOrangeShoot: "sounds/portal_orange_shoot.ogg",
    portalEnter:       "sounds/portal_enter.ogg",
    portalFizzle:      "sounds/portal_fizzle.ogg",
    turretSpot:        "sounds/turret_spot.ogg",
    turretFire:        "sounds/turret_fire.ogg",
    turretRetract:     "sounds/turret_retract.ogg",
    cubeDrop:          "sounds/cube_drop.ogg",
    buttonPress:       "sounds/button_press.ogg",
    doorOpen:          "sounds/door_open.ogg",
    playerHurt:        "sounds/player_hurt.ogg"
  }
};

const warn=f=>console.warn('missing/failed asset (using fallback):',ASSET_BASE+f);
const loadGLB=f=>new Promise(r=>new GLTFLoader().load(ASSET_BASE+f,g=>{console.groupCollapsed('[glb] '+f);g.scene.traverse(o=>console.log(o.type,o.name));console.log('animation clips:',g.animations.map(a=>a.name));console.groupEnd();r(g)},undefined,()=>{warn(f);r(null)}));
const loadTex=f=>new Promise(r=>new THREE.TextureLoader().load(ASSET_BASE+f,t=>{t.colorSpace=THREE.SRGBColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;r(t)},undefined,()=>{warn(f);r(null)}));
const models={},tex={};
await Promise.all([...Object.entries(ASSETS.models).map(async([k,f])=>models[k]=await loadGLB(f)),...Object.entries(ASSETS.textures).map(async([k,f])=>tex[k]=await loadTex(f))]);
const snd={};let soundWarned=false;
for(const k in ASSETS.sounds){const a=new Audio(ASSET_BASE+ASSETS.sounds[k]);a.preload='auto';a.onerror=()=>{snd[k]=null;if(!soundWarned){soundWarned=true;console.warn('sound files missing (expected) - running silent')}};snd[k]=a}
const sfx=k=>{const a=snd[k];if(a){const c=a.cloneNode();c.volume=.6;c.play().catch(()=>{})}};

const renderer=new THREE.WebGLRenderer({antialias:true});renderer.setSize(innerWidth,innerHeight);document.body.prepend(renderer.domElement);
const scene=new THREE.Scene();scene.background=new THREE.Color(0x15181c);scene.add(new THREE.HemisphereLight(0xffffff,0x445566,1.1));
const camera=new THREE.PerspectiveCamera(75,innerWidth/innerHeight,.05,100);scene.add(camera);
const world=new CANNON.World({gravity:new CANNON.Vec3(0,-20,0)});
const mat=new CANNON.Material('d'),pmat=new CANNON.Material('p');
world.addContactMaterial(new CANNON.ContactMaterial(mat,mat,{friction:.3,restitution:0}));
world.addContactMaterial(new CANNON.ContactMaterial(pmat,mat,{friction:0,restitution:0}));

const ctx={scene,camera,renderer,world,mat,pmat,tex,sfx,ui,fx:[],levelMeshes:[],dyn:[],grab:[]};
ctx.model=(key,size,col,fb)=>{const g=models[key],r=new THREE.Group();let clips=[];
  if(g){const m=SkeletonUtils.clone(g.scene),b=new THREE.Box3().setFromObject(m),z=b.getSize(new THREE.Vector3());
    m.scale.setScalar(size/Math.max(z.x,z.y,z.z,1e-4));b.setFromObject(m);m.position.set(-(b.min.x+b.max.x)/2,-b.min.y,-(b.min.z+b.max.z)/2);r.add(m);clips=g.animations}
  else{const m=new THREE.Mesh(new THREE.BoxGeometry(...fb),new THREE.MeshStandardMaterial({color:col}));m.position.y=fb[1]/2;r.add(m)}
  return{obj:r,clips}};
ctx.flash=(pos,col,life,key)=>{const s=new THREE.Sprite(new THREE.SpriteMaterial({map:key?tex[key]:null,color:col,transparent:true,depthTest:false}));s.position.copy(pos);s.scale.setScalar(key?.6:.4);scene.add(s);ctx.fx.push({s,t:life})};
ctx.player=new Player(ctx);ctx.portals=new Portals(ctx);
ctx.pressers=()=>[ctx.player.body,...ctx.grab.filter(g=>g.presses).map(g=>g.body)];

const TEX={floor:'floor',wall:'wall',metal:'metalWall'},COLS={floor:0x777777,wall:0x999999,metal:0x445566};
function boxMat(t,[w,h,d]){const f=(a,b)=>{const m=new THREE.MeshStandardMaterial({color:tex[TEX[t]]?0xffffff:COLS[t]});if(tex[TEX[t]]){const x=tex[TEX[t]].clone();x.needsUpdate=true;x.repeat.set(a/2,b/2);m.map=x}return m};
  return [f(d,h),f(d,h),f(w,d),f(w,d),f(w,h),f(w,h)]}

let cur=0,lvl=null,dead=false,done=false;
function clearLevel(){if(!lvl)return;lvl.bodies.forEach(b=>world.removeBody(b));scene.remove(lvl.group);ctx.portals.clear();ctx.ui.portals(false,false)}
function loadLevel(i){clearLevel();cur=i;done=false;const L=LEVELS[i];lvl={group:new THREE.Group(),bodies:[],ents:[],doors:[],buttons:[]};scene.add(lvl.group);
  ctx.levelMeshes=[];ctx.dyn=[ctx.player.body];ctx.grab=[];
  for(const s of L.surfaces){const m=new THREE.Mesh(new THREE.BoxGeometry(...s.s),boxMat(s.t,s.s));m.position.set(...s.p);m.userData.portalable=s.t!=='metal';lvl.group.add(m);ctx.levelMeshes.push(m);
    const b=new CANNON.Body({mass:0,material:mat,shape:new CANNON.Box(new CANNON.Vec3(s.s[0]/2,s.s[1]/2,s.s[2]/2))});b.position.set(...s.p);world.addBody(b);lvl.bodies.push(b)}
  const add=e=>{lvl.ents.push(e);lvl.group.add(e.group);if(e.body){world.addBody(e.body);lvl.bodies.push(e.body);if(!e.kin)ctx.dyn.push(e.body)}if(e.grabbable)ctx.grab.push(e);return e};
  (L.cubes||[]).forEach(p=>add(new Cube(ctx,p)));(L.radios||[]).forEach(p=>add(new Cube(ctx,p,'radio')));(L.turrets||[]).forEach(d=>add(new Turret(ctx,d)));
  (L.buttons||[]).forEach(d=>lvl.buttons.push(add(new Button(ctx,d))));
  (L.doors||[]).forEach(d=>{const o=add(new Door(ctx,d));lvl.doors.push(o);ctx.levelMeshes.push(o.mesh)});
  const ex=new THREE.Mesh(new THREE.CylinderGeometry(1,1,.1,32),new THREE.MeshStandardMaterial({color:0x22cc66,emissive:0x116633}));ex.position.set(L.exit[0],L.exit[1]+.05,L.exit[2]);lvl.group.add(ex);
  (L.lights||[]).forEach(p=>{const l=new THREE.PointLight(0xfff2e0,40,40,2);l.position.set(...p);lvl.group.add(l)});
  ctx.player.respawn(L.spawn,L.yaw);ctx.player.syncCam();ui.level(i,L)}
ctx.die=()=>{dead=true};

let running=false;
const lock=()=>renderer.domElement.requestPointerLock();
ui.buildMenu(20,LEVELS.length,i=>{loadLevel(i);lock()});
document.getElementById('resume').onclick=lock;
document.addEventListener('pointerlockchange',()=>{running=!!document.pointerLockElement;ui.menu(!running,'paused')});
addEventListener('resize',()=>{renderer.setSize(innerWidth,innerHeight);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();ctx.portals.resize()});

let last=performance.now();
function loop(t){requestAnimationFrame(loop);const dt=Math.min((t-last)/1000,.05);last=t;
  if(running){const P=ctx.player;P.update(dt);world.step(1/60,dt,3);ctx.portals.teleport(dt);P.syncCam();
    for(const e of lvl.ents)e.update(dt);
    for(const d of lvl.doors){const bs=lvl.buttons.filter(b=>(b.d.doors||[]).includes(d.d.id));d.set(bs.length>0&&bs.every(b=>b.pressed))}
    ctx.fx=ctx.fx.filter(f=>{f.t-=dt;if(f.t<=0)scene.remove(f.s);return f.t>0});
    const L=LEVELS[cur],p=P.body.position;
    if(!done&&Math.hypot(p.x-L.exit[0],p.z-L.exit[2])<1.2&&Math.abs(p.y-.5-L.exit[1])<1.5){done=true;ui.toast('level complete');
      setTimeout(()=>{if(cur+1<LEVELS.length)loadLevel(cur+1);else{document.exitPointerLock();ui.menu(true,'more levels coming')}},1200)}
    if(p.y<-20)dead=true;
    if(dead){dead=false;loadLevel(cur)}}
  ctx.portals.render();renderer.render(scene,camera)}
loadLevel(0);ui.menu(true);requestAnimationFrame(loop);
