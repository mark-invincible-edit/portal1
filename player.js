import * as THREE from 'three';
import * as CANNON from 'cannon-es';
const GUN_YAW=0; // model forward axis unknown: set to 0 if the gun points back at you
export class Player{
  constructor(c){this.c=c;this.k={};this.yaw=0;this.pitch=0;this.h=100;this.held=null;this.since=0;this.rr=new CANNON.RaycastResult();
    this.body=new CANNON.Body({mass:5,shape:new CANNON.Sphere(.5),material:c.pmat,fixedRotation:true,linearDamping:.01});
    this.body.collisionFilterGroup=2;c.world.addBody(this.body);
    this.gun=c.model('portalGun',.75,0x8899aa,[.15,.18,.75]).obj;this.gun.rotation.y=GUN_YAW;c.gun=this.gun;c.camera.add(this.gun);
    addEventListener('keydown',e=>{this.k[e.code]=1;if(e.code==='KeyE'&&this.locked())this.held?this.drop():this.grab()});
    addEventListener('keyup',e=>this.k[e.code]=0);
    addEventListener('mousemove',e=>{if(!this.locked())return;this.yaw-=e.movementX*.0022;this.pitch=Math.max(-1.5,Math.min(1.5,this.pitch-e.movementY*.0022))});
    addEventListener('mousedown',e=>{if(this.locked())c.portals.shoot(e.button===2?1:0)});
    addEventListener('contextmenu',e=>e.preventDefault())}
  locked(){return !!document.pointerLockElement}
  eye(){const p=this.body.position;return new THREE.Vector3(p.x,p.y+1,p.z)}
  dir(){return new THREE.Vector3(0,0,-1).applyQuaternion(this.c.camera.quaternion)}
  respawn(p,yaw){this.body.position.set(...p);this.body.velocity.set(0,0,0);this.yaw=yaw||0;this.pitch=0;this.h=100;this.held=null;this.c.ui.hp(100)}
  hurt(n){this.h-=n;this.since=0;this.c.ui.hurt();this.c.sfx('playerHurt');this.c.ui.hp(this.h);if(this.h<=0)this.c.die()}
  grab(){const cam=this.c.camera.position,d=this.dir();let best=null,bd=3.5;
    for(const g of this.c.grab){const v=new THREE.Vector3().copy(g.body.position).sub(cam),l=v.length();if(l<bd&&v.normalize().dot(d)>.8){best=g;bd=l}}
    if(best){this.held=best;best.body.collisionFilterGroup=4;best.body.collisionFilterMask=-1&~2;best.body.wakeUp()}}
  drop(){if(!this.held)return;this.held.body.collisionFilterGroup=1;this.held.body.collisionFilterMask=-1;this.held=null}
  update(dt){const k=this.k,y=this.yaw,p=this.body.position,v=this.body.velocity;
    const f=(k.KeyW?1:0)-(k.KeyS?1:0),s=(k.KeyD?1:0)-(k.KeyA?1:0);
    let wx=-Math.sin(y)*f+Math.cos(y)*s,wz=-Math.cos(y)*f-Math.sin(y)*s;const l=Math.hypot(wx,wz);if(l>1){wx/=l;wz/=l}wx*=6;wz*=6;
    this.rr.reset();let g=this.c.world.raycastClosest(new CANNON.Vec3(p.x,p.y,p.z),new CANNON.Vec3(p.x,p.y-.7,p.z),{collisionFilterMask:1,skipBackfaces:true},this.rr);
    for(const q of this.c.world.contacts){const a=q.bi===this.body;if((a||q.bj===this.body)&&(a?-q.ni.y:q.ni.y)>.6){g=true;break}} // contact fallback, the ray alone wasn't reliable
    this.grounded=g;
    if(this.grounded){v.x=wx;v.z=wz;if(k.Space)v.y=8}
    else{const m=Math.max(Math.hypot(v.x,v.z),6);v.x+=wx*dt*4;v.z+=wz*dt*4;const s2=Math.hypot(v.x,v.z);if(s2>m){v.x*=m/s2;v.z*=m/s2}} // air control never kills fling momentum
    this.since+=dt;if(this.since>4&&this.h<100){this.h=Math.min(100,this.h+dt*10);this.c.ui.hp(this.h)}
    if(this.held){const h=this.held.body,t=this.eye().addScaledVector(this.dir(),2.4);t.y-=.3;
      const dx=t.x-h.position.x,dy=t.y-h.position.y,dz=t.z-h.position.z;
      if(Math.hypot(dx,dy,dz)>4)this.drop();else{h.velocity.set(dx*12,dy*12,dz*12);h.angularVelocity.set(0,0,0);h.quaternion.setFromEuler(0,this.yaw,0)}}
    const t=performance.now()/1000;this.gun.position.set(.3+Math.sin(t*1.3)*.004,-.34+Math.sin(t*1.9)*.006,-.65)}
  syncCam(){const p=this.body.position,c=this.c.camera;c.position.set(p.x,p.y+1,p.z);c.rotation.set(this.pitch,this.yaw,0,'YXZ');c.updateMatrixWorld()}
  onTeleport(M){const f=this.dir().transformDirection(M);this.yaw=Math.atan2(-f.x,-f.z);this.pitch=Math.max(-1.5,Math.min(1.5,Math.asin(f.y))); // roll is dropped (limitation)
    this.syncCam()}
}
