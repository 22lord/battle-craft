const {load,THREE:T}=require('./harness.cjs');const vm=require('vm'),assert=require('assert');
(async()=>{const file=process.argv[2],c=load(file,+(process.argv[3]||90210));await c.init();const A=c.API;
const G={scene:new T.Scene(),physics:new A.Physics()};const W=new A.World(G);
// registra le casse e le auto mentre il mondo si costruisce
const casse=[],auto=[];const ob=W.box.bind(W);
const caller=()=>new Error().stack.split('\n')[3]||'';
W.box=function(mat,cx,cy,cz,sx,sy,sz,o){if(sx===1.1&&sy===1.1&&sz===1.1&&/casse/.test(caller()))casse.push([cx,cy,cz]);return ob(mat,cx,cy,cz,sx,sy,sz,o);};
const oc=W.car.bind(W);W.car=function(x,z,r,m){const n=W.harvestables.length;oc(x,z,r,m);const h=W.harvestables[n];if(h)auto.push({x:h.x,z:h.z,r,orig:[x,z]});/* v106: senza posto libero l auto non si piazza */};
W.build();
const r={};
// 1. terreno dentro le case
let peggioSopra=0,peggioSotto=0;
for(const h of W.houses92){const floor=A.terrainHeight(h.x,h.z)+.3;for(let i=0;i<=10;i++)for(let j=0;j<=10;j++){const t=A.terrainHeight(h.x-h.w/2+h.w*i/10,h.z-h.d/2+h.d*j/10);peggioSopra=Math.max(peggioSopra,t-floor);peggioSotto=Math.max(peggioSotto,floor-.3-t);}}
r.case=W.houses92.length;r.terrenoSopraPavimento_cm=+(peggioSopra*100).toFixed(1);r.vuotoSottoCasa_cm=+(peggioSotto*100).toFixed(1);
// la mesh visibile coincide con la funzione dentro le case?
const pos=W.terrainMesh.geometry.attributes.position;let meshErr=0;for(let i=0;i<pos.count;i++){const x=pos.getX(i),z=pos.getZ(i);if(W.houses92.some(h=>Math.abs(x-h.x)<h.w/2+2&&Math.abs(z-h.z)<h.d/2+2))meshErr=Math.max(meshErr,Math.abs(pos.getY(i)-A.terrainHeight(x,z)));}
r.meshVsFisica_cm=+(meshErr*100).toFixed(2);
// davanti alle porte: dislivello fra portico e terreno a 4 m
let gradino=0;for(const h of W.houses92){const dn=[[0,-1],[0,1],[-1,0],[1,0]][h.door];const y=A.terrainHeight(h.x,h.z);const t=A.terrainHeight(h.x+dn[0]*(h.w/2+4),h.z+dn[1]*(h.d/2+4));gradino=Math.max(gradino,Math.abs(t-y));}
r.dislivelloDavantiPorta_cm=+(gradino*100).toFixed(1);
// 2. auto
r.auto=auto.map(a=>{const lx=Math.abs(Math.cos(a.r))>.5?2.15:1,lz=Math.abs(Math.cos(a.r))>.5?1:2.15;const davanti=W.porte102.some(p=>Math.abs(a.x-p.x)<p.hx+lx&&Math.abs(a.z-p.z)<p.hz+lz);return {spostata_m:+Math.hypot(a.x-a.orig[0],a.z-a.orig[1]).toFixed(1),davantiPorta:davanti,sopraCasa:W.nearHouse92(a.x,a.z,.2)};});
// 3. casse: fondo rispetto al terreno sotto i 4 spigoli; la cassa in cima deve avere una cassa sotto
let galleggia=0,nelVuoto=0;for(const [x,y,z] of casse){const fondo=y-.55;const sotto=casse.some(o=>Math.abs(o[0]-x)<.3&&Math.abs(o[2]-z)<.3&&Math.abs(o[1]+1.1-y)<.05);let tmin=1e9;for(const [dx,dz] of [[-.55,-.55],[.55,-.55],[-.55,.55],[.55,.55],[0,0]])tmin=Math.min(tmin,A.terrainHeight(x+dx,z+dz));
 if(sotto)continue;const g=fondo-tmin;if(g>.03){galleggia++;}if(fondo-tmin>1)nelVuoto++;}
r.casse=casse.length;r.casseSospese=galleggia;
// 4. atterraggi
const S=W.botSpawns;let dmin=1e9;for(let i=0;i<S.length;i++)for(let j=i+1;j<S.length;j++)dmin=Math.min(dmin,Math.hypot(S[i][0]-S[j][0],S[i][1]-S[j][1]));
r.atterraggi=S.length;r.distanzaMinimaAtterraggi_m=+dmin.toFixed(1);
// 5. elementi tolti
const sfere=G.scene.children.filter(o=>o.isMesh&&o.geometry&&o.geometry.type==='SphereGeometry'&&o.geometry.parameters.radius>=2.5&&o.geometry.parameters.radius<100).length;
const coni=G.scene.children.filter(o=>o.isMesh&&o.geometry&&o.geometry.type==='ConeGeometry').length;
const luoghi=vm.runInContext('LUOGHI.map(l=>l.n)',c);
r.chiomeAPalla=sfere;r.tende=coni;r.luoghi=luoghi;
console.log(JSON.stringify(r,null,1));
if(process.argv[4]==='check'){
assert(peggioSopra<.02,'terreno dentro casa');assert(peggioSotto<.02,'casa sospesa');assert(meshErr<.02,'mesh diversa dalla fisica');
assert(r.auto.every(a=>!a.davantiPorta&&!a.sopraCasa),'auto davanti a una porta');assert.equal(galleggia,0,'casse sospese');
assert(S.length===30&&dmin>25,'atterraggi troppo vicini');assert.equal(sfere,0);assert.equal(coni,0);assert(!luoghi.includes('Bunker'));
console.log('WORLD PASS');}
})().catch(e=>{console.error(e.stack);process.exit(1)});
