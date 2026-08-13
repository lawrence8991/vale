// Vale Energies hero scene generator — elevated valley, winding road,
// isometric site building, survey overlays, and a true isometric 3D van
// rendered at 32 headings (game-style sprite rotation, per-face shading).
// Emits scene.svg + meta.json (park fraction & pose for the JS driver).

import { writeFileSync } from "node:fs";

const fmt = (n) => Math.round(n * 100) / 100;
let seed = 42;
const rand = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296;

/* ================= iso projection (shared with building & van) ========= */
const C30 = Math.cos(Math.PI / 6), S30 = Math.sin(Math.PI / 6);

/* ================= road ================================================ */
// Sleeker line: two confident bends, over the rim → past the site.
const segs = [
  [[588, 40],  [668, 84],  [706, 122], [704, 176]],
  [[704, 176], [702, 238], [590, 252], [556, 306]],
  [[556, 306], [516, 370], [640, 414], [820, 452]],
  [[820, 452], [968, 484], [1130, 526], [1530, 636]],
];
function bez(seg, t) {
  const [p0, c1, c2, p1] = seg, u = 1 - t;
  return [
    u*u*u*p0[0] + 3*u*u*t*c1[0] + 3*u*t*t*c2[0] + t*t*t*p1[0],
    u*u*u*p0[1] + 3*u*u*t*c1[1] + 3*u*t*t*c2[1] + t*t*t*p1[1],
  ];
}
const pts = [];
for (let s = 0; s < segs.length; s++)
  for (let i = 0; i < 160; i++) pts.push(bez(segs[s], i / 160));
pts.push(segs[segs.length - 1][3]);

const cum = [0];
for (let i = 1; i < pts.length; i++)
  cum.push(cum[i-1] + Math.hypot(pts[i][0]-pts[i-1][0], pts[i][1]-pts[i-1][1]));
const total = cum[cum.length - 1];

const PARK_TARGET = [878, 462];
let best = 0, bestD = 1e9;
for (let i = 0; i < pts.length; i++) {
  const d = Math.hypot(pts[i][0]-PARK_TARGET[0], pts[i][1]-PARK_TARGET[1]);
  if (d < bestD) { bestD = d; best = i; }
}
const parkFrac = cum[best] / total;

// ribbon: narrower, sleeker taper
const wAt = (y) => {
  const t = Math.min(1, Math.max(0, (y - 40) / (560 - 40)));
  const sm = t * t * (3 - 2 * t);
  return 7 + sm * 17;               // 7px far -> 24px near
};
const left = [], right = [];
for (let i = 0; i < pts.length; i++) {
  const p = pts[i];
  const q = pts[Math.min(i+1, pts.length-1)], p0 = pts[Math.max(i-1, 0)];
  let tx = q[0]-p0[0], ty = q[1]-p0[1];
  const len = Math.hypot(tx, ty) || 1; tx/=len; ty/=len;
  const w = wAt(p[1]) / 2;
  left.push([p[0]-ty*w, p[1]+tx*w]);
  right.push([p[0]+ty*w, p[1]-tx*w]);
}
const poly = (a) => a.map((p,i)=>`${i?"L":"M"}${fmt(p[0])} ${fmt(p[1])}`).join("");
const ribbon = poly(left) + right.slice().reverse().map(p=>`L${fmt(p[0])} ${fmt(p[1])}`).join("") + "Z";
const centerD = segs.map((s,i)=>(i===0?`M${fmt(s[0][0])} ${fmt(s[0][1])}`:"")+
  `C${fmt(s[1][0])} ${fmt(s[1][1])} ${fmt(s[2][0])} ${fmt(s[2][1])} ${fmt(s[3][0])} ${fmt(s[3][1])}`).join("");
// route trace: start -> park, sparse polyline
let routeD = "";
for (let i = 0; i <= best; i += 6) routeD += `${i?"L":"M"}${fmt(pts[i][0])} ${fmt(pts[i][1])}`;

/* ================= site building (unchanged geometry) ================== */
const O = [968, 502];
const P = (u,v,w=0) => [O[0] + (u-v)*C30, O[1] - (u+v)*S30 - w];
const quad = (a,b,c,d) => `M${fmt(a[0])} ${fmt(a[1])}L${fmt(b[0])} ${fmt(b[1])}L${fmt(c[0])} ${fmt(c[1])}L${fmt(d[0])} ${fmt(d[1])}Z`;
const U = 150, V = 95, H = 56;

const roof = quad(P(0,0,H),P(U,0,H),P(U,V,H),P(0,V,H));
const faceR = quad(P(0,0,0),P(U,0,0),P(U,0,H),P(0,0,H));
const faceL = quad(P(0,0,0),P(0,V,0),P(0,V,H),P(0,0,H));
const parapet = quad(P(0,0,H),P(U,0,H),P(U,0,H+3),P(0,0,H+3)) + quad(P(0,0,H),P(0,V,H),P(0,V,H+3),P(0,0,H+3));
const shadow = `M${fmt(P(0,0)[0])} ${fmt(P(0,0)[1])}L${fmt(P(U,0)[0])} ${fmt(P(U,0)[1])}L${fmt(P(U,0)[0]-26)} ${fmt(P(U,0)[1]+16)}L${fmt(P(0,0)[0]-30)} ${fmt(P(0,0)[1]+18)}Z`;

const winR = [], winL = [];
{
  const cw=26, gap=8.67, m=12, rows=[[9,20],[26,37],[43,54]];
  for (let c=0;c<4;c++){ const u0=m+c*(cw+gap), u1=u0+cw;
    for (const [w0,w1] of rows) winR.push({d:quad(P(u0,0,w0),P(u1,0,w0),P(u1,0,w1),P(u0,0,w1)),u:(u0+u1)/2}); }
}
{
  const cw=22, gap=8.5, m=8, rows=[[9,20],[26,37],[43,54]];
  for (let c=0;c<3;c++){ const v0=m+c*(cw+gap), v1=v0+cw;
    for (const [w0,w1] of rows) winL.push({d:quad(P(0,v0,w0),P(0,v1,w0),P(0,v1,w1),P(0,v0,w1)),u:0}); }
}
const stag = (u)=> u<25?0 : u<60?1 : u<100?2 : 3;
const winBase = [...winR,...winL].map(w=>`<path d="${w.d}"/>`).join("");
const winLit  = [...winR,...winL].map(w=>`<path class="lit s${stag(w.u)}" d="${w.d}"/>`).join("");

function isoBox(u0,v0,du,dv,h0,dh){
  return {
    r: quad(P(u0,v0,h0+dh),P(u0+du,v0,h0+dh),P(u0+du,v0+dv,h0+dh),P(u0,v0+dv,h0+dh)),
    f: quad(P(u0,v0,h0),P(u0+du,v0,h0),P(u0+du,v0,h0+dh),P(u0,v0,h0+dh)),
    l: quad(P(u0,v0,h0),P(u0,v0+dv,h0),P(u0,v0+dv,h0+dh),P(u0,v0,h0+dh)),
  };
}
const plant1 = isoBox(96,58,30,22,H+3,12);
const plant2 = isoBox(58,62,24,16,H+3,9);
const p1c = P(111,69,H+15), p2c = P(70,70,H+12);
const stackBase = P(22,78,H+3), stackTop = P(22,78,H+34);

const solar = [];
{
  const pu=24,pv=24,gu=6,gv=8,u0=14,v0=10;
  for (let r=0;r<2;r++) for (let c=0;c<3;c++){
    const uu=u0+c*(pu+gu), vv=v0+r*(pv+gv);
    solar.push(quad(P(uu,vv,H+4),P(uu+pu,vv,H+4),P(uu+pu,vv+pv,H+4),P(uu,vv+pv,H+4)));
  }
}
const solarSVG = solar.map(d=>`<path d="${d}"/>`).join("");

const fore = quad(P(-6,-52,0),P(U+6,-52,0),P(U+6,-4,0),P(-6,-4,0));
const bays = [1,2,3,4].map(i=>{
  const u=-6+i*(U+12)/5;
  return `<path d="M${fmt(P(u,-4)[0])} ${fmt(P(u,-4)[1])}L${fmt(P(u,-22)[0])} ${fmt(P(u,-22)[1])}"/>`;
}).join("");

const G0u=-28,G1u=U+30,G0v=-60,G1v=V+28,STEP=26;
let gridLines="";
for (let u=G0u;u<=G1u;u+=STEP) gridLines+=`<path d="M${fmt(P(u,G0v)[0])} ${fmt(P(u,G0v)[1])}L${fmt(P(u,G1v)[0])} ${fmt(P(u,G1v)[1])}"/>`;
for (let v=G0v;v<=G1v;v+=STEP) gridLines+=`<path d="M${fmt(P(G0u,v)[0])} ${fmt(P(G0u,v)[1])}L${fmt(P(G1u,v)[0])} ${fmt(P(G1u,v)[1])}"/>`;
const plotOutline = quad(P(G0u,G0v),P(G1u,G0v),P(G1u,G1v),P(G0u,G1v));
const dimA=P(G0u,G0v-12), dimB=P(G1u,G0v-12);
const dimTickA=`M${fmt(P(G0u,G0v)[0])} ${fmt(P(G0u,G0v)[1])}L${fmt(P(G0u,G0v-16)[0])} ${fmt(P(G0u,G0v-16)[1])}`;
const dimTickB=`M${fmt(P(G1u,G0v)[0])} ${fmt(P(G1u,G0v)[1])}L${fmt(P(G1u,G0v-16)[0])} ${fmt(P(G1u,G0v-16)[1])}`;

// power-up rings: expanded footprint outline
const ringD = quad(P(-10,-10),P(U+10,-10),P(U+10,V+10),P(-10,V+10));

/* ================= landscape (kept) ==================================== */
const fields = [
  { d:"M0 118 Q210 86 430 96 L400 190 Q200 176 0 208 Z", c:"f2" },
  { d:"M470 92 Q650 76 830 92 L800 168 Q640 150 436 178 Z", c:"f1" },
  { d:"M870 96 Q1080 84 1290 108 L1440 128 L1440 210 L1180 180 Q1000 158 838 166 Z", c:"f3" },
  { d:"M0 232 Q190 198 386 208 L348 330 Q160 322 0 356 Z", c:"f1" },
  { d:"M420 214 Q470 210 512 218 L490 300 Q440 292 372 318 Z", c:"f3" },
  { d:"M1180 196 L1440 232 L1440 400 Q1250 360 1120 330 Q1150 258 1180 196 Z", c:"f2" },
  { d:"M0 384 Q170 348 330 356 L296 470 Q140 462 0 500 Z", c:"f3" },
  { d:"M356 362 Q450 350 520 364 L620 428 Q520 440 420 470 Q380 414 356 362 Z", c:"f2" },
  { d:"M660 470 Q740 500 820 528 L780 610 Q640 560 540 540 Q600 500 660 470 Z", c:"f1" },
  { d:"M1160 356 L1440 428 L1440 560 Q1330 540 1240 560 Q1180 460 1160 356 Z", c:"f1" },
  { d:"M60 520 Q220 490 340 500 L320 640 L0 640 L0 560 Z", c:"f2" },
];
const fieldSVG = fields.map(f=>`<path class="${f.c}" d="${f.d}"/>`).join("");
const hedges = ["M0 212 Q200 180 400 192","M436 180 Q640 152 800 170","M348 328 Q160 324 0 358","M1120 332 Q1250 362 1440 402","M296 468 Q140 464 0 502"];
const hedgeSVG = hedges.map(d=>`<path d="${d}"/>`).join("");
function alongQ(p0,c,p1,t){ const u=1-t; return [u*u*p0[0]+2*u*t*c[0]+t*t*p1[0], u*u*p0[1]+2*u*t*c[1]+t*t*p1[1]]; }
const treeRuns=[
  {p0:[0,212],c:[200,180],p1:[400,192],n:7},
  {p0:[436,180],c:[640,152],p1:[800,170],n:6},
  {p0:[1120,332],c:[1250,362],p1:[1440,402],n:6},
  {p0:[296,468],c:[140,464],p1:[0,502],n:5},
];
let trees="";
for (const run of treeRuns) for (let i=0;i<run.n;i++){
  const t=(i+0.5)/run.n+(rand()-0.5)*0.06;
  const [x,y]=alongQ(run.p0,run.c,run.p1,Math.min(1,Math.max(0,t)));
  const r=2+rand()*2.2+(y/640)*1.6;
  trees+=`<circle cx="${fmt(x+(rand()-0.5)*10)}" cy="${fmt(y+(rand()-0.5)*8)}" r="${fmt(r)}"/>`;
}
const contours=["M40 150 Q360 108 700 128 Q1050 146 1400 118","M120 250 Q420 216 760 240 Q1080 262 1420 236","M60 360 Q380 330 720 358"].map(d=>`<path d="${d}"/>`).join("");

let smoke="";
for (let i=0;i<5;i++) smoke+=`<circle class="wisp w${i}" cx="${fmt(stackTop[0])}" cy="${fmt(stackTop[1]-4)}" r="${fmt(2.4+i*0.8)}"/>`;
let cleanFlecks="";
for (let i=0;i<7;i++){ const [x,y]=P(20+rand()*120,10+rand()*70,H+8);
  cleanFlecks+=`<circle class="cf cf${i}" cx="${fmt(x)}" cy="${fmt(y)}" r="${fmt(1.4+rand()*1.2)}"/>`; }
let ambient="";
for (let i=0;i<10;i++){ const x=60+rand()*1320,y=120+rand()*420;
  ambient+=`<circle class="amb a${i%5}" cx="${fmt(x)}" cy="${fmt(y)}" r="${fmt(1.3+rand()*1.3)}"/>`; }

/* ================= isometric 3D van — 32 heading sprites =============== */
// Smooth white panel van: a curved side profile (raked windshield, rounded
// roofline, sloped bonnet) swept across the body width. The iso projection
// is affine, so bezier control points project exactly — no facets.
const N_SPRITES = 32;
const VAN_W = 19;                 // body width
// side profile in (x forward, z up); closed path, smooth
// [command, ...points]  C = cubic with 2 controls + end
const PROFILE = [
  ["M", [-24.0,  3.0]],                                        // rear bottom
  ["L", [-24.6, 20.0]],                                        // rear face
  ["C", [-24.7, 22.6], [-23.4, 23.8], [-21.0, 24.0]],          // rounded rear-top
  ["C", [-12.0, 24.6], [ -1.0, 24.4], [  7.0, 23.8]],          // roofline arc
  ["C", [  9.0, 23.6], [ 10.0, 23.2], [ 10.8, 22.4]],          // roof->screen turn
  ["L", [ 18.0, 13.8]],                                        // raked windshield
  ["C", [ 19.2, 12.5], [ 20.4, 11.9], [ 21.6, 11.5]],          // cowl
  ["C", [ 23.2, 11.1], [ 24.4, 10.7], [ 25.0, 10.0]],          // flat bonnet
  ["C", [ 25.7,  9.1], [ 25.9,  7.6], [ 25.8,  6.4]],          // rounded nose
  ["C", [ 25.7,  4.6], [ 25.1,  3.3], [ 24.2,  3.0]],          // bumper
  ["Z"],
];
// Face-based renderer: the swept body is decomposed into real surfaces —
// rear panel, roof, windshield, bonnet, bumper (bands between the two side
// profiles) plus the near side panel. Each band is backface-culled per
// heading, so hidden panels vanish instead of showing through.
function vanSprite(k){
  const th = (k / N_SPRITES) * Math.PI * 2;
  const c = Math.cos(th), s = Math.sin(th);
  const rot = (x,v)=>[x*c - v*s, x*s + v*c];
  const prj = (x,v,z)=>{ const [ru,rv]=rot(x,v); return [(ru-rv)*C30, (ru+rv)*S30 - z]; };

  // near side = the one facing the camera (larger screen y)
  const hv = VAN_W/2;
  const nearV = prj(0,hv,0)[1] > prj(0,-hv,0)[1] ? hv : -hv;
  const farV = -nearV;

  // segment list from PROFILE: {a, c1, c2, b} (c1/c2 null for lines)
  const segsOf = () => {
    const list = [];
    let cur = null, start = null;
    for (const op of PROFILE){
      if (op[0]==="M"){ cur = op[1]; start = op[1]; }
      else if (op[0]==="L"){ list.push({a:cur, c1:null, c2:null, b:op[1]}); cur = op[1]; }
      else if (op[0]==="C"){ list.push({a:cur, c1:op[1], c2:op[2], b:op[3]}); cur = op[3]; }
      else if (op[0]==="Z" && start){ list.push({a:cur, c1:null, c2:null, b:start}); cur = start; }
    }
    return list;
  };
  const SEGS = segsOf();
  const P2 = (p,v)=>prj(p[0],v,p[1]);
  const pt = (p,v)=>P2(p,v).map(fmt).join(" ");
  const chainF = (v, from, to) => {
    let d = "";
    for (let i = from; i <= to; i++){
      const g = SEGS[i];
      d += g.c1 ? `C${pt(g.c1,v)} ${pt(g.c2,v)} ${pt(g.b,v)}` : `L${pt(g.b,v)}`;
    }
    return d;
  };
  const chainB = (v, from, to) => {           // reversed: swap bezier controls
    let d = "";
    for (let i = to; i >= from; i--){
      const g = SEGS[i];
      d += g.c1 ? `C${pt(g.c2,v)} ${pt(g.c1,v)} ${pt(g.a,v)}` : `L${pt(g.a,v)}`;
    }
    return d;
  };
  const pathAt = (v) => `M${pt(SEGS[0].a,v)}` + chainF(v, 0, SEGS.length-1) + "Z";
  // indices: 0 rear face, 1 rear-top, 2 roofline, 3 roof turn, 4 windshield,
  //          5 cowl, 6 bonnet, 7 nose, 8 bumper, 9 floor (Z-close)

  // band: swept surface between the two profiles along segments [i0..i1]
  const band = (i0,i1) =>
    `M${pt(SEGS[i0].a, farV)}` + chainF(farV, i0, i1) +
    `L${pt(SEGS[i1].b, nearV)}` + chainB(nearV, i0, i1) + "Z";
  const bandArea = (i0,i1) => {                // shoelace of the 4 corners
    const q = [P2(SEGS[i0].a,farV), P2(SEGS[i1].b,farV), P2(SEGS[i1].b,nearV), P2(SEGS[i0].a,nearV)];
    let a = 0;
    for (let i=0;i<4;i++){ const p=q[i], r=q[(i+1)%4]; a += p[0]*r[1] - r[0]*p[1]; }
    return a/2;
  };
  // the roof is visible from every heading — its winding defines "front-facing"
  const visSign = Math.sign(bandArea(1,3));
  const visible = (i0,i1) => bandArea(i0,i1) * visSign > 0.5;

  // underlay in body tone so no background can peek between faces;
  // when the rear panel is hidden, the true silhouette at the back runs
  // up the NEAR rear edge and across the roof's rear width-edge
  const rearVis = bandArea(0,0) * Math.sign(bandArea(1,3)) > 0.5;
  const underlay = rearVis
    ? `M${pt(SEGS[0].a, farV)}` + chainF(farV, 0, 4) +
      `L${pt(SEGS[4].b, nearV)}` + chainF(nearV, 5, SEGS.length-1) + "Z"
    : `M${pt(SEGS[1].a, farV)}` + chainF(farV, 1, 4) +
      `L${pt(SEGS[4].b, nearV)}` + chainF(nearV, 5, SEGS.length-1) +
      chainF(nearV, 0, 0) + "Z";

  const BANDS = [
    { i0:0, i1:0, fill:"#E3E7D9" },            // rear panel
    { i0:1, i1:3, fill:"#FCFDF8" },            // roof
    { i0:4, i1:4, fill:"#F7F9F1", glass:true },// windshield
    { i0:5, i1:7, fill:"#F7F9F1" },            // bonnet + nose
    { i0:8, i1:8, fill:"#E9EDDF" },            // bumper
  ];
  let bands = "", frameLines = "";
  const widthLine = (p) =>
    `<path d="M${pt(p,farV)}L${pt(p,nearV)}" stroke="#C4CBB8" stroke-width=".7" fill="none"/>`;
  for (const b of BANDS){
    if (!visible(b.i0,b.i1)) continue;
    bands += `<path d="${band(b.i0,b.i1)}" fill="${b.fill}"/>`;
    if (b.glass) bands += `<path d="${band(b.i0,b.i1)}" fill="#55655B" opacity=".5"/>`;
  }
  frameLines += widthLine(SEGS[0].b);                       // rear roof edge across the width
  if (visible(4,4)){ frameLines += widthLine(SEGS[4].a) + widthLine(SEGS[4].b); } // windshield frame
  if (visible(8,8)){ frameLines += widthLine(SEGS[8].a); }  // bumper top edge

  // far silhouette edge — include the far rear edge only when the rear shows
  const farEdge = rearVis
    ? `M${pt(SEGS[0].a, farV)}` + chainF(farV, 0, 8)
    : `M${pt(SEGS[1].a, farV)}` + chainF(farV, 1, 8);
  const near = pathAt(nearV);
  // panel outline without the rear-top arc — that crease would cut across
  // the roof surface and make it read as open
  const nearStroke =
    `M${pt(SEGS[0].a, nearV)}` + chainF(nearV, 0, 0) +
    `M${pt(SEGS[2].a, nearV)}` + chainF(nearV, 2, 9);

  // wheels on the near side, tucked under the body
  let wheels = "";
  for (const wx of [-16.5, 15.8]){
    const [cx,cy] = prj(wx, nearV*0.86, 3.2);
    wheels += `<ellipse cx="${fmt(cx)}" cy="${fmt(cy)}" rx="3.6" ry="3.7" fill="#1A211A"/>`;
  }

  // door seam + skirt hairlines on the near side
  const seamT = prj(8.2, nearV, 22.4), seamB = prj(8.2, nearV, 4);
  const skirtA = prj(-23.6, nearV, 5), skirtB = prj(23.8, nearV, 5);

  // side wordmark on the cargo panel (skip when the side is edge-on)
  const hx = (()=>{ const a=prj(1,nearV,0), b=prj(0,nearV,0); return [a[0]-b[0], a[1]-b[1]]; })();
  let livery = "";
  if (Math.hypot(hx[0],hx[1]) > 0.42){
    const flip = hx[0] < 0 ? -1 : 1;   // keep glyphs unmirrored
    const ax = hx[0]*flip, ay = hx[1]*flip;
    const [ex,ey] = prj(-9, nearV, 12.8);
    livery =
      `<g transform="matrix(${fmt(ax)} ${fmt(ay)} 0 1 ${fmt(ex)} ${fmt(ey)})">`+
      `<text x="0" y="0" text-anchor="middle" dominant-baseline="middle" font-family="'Geist Mono',ui-monospace,monospace" font-size="7" letter-spacing="1.2" fill="#3A4A3E">VALE</text>`+
      `</g>`;
  }

  return `<g id="van-${k}">`
    + `<ellipse cx="1" cy="1.5" rx="26" ry="11" fill="#0A1D08" opacity=".09"/>`
    + `<path d="${underlay}" fill="#EDF0E3"/>`
    + bands
    + `<path d="${farEdge}" fill="none" stroke="#C4CBB8" stroke-width=".8" stroke-linejoin="round" stroke-linecap="round"/>`
    + frameLines
    + wheels
    + `<path d="${near}" fill="#EDF0E3"/>`
    + `<path d="${nearStroke}" fill="none" stroke="#C4CBB8" stroke-width=".8" stroke-linejoin="round" stroke-linecap="round"/>`
    + `<path d="M${fmt(seamT[0])} ${fmt(seamT[1])}L${fmt(seamB[0])} ${fmt(seamB[1])}" stroke="#D5DACA" stroke-width=".7" fill="none"/>`
    + `<path d="M${fmt(skirtA[0])} ${fmt(skirtA[1])}L${fmt(skirtB[0])} ${fmt(skirtB[1])}" stroke="#DDE1D3" stroke-width=".7" fill="none"/>`
    + livery
    + `</g>`;
}
let sprites = "";
for (let k=0;k<N_SPRITES;k++) sprites += vanSprite(k);

// park pose: screen tangent -> ground heading -> sprite index
const q = pts[Math.min(best+3, pts.length-1)], pB = pts[Math.max(best-3,0)];
const dX = q[0]-pB[0], dY = q[1]-pB[1];
const du = (dX/C30 + dY/S30)/2, dv = (dY/S30 - dX/C30)/2;
const parkTheta = Math.atan2(dv,du);
const parkIdx = ((Math.round(parkTheta/(2*Math.PI/N_SPRITES)) % N_SPRITES)+N_SPRITES)%N_SPRITES;

/* ================= assemble ============================================ */
const svg = `<svg class="scene" viewBox="0 0 1440 640" role="img" preserveAspectRatio="xMidYMid slice"
  aria-label="Animated view down into a valley: a Vale Energies van follows a winding road to a commercial site. A survey scan lights the building's systems with live load readouts, a measurement grid maps the plot, the site's compliance register ticks off DEC, EPC and ESOS upgrades while the building gains solar and stops emitting, and a savings readout posts the result.">
  <defs>
    <linearGradient id="dissolve" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#fff" stop-opacity="0"/>
      <stop offset="0.16" stop-color="#fff" stop-opacity="1"/>
      <stop offset="0.9" stop-color="#fff" stop-opacity="1"/>
      <stop offset="1" stop-color="#fff" stop-opacity="0"/>
    </linearGradient>
    <mask id="valeMask"><rect x="0" y="0" width="1440" height="640" fill="url(#dissolve)"/></mask>
    <linearGradient id="scanG" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#63B04B" stop-opacity="0"/>
      <stop offset="0.5" stop-color="#63B04B" stop-opacity="0.30"/>
      <stop offset="1" stop-color="#63B04B" stop-opacity="0"/>
    </linearGradient>
    <filter id="soften" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="1.1"/></filter>
    <mask id="routeMask">
      <path class="route-mask" d="${routeD}" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round" pathLength="1"/>
    </mask>
    ${sprites}
  </defs>

  <g mask="url(#valeMask)">
    <g class="fields">${fieldSVG}</g>
    <g class="contours">${contours}</g>
    <g class="hedges">${hedgeSVG}</g>
    <g class="trees">${trees}</g>

    <path class="road-fill" d="${ribbon}"/>
    <path class="road-edge" d="${poly(left)}"/>
    <path class="road-edge" d="${poly(right)}"/>
    <path id="roadline" d="${centerD}" fill="none" stroke="none"/>
    <g mask="url(#routeMask)"><path class="route" d="${routeD}"/></g>

    <g class="site">
      <path class="fore" d="${fore}"/>
      <g class="bays">${bays}</g>
      <path class="shadow" d="${shadow}"/>
      <path class="faceL" d="${faceL}"/>
      <path class="faceR" d="${faceR}"/>
      <path class="roofP" d="${roof}"/>
      <g class="parapet"><path d="${parapet}"/></g>
      <g class="win-base">${winBase}</g>
      <g class="win-lit">${winLit}</g>
      <g class="plant">
        <path d="${plant1.f}"/><path d="${plant1.l}"/><path class="ptop" d="${plant1.r}"/>
        <path d="${plant2.f}"/><path d="${plant2.l}"/><path class="ptop" d="${plant2.r}"/>
        <path class="stack" d="M${fmt(stackBase[0])} ${fmt(stackBase[1])}L${fmt(stackTop[0])} ${fmt(stackTop[1])}"/>
        <circle class="pdot pd1" cx="${fmt(p1c[0])}" cy="${fmt(p1c[1])}" r="3"/>
        <circle class="pdot pd2" cx="${fmt(p2c[0])}" cy="${fmt(p2c[1])}" r="3"/>
      </g>
      <g class="solar">${solarSVG}</g>
      <path class="ring ring-a" d="${ringD}"/>
      <path class="ring ring-b" d="${ringD}"/>
      <path class="ring ring-c" d="${ringD}"/>
    </g>

    <g class="survey">
      <path class="plot" d="${plotOutline}"/>
      <g class="glines">${gridLines}</g>
      <g class="dims">
        <path d="M${fmt(dimA[0])} ${fmt(dimA[1])}L${fmt(dimB[0])} ${fmt(dimB[1])}"/>
        <path d="${dimTickA}"/><path d="${dimTickB}"/>
      </g>
    </g>

    <g class="scan">
      <rect x="-60" y="-190" width="86" height="210" fill="url(#scanG)"
            transform="translate(${fmt(P(0,V/2,0)[0])} ${fmt(P(0,V/2,0)[1])}) skewX(-30)"/>
    </g>

    <g class="smoke" filter="url(#soften)">${smoke}</g>
    <g class="clean-flecks">${cleanFlecks}</g>

    <!-- van: JS drives position + heading sprite along #roadline -->
    <use id="vanUse" class="van-move" href="#van-${parkIdx}"
         transform="translate(${fmt(pts[0][0])} ${fmt(pts[0][1])}) scale(.45)"/>
    <use class="van-static" href="#van-${parkIdx}"
         transform="translate(${fmt(pts[best][0])} ${fmt(pts[best][1])})"/>
  </g>

  <g class="ambient">${ambient}</g>

  <g class="ann">
    <g class="load load-a">
      <path class="leader" d="M${fmt(P(U,24,40)[0])} ${fmt(P(U,24,40)[1])} L1178 306 H1208"/>
      <circle class="node" cx="${fmt(P(U,24,40)[0])}" cy="${fmt(P(U,24,40)[1])}" r="3"/>
      <text x="1216" y="310">AHU-01&#8195;46.2 kW</text>
    </g>
    <g class="load load-b">
      <path class="leader" d="M${fmt(P(U,52,26)[0])} ${fmt(P(U,52,26)[1])} L1178 346 H1208"/>
      <circle class="node" cx="${fmt(P(U,52,26)[0])}" cy="${fmt(P(U,52,26)[1])}" r="3"/>
      <text x="1216" y="350">LTG-EAST&#8195;11.8 kW</text>
    </g>
    <g class="load load-c">
      <path class="leader" d="M${fmt(P(U,80,12)[0])} ${fmt(P(U,80,12)[1])} L1178 386 H1208"/>
      <circle class="node" cx="${fmt(P(U,80,12)[0])}" cy="${fmt(P(U,80,12)[1])}" r="3"/>
      <text x="1216" y="390">CHW-02&#8195;61 %</text>
    </g>

    <text class="dim-label" x="${fmt((dimA[0]+dimB[0])/2+26)}" y="${fmt((dimA[1]+dimB[1])/2+30)}">2,400 M&#178; MAPPED</text>

    <!-- compliance register — beside the site, where the eye already is -->
    <g class="register">
      <text class="reg-cap" x="906" y="150">COMPLIANCE REGISTER</text>
      <g class="reg-row r1">
        <text x="906" y="180">DEC — COMPLIANT</text>
        <path class="rt" d="M1112 173 l4.5 4.5 9 -10" pathLength="1"/>
        <path class="rule" d="M906 188 H1134"/>
      </g>
      <g class="reg-row r2">
        <text x="906" y="212">EPC — RATING C &#8594; B</text>
        <path class="rt" d="M1112 205 l4.5 4.5 9 -10" pathLength="1"/>
        <path class="rule" d="M906 220 H1134"/>
      </g>
      <g class="reg-row r3">
        <text x="906" y="244">ESOS PH.3 — EVIDENCED</text>
        <path class="rt" d="M1112 237 l4.5 4.5 9 -10" pathLength="1"/>
        <path class="rule" d="M906 252 H1134"/>
      </g>
    </g>

    <g class="savings">
      <rect x="902" y="270" width="236" height="34" rx="17"/>
      <text x="1020" y="292" text-anchor="middle">&#8722;32% ENERGY&#8195;&#183;&#8195;&#8722;41 tCO&#8322;e/YR</text>
    </g>
  </g>
</svg>`;

writeFileSync(new URL("./scene.svg", import.meta.url), svg);
writeFileSync(new URL("./meta.json", import.meta.url), JSON.stringify({
  parkFrac: fmt(parkFrac), parkIdx,
  parkX: fmt(pts[best][0]), parkY: fmt(pts[best][1]),
}));
console.log("parkFrac", fmt(parkFrac), "parkIdx", parkIdx, "park", pts[best].map(fmt).join(","), "bytes", svg.length);
