import * as THREE from 'three';
import * as CANNON from 'cannon-es';
const CL='Turret_01_reference_skeleton | ',YAW_OFF=0; // YAW_OFF: radians, fix if the turret model faces the wrong way
class Prop{ // physics body + model, grabbable
  constructor(c,p,half,mass,key,col){this.c=c;this.grabbable=1;
    this.body=new CANNON.Body({mass,material:c.mat,shape:new CANNON.Box(new CANNON.Vec3(...half)),linearDamping:.15,angularDamping:.4});this.body.position.set(...p);
    const m=c.model(key,Math.max(...half)*2,col,half.map(x=>x*2));this.clips=m.clips;this.obj=m.obj;this.obj.position.y=-half[1];
    this.group=new THREE.Group();this.group.add(this.obj)}
  sync(){this.group.position.copy(this.body.position);this.group.quaternion.copy(this.body.quaternion)}
  update(){this.sync()}
}
export class Cube extends Prop{ // kind 'radio' = decorative, grabbable, never presses buttons
  constructor(c,p,kind='cube'){const r=kind==='radio';super(c,p,r?[.25,.2,.12]:[.25,.25,.25],r?1:2,r?'radio':'cube',r?0x884422:0x99aabb);this.presses=!r}
}
export class Turret extends Prop{
  constructor(c,d){super(c,d.p,[.3,.6,.3],3,'turret',0xcccccc);this.home=d.yaw||0;this.yaw=this.home;this.obj.rotation.y=YAW_OFF;this.warned={};this.cur=null;
    this.mixer=this.clips.length?new THREE.AnimationMixer(this.obj):null;this.state='idle';this.t=0;this.lost=0;this.shot=0;this.rc=new THREE.Raycaster();
    this.body.quaternion.setFromEuler(0,this.yaw,0);this.play('idle',true)}
  play(s,loop){if(!this.mixer)return 0;
    const c=this.clips.find(x=>x.name===CL+s)||this.clips.find(x=>x.name.toLowerCase().endsWith(s));
    if(!c){if(!this.warned[s]){this.warned[s]=1;console.warn(`turret clip "${CL+s}" not found. real clips:`,this.clips.map(x=>x.name))}return 0}
    const a=this.mixer.clipAction(c);a.reset().setLoop(loop?THREE.LoopRepeat:THREE.LoopOnce);a.clampWhenFinished=!loop;
    if(this.cur&&this.cur!==a)this.cur.fadeOut(.15);a.fadeIn(.15).play();this.cur=a;return c.duration}
  go(st,clip,loop,t){this.state=st;this.t=this.play(clip,loop)||t||.6}
  update(dt){const c=this.c,P=c.player,b=this.body,q=new THREE.Quaternion(b.quaternion.x,b.quaternion.y,b.quaternion.z,b.quaternion.w);
    const up=new THREE.Vector3(0,1,0).applyQuaternion(q).y;this.mixer&&this.mixer.update(dt);this.sync();
    if(P.held===this)return;
    if(up<.6){if(this.state!=='down')this.go('down','retract',false);return} // knocked over = disabled
    if(this.state==='down'){this.go('idle','idle',true)}
    const mz=new THREE.Vector3(0,.35,.3).applyQuaternion(q).add(b.position),eye=P.eye(),to=eye.clone().sub(mz),dist=to.length(),dir=to.clone().normalize();
    const hf=new THREE.Vector3(Math.sin(this.home),0,Math.cos(this.home));
    this.rc.set(mz,dir);this.rc.far=Math.max(dist-.2,.01);const los=this.rc.intersectObjects(c.levelMeshes,false).length===0; // walls/doors block; no portal LOS (limitation)
    const sees=dist<14&&(this.state!=='idle'||dir.dot(hf)>.5)&&los;this.t-=dt;
    if(up>.9){const tgt=this.state==='idle'||this.state==='retract'?this.home:Math.atan2(to.x,to.z);let dy=tgt-this.yaw;dy=Math.atan2(Math.sin(dy),Math.cos(dy));
      this.yaw+=dy*Math.min(1,dt*6);b.quaternion.setFromEuler(0,this.yaw,0);b.angularVelocity.set(0,0,0)}
    switch(this.state){
      case'idle':if(sees){this.go('deploy','deploy',false);c.sfx('turretSpot')}break;
      case'deploy':if(this.t<=0){this.state='alert';this.t=.4;this.play('idlealert',true)}break;
      case'alert':if(sees){this.lost=0;if(this.t<=0){this.state='fire';this.play('fire',true)}}else if((this.lost+=dt)>1.5){this.go('retract','retract',false);c.sfx('turretRetract')}break;
      case'fire':if(sees){this.lost=0;this.shot-=dt;if(this.shot<=0){this.shot=.18;c.flash(mz,0xffddaa,.09,'muzzleFlash');c.sfx('turretFire');
          if(Math.random()<Math.max(.1,.9-dist*.05))P.hurt(5)}} // accuracy falls off with distance
        else if((this.lost+=dt)>.6){this.go('retract','retract',false);c.sfx('turretRetract')}break;
      case'retract':if(this.t<=0)this.go('idle','idle',true);break}}
}
export class Button{
  constructor(c,d){this.c=c;this.d=d;this.pressed=false;this.mesh=this.group=new THREE.Mesh(new THREE.CylinderGeometry(.6,.7,.1,24),new THREE.MeshStandardMaterial({color:0xcc3333,emissive:0x330000}));this.mesh.position.set(...d.p)}
  update(){const bp=this.d.p;let on=false;
    for(const b of this.c.pressers()){const p=b.position,dy=p.y-bp[1];if(Math.hypot(p.x-bp[0],p.z-bp[2])<.65&&dy<1&&dy>-.2)on=true}
    if(on!==this.pressed){this.pressed=on;const m=this.mesh.material;m.color.set(on?0x33cc55:0xcc3333);m.emissive.set(on?0x003311:0x330000);this.mesh.scale.y=on?.4:1;this.c.sfx('buttonPress')}}
}
export class Door{
  constructor(c,d){this.c=c;this.d=d;this.open=false;this.k=0;this.kin=1;
    this.mesh=this.group=new THREE.Mesh(new THREE.BoxGeometry(...d.s),new THREE.MeshStandardMaterial({color:0x778899,map:c.tex.metalWall||null}));this.mesh.userData.portalable=false;
    this.body=new CANNON.Body({mass:0,type:CANNON.Body.KINEMATIC,material:c.mat,shape:new CANNON.Box(new CANNON.Vec3(d.s[0]/2,d.s[1]/2,d.s[2]/2))});this.place()}
  set(o){if(o!==this.open){this.open=o;this.c.sfx('doorOpen')}}
  place(){const y=this.d.p[1]+this.k*this.d.s[1]*.98;this.mesh.position.set(this.d.p[0],y,this.d.p[2]);this.body.position.set(this.d.p[0],y,this.d.p[2])}
  update(dt){this.k=Math.max(0,Math.min(1,this.k+(this.open?1:-1)*dt*2));this.place()}
}
