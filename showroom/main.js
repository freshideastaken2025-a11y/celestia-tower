import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { buildTower, buildSurroundings } from './tower.js';
import { buildInteriors } from './interiors.js';
import { Walker } from './walker.js';
import { makeTours, TourPlayer } from './tours.js';
import { initHUD } from './hud.js';
import { BADGE_V } from './data.js';

const canvas=document.getElementById('scene');
const renderer=new THREE.WebGLRenderer({canvas,antialias:true});
renderer.toneMapping=THREE.ACESFilmicToneMapping; renderer.toneMappingExposure=1.12;
renderer.outputColorSpace=THREE.SRGBColorSpace; renderer.shadowMap.enabled=true; renderer.shadowMap.type=THREE.PCFSoftShadowMap;
const scene=new THREE.Scene();
scene.fog=new THREE.Fog(0xe6d7bd,180,420); // golden-hour defaults; applyLighting() below drives every mode
// ---------- lighting switcher: gradient sky + sun / hemi / fog / exposure presets ----------
function makeSky(stops){
  const c=document.createElement('canvas'); c.width=4; c.height=256; const g=c.getContext('2d');
  const gr=g.createLinearGradient(0,0,0,256);
  for(const [o,col] of stops) gr.addColorStop(o,col);
  g.fillStyle=gr; g.fillRect(0,0,4,256);
  const t=new THREE.CanvasTexture(c); t.colorSpace=THREE.SRGBColorSpace; return t;
}
const LIGHTING={
  day:      { sky:[[0,'#5f96d8'],[0.55,'#a8c8e8'],[1,'#e8efe9']], fog:[0xdfe8ee,260,650],
              sun:[0xfff2dd,3.0,[60,120,40]], hemi:[0xcfe5ff,0x77694f,0.85], exposure:1.05 },
  golden:   { sky:[[0,'#33507a'],[0.5,'#8fb0d0'],[0.72,'#e8a58e'],[0.88,'#ffb46b'],[1,'#ffd9a0']], fog:[0xe6d7bd,180,420],
              sun:[0xffb46b,2.7,[-85,46,68]], hemi:[0xffd9a8,0x4a3826,0.55], exposure:1.12 },
  twilight: { sky:[[0,'#0d2142'],[0.45,'#274a75'],[0.75,'#6e4460'],[1,'#e2703a']], fog:[0x2c3a55,170,470],
              sun:[0xff8a4a,1.5,[-95,15,60]], hemi:[0x8fa3cc,0x2e2118,0.35], exposure:1.15 },
};
let skyTexture=null;
function applyLighting(mode){
  const L=LIGHTING[mode]||LIGHTING.golden;
  if(skyTexture) skyTexture.dispose();
  skyTexture=makeSky(L.sky); scene.background=skyTexture;
  scene.fog.color.set(L.fog[0]); scene.fog.near=L.fog[1]; scene.fog.far=L.fog[2];
  sun.color.set(L.sun[0]); sun.intensity=L.sun[1]; sun.position.set(L.sun[2][0],L.sun[2][1],L.sun[2][2]);
  hemi.color.set(L.hemi[0]); hemi.groundColor.set(L.hemi[1]); hemi.intensity=L.hemi[2];
  renderer.toneMappingExposure=L.exposure;
}
// warm golden-hour environment map for glass/metal reflections: gradient sky
// dome (same stops as the golden sky) + one HDR-bright warm sun card placed at
// the sun's direction so the tower glass picks up a low western sun streak.
function makeEnvScene(){
  const es=new THREE.Scene();
  const domeMat=new THREE.ShaderMaterial({ side:THREE.BackSide,
    uniforms:{ top:{value:new THREE.Color(0x33507a)}, mid:{value:new THREE.Color(0x8fb0d0)}, bot:{value:new THREE.Color(0xffc98a)} },
    vertexShader:'varying vec3 vP; void main(){ vP=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
    fragmentShader:'varying vec3 vP; uniform vec3 top; uniform vec3 mid; uniform vec3 bot;'+
      ' void main(){ float h=normalize(vP).y;'+
      ' vec3 c=h>0.12 ? mix(mid,top,smoothstep(0.12,0.65,h)) : mix(bot,mid,smoothstep(-0.08,0.12,h));'+
      ' gl_FragColor=vec4(c,1.0); }' });
  es.add(new THREE.Mesh(new THREE.SphereGeometry(50,32,16),domeMat));
  const sunCard=new THREE.Mesh(new THREE.PlaneGeometry(15,15),new THREE.MeshBasicMaterial());
  sunCard.material.color.setRGB(4.2,2.5,1.25);
  sunCard.position.set(-30,16,24); sunCard.lookAt(0,0,0); es.add(sunCard);
  return es;
}
const pmrem=new THREE.PMREMGenerator(renderer); scene.environment=pmrem.fromScene(makeEnvScene(),0.04).texture;
const camera=new THREE.PerspectiveCamera(55,innerWidth/innerHeight,0.1,1200); camera.position.set(88,18,124);
// post-processing: bloom for the warm emissives (podium glow, lit windows, LED
// bands) + OutputPass for ACES tone mapping / sRGB. Disabled on Low quality.
const composer=new EffectComposer(renderer,new THREE.WebGLRenderTarget(innerWidth,innerHeight,{type:THREE.HalfFloatType,samples:4}));
composer.addPass(new RenderPass(scene,camera));
const bloomPass=new UnrealBloomPass(new THREE.Vector2(innerWidth,innerHeight),0.35,0.6,0.85);
composer.addPass(bloomPass);
composer.addPass(new OutputPass());
const controls=new OrbitControls(camera,canvas); controls.target.set(0,40,0); controls.enableDamping=true; controls.maxPolarAngle=Math.PI*0.52; controls.maxDistance=320;
// golden-hour sun: warm, low from the SW
const sun=new THREE.DirectionalLight(0xffb46b,2.7); sun.position.set(-85,46,68); sun.castShadow=true;
sun.shadow.mapSize.set(2048,2048); sun.shadow.camera.left=-110; sun.shadow.camera.right=110; sun.shadow.camera.top=140; sun.shadow.camera.bottom=-20; sun.shadow.bias=-0.0004;
scene.add(sun); const hemi=new THREE.HemisphereLight(0xffd9a8,0x4a3826,0.55); scene.add(hemi);
const warm=new THREE.PointLight(0xffc98a,120,40,1.8); warm.position.set(0,4,0); scene.add(warm); // lobby glow

const tower=buildTower(scene); buildSurroundings(scene);
const zones=buildInteriors(scene);
const walker=new Walker(camera,canvas,zones);
const tours=makeTours(); const player=new TourPlayer(camera);
// interior visibility: interiors always present but tucked inside tower; hide office/roof groups in exterior orbit unless walking/touring there
function setMode(mode,zoneName){
  const zb=document.getElementById('zoneBadge');
  document.getElementById('walkBar').classList.toggle('hidden',mode!=='walk');
  document.getElementById('joystick').classList.toggle('hidden',!(mode==='walk'&&matchMedia('(pointer:coarse)').matches));
  if(mode==='walk'){ controls.enabled=false; player.stop(); walker.enter(zoneName||'lobby');
    zb.classList.remove('hidden'); zb.innerHTML = zoneName==='rooftop' ? `Rooftop Terrace — <span class="badge v">${BADGE_V}</span> not in official brochure` : `Interior fit-out — <span class="badge v">${BADGE_V}</span>`;
  } else { walker.exit(); controls.enabled=true; zb.classList.add('hidden'); }
}
document.getElementById('walkFab').onclick=()=>setMode('walk','lobby');
document.getElementById('exitWalk').onclick=()=>{ setMode('orbit'); camera.position.set(88,18,124); controls.target.set(0,40,0); };
document.querySelectorAll('[data-walk]').forEach(b=>b.onclick=()=>setMode('walk',b.dataset.walk));
addEventListener('keydown',e=>{ if(e.code==='Escape'&&walker.active) document.getElementById('exitWalk').click(); });
// tours UI
const tb=document.getElementById('tourBtns');
Object.keys(tours).forEach(name=>{ const b=document.createElement('button'); b.textContent=name;
  b.onclick=()=>{ walker.exit(); document.getElementById('walkBar').classList.add('hidden'); controls.enabled=false;
    if(name==='Grand Lobby'||name==='IT Office Floor'||name==='Executive Suite'||name==='Rooftop Terrace'){ /* camera goes inside; tower shell stays, interiors are inside */ }
    player.play(tours[name],()=>{ controls.enabled=true; const p=camera.position; controls.target.set(p.x*0.4,Math.max(10,p.y*0.7),p.z*0.4); }); };
  tb.appendChild(b); });
// HUD
initHUD({ onWalk:(z)=>setMode('walk',z), onFloor:()=>{} });
// quality selector
function applyQuality(q){
  const dpr=devicePixelRatio||1;
  const pr=q==='high'?Math.min(dpr,2):q==='medium'?Math.min(dpr,1.5):1;
  renderer.setPixelRatio(pr);
  renderer.setSize(innerWidth,innerHeight);
  composer.setPixelRatio(pr);
  composer.setSize(innerWidth,innerHeight);
  bloomPass.enabled=q!=='low';
  sun.castShadow=q!=='low'; renderer.shadowMap.enabled=q!=='low';
  scene.traverse(o=>{ if(o.material) o.material.needsUpdate=true; });
}
document.getElementById('quality').onchange=e=>applyQuality(e.target.value); applyQuality('medium');
// lighting switcher (Day / Golden Hour / Twilight) — golden applied at startup, first paint unchanged
document.getElementById('lighting').onchange=e=>applyLighting(e.target.value); applyLighting('golden');
addEventListener('resize',()=>{ camera.aspect=innerWidth/innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth,innerHeight); composer.setSize(innerWidth,innerHeight); });
const clock=new THREE.Clock();
(function animate(){ requestAnimationFrame(animate); const dt=Math.min(clock.getDelta(),0.05), t=clock.elapsedTime;
  tower.update(t); if(player.active) player.update(dt); else if(walker.active) walker.update(dt); else controls.update();
  composer.render(); })();
