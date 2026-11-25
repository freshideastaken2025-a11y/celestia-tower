// Celestia — official data from CBD Punjab brochure (SPECS_EXTRACTED.md)
// A = Official — CBD Brochure, V = Visualisation (not in brochure)
export const FT = 0.3048;
export const BADGE_A = 'Official — CBD Brochure';
export const BADGE_V = 'Visualisation';

const U = (areas) => areas.map((a, i) => ({ id: 'F-' + String(i + 1).padStart(2, '0'), area: a }));
export const UNITS_2_4 = U([455,1665,1295,1170,1281,1498,565,1097,1535,1394,610,610,1128,1344,557,525,369]);
export const UNITS_6   = U([380,1629,1230,1134,1251,1435,565,1074,1502,1361,610,610,1120,591,557,1206,369]);
export const UNITS_7_9 = U([1419,1451,916,1054,1073,932,565,1074,1619,1175,610,610,1224,530,537,562,369]);
export const UNITS_11_19 = U([5234,3111,5383,5342]); // floor 12 layout used for walkable office

export function rateFor(level){
  if(level>=1 && level<=3) return 40000;
  if(level>=4 && level<=6) return 45000;
  if(level>=7 && level<=9) return 50000;
  if(level>=11 && level<=13) return 60000;
  if(level>=14 && level<=16) return 70000;
  if(level>=17 && level<=19) return 75000;
  return 0;
}
// level: numeric (G=0, M=20, basements negative)
function F(id,label,level,plate,hFt,saleable,opts={}){
  return { id,label,level,plate,heightFt:hFt,saleable,rate:opts.rate??rateFor(level),
    status:opts.status||(saleable>0?'For Sale':'Not For Sale'), units:opts.units||[], note:opts.note||'', badge:BADGE_A };
}
export const FLOORS = [
  F('B4','B4 — Basement 4',-4,31231,12,0,{note:'Parking / services — indicated in explorer, not walkable'}),
  F('B3','B3 — Basement 3',-3,31231,12,0,{note:'Parking / services — not walkable'}),
  F('B2','B2 — Basement 2',-2,31231,12,0,{note:'Parking / services — not walkable'}),
  F('B1','B1 — Basement 1',-1,31231,12,0,{note:'Parking / services — not walkable'}),
  F('G','Ground',0,28286,15.5,16972,{rate:40000,note:'Double-height reception / lobby at south entrance (plan annotation)',units:[]}),
  F('1','Floor 1',1,28283,14,18634,{units:[{id:'Complete Floor',area:18634}]}),
  F('2','Floor 2',2,28283,14,17096,{units:UNITS_2_4}),
  F('3','Floor 3',3,28283,14,17096,{units:UNITS_2_4}),
  F('4','Floor 4',4,28283,14,17096,{units:UNITS_2_4}),
  F('5','Floor 5',5,28283,14,17096,{status:'NOT FOR SALE',rate:0,note:'RESERVED FOR TOKENIZATION — not for sale'}),
  F('6','Floor 6',6,27266,14,16624,{units:UNITS_6}),
  F('7','Floor 7',7,25979,14,15720,{units:UNITS_7_9}),
  F('8','Floor 8',8,25979,14,15720,{units:UNITS_7_9}),
  F('9','Floor 9',9,25979,14,15720,{units:UNITS_7_9}),
  F('10','Floor 10 — Service',10,25979,19.5,0,{status:'NOT FOR SALE',rate:0,note:'SERVICE FLOOR — not for sale'}),
  ...[11,12,13,14,15,16,17,18,19].map(n=>F(String(n),'Floor '+n,n,25979,14,19070,{units:UNITS_11_19})),
  F('M','M — Mechanical',20,3100,14,0,{status:'Not For Sale',note:'Mechanical / plant level above floor 19'}),
];
// cumulative base height (m) for each floor id
export function floorBaseY(){
  const map={}; let y=0;
  for(const f of FLOORS.filter(x=>x.level>=0)){ map[f.id]=y; y+=f.heightFt*FT; }
  return {map,total:y};
}
export const PAYMENT = { downPct:40, possessionPct:10, instalments:6, instalmentPct:8.33, months:[3,6,9,12,15,18], bookingFee:150000 };
export function paymentBreakdown(total){
  return { total, down: total*PAYMENT.downPct/100, possession: total*PAYMENT.possessionPct/100,
    instalment: total*PAYMENT.instalmentPct/100, count:PAYMENT.instalments };
}
export const PROJECT = {
  name:'Celestia IT & Office Tower', location:'NSIT Silicon Block, CBD NSIT City, Lahore — adjacent to DHA Phase 6 & 7, access from Bedian Road',
  developer:'CBD Punjab / PCBDDA — Punjab Central Business District Development Authority, Govt of Punjab',
  plot:'Plot B-23-01 · 43,511.75 sqft (9.67 kanals) · FAR 12 · footprint 29,967.38 sqft (69%)',
  status:'Grey structure completed; finishing in process', stza:'STZA licensed — Nawaz Sharif IT City STZ (231.53 acres)',
  contact:'UAN 0331-111-1063 · 042-99058800 · www.cbdpunjab.gov.pk',
  amenities:['24/7 electricity backup','ICT services','Central HVAC — centrally heated & air conditioned','24/7 surveillance','Passenger & cargo lifts (6 lifts + cargo)','On-premises security guards'],
  totals:{ saleable:339404, aboveGroundPlate:537793.81, basements:124924, grandTotal:662717.81, heightFt:301 }
};
export const fmt = n => 'PKR ' + Math.round(n).toLocaleString('en-PK');
export const fmtN = n => Math.round(n).toLocaleString('en-PK');
