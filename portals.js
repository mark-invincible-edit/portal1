import * as THREE from 'three';
// KNOWN LIMITS: no recursion (a portal seen through a portal shows only its rim); near-plane clipping uses a global
// clipping plane at the exit portal, not an oblique projection; camera roll is dropped on exit; a portal must fit fully
// inside ONE box surface (no spanning seams); bodies are tested by center point only; carried objects are dropped on teleport.
const HW=.6,HH=1,MIN_EXIT=4,R180=new THREE.Matrix4().makeRotationY(Math.PI),COL=[0x2a8cff,0xff8a1e];
const V=()=>new THREE.Vector3();
export class Portals{
  constructor(c){this.c=c;this.p=[null,null];this.ray=new THREE.Raycaster();this.ray.far=80;
    this.cam=new THREE.PerspectiveCamera();this.cam.matrixAutoUpdate=false;this.cam.matrixWorldAutoUpdate=false;
    this.rt=[0,1].map(()=>new THREE.WebGLRenderTarget(2,2));this.inv=new THREE.Matrix4();this.resize()}
  resize(){this.res=this.c.renderer.getDrawingBufferSize(new THREE.Vector2());this.rt.forEach(r=>r.setSize(Math.ceil(this.res.x*.6),Math.ceil(this.res.y*.6)))}
  clear(){this.p.forEach(g=>g&&this.c.scene.remove(g));this.p=[null,null]}
  fizzle(pt){this.c.flash(pt,0x888888,.3,null);this.c.sfx('portalFizzle')}
  shoot(i){const c=this.c;this.ray.setFromCamera({x:0,y:0},c.camera);
    const h=this.ray.intersectObjects(c.levelMeshes,false)[0];if(!h)return;
    const n=h.face.normal.clone().transformDirection(h.object.matrixWorld);n.set(Math.round(n.x),Math.round(n.y),Math.round(n.z));
    c.sfx(i?'portalOrangeShoot':'portalBlueShoot');
    const at=h.point.clone().addScaledVector(n,.05);
    if(!h.object.userData.portalable)return this.fizzle(at); // metal: nothing placed
    const up=Math.abs(n.y)>.5?new THREE.Vector3(0,0,n.y>0?1:-1):new THREE.Vector3(0,1,0);
    const box=new THREE.Box3().setFromObject(h.object),pt=h.point.clone();
    for(const [a,half] of [[up,HH],[V().crossVectors(up,n),HW]]){
      const ax=['x','y','z'].reduce((m,k)=>Math.abs(a[k])>Math.abs(a[m])?k:m,'x');
      if(box.max[ax]-box.min[ax]<2*half)return this.fizzle(at); // surface too small
      pt[ax]=THREE.MathUtils.clamp(pt[ax],box.min[ax]+half,box.max[ax]+0-half)}
    this.place(i,pt.addScaledVector(n,.01),n,up)}
  place(i,pos,n,up){const c=this.c;if(this.p[i])c.scene.remove(this.p[i]);
    const g=new THREE.Group(),x=V().crossVectors(up,n);g.position.copy(pos);g.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(x,up,n));
    const view=new THREE.Mesh(new THREE.CircleGeometry(1,48),new THREE.ShaderMaterial({uniforms:{t:{value:this.rt[i].texture},res:{value:this.res},on:{value:0}},
      vertexShader:'void main(){gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
      fragmentShader:'uniform sampler2D t;uniform vec2 res;uniform float on;void main(){gl_FragColor=vec4(on>.5?texture2D(t,gl_FragCoord.xy/res).rgb:vec3(.03),1.);#include <colorspace_fragment>\n}'}));
    view.scale.set(HW,HH,1);view.position.z=.004;
    const tx=c.tex[i?'portalOrange':'portalBlue'];let rim;
    if(tx){rim=new THREE.Mesh(new THREE.PlaneGeometry(HW*2.4,HH*2.4),new THREE.MeshBasicMaterial({map:tx,transparent:true,depthWrite:false}))} // if your png is an opaque fill it will cover the view
    else{rim=new THREE.Mesh(new THREE.RingGeometry(.9,1,48),new THREE.MeshBasicMaterial({color:COL[i],side:THREE.DoubleSide}));rim.scale.set(HW,HH,1)}
    rim.position.z=.008;g.add(view,rim);g.userData={view};c.scene.add(g);g.updateMatrixWorld(true);this.p[i]=g;
    c.ui.portals(!!this.p[0],!!this.p[1])}
  render(){const c=this.c,[a,b]=this.p;if(!a||!b)return;const {renderer,scene,camera}=c;camera.updateMatrixWorld();
    a.userData.view.visible=b.userData.view.visible=false;c.gun.visible=false;
    for(const i of [0,1]){const s=this.p[i],d=this.p[1-i],cam=this.cam;
      this.inv.copy(s.matrixWorld).invert();
      cam.matrixWorld.copy(d.matrixWorld).multiply(R180).multiply(this.inv).multiply(camera.matrixWorld);
      cam.matrixWorldInverse.copy(cam.matrixWorld).invert();cam.projectionMatrix.copy(camera.projectionMatrix);cam.projectionMatrixInverse.copy(camera.projectionMatrixInverse);
      const n=V().set(0,0,1).transformDirection(d.matrixWorld);
      renderer.clippingPlanes=[new THREE.Plane().setFromNormalAndCoplanarPoint(n,V().setFromMatrixPosition(d.matrixWorld))];
      renderer.setRenderTarget(this.rt[i]);renderer.render(scene,cam);renderer.setRenderTarget(null);renderer.clippingPlanes=[]}
    for(const g of this.p){g.userData.view.visible=true;g.userData.view.material.uniforms.on.value=1}c.gun.visible=true}
  teleport(dt){const [a,b]=this.p;if(!a||!b)return;const c=this.c,m3=new THREE.Matrix3();
    for(const body of c.dyn){body.tp=(body.tp||0)-dt;if(body.tp>0)continue;
      for(const i of [0,1]){const s=this.p[i],d=this.p[1-i];this.inv.copy(s.matrixWorld).invert();
        const lp=V().copy(body.position).applyMatrix4(this.inv),lv=V().copy(body.velocity).applyMatrix3(m3.setFromMatrix4(this.inv));
        if((lp.x/HW)**2+(lp.y/HH)**2>=1||lp.z>.65||lp.z<-.6||lv.z>=1)continue;
        const M=new THREE.Matrix4().copy(d.matrixWorld).multiply(R180).multiply(this.inv);
        const dl=V().copy(body.position).applyMatrix4(M).applyMatrix4(new THREE.Matrix4().copy(d.matrixWorld).invert());dl.z=.7; // push out of the exit wall
        const pos=dl.applyMatrix4(d.matrixWorld),v=V().copy(body.velocity).applyMatrix3(m3.setFromMatrix4(M)),nd=V().set(0,0,1).transformDirection(d.matrixWorld),vn=v.dot(nd);
        if(vn<MIN_EXIT)v.addScaledVector(nd,MIN_EXIT-vn); // momentum kept, min push so you actually leave the portal
        const q=new THREE.Quaternion().setFromRotationMatrix(M).multiply(new THREE.Quaternion(body.quaternion.x,body.quaternion.y,body.quaternion.z,body.quaternion.w));
        body.position.set(pos.x,pos.y,pos.z);body.velocity.set(v.x,v.y,v.z);body.quaternion.set(q.x,q.y,q.z,q.w);body.tp=.35;body.wakeUp();
        if(c.player.held&&c.player.held.body===body)c.player.drop();
        if(body===c.player.body)c.player.onTeleport(M);
        c.sfx('portalEnter');break}}}
}
