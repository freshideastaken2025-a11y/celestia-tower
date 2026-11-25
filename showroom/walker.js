import * as THREE from 'three';
import { colliders } from './interiors.js';
// First-person walker: WASD/arrows, pointer-lock mouse look, Shift run, touch joystick
export class Walker {
  constructor(camera, dom, zones){
    this.camera=camera; this.dom=dom; this.zones=zones; this.active=false;
    this.pos=new THREE.Vector3(0,1.7,15); this.yaw=Math.PI; this.pitch=0;
    this.keys={}; this.zone=null; this.joy={x:0,y:0}; this.lookDelta={x:0,y:0};
    addEventListener('keydown',e=>this.keys[e.code]=true);
    addEventListener('keyup',e=>this.keys[e.code]=false);
    document.addEventListener('mousemove',e=>{ if(document.pointerLockElement===dom && this.active){
      this.yaw-=e.movementX*0.0022; this.pitch=Math.max(-1.4,Math.min(1.4,this.pitch-e.movementY*0.0022)); }});
    // touch joystick
    const joy=document.getElementById('joystick'), knob=document.getElementById('joyKnob');
    if(joy){ let id=null;
      joy.addEventListener('touchstart',e=>{id=e.changedTouches[0].identifier},{passive:true});
      joy.addEventListener('touchmove',e=>{ for(const t of e.changedTouches){ if(t.identifier===id){
        const r=joy.getBoundingClientRect(), cx=r.left+r.width/2, cy=r.top+r.height/2;
        let dx=(t.clientX-cx)/40, dy=(t.clientY-cy)/40; const len=Math.hypot(dx,dy); if(len>1){dx/=len;dy/=len;}
        this.joy.x=dx; this.joy.y=dy; knob.style.transform=`translate(${dx*26}px,${dy*26}px)`; }}},{passive:true});
      const end=e=>{ for(const t of e.changedTouches) if(t.identifier===id){ id=null; this.joy.x=0; this.joy.y=0; knob.style.transform=''; }};
      joy.addEventListener('touchend',end); joy.addEventListener('touchcancel',end);
      // drag look on right half
      let lookId=null,lx=0,ly=0;
      dom.addEventListener('touchstart',e=>{ for(const t of e.changedTouches){ if(t.clientX>innerWidth/2 && lookId===null){lookId=t.identifier;lx=t.clientX;ly=t.clientY;} }},{passive:true});
      dom.addEventListener('touchmove',e=>{ for(const t of e.changedTouches){ if(t.identifier===lookId){ this.yaw-=(t.clientX-lx)*0.005; this.pitch=Math.max(-1.4,Math.min(1.4,this.pitch-(t.clientY-ly)*0.005)); lx=t.clientX; ly=t.clientY; } }},{passive:true});
      dom.addEventListener('touchend',e=>{ for(const t of e.changedTouches) if(t.identifier===lookId) lookId=null; },{passive:true});
    }
  }
  enter(zoneName){
    this.zone=this.zones[zoneName]; if(!this.zone) return;
    this.pos.copy(this.zone.spawn); this.pos.y+=1.7; this.yaw=Math.PI; this.pitch=0; this.active=true;
    if(matchMedia('(pointer:fine)').matches) this.dom.requestPointerLock?.();
  }
  exit(){ this.active=false; document.exitPointerLock?.(); }
  update(dt){
    if(!this.active||!this.zone) return;
    const run=(this.keys.ShiftLeft||this.keys.ShiftRight)?7:3.4;
    const fwd=new THREE.Vector3(-Math.sin(this.yaw),0,-Math.cos(this.yaw));
    const right=new THREE.Vector3(-fwd.z,0,fwd.x);
    const move=new THREE.Vector3();
    if(this.keys.KeyW||this.keys.ArrowUp) move.add(fwd);
    if(this.keys.KeyS||this.keys.ArrowDown) move.sub(fwd);
    if(this.keys.KeyD||this.keys.ArrowRight) move.add(right);
    if(this.keys.KeyA||this.keys.ArrowLeft) move.sub(right);
    move.addScaledVector(fwd,-this.joy.y); move.addScaledVector(right,this.joy.x);
    if(move.lengthSq()>0){ move.normalize().multiplyScalar(run*dt);
      const nx=this.pos.x+move.x, nz=this.pos.z+move.z;
      const b=this.zone.bounds;
      const hit=(x,z)=>colliders.some(c=>Math.abs(c.floorY-this.zone.y)<0.6 && x>c.minX&&x<c.maxX&&z>c.minZ&&z<c.maxZ);
      if(!hit(nx,this.pos.z)) this.pos.x=THREE.MathUtils.clamp(nx,b.minX,b.maxX);
      if(!hit(this.pos.x,nz)) this.pos.z=THREE.MathUtils.clamp(nz,b.minZ,b.maxZ);
    }
    this.camera.position.copy(this.pos);
    const look=this.pos.clone().add(new THREE.Vector3(-Math.sin(this.yaw)*Math.cos(this.pitch),Math.sin(this.pitch),-Math.cos(this.yaw)*Math.cos(this.pitch)));
    this.camera.lookAt(look);
  }
}
