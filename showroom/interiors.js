import * as THREE from 'three';
import { floorBaseY } from './data.js';
// Procedural walkable interiors. All fit-out is class V (Visualisation).
export const colliders = []; // {minX,maxX,minZ,maxZ, floorY}
function box(group,mat,w,h,d,x,y,z,ry=0,collideFloorY=null){
  const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat); m.position.set(x,y,z); m.rotation.y=ry;
  m.castShadow=true; m.receiveShadow=true; group.add(m);
  if(collideFloorY!==null) colliders.push({minX:x-w/2-.35,maxX:x+w/2+.35,minZ:z-d/2-.35,maxZ:z+d/2+.35,floorY:collideFloorY});
  return m;
}
function canvasTex(w,h,draw){ const c=document.createElement('canvas'); c.width=w;c.height=h; draw(c.getContext('2d'),w,h);
  const t=new THREE.CanvasTexture(c); t.wrapS=t.wrapT=THREE.RepeatWrapping; t.colorSpace=THREE.SRGBColorSpace; return t; }
// Veined marble: soft mineral patches, layered grey + faint gold veins, tile grout lines
const marbleTex=canvasTex(512,512,(g,w,h)=>{
  g.fillStyle='#eae4d8'; g.fillRect(0,0,w,h);
  for(let i=0;i<26;i++){ const x=Math.random()*w,y=Math.random()*h,r=40+Math.random()*110;
    const gr=g.createRadialGradient(x,y,0,x,y,r); const tone=Math.random()<.5?'210,202,188':'228,222,208';
    gr.addColorStop(0,`rgba(${tone},.20)`); gr.addColorStop(1,`rgba(${tone},0)`); g.fillStyle=gr;
    g.beginPath(); g.arc(x,y,r,0,7); g.fill(); }
  const vein=(style,lw,alpha)=>{ g.strokeStyle=style; g.globalAlpha=alpha; g.lineWidth=lw; g.beginPath();
    let x=Math.random()*w,y=0; g.moveTo(x,y);
    while(y<h){ y+=30+Math.random()*50; x+=(Math.random()-.5)*90; g.lineTo(x,y); } g.stroke(); g.globalAlpha=1; };
  for(let i=0;i<11;i++) vein('#8f887b',1.4,.55);       // main grey veins
  for(let i=0;i<16;i++) vein('#a89f8f',.7,.4);         // fine veins
  for(let i=0;i<4;i++)  vein('#c2a15e',1,.28);         // faint gold veins
  for(let i=0;i<9;i++)  vein('#f6f2ea',1.1,.5);        // white veins
  g.strokeStyle='rgba(90,82,70,.35)'; g.lineWidth=2;   // grout (2x2 tiles per canvas)
  for(const p of [0,256,511]){ g.beginPath(); g.moveTo(p,0); g.lineTo(p,h); g.stroke(); g.beginPath(); g.moveTo(0,p); g.lineTo(w,p); g.stroke(); }
});
marbleTex.repeat.set(10,8);

const MAT = {
  marble:new THREE.MeshStandardMaterial({map:marbleTex,roughness:.22,metalness:.08}),
  carpet:new THREE.MeshStandardMaterial({color:0x5a6570,roughness:1}),
  wall:new THREE.MeshStandardMaterial({color:0xe9e4da,roughness:.9}),
  wood:new THREE.MeshStandardMaterial({color:0x8a6844,roughness:.6}),
  darkWood:new THREE.MeshStandardMaterial({color:0x5a4028,roughness:.55}),
  glass:new THREE.MeshPhysicalMaterial({color:0xbcd6e4,transparent:true,opacity:.32,roughness:.08,metalness:.4}),
  metal:new THREE.MeshStandardMaterial({color:0xb9c0c6,metalness:.9,roughness:.3}),
  brushed:new THREE.MeshStandardMaterial({color:0xaab2b8,metalness:.95,roughness:.38}),
  liftFrame:new THREE.MeshStandardMaterial({color:0x3c4147,metalness:.8,roughness:.45}),
  black:new THREE.MeshStandardMaterial({color:0x222528,roughness:.5,metalness:.4}),
  white:new THREE.MeshStandardMaterial({color:0xf4f2ee,roughness:.8}),
  ceilWarm:new THREE.MeshStandardMaterial({color:0xefe3cb,roughness:.85}),
  screen:new THREE.MeshBasicMaterial({color:0x1c4d6e}),
  green:new THREE.MeshStandardMaterial({color:0x4a7c43,roughness:1}),
  shrub:new THREE.MeshStandardMaterial({color:0x3e6e38,roughness:1}),
  stone:new THREE.MeshStandardMaterial({color:0xd8d2c6,roughness:.7}),
  brass:new THREE.MeshStandardMaterial({color:0xc9a45f,metalness:1,roughness:.35}),
  deskTop:new THREE.MeshStandardMaterial({color:0xd9d4cb,roughness:.6}),
  glowWarm:new THREE.MeshBasicMaterial({color:0xffd9a0}),   // 3000K light panels / coves
  ledGreen:new THREE.MeshBasicMaterial({color:0x53e08a}),
  ledRed:new THREE.MeshBasicMaterial({color:0xe05353}),
};
function ceilingLights(group,y,w,d,step=6){
  const geo=new THREE.BoxGeometry(1.6,.06,.5); const mat=new THREE.MeshBasicMaterial({color:0xffd9a0});
  const spots=[]; for(let x=-w/2+step;x<w/2;x+=step) for(let z=-d/2+step;z<d/2;z+=step) spots.push([x,z]);
  const inst=new THREE.InstancedMesh(geo,mat,spots.length); const m4=new THREE.Matrix4();
  spots.forEach((s,i)=>{ m4.makeTranslation(s[0],y,s[1]); inst.setMatrixAt(i,m4); }); inst.instanceMatrix.needsUpdate=true; group.add(inst);
  // HVAC slot diffusers — dark slotted ceiling boxes on an offset grid
  const dGeo=new THREE.BoxGeometry(.95,.05,.95); const dMat=new THREE.MeshStandardMaterial({color:0x2e3236,metalness:.4,roughness:.6});
  const dInst=new THREE.InstancedMesh(dGeo,dMat,spots.length);
  spots.forEach((s,i)=>{ m4.makeTranslation(s[0]+step/2,y-.01,s[1]+step/2); dInst.setMatrixAt(i,m4); }); dInst.instanceMatrix.needsUpdate=true; group.add(dInst);
}
// Elevator bank: dark frame, brushed-steel door pair proud of the frame, warm indicator above.
// facing=+1 → doors face +z (room at larger z); facing=-1 → doors face -z.
function liftBank(group,y,z,x0,facing=1){
  const door=(x,w)=>{ const f=box(group,MAT.liftFrame,w+.5,3.6,.16,x,y+1.8,z);
    box(group,MAT.brushed,w/2-.03,3,.07,x-w/4,y+1.5,z+facing*.12);
    box(group,MAT.brushed,w/2-.03,3,.07,x+w/4,y+1.5,z+facing*.12);
    const ind=box(group,MAT.glowWarm,.5,.12,.05,x,y+3.38,z+facing*.13); ind.castShadow=false; return f; };
  for(let i=0;i<6;i++) door(x0+i*2.4,1.5);
  const cargo=door(x0+16,2.1); cargo.userData.label='Cargo lift';
}
function planter(group,mat,x,y,z,s=1){
  box(group,mat||MAT.stone,1.7*s,.62,1.7*s,x,y+.31,z);
  const shrub=new THREE.Mesh(new THREE.IcosahedronGeometry(.78*s,1),MAT.shrub);
  shrub.position.set(x,y+.95*s,z); shrub.castShadow=true; group.add(shrub);
  const shrub2=new THREE.Mesh(new THREE.IcosahedronGeometry(.5*s,1),MAT.green);
  shrub2.position.set(x+.45*s,y+1.25*s,z+.3*s); shrub2.castShadow=true; group.add(shrub2);
}

export function buildInteriors(scene){
  const {map:baseY}=floorBaseY();
  const zones={};
  // ---------- Zone 1: Lobby (Ground, double-height 15.5ft + void) ----------
  const lobby=new THREE.Group(); const ly=0;
  const lf=new THREE.Mesh(new THREE.PlaneGeometry(44,34),MAT.marble); lf.rotation.x=-Math.PI/2; lf.position.y=ly+.02; lf.receiveShadow=true; lobby.add(lf);
  const ceilY=15.5*0.3048*2; // double height visual
  const ceil=new THREE.Mesh(new THREE.BoxGeometry(44,.2,34),MAT.ceilWarm);
  ceil.position.y=ceilY; lobby.add(ceil);
  // 3000K coffered ceiling: warm beams, glowing recessed panels, perimeter cove strips
  const beamXs=[-18,-9,0,9,18], beamZs=[-12.75,-4.25,4.25,12.75];
  for(const bx of beamXs) box(lobby,MAT.ceilWarm,.55,.4,34,bx,ceilY-.2,0);
  for(const bz of beamZs) box(lobby,MAT.ceilWarm,44,.4,.55,0,ceilY-.2,bz);
  const cellXs=[-22,-13.5,-4.5,4.5,13.5,22], cellZs=[-17,-8.5,0,8.5,17];
  const panelGeo=new THREE.BoxGeometry(7.6,.07,7.2);
  const panels=new THREE.InstancedMesh(panelGeo,MAT.glowWarm,(cellXs.length-1)*(cellZs.length-1));
  { const m4=new THREE.Matrix4(); let i=0;
    for(let a=0;a<cellXs.length-1;a++) for(let b=0;b<cellZs.length-1;b++){
      m4.makeTranslation((cellXs[a]+cellXs[a+1])/2,ceilY-.13,(cellZs[b]+cellZs[b+1])/2); panels.setMatrixAt(i++,m4); }
    panels.instanceMatrix.needsUpdate=true; lobby.add(panels); }
  box(lobby,MAT.glowWarm,42.4,.14,.2,0,ceilY-.5,15.9); box(lobby,MAT.glowWarm,42.4,.14,.2,0,ceilY-.5,-15.9);
  box(lobby,MAT.glowWarm,.2,.14,31.6,20.9,ceilY-.5,0); box(lobby,MAT.glowWarm,.2,.14,31.6,-20.9,ceilY-.5,0);
  // Reception desk: stone front, dark-wood counter with brass trim, slatted backdrop + lit name strip
  box(lobby,MAT.stone,7,.95,1.1,0,.48,8); box(lobby,MAT.darkWood,7.5,.14,1.6,0,1.03,8); box(lobby,MAT.brass,7.5,.05,.05,0,.9,8.57);
  box(lobby,MAT.darkWood,9,3.4,.25,0,1.7,10.6);
  for(let i=0;i<11;i++) box(lobby,MAT.wood,.32,3.4,.1,-4+i*.8,1.7,10.44);
  const sign=box(lobby,MAT.glowWarm,3.6,.5,.06,0,2.5,10.36); sign.castShadow=false;
  const dirCanvas=document.createElement('canvas'); dirCanvas.width=512; dirCanvas.height=256; const dg=dirCanvas.getContext('2d');
  dg.fillStyle='#0d2f47'; dg.fillRect(0,0,512,256); dg.fillStyle='#ffd9a0'; dg.font='bold 30px sans-serif'; dg.fillText('CELESTIA — DIRECTORY',24,50);
  dg.fillStyle='#fff'; dg.font='22px sans-serif'; ['Lifts → Floors 1–19','IT Offices · Floors 11–19','CBD Punjab — UAN 0331-111-1063'].forEach((s,i)=>dg.fillText(s,24,105+i*45));
  const dirTex=new THREE.CanvasTexture(dirCanvas); dirTex.colorSpace=THREE.SRGBColorSpace;
  const dir=new THREE.Mesh(new THREE.PlaneGeometry(5,2.5),new THREE.MeshBasicMaterial({map:dirTex})); dir.position.set(6,2,-10); lobby.add(dir);
  // Security turnstiles ×3: steel pedestals, glass wing, LED status strip — just inside the entrance
  for(let i=0;i<3;i++){ const tx=-4.4+i*4.4;
    box(lobby,MAT.brushed,.45,1.02,2.2,tx-.95,.51,3,0,ly); box(lobby,MAT.brushed,.45,1.02,2.2,tx+.95,.51,3,0,ly);
    const wing=box(lobby,MAT.glass,.05,.78,1.15,tx,.55,3.1); wing.castShadow=false;
    const led=box(lobby,i===1?MAT.ledRed:MAT.ledGreen,1.5,.06,.3,tx,1.05,2.1); led.castShadow=false;
  }
  liftBank(lobby,ly,-12,-8,1);
  for(const sx of [-16,16]) planter(lobby,MAT.stone,sx,ly,12.5);
  planter(lobby,MAT.stone,-19,ly,-6,.9); planter(lobby,MAT.stone,19,ly,-6,.9);
  // perimeter low walls for collision bounds are handled by walker zone clamp
  scene.add(lobby); zones.lobby={group:lobby,y:ly,spawn:new THREE.Vector3(0,ly,15),bounds:{minX:-21,maxX:21,minZ:-16,maxZ:16}};
  // ---------- Zone 2: Typical IT office — Floor 12 ----------
  const office=new THREE.Group(); const oy=baseY['12'];
  const of=new THREE.Mesh(new THREE.PlaneGeometry(50,40),MAT.carpet); of.rotation.x=-Math.PI/2; of.position.y=oy+.02; of.receiveShadow=true; office.add(of);
  const oCeil=new THREE.Mesh(new THREE.BoxGeometry(50,.2,40),MAT.white); oCeil.position.y=oy+14*0.3048; office.add(oCeil);
  ceilingLights(office,oy+14*0.3048-.15,50,40,6);
  // central core block
  box(office,MAT.wall,14,4.2,10,0,oy+2.1,0,0,oy); liftBank(office,oy,-6.2,-6,-1);
  // workstations instanced: desk tops + monitors + glowing screens + two-part ergonomic chairs
  const deskG=new THREE.BoxGeometry(1.6,.08,.8), monG=new THREE.BoxGeometry(.55,.35,.05),
        scrG=new THREE.BoxGeometry(.5,.3,.02), seatG=new THREE.BoxGeometry(.5,.07,.48), backG=new THREE.BoxGeometry(.5,.55,.07);
  const positions=[];
  for(let r=0;r<5;r++) for(let c=0;c<6;c++){ if(r===2&&c>1&&c<4) continue; positions.push([-20+c*4.2, -14+r*5.5]); }
  for(let r=0;r<4;r++) for(let c=0;c<4;c++) positions.push([8+c*4.2, 6+r*5]);
  const desks=new THREE.InstancedMesh(deskG,MAT.deskTop,positions.length),
        mons=new THREE.InstancedMesh(monG,MAT.black,positions.length),
        scrs=new THREE.InstancedMesh(scrG,MAT.screen,positions.length),
        seats=new THREE.InstancedMesh(seatG,MAT.black,positions.length),
        backs=new THREE.InstancedMesh(backG,MAT.black,positions.length);
  const m4=new THREE.Matrix4();
  positions.forEach((p,i)=>{ m4.makeTranslation(p[0],oy+.78,p[1]); desks.setMatrixAt(i,m4);
    m4.makeTranslation(p[0],oy+1.05,p[1]-.15); mons.setMatrixAt(i,m4);
    m4.makeTranslation(p[0],oy+1.05,p[1]-.18); scrs.setMatrixAt(i,m4);
    m4.makeTranslation(p[0],oy+.46,p[1]+.75); seats.setMatrixAt(i,m4);
    m4.makeTranslation(p[0],oy+.78,p[1]+.97); backs.setMatrixAt(i,m4);
    colliders.push({minX:p[0]-.9,maxX:p[0]+.9,minZ:p[1]-.5,maxZ:p[1]+.5,floorY:oy}); });
  for(const im of [desks,mons,scrs,seats,backs]) im.instanceMatrix.needsUpdate=true;
  office.add(desks,mons,scrs,seats,backs);
  // glass-walled meeting room (x -21..-11, z 4..13) with door gap on the east wall
  box(office,MAT.glass,10,3,.12,-16,oy+1.5,13,0,oy);            // south wall
  box(office,MAT.glass,10,3,.12,-16,oy+1.5,4,0,oy);             // north wall
  box(office,MAT.glass,.12,3,9,-21,oy+1.5,8.5,0,oy);            // west wall
  box(office,MAT.glass,.12,3,3.4,-11,oy+1.5,5.7,0,oy);          // east wall, lower segment
  box(office,MAT.glass,.12,3,3.4,-11,oy+1.5,11.3,0,oy);         // east wall, upper segment (gap = door)
  box(office,MAT.brushed,10,.18,.18,-16,oy+3.05,13); box(office,MAT.brushed,10,.18,.18,-16,oy+3.05,4);
  const mScr=box(office,MAT.screen,2.6,1.5,.08,-20.8,oy+1.8,8.5); mScr.castShadow=false;
  box(office,MAT.darkWood,5.4,.1,1.9,-16,oy+.78,8.5);
  for(let i=0;i<3;i++){ box(office,MAT.black,.5,.5,.5,-18.2+i*2.2,oy+.25,6.9); box(office,MAT.black,.5,.5,.5,-18.2+i*2.2,oy+.25,10.1); }
  // CEO corner office (SE corner)
  box(office,MAT.glass,9,3,.12,18,oy+1.5,-12,0,oy); box(office,MAT.glass,.12,3,8,13.5,oy+1.5,-16,0,oy);
  box(office,MAT.darkWood,2.4,.1,1.1,20,oy+.78,-17); box(office,MAT.wood,3,.9,.6,16,oy+.45,-18.5);
  // breakout / server lounge
  box(office,MAT.wood,4,.9,1, -20,oy+.45,-16); box(office,MAT.black,1.2,2.2,.8,22,oy+1.1,14,0,oy); box(office,MAT.black,1.2,2.2,.8,20.5,oy+1.1,14,0,oy);
  scene.add(office); zones.office={group:office,y:oy,spawn:new THREE.Vector3(0,oy,16),bounds:{minX:-24,maxX:24,minZ:-19,maxZ:19}};
  // ---------- Zone 3: Rooftop terrace (V — visualisation) ----------
  const roof=new THREE.Group(); const ry=baseY['M'];
  const rf=new THREE.Mesh(new THREE.PlaneGeometry(48,38),new THREE.MeshStandardMaterial({color:0xb9ac97,roughness:.9}));
  rf.rotation.x=-Math.PI/2; rf.position.y=ry+.03; rf.receiveShadow=true; roof.add(rf);
  const balMat=MAT.glass;
  box(roof,balMat,48,1.1,.1,0,ry+.55,19); box(roof,balMat,48,1.1,.1,0,ry+.55,-19); box(roof,balMat,.1,1.1,38,24,ry+.55,0); box(roof,balMat,.1,1.1,38,-24,ry+.55,0);
  for(let x=-20;x<=20;x+=8){ box(roof,MAT.green,2.2,.8,1.2,x,ry+.4,16.5); box(roof,MAT.wood,2,.45,.6,x,ry+.22,12); }
  box(roof,MAT.wood,10,.15,4,0,ry+2.6,-8); for(const sx of [-4.5,4.5]) box(roof,MAT.metal,.18,2.6,.18,sx,ry+1.3,-8);
  scene.add(roof); zones.rooftop={group:roof,y:ry,spawn:new THREE.Vector3(0,ry,12),bounds:{minX:-23,maxX:23,minZ:-18,maxZ:18}};
  return zones;
}
