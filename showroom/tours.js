import * as THREE from 'three';
import { floorBaseY } from './data.js';
// Guided one-click camera tours: smooth interpolation between keyframes
export function makeTours(){
  const {map:baseY,total}=floorBaseY(); const oy=baseY['12'], ry=baseY['M'];
  const K=(pos,look,dur=3.2)=>({pos:new THREE.Vector3(...pos),look:new THREE.Vector3(...look),dur});
  return {
    'Exterior Hero':[ K([95,38,118],[0,40,0]), K([72,16,100],[0,36,0]), K([-88,50,102],[0,42,0]), K([95,38,118],[0,40,0]) ],
    'Media Facade Close-Up':[ K([70,30,40],[28,45,6]), K([62,60,18],[27,70,6]), K([66,95,26],[27,110,6]) ],
    'Grand Lobby':[ K([0,2,16],[0,2.2,-6]), K([-8,2.2,4],[4,2,-10]), K([4,2.4,-6],[0,2,10]) ],
    'IT Office Floor':[ K([0,oy+1.7,17],[0,oy+1.5,-4],3.6), K([-14,oy+1.7,6],[-18,oy+1.2,-8],3.6), K([12,oy+1.7,-6],[0,oy+1.2,4],3.6) ],
    'Executive Suite':[ K([8,oy+1.7,-6],[20,oy+1.2,-16],3.4), K([17,oy+1.7,-13],[24,oy+1,-19],3.2) ],
    'Rooftop Terrace':[ K([0,ry+1.8,14],[0,ry+1, -10],3.4), K([-14,ry+2,4],[18,ry+1,-6],3.6), K([10,ry+2.2,-4],[0,ry+1,16],3.4) ],
  };
}
export class TourPlayer {
  constructor(camera){ this.camera=camera; this.active=false; this.t=0; this.frames=[]; this.onDone=null; }
  play(frames,onDone){ this.frames=frames; this.t=0; this.active=true; this.onDone=onDone; this.seg=0; this.segT=0;
    if(frames[0]){ this.camera.position.copy(frames[0].pos); this.camera.lookAt(frames[0].look); } }
  stop(){ this.active=false; }
  update(dt){
    if(!this.active||this.frames.length<2) return;
    const a=this.frames[this.seg], b=this.frames[this.seg+1]; if(!b){ this.active=false; this.onDone?.(); return; }
    this.segT+=dt/b.dur; const k=this.segT>=1?1:(1-Math.pow(1-this.segT,3)); // easeOutCubic-ish smooth
    const s=k*k*(3-2*k);
    this.camera.position.lerpVectors(a.pos,b.pos,s);
    const look=new THREE.Vector3().lerpVectors(a.look,b.look,s); this.camera.lookAt(look);
    if(this.segT>=1){ this.seg++; this.segT=0; if(this.seg>=this.frames.length-1){ this.active=false; this.onDone?.(); } }
  }
}
