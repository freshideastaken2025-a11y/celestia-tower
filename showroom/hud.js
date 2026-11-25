import { FLOORS, PROJECT, PAYMENT, paymentBreakdown, fmt, fmtN, BADGE_A, BADGE_V } from './data.js';
const $=s=>document.querySelector(s);
const badge=(b)=>`<span class="badge ${b.startsWith('Official')?'a':'v'}">${b}</span>`;
export function initHUD({onFloor,onWalk}){
  // Info panel
  $('#infoBody').innerHTML=`
    <h3>${PROJECT.name}</h3>${badge(BADGE_A)}
    <p><b>Location:</b> ${PROJECT.location}</p>
    <p><b>Developer:</b> ${PROJECT.developer}</p>
    <p><b>Plot:</b> ${PROJECT.plot}</p>
    <p><b>Status:</b> ${PROJECT.status}</p>
    <p><b>STZA:</b> ${PROJECT.stza}</p>
    <p><b>Contact:</b> ${PROJECT.contact}</p>
    <p><b>Total saleable:</b> ${fmtN(PROJECT.totals.saleable)} sqft · <b>Height:</b> ${PROJECT.totals.heightFt} ft · <b>Grand total built-up:</b> ${fmtN(PROJECT.totals.grandTotal)} sqft</p>
    <h4>Amenities ${badge(BADGE_A)}</h4><ul>${PROJECT.amenities.map(a=>`<li>${a}</li>`).join('')}</ul>
    <h4>Payment Plan — 1.5 years ${badge(BADGE_A)}</h4>
    <p>Down payment <b>${PAYMENT.downPct}%</b> at booking · <b>${PAYMENT.possessionPct}%</b> on possession · <b>${PAYMENT.instalments} quarterly instalments × ${PAYMENT.instalmentPct}%</b> (3, 6, 9, 12, 15, 18 months) · Booking registration fee ${fmt(PAYMENT.bookingFee)} per unit (non-refundable) · "Get possession — pay later"</p>
    <h4>Interiors & Rooftop ${badge(BADGE_V)}</h4>
    <p>Interior fit-out (marble lobby, workstations, executive suite) and the rooftop terrace lounge are visualisation only — not in the official brochure. The brochure roof is plant / mechanical.</p>`;
  // Explorer list
  const list=$('#floorList'); list.innerHTML='';
  [...FLOORS].reverse().forEach(f=>{
    const b=document.createElement('button'); b.className='floorBtn'; b.dataset.id=f.id;
    b.innerHTML=`<span>${f.label}</span><small>${f.status==='NOT FOR SALE'?'NOT FOR SALE':fmtN(f.saleable)+' sqft saleable'}</small>`;
    b.onclick=()=>{ selectFloor(f,onWalk); onFloor?.(f); document.querySelectorAll('.floorBtn').forEach(x=>x.classList.toggle('sel',x.dataset.id===f.id)); };
    list.appendChild(b);
  });
  $('#infoToggle').onclick=()=>$('#infoPanel').classList.toggle('hidden');
  $('#explorerToggle').onclick=()=>$('#explorerPanel').classList.toggle('hidden');
}
export function selectFloor(f,onWalk){
  const el=$('#floorDetail'); const nfs=f.status==='NOT FOR SALE'||f.saleable===0;
  let html=`<h3>${f.label}</h3>${badge(f.badge)}
    <p><b>Floor plate:</b> ${fmtN(f.plate)} sqft · <b>Height:</b> ${f.heightFt} ft · <b>Saleable:</b> ${fmtN(f.saleable)} sqft</p>`;
  if(f.note) html+=`<p class="note">${f.note}</p>`;
  if(nfs){ html+=`<p class="nfs"><b>${f.status}</b> — no pricing for this level.</p>`; }
  else if(f.rate){ html+=`<p><b>Rate:</b> ${fmt(f.rate)}/sqft</p>`; }
  const walkable={G:'lobby','12':'office',M:'rooftop'}[f.id];
  if(walkable) html+=`<button class="walkBtn" id="walkBtn">🚶 Walk this zone</button>`;
  if(!nfs && f.units.length){
    html+=`<h4>Units</h4><div class="units">`;
    for(const u of f.units){ const bd=paymentBreakdown(u.area*f.rate);
      html+=`<details><summary><b>${u.id}</b> — ${fmtN(u.area)} sqft — <b>${fmt(bd.total)}</b></summary>
        <div class="pay"><p>Down payment (40% at booking): <b>${fmt(bd.down)}</b></p>
        <p>On possession (10%): <b>${fmt(bd.possession)}</b></p>
        <p>${bd.count} quarterly instalments × 8.33%: <b>${fmt(bd.instalment)}</b> each (3/6/9/12/15/18 months)</p></div></details>`; }
    html+='</div>';
  } else if(!nfs && f.id==='G'){ html+=`<p>Lobby + saleable area — no unit split printed in brochure. ${badge(BADGE_A)}</p>`; }
  el.innerHTML=html;
  const wb=$('#walkBtn'); if(wb) wb.onclick=()=>onWalk?.(walkable);
}
