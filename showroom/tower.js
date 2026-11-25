import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { FLOORS, FT, floorBaseY } from './data.js';

// ---------- helpers ----------
function mulberry(seed){ return function(){ seed|=0; seed=seed+0x6D2B79F5|0; let t=Math.imul(seed^seed>>>15,1|seed); t=t+Math.imul(t^t>>>7,61|t)^t; return ((t^t>>>14)>>>0)/4294967296; }; }
function canvasTex(w,h,draw,rx=1,ry=1){
  const c=document.createElement('canvas'); c.width=w; c.height=h; draw(c.getContext('2d'),w,h);
  const t=new THREE.CanvasTexture(c); t.wrapS=t.wrapT=THREE.RepeatWrapping; t.repeat.set(rx,ry);
  t.anisotropy=4; t.colorSpace=THREE.SRGBColorSpace; return t;
}
// Footprint: rectangle with ONE rounded corner (SE = world +x,+z, per brochure plans).
// Shape is drawn in (x, -z) space; extruding + rotating -90° about X maps extrusion to +Y.
function footprintGeo(w,d,r,h,curveSegments=28){
  const s=new THREE.Shape(); const hw=w/2, hd=d/2;
  s.moveTo(-hw,-hd);
  s.lineTo(hw-r,-hd);
  s.absarc(hw-r,-hd+r,r,-Math.PI/2,0,false);
  s.lineTo(hw,hd);
  s.lineTo(-hw,hd);
  s.closePath();
  const g=new THREE.ExtrudeGeometry(s,{depth:h,bevelEnabled:false,curveSegments,steps:1});
  g.rotateX(-Math.PI/2);
  return g;
}

// ---------- facade textures ----------
export function diagridTexture(){ // kept for API compatibility (legacy gold diagrid tile)
  return canvasTex(256,256,(g,w,h)=>{
    g.fillStyle='#8a6a3c'; g.fillRect(0,0,w,h);
    g.fillStyle='#2e4453'; g.fillRect(6,6,w-12,h-12);
    g.strokeStyle='#d9a45b'; g.lineWidth=14;
    g.beginPath(); g.moveTo(0,h); g.lineTo(w,0); g.moveTo(0,0); g.lineTo(w,h); g.stroke();
  },10,2);
}
// Tower curtain wall tile: 16 bays x 4 floors = 17.6 m x 17.07 m (large tile so the
// lit-window pattern does not visibly repeat). Uniform silver-blue base, per-pane
// variation <= ±6%, ~8% of panes lit (seeded random) -> reads as one light slab
// with subtle warm sparkle at dusk, like the brochure render. Returns {map, emissive}.
function towerGlassTextures(){
  const W=1024,H=1024, bays=16, floors=4, bw=W/bays, fh=H/floors, rnd=mulberry(2024);
  const lit=[]; for(let i=0;i<bays*floors;i++) lit.push(rnd()<0.08 ? 0.45+rnd()*0.5 : 0);
  const tileW=17.6, tileH=4*14*0.3048; // 16 bays @1.1 m, 4 floors @14 ft
  const map=canvasTex(W,H,(g)=>{
    const grad=g.createLinearGradient(0,0,0,H);
    grad.addColorStop(0,'#bfd9e6'); grad.addColorStop(.5,'#aecadb'); grad.addColorStop(1,'#9fbecd');
    g.fillStyle=grad; g.fillRect(0,0,W,H);
    for(let f=0;f<floors;f++) for(let b=0;b<bays;b++){
      const x=b*bw, y=f*fh, v=(rnd()-0.5)*0.12; // <= ±6% brightness jitter
      g.fillStyle=v>=0?`rgba(255,255,255,${v})`:`rgba(22,42,56,${-v})`; g.fillRect(x+3,y+3,bw-6,fh-6);
      if(lit[f*bays+b]){ g.fillStyle=`rgba(255,201,143,${0.10*lit[f*bays+b]})`; g.fillRect(x+3,y+3,bw-6,fh-6); }
      // faint sky reflection streak
      g.fillStyle='rgba(255,255,255,0.06)'; g.fillRect(x+6,y+3,8,fh-6);
    }
    // floor slab lines
    g.fillStyle='#e8eef1'; for(let f=0;f<=floors;f++) g.fillRect(0,f*fh-2,W,4);
    g.fillStyle='rgba(40,55,66,0.5)'; for(let f=0;f<=floors;f++) g.fillRect(0,f*fh+2,W,2);
    // dense vertical fin / mullion lines at every bay edge
    for(let b=0;b<=bays;b++){ const x=b*bw;
      g.fillStyle='#dfe8ec'; g.fillRect(x-2,0,3,H);
      g.fillStyle='rgba(35,48,58,0.65)'; g.fillRect(x+1,0,2,H); }
  },1/tileW,1/tileH);
  const emissive=canvasTex(W,H,(g)=>{
    g.fillStyle='#000'; g.fillRect(0,0,W,H);
    for(let f=0;f<floors;f++) for(let b=0;b<bays;b++){ const L=lit[f*bays+b]; if(!L) continue;
      g.fillStyle=`rgba(255,201,143,${L})`; g.fillRect(b*bw+5,f*fh+6,bw-10,fh-12); }
  },1/tileW,1/tileH);
  return {map,emissive};
}
export function glassTexture(){ return towerGlassTextures().map; }
// Podium glazed base tile (warm glowing glass behind the diagrid diamonds)
function podiumGlassTextures(){
  const W=512,H=512, bays=8, floors=2, bw=W/bays, fh=H/floors, rnd=mulberry(77);
  const draw=(g,emissiveOnly)=>{
    const grad=g.createLinearGradient(0,0,0,H);
    grad.addColorStop(0,'#5a4030'); grad.addColorStop(.55,'#4a3421'); grad.addColorStop(1,'#382716');
    g.fillStyle=emissiveOnly?'#0d0703':grad; g.fillRect(0,0,W,H);
    for(let f=0;f<floors;f++) for(let b=0;b<bays;b++){
      const x=b*bw, y=f*fh, warm=rnd();
      g.fillStyle=emissiveOnly?`rgba(255,160,75,${0.18+warm*0.25})`:`rgba(255,170,90,${0.05+warm*0.09})`;
      g.fillRect(x+4,y+4,bw-8,fh-8);
      if(!emissiveOnly){ g.fillStyle='rgba(255,240,210,0.07)'; g.fillRect(x+8,y+4,12,fh-8); }
    }
    g.fillStyle=emissiveOnly?'#000':'#2a1c10';
    for(let b=0;b<=bays;b++) g.fillRect(b*bw-2,0,4,H);
    for(let f=0;f<=floors;f++) g.fillRect(0,f*fh-2,W,4);
  };
  return { map:canvasTex(W,H,g=>draw(g,false),1/8.8,1/8.536),
           emissive:canvasTex(W,H,g=>draw(g,true),1/8.8,1/8.536) };
}
// (v5: the faceted pyramid panels were replaced by a true beam lattice — see buildTower)
// Palm: merged bent trunk + merged frond crown (for instancing)
function palmGeometries(){
  const seg=(rt,rb,h)=>new THREE.CylinderGeometry(rt,rb,h,7);
  const s1=seg(0.13,0.20,1.6); s1.translate(0,0.8,0);
  const s2=seg(0.11,0.14,1.6); s2.rotateZ(0.16); s2.translate(0.13,2.35,0);
  const s3=seg(0.08,0.11,1.5); s3.rotateZ(0.34); s3.translate(0.48,3.75,0);
  const trunk=mergeGeometries([s1,s2,s3]);
  const fronds=[];
  for(let k=0;k<8;k++){
    const f=new THREE.PlaneGeometry(0.85,3.4,1,4);
    f.rotateX(-Math.PI/2); f.translate(0,0,1.7); // extends +z, base at origin
    const p=f.attributes.position;
    for(let i=0;i<p.count;i++){ const z=p.getZ(i), t=z/3.4;
      p.setY(i, Math.sin(t*1.9)*0.85 - t*t*0.7 );
      p.setX(i, p.getX(i)*(1-0.6*t)); }
    f.rotateY(k*Math.PI/4 + (k%2)*0.18);
    fronds.push(f);
  }
  const crown=mergeGeometries(fronds); crown.computeVertexNormals(); crown.translate(0.73,4.4,0);
  return {trunk,crown};
}

// ---------- tower + podium ----------
export function buildTower(scene){
  const group=new THREE.Group(); const {map:baseY,total}=floorBaseY();
  const dims = sqft => sqft>28000 ? [56,47] : sqft>26000 ? [54.5,45.5] : [52.5,43.5];
  const [pw,pd]=dims(28283), [tw6,td6]=dims(27266), [tw,td]=dims(25979);
  const podiumH=baseY['6'], upperY=baseY['7'], upperH=baseY['M']-upperY;

  const glass=towerGlassTextures();
  const glassMat=new THREE.MeshPhysicalMaterial({ map:glass.map, emissiveMap:glass.emissive, emissive:0xffc98f, emissiveIntensity:0.35,
    color:0x2a4a68, metalness:0.9, roughness:0.10, envMapIntensity:0.75 }); // deep blue curtain glass: warm sky reflects as a streak, no white wash
  const podGlass=podiumGlassTextures();
  const podiumBaseMat=new THREE.MeshStandardMaterial({ map:podGlass.map, emissiveMap:podGlass.emissive, emissive:0xffa050, emissiveIntensity:0.35,
    color:0xffffff, metalness:0.3, roughness:0.5, envMapIntensity:0.9 });
  const silverMat=new THREE.MeshStandardMaterial({color:0xe9e7e2,metalness:0.65,roughness:0.32,envMapIntensity:1.1});
  const darkPlinthMat=new THREE.MeshStandardMaterial({color:0x4a3b28,metalness:0.5,roughness:0.6});

  // --- floor-wise stacking (brochure Building Dynamics table): EVERY floor is its
  // own extruded band, sized from its own plate via dims(), placed at its own
  // cumulative base height from floorBaseY, with a thin protruding slab line at
  // its top edge so all 20 floor lines read individually. Podium floors G-5
  // (radius 6) use the warm podium glass; tower floors 6-19 (radius 8) the tower
  // glass. Floor 10's band is naturally taller (19.5 ft in data.js).
  // Podium outline note: the brochure ground plan's angled SW south edge is
  // SKIPPED — footprintGeo has no custom-point variant; the nest shell
  // below follows this same rounded-rect outline, so alignment is kept.
  const slabMat=new THREE.MeshStandardMaterial({color:0x3a2c1c,metalness:0.7,roughness:0.45});
  for(const f of FLOORS){
    if(f.level<0 || f.id==='M') continue;
    const [w,d]=dims(f.plate), h=f.heightFt*FT, y=baseY[f.id], r=f.level<=5?6:8;
    const bandGeo=footprintGeo(w,d,r,h);
    // ExtrudeGeometry side-wall V runs 0..h within each extrusion; shift it by the
    // floor's base height so the facade texture flows continuously up the whole
    // building, exactly as it did on the old single-block tiers (v4 look kept).
    const uv=bandGeo.attributes.uv; for(let i=0;i<uv.count;i++) uv.setY(i,uv.getY(i)-y);
    const band=new THREE.Mesh(bandGeo, f.level<=5?podiumBaseMat:glassMat);
    band.position.y=y; band.castShadow=true; band.receiveShadow=true; band.userData.floorId=f.id; group.add(band);
    const slab=new THREE.Mesh(footprintGeo(w+0.3,d+0.3,r+0.15,0.28),slabMat);
    slab.position.y=y+h-0.28; slab.castShadow=true; slab.receiveShadow=true; group.add(slab);
  }
  const plinth=new THREE.Mesh(footprintGeo(pw+0.3,pd+0.3,6.15,0.5),darkPlinthMat);
  plinth.position.y=0.02; group.add(plinth);
  // podium roof slab + white/silver coping band on top edge
  const roofSlab=new THREE.Mesh(footprintGeo(pw+0.5,pd+0.5,6.25,0.22),new THREE.MeshStandardMaterial({color:0x7d8471,roughness:1}));
  roofSlab.position.y=podiumH-0.06; roofSlab.receiveShadow=true; group.add(roofSlab);
  const coping=new THREE.Mesh(footprintGeo(pw+0.9,pd+0.9,6.45,0.5),silverMat);
  coping.position.y=podiumH-0.14; coping.castShadow=true; group.add(coping);

  // --- tower cap (the floor bands themselves are built floor-wise above) ---
  const towerCap=new THREE.Mesh(footprintGeo(tw+0.6,td+0.6,8.3,0.45),silverMat);
  towerCap.position.y=baseY['M']-0.08; group.add(towerCap);
  // --- sloped crown (refs): glass prism on the NW (-x) end whose top slopes down
  // ~2.5 m over the last ~18 m of the slab, + lit crown strip on the rounded-corner end ---
  { const ws=new THREE.Shape();
    ws.moveTo(-tw/2,0); ws.lineTo(-tw/2+18,0); ws.lineTo(-tw/2+18,2.8); ws.lineTo(-tw/2,0.3); ws.closePath();
    const wedge=new THREE.Mesh(new THREE.ExtrudeGeometry(ws,{depth:td-0.6,bevelEnabled:false}),glassMat);
    wedge.position.set(0,baseY['M']+0.2,-(td-0.6)/2); wedge.castShadow=true; group.add(wedge); }
  const crownStripMat=new THREE.MeshStandardMaterial({color:0x59462a,emissive:0xffb46b,emissiveIntensity:0.8,roughness:0.5,metalness:0.3});
  { const arcGeo=new THREE.TorusGeometry(8.05,0.11,8,32,Math.PI/2); arcGeo.rotateX(Math.PI/2); // arc spans the SE quadrant
    const arc=new THREE.Mesh(arcGeo,crownStripMat); arc.position.set(tw/2-8, baseY['M']+0.45, td/2-8); group.add(arc);
    const stripS=new THREE.Mesh(new THREE.BoxGeometry(7,0.16,0.16),crownStripMat);
    stripS.position.set(tw/2-8-3.5, baseY['M']+0.45, td/2); group.add(stripS);
    const stripE=new THREE.Mesh(new THREE.BoxGeometry(0.16,0.16,7),crownStripMat);
    stripE.position.set(tw/2, baseY['M']+0.45, td/2-8-3.5); group.add(stripE); }
  // M / mechanical block
  const mBlock=new THREE.Mesh(new THREE.BoxGeometry(22,4.27,18),
    new THREE.MeshStandardMaterial({color:0x707c84,metalness:0.7,roughness:0.5}));
  mBlock.position.y=baseY['M']+2.1; mBlock.castShadow=true; group.add(mBlock);

  // --- real instanced vertical fins on the two long faces (stop before the rounded corner) ---
  const finGeo=new THREE.BoxGeometry(0.14,1,0.45); // ~1.5x thicker/deeper so the gold rhythm reads at distance
  const finMat=new THREE.MeshStandardMaterial({color:0xc9a227,metalness:1.0,roughness:0.35,envMapIntensity:1.2}); // deeper, more saturated champagne-gold (refs)
  const finXf=[];
  for(const [w,d,y0,h] of [[tw6,td6,baseY['6'],baseY['7']-baseY['6']],[tw,td,upperY,upperH]]){
    for(let x=-w/2+0.4;x<=w/2-8-0.3;x+=0.9) finXf.push([x,y0+h/2, d/2+0.22,h]);   // south face, denser spacing
    for(let x=-w/2+0.4;x<=w/2-0.4;x+=0.9) finXf.push([x,y0+h/2,-d/2-0.22,h]);     // north face (full width)
  }
  const fins=new THREE.InstancedMesh(finGeo,finMat,finXf.length);
  { const d4=new THREE.Object3D();
    finXf.forEach((fp,i)=>{ d4.position.set(fp[0],fp[1],fp[2]); d4.scale.set(1,fp[3],1); d4.rotation.set(0,0,0); d4.updateMatrix(); fins.setMatrixAt(i,d4.matrix); });
    fins.instanceMatrix.needsUpdate=true; fins.castShadow=true; group.add(fins); }

  // --- subtle horizontal LED bands (dusk ref) at the floors 5/10/15 boundaries ---
  // Flat faces only; the south and east strips stop short of the rounded SE corner.
  const ledMat=new THREE.MeshStandardMaterial({color:0x4a3d26,emissive:0xffd9a0,emissiveIntensity:0.5,roughness:0.5});
  for(const [by,bw,bd] of [[baseY['6']+0.12,tw6,td6],[baseY['11'],tw,td],[baseY['16'],tw,td]]){
    const sB=new THREE.Mesh(new THREE.BoxGeometry(bw-8,0.18,0.07),ledMat); sB.position.set(-4,by,bd/2+0.07); group.add(sB);
    const nB=new THREE.Mesh(new THREE.BoxGeometry(bw,0.18,0.07),ledMat); nB.position.set(0,by,-bd/2-0.07); group.add(nB);
    const eB=new THREE.Mesh(new THREE.BoxGeometry(0.07,0.18,bd-8),ledMat); eB.position.set(bw/2+0.07,by,-4); group.add(eB);
    const wB=new THREE.Mesh(new THREE.BoxGeometry(0.07,0.18,bd),ledMat); wB.position.set(-bw/2-0.07,by,0); group.add(wB);
  }

  // --- podium NEST shell (Blender v11 design): one merged BufferGeometry of box
  // beams woven around the podium outline — two diagonal strand families + 5
  // horizontal rings. The shell follows the footprint perimeter, bulges
  // mid-height (radial scale profile), pinches at the ground, and its bottom
  // edge lifts in a scallop over the SOUTH entrance (+z, where the ribbon is).
  function podiumPerimeter(w,d,r,step=1.5){
    const hw=w/2, hd=d/2, pts=[];
    const seg=(x1,z1,x2,z2)=>{ const L=Math.hypot(x2-x1,z2-z1), n=Math.max(1,Math.round(L/step));
      for(let k=0;k<n;k++) pts.push([x1+(x2-x1)*k/n, z1+(z2-z1)*k/n]); };
    seg(-hw,hd, hw-r,hd);                        // south edge (+z, entrance side)
    const cx=hw-r, cz=hd-r, na=Math.max(4,Math.round(r*Math.PI/2/step));
    for(let k=0;k<na;k++){ const phi=Math.PI/2-(k/na)*(Math.PI/2);
      pts.push([cx+r*Math.cos(phi), cz+r*Math.sin(phi)]); } // SE rounded corner
    seg(hw,hd-r, hw,-hd);                        // east edge
    seg(hw,-hd, -hw,-hd);                        // north edge
    seg(-hw,-hd, -hw,hd);                        // west edge
    // v13 blob modulation (design drawings): radius waves by angle -> organic
    // peanut plan instead of a plain rounded rectangle
    return pts.map(([x,z])=>{ const th=Math.atan2(z,x);
      const m=1+0.085*Math.sin(2*th+0.6)+0.05*Math.sin(3*th+2.0); return [x*m,z*m]; });
  }
  const PERIM=podiumPerimeter(pw,pd,6,1.5), NP=PERIM.length;
  const NEST_PTS=[[0,1.03],[0.3,1.10],[0.55,1.15],[0.8,1.09],[1,1.04]]; // radial scale by height fraction
  function nestScale(t){
    for(let i=0;i<NEST_PTS.length-1;i++){ const [t0,s0]=NEST_PTS[i], [t1,s1]=NEST_PTS[i+1];
      if(t>=t0&&t<=t1){ const f=(t-t0)/Math.max(t1-t0,1e-6); return s0+(s1-s0)*f; } }
    return NEST_PTS[NEST_PTS.length-1][1];
  }
  function perimAt(idxF){
    const fl=Math.floor(idxF), i0=((fl%NP)+NP)%NP, i1=(i0+1)%NP, f=idxF-fl;
    return [PERIM[i0][0]+(PERIM[i1][0]-PERIM[i0][0])*f, PERIM[i0][1]+(PERIM[i1][1]-PERIM[i0][1])*f];
  }
  function nestPoint(idxF,t,y){
    const [x,z]=perimAt(idxF), sc=nestScale(t);
    const wob=1+0.02*Math.sin(3*Math.atan2(z,x)+0.7); // gentle organic wobble
    return new THREE.Vector3(x*sc*wob, y, z*sc*wob);
  }
  function nestZBottom(idxF){ // bottom edge: 0.5 m at the sides, lifting +5.2 m at the south centre
    const [,z]=perimAt(idxF), d=Math.max(0,Math.min(1,z/(pd/2)));
    return 0.5+5.2*d*d;
  }
  function nestRimY(idxF){ // v13 wavy rim (drawings): strand tops undulate around podiumH
    const [x,z]=perimAt(idxF), th=Math.atan2(z,x);
    return podiumH + 1.7*Math.sin(2*th+0.6) + 0.8*Math.sin(3*th+2.0);
  }
  const nestGeos=[], NEST_Z=new THREE.Vector3(0,0,1);
  function nestBeam(p1,p2,w,dep){
    const dir=new THREE.Vector3().subVectors(p2,p1), len=dir.length();
    if(len<0.05) return;
    const g=new THREE.BoxGeometry(w,dep,len);
    g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(NEST_Z, dir.normalize()));
    const mid=new THREE.Vector3().addVectors(p1,p2).multiplyScalar(0.5);
    g.translate(mid.x,mid.y,mid.z); nestGeos.push(g);
  }
  for(const fam of [1,-1]){ // two diagonal strand families, starts every ~2 samples (~3 m)
    for(let start=0; start<NP; start+=2){
      const zb=nestZBottom(start); let prev=null;
      const topY=nestRimY(start + fam*NP*0.09 + fam*1.5*Math.sin(5+start)); // strand top lands on the wavy rim
      for(let k=0;k<=8;k++){ // 8 segments per strand
        const frac=k/8, y=zb+frac*(topY-zb);
        const idx=start + fam*frac*NP*0.09 + fam*1.5*Math.sin(frac*5+start); // drift +-9% of perimeter + sine jitter
        const pt=nestPoint(idx, y/podiumH, y);
        if(prev) nestBeam(prev,pt,0.43,0.26);
        prev=pt;
      }
    }
  }
  for(const t of [0.16,0.36,0.56,0.76,0.95]){ // horizontal rings following the scaled outline
    const y=t*podiumH; let prev=null;
    for(let i=0;i<=NP;i++){ const ii=i%NP;
      if(y<nestZBottom(ii)+0.3){ prev=null; continue; } // ring stays above the scalloped bottom edge
      const pt=nestPoint(ii,t,y);
      if(prev) nestBeam(prev,pt,0.36,0.22);
      prev=pt;
    }
  }
  const nestGeo=mergeGeometries(nestGeos); nestGeo.computeVertexNormals();
  nestGeos.forEach(g=>g.dispose());
  const nest=new THREE.Mesh(nestGeo, new THREE.MeshStandardMaterial({
    color:0x8a6844, metalness:0.7, roughness:0.38, emissive:0xffb877, emissiveIntensity:0.04, envMapIntensity:1.0 }));
  nest.castShadow=true; nest.receiveShadow=true; group.add(nest);
  // --- garden deck: footprint scaled 1.045 at podium top, under the tree ring/coping ---
  const deck=new THREE.Mesh(footprintGeo(pw*1.045,pd*1.045,6*1.045,0.3),
    new THREE.MeshStandardMaterial({color:0x46532f,roughness:1,metalness:0}));
  deck.position.y=podiumH-0.02; deck.castShadow=true; deck.receiveShadow=true; group.add(deck);

  // --- entrance ribbon: touches ground, arches over entrance, sweeps diagonally, small east arch ---
  const ribbonPts=[[-26,0.1,25.2],[-20,2.8,25.8],[-13,6.8,26.2],[-5,9.0,26.4],[2,7.6,26.2],[8,4.6,25.9],
    [13,2.0,25.7],[16.5,1.0,25.7],[19.5,3.4,25.7],[22,5.2,25.7],[24.5,3.2,25.4],[27,0.1,25.0]]
    .map(p=>new THREE.Vector3(...p));
  const ribbonCurve=new THREE.CatmullRomCurve3(ribbonPts);
  const ribbonGeo=new THREE.TubeGeometry(ribbonCurve,90,0.85,14,false);
  { const p=ribbonGeo.attributes.position; // flatten cross-section in z -> broad band, not pipe
    for(let i=0;i<p.count;i++) p.setZ(i, 25.7+(p.getZ(i)-25.7)*0.30);
    ribbonGeo.computeVertexNormals(); }
  const ribbon=new THREE.Mesh(ribbonGeo,new THREE.MeshPhysicalMaterial({color:0xf4f2ec,roughness:0.25,metalness:0.05,clearcoat:0.7,clearcoatRoughness:0.3,envMapIntensity:1.1}));
  ribbon.castShadow=true; group.add(ribbon);
  const entranceGlow=new THREE.PointLight(0xffb46b,260,48,1.8); entranceGlow.position.set(0,5,29); group.add(entranceGlow);

  // --- palms + shrubs: podium-roof ring around tower base + plaza ---
  const {trunk,crown}=palmGeometries();
  const trunkMat=new THREE.MeshStandardMaterial({color:0x7a5a38,roughness:1});
  const crownMat=new THREE.MeshStandardMaterial({color:0x2e6b34,roughness:1,side:THREE.DoubleSide});
  const roofSpots=[];
  // podium-roof ring: TWO staggered rows riding the coping band -> lush, like the render
  const ringY=podiumH+0.34; // coping top surface
  for(let x=-25;x<=25;x+=3.6){ roofSpots.push([x,ringY,pd/2+0.28]); roofSpots.push([x+1.8,ringY,-(pd/2+0.28)]); }
  for(let x=-23.2;x<=23.2;x+=3.6){ roofSpots.push([x+1.8,ringY,pd/2-0.55]); roofSpots.push([x,ringY,-(pd/2-0.55)]); }
  for(let z=-19;z<=19;z+=3.6){ roofSpots.push([pw/2+0.28,ringY,z]); roofSpots.push([-(pw/2+0.28),ringY,z+1.8]); }
  for(let z=-17.2;z<=17.2;z+=3.6){ roofSpots.push([pw/2-0.55,ringY,z+1.8]); roofSpots.push([-(pw/2-0.55),ringY,z]); }
  roofSpots.push([pw/2-2.2,ringY,pd/2-2.2],[pw/2-4.6,ringY,pd/2-1.1]); // SE corner cluster
  const plazaSpots=[[-14,30],[-10,28.5],[10,28.5],[14,30],[-22,33],[22,33],[-30,40],[30,40],
    [-26,36],[26,36],[-20,42],[20,42],[-34,34],[34,34],[-12,42],[12,42],[-26,28.5],[26,28.5]].map(pp=>[pp[0],0,pp[1]]);
  // refs: the podium-roof band is a LUSH LEAFY canopy with palms mixed in (~60% leafy / 40% palm)
  const palmSpots=[...plazaSpots], leafySpots=[];
  { const splitRnd=mulberry(14);
    for(const sp of roofSpots) (splitRnd()<0.40?palmSpots:leafySpots).push(sp); }
  const trunks=new THREE.InstancedMesh(trunk,trunkMat,palmSpots.length);
  const crowns=new THREE.InstancedMesh(crown,crownMat,palmSpots.length);
  { const d4=new THREE.Object3D(), rnd=mulberry(9);
    palmSpots.forEach((sp,i)=>{ const s=(0.85+rnd()*0.4)*1.55; // ~1.7x the v2 scale
      d4.position.set(sp[0],sp[1],sp[2]); d4.rotation.set(0,rnd()*Math.PI*2,0); d4.scale.set(s,s,s); d4.updateMatrix();
      trunks.setMatrixAt(i,d4.matrix); crowns.setMatrixAt(i,d4.matrix); });
    trunks.instanceMatrix.needsUpdate=true; crowns.instanceMatrix.needsUpdate=true;
    trunks.castShadow=true; crowns.castShadow=true; group.add(trunks,crowns); }
  // leafy canopy trees: trunk + 3 overlapping foliage spheres, rich green variation
  const leafTrunkGeo=new THREE.CylinderGeometry(0.11,0.19,2.3,6); leafTrunkGeo.translate(0,1.15,0);
  const leafBall=(r,x,y,z)=>{ const s=new THREE.SphereGeometry(r,8,6); s.translate(x,y,z); return s; };
  const leafCanopyGeo=mergeGeometries([leafBall(1.6,0,3.75,0),leafBall(1.15,1.25,2.95,0.4),leafBall(1.1,-1.2,3.0,-0.35),leafBall(0.95,0.3,4.4,-0.2)]);
  const leafTrunkMat=new THREE.MeshStandardMaterial({color:0x6e5133,roughness:1});
  const leafCanopyMat=new THREE.MeshStandardMaterial({color:0xffffff,roughness:1});
  const leafTrunks=new THREE.InstancedMesh(leafTrunkGeo,leafTrunkMat,leafySpots.length);
  const leafCanopies=new THREE.InstancedMesh(leafCanopyGeo,leafCanopyMat,leafySpots.length);
  { const d4=new THREE.Object3D(), rnd=mulberry(21),
      gA=new THREE.Color(0x35682e), gB=new THREE.Color(0x4a7d33), tmpC=new THREE.Color();
    leafySpots.forEach((sp,i)=>{ const s=0.8+rnd()*0.55; // canopy tops land ~4.2-6.9 m, varied like real planting
      d4.position.set(sp[0],sp[1],sp[2]); d4.rotation.set(0,rnd()*Math.PI*2,0); d4.scale.set(s,s*(0.92+rnd()*0.25),s); d4.updateMatrix();
      leafTrunks.setMatrixAt(i,d4.matrix); leafCanopies.setMatrixAt(i,d4.matrix);
      tmpC.lerpColors(gA,gB,rnd()); leafCanopies.setColorAt(i,tmpC); });
    leafTrunks.instanceMatrix.needsUpdate=true; leafCanopies.instanceMatrix.needsUpdate=true;
    if(leafCanopies.instanceColor) leafCanopies.instanceColor.needsUpdate=true;
    leafTrunks.castShadow=true; leafCanopies.castShadow=true; group.add(leafTrunks,leafCanopies); }
  const shrubGeo=new THREE.SphereGeometry(0.7,7,6);
  const shrubMat=new THREE.MeshStandardMaterial({color:0x39543a,roughness:1});
  const shrubSpots=[];
  for(let x=-23;x<=23;x+=3.6){ shrubSpots.push([x+0.9,ringY,pd/2-0.15]); shrubSpots.push([x+0.9,ringY,-(pd/2-0.15)]); }
  for(const pp of [[-6,27.6],[6,27.6],[-18,31],[18,31],[0,38.5]]) shrubSpots.push([pp[0],0,pp[1]]);
  const shrubs=new THREE.InstancedMesh(shrubGeo,shrubMat,shrubSpots.length);
  { const d4=new THREE.Object3D(), rnd=mulberry(31);
    shrubSpots.forEach((sp,i)=>{ const s=0.8+rnd()*0.7;
      d4.position.set(sp[0],sp[1]+0.3,sp[2]); d4.scale.set(s,s*0.55,s); d4.rotation.set(0,rnd()*3,0); d4.updateMatrix(); shrubs.setMatrixAt(i,d4.matrix); });
    shrubs.instanceMatrix.needsUpdate=true; group.add(shrubs); }

  // --- media façade: subtle animated vertical light band on the east edge ---
  const mediaCanvas=document.createElement('canvas'); mediaCanvas.width=64; mediaCanvas.height=512;
  const mediaCtx=mediaCanvas.getContext('2d');
  const mediaTex=new THREE.CanvasTexture(mediaCanvas); mediaTex.colorSpace=THREE.SRGBColorSpace;
  const mediaMesh=new THREE.Mesh(new THREE.PlaneGeometry(1.3,upperH),
    new THREE.MeshBasicMaterial({map:mediaTex}));
  mediaMesh.position.set(tw/2+0.35, upperY+upperH/2, 8); mediaMesh.rotation.y=Math.PI/2; group.add(mediaMesh);
  let mediaLast=-1;

  scene.add(group);
  return { group, baseY, totalHeight: total, mediaCtx, mediaTex,
    update(t){
      ledMat.emissiveIntensity=0.45+0.15*Math.sin(t*0.8); // gentle LED band breathing
      if(t-mediaLast<0.12) return; mediaLast=t; // throttled redraw, subtle drift
      const g=mediaCtx; g.fillStyle='#0d1526'; g.fillRect(0,0,64,512);
      for(let i=0;i<9;i++){ const y=((i*72 + t*22)%580)-50;
        g.fillStyle=`hsl(${205+i*7} 55% ${26+((i*13)%14)}%)`; g.fillRect(8,y,48,30); }
      g.fillStyle='hsl(32 75% 42%)'; g.fillRect(8,((t*22)%580)-50,48,16);
      g.fillStyle='rgba(220,235,245,0.85)'; g.font='bold 12px sans-serif';
      g.save(); g.translate(42,256); g.rotate(-Math.PI/2); g.textAlign='center'; g.fillText('CELESTIA · NSIT CITY',0,0); g.restore();
      mediaTex.needsUpdate=true;
    }};
}

// ---------- surroundings ----------
export function buildSurroundings(scene){
  const g=new THREE.Group();
  // far ground: muted urban grey-green with soft tonal patches + a faint street
  // grid (canvas tile edges line up into continuous streets when repeated)
  const groundTex=canvasTex(512,512,(c,w,h)=>{
    c.fillStyle='#5c6058'; c.fillRect(0,0,w,h);
    const rnd=mulberry(3);
    for(let i=0;i<60;i++){ c.fillStyle=rnd()<0.5?'rgba(0,0,0,0.05)':'rgba(255,255,255,0.04)';
      c.beginPath(); c.ellipse(rnd()*w,rnd()*h,20+rnd()*70,14+rnd()*50,rnd()*3,0,7); c.fill(); }
    c.fillStyle='rgba(20,22,20,0.16)';
    c.fillRect(0,0,w,9); c.fillRect(0,0,9,h); c.fillRect(0,h/2-4,w,8); c.fillRect(w/2-4,0,8,h);
  },8,8);
  const ground=new THREE.Mesh(new THREE.PlaneGeometry(600,600),new THREE.MeshStandardMaterial({map:groundTex,roughness:1,envMapIntensity:0.3}));
  ground.rotation.x=-Math.PI/2; ground.position.y=-0.05; ground.receiveShadow=true; g.add(ground);
  // wet-look boulevard (canvas asphalt with lane dashes)
  const roadTex=canvasTex(256,256,(c,w,h)=>{
    c.fillStyle='#33363b'; c.fillRect(0,0,w,h);
    const rnd=mulberry(5); for(let i=0;i<900;i++){ c.fillStyle=`rgba(255,255,255,${rnd()*0.05})`; c.fillRect(rnd()*w,rnd()*h,2,2); }
    c.fillStyle='#e8e4da'; c.fillRect(0,h/2-3,120,6); // dash (gap from tiling)
    c.fillStyle='rgba(232,228,218,0.5)'; c.fillRect(0,14,w,3); c.fillRect(0,h-17,w,3);
  },16,1);
  const road=new THREE.Mesh(new THREE.PlaneGeometry(600,18),
    new THREE.MeshStandardMaterial({map:roadTex,color:0x878d93,roughness:0.28,metalness:0.05,envMapIntensity:0.85}));
  road.rotation.x=-Math.PI/2; road.position.set(0,0.01,48); road.receiveShadow=true; g.add(road);
  // light stone plaza + entrance forecourt / drop-off
  const plazaTex=canvasTex(256,256,(c,w,h)=>{
    c.fillStyle='#d9d2c1'; c.fillRect(0,0,w,h);
    const rnd=mulberry(11); for(let i=0;i<500;i++){ c.fillStyle=`rgba(120,105,80,${rnd()*0.08})`; c.fillRect(rnd()*w,rnd()*h,3,3); }
    c.strokeStyle='#b3a98f'; c.lineWidth=3; c.strokeRect(0,0,w,h); c.beginPath(); c.moveTo(w/2,0); c.lineTo(w/2,h); c.moveTo(0,h/2); c.lineTo(w,h/2); c.stroke();
  },9,3);
  const plazaMat=new THREE.MeshStandardMaterial({map:plazaTex,roughness:0.45,envMapIntensity:0.8});
  const plaza=new THREE.Mesh(new THREE.PlaneGeometry(76,24),plazaMat);
  plaza.rotation.x=-Math.PI/2; plaza.position.set(0,0.02,35); plaza.receiveShadow=true; g.add(plaza);
  const forecourt=new THREE.Mesh(new THREE.PlaneGeometry(64,7.5),new THREE.MeshStandardMaterial({color:0xbfb298,roughness:0.5,envMapIntensity:0.6}));
  forecourt.rotation.x=-Math.PI/2; forecourt.position.set(0,0.025,27); forecourt.receiveShadow=true; g.add(forecourt);
  // context buildings, warmed with a lit-window texture
  const ctxTex=canvasTex(128,256,(c,w,h)=>{
    c.fillStyle='#a79b88'; c.fillRect(0,0,w,h);
    const rnd=mulberry(23);
    for(let y=8;y<h-8;y+=16) for(let x=8;x<w-8;x+=16){
      c.fillStyle=rnd()<0.22?'rgba(255,180,105,0.85)':'rgba(38,48,58,0.75)'; c.fillRect(x,y,9,10); }
  },2,3);
  const ctxMat=new THREE.MeshStandardMaterial({map:ctxTex,roughness:0.8});
  const ctxMat2=new THREE.MeshStandardMaterial({map:ctxTex,color:0xb9c0c4,roughness:0.8});
  // blue-grey glass variant so the context does not read as one repeated warm box
  const ctxTexGlass=canvasTex(128,256,(c,w,h)=>{
    c.fillStyle='#6e7f8d'; c.fillRect(0,0,w,h);
    const rnd=mulberry(29);
    for(let y=8;y<h-8;y+=16) for(let x=8;x<w-8;x+=16){
      c.fillStyle=rnd()<0.18?'rgba(255,180,105,0.85)':'rgba(24,34,46,0.8)'; c.fillRect(x,y,9,10); }
  },2,3);
  const ctxGlassMat=new THREE.MeshStandardMaterial({map:ctxTexGlass,metalness:0.35,roughness:0.5,envMapIntensity:0.7});
  const ctxRnd=mulberry(7); // seeded height jitter 0.75x-1.35x for a less uniform skyline
  [[-90,-20,30,18,22],[95,-35,26,26,18],[-80,55,34,14,20],[90,60,28,20,16],[0,-85,50,22,26],[-120,-70,24,30,14],[120,-80,24,24,20]].forEach((b,i)=>{
    const bh=b[4]*(0.75+ctxRnd()*0.6);
    const m=new THREE.Mesh(new THREE.BoxGeometry(b[2],bh,b[3]), i%3===2?ctxGlassMat:(i%2?ctxMat:ctxMat2)); m.position.set(b[0],bh/2,b[1]); m.castShadow=true; g.add(m); });
  // simple cars: white SUV on the boulevard, dark + red sedans at the drop-off
  function car(color,x,z,rotY,suv=false){
    const carG=new THREE.Group();
    const bodyMat=new THREE.MeshStandardMaterial({color,metalness:0.6,roughness:0.35,envMapIntensity:1.1});
    const body=new THREE.Mesh(new THREE.BoxGeometry(4.4,suv?0.75:0.55,1.8),bodyMat); body.position.y=suv?0.62:0.52; body.castShadow=true; carG.add(body);
    const cabin=new THREE.Mesh(new THREE.BoxGeometry(2.3,suv?0.62:0.48,1.66),
      new THREE.MeshStandardMaterial({color:0x1c2833,metalness:0.8,roughness:0.15,envMapIntensity:1.3}));
    cabin.position.set(-0.2,suv?1.28:1.02,0); carG.add(cabin);
    const wheelG=new THREE.CylinderGeometry(0.34,0.34,0.22,10); wheelG.rotateX(Math.PI/2);
    const wheelM=new THREE.MeshStandardMaterial({color:0x14161a,roughness:0.9});
    for(const [wx,wz] of [[-1.5,0.85],[1.5,0.85],[-1.5,-0.85],[1.5,-0.85]]){
      const wh=new THREE.Mesh(wheelG,wheelM); wh.position.set(wx,0.34,wz); carG.add(wh); }
    carG.position.set(x,0,z); carG.rotation.y=rotY; g.add(carG);
  }
  car(0xf2f3f4, 17, 52.5, 0.02, true);
  car(0x23272c, -6, 33.5, Math.PI, false);
  car(0x8e2323, 7, 34.5, Math.PI, false);
  // boulevard trees: trunk + 3 foliage spheres each, instanced, with per-tree
  // scale (0.8-1.4) / rotation variety and two foliage tones (no more lollipops)
  const trunkG=new THREE.CylinderGeometry(0.14,0.2,3,6), trunkM=new THREE.MeshStandardMaterial({color:0x6e5133});
  const leafG=new THREE.SphereGeometry(1,8,6), leafM=new THREE.MeshStandardMaterial({color:0xffffff,roughness:1});
  const pos=[]; for(let x=-140;x<=140;x+=14){ if(Math.abs(x)>20) pos.push([x,38]); pos.push([x,58]); }
  const trunks=new THREE.InstancedMesh(trunkG,trunkM,pos.length);
  const leaves=new THREE.InstancedMesh(leafG,leafM,pos.length*4);
  const d4=new THREE.Object3D(); const blob=[[0,4.7,0,1.8],[1.4,3.8,0.5,1.35],[-1.3,3.9,-0.45,1.3],[0.3,5.35,-0.55,1.0]]; // wider-spread 4-blob cluster, no single ball
  const bRnd=mulberry(41), tA=new THREE.Color(0x3e6e35), tB=new THREE.Color(0x5c8a47), tmpC=new THREE.Color();
  pos.forEach((pp,i)=>{ const s=0.8+bRnd()*0.6, tone=bRnd();
    d4.rotation.set(0,bRnd()*Math.PI*2,0); d4.scale.set(s,s,s); d4.position.set(pp[0],1.5*s,pp[1]); d4.updateMatrix(); trunks.setMatrixAt(i,d4.matrix);
    blob.forEach((b,j)=>{ d4.position.set(pp[0]+b[0]*s,b[1]*s,pp[1]+b[2]*s); const bs=b[3]*s; d4.scale.set(bs,bs*0.88,bs); d4.updateMatrix(); leaves.setMatrixAt(i*4+j,d4.matrix);
      tmpC.lerpColors(tA,tB,Math.min(1,Math.max(0,tone+(bRnd()-0.5)*0.15))); leaves.setColorAt(i*4+j,tmpC); }); });
  trunks.instanceMatrix.needsUpdate=true; leaves.instanceMatrix.needsUpdate=true;
  if(leaves.instanceColor) leaves.instanceColor.needsUpdate=true;
  g.add(trunks,leaves);
  scene.add(g); return g;
}
