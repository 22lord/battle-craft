const {load,THREE:T}=require('./harness.cjs');const vm=require('vm');
(async()=>{const c=load(process.argv[2]);await c.init();c.window.keysDefaults();c.document.documentElement={style:{setProperty(){}}};const A=c.API;const G=Object.create(A.Game.prototype);Object.assign(G,{scene:new T.Scene(),physics:new A.Physics(),state:'title',time:0,chars:[],bots:[],outfit:0,playerName:'Test',canvas:c.document.createElement('canvas'),renderer:{toneMappingExposure:1,setPixelRatio(){},setSize(){}},lobbyCam:new T.PerspectiveCamera(),sens:1,jumpBuf:0,zoneTickT:0,camera:new T.PerspectiveCamera(),stats:{xp:0}});G.scene.fog=new T.Fog(0,50,80);G.world=new A.World(G);G.world.build();
for(const [key,cls] of Object.entries({audio:'AudioSys',fx:'FX',input:'Input',cam:'CameraRig',hud:'HUD',combat:'Combat',build:'BuildSystem',edit:'EditSystem',harvest:'Harvest',items:'Items',zone:'SafeZone',drop88:'Drop88'})){G[key]=new A[cls](key==='input'?G.canvas:G);}
G.sun=new T.DirectionalLight();G.hemi=new T.HemisphereLight();for(const k of Object.getOwnPropertyNames(A.HUD.prototype))if(k!=='constructor')G.hud[k]=()=>{};
G.ui=Object.fromEntries(['title','end','pause','pauseNote','q1','q2'].map(k=>[k,c.document.createElement('div')]));G.bindUI();
G.startMatch();G.endMatch=()=>{};const p=G.player;
let t=0,landed=null;const morti=[];const vivi0=G.bots.length;
const seen=new Set();
while(t<130){G.update(1/30);t+=1/30;if(p.air88&&p.air88.phase==='bus'&&t>2)G.drop88.jump(p);
 // il giocatore resta fermo in alto, lontano: non partecipa
 if(!p.air88){p.pos.set(0,200,0);p.vel.set(0,0,0);p.hp=999;}
 if(landed===null&&G.bots.every(b=>!b.air88))landed=t;
 for(const b of G.bots)if(!b.alive&&!seen.has(b)){seen.add(b);morti.push(+t.toFixed(1));}}
const dist=[];const pos=G.bots.map(b=>b.brain.home92).filter(Boolean);for(let i=0;i<pos.length;i++){let m=1e9;for(let j=0;j<pos.length;j++)if(i!==j)m=Math.min(m,Math.hypot(pos[i].x-pos[j].x,pos[i].z-pos[j].z));dist.push(m);}
dist.sort((a,b)=>a-b);
console.log(process.argv[2].match(/v\d+/)[0],'tutti a terra a',landed&&landed.toFixed(1),'s | distanza dal bot piu vicino all atterraggio: min',dist[0].toFixed(1),'mediana',dist[Math.floor(dist.length/2)].toFixed(1),'m');
const fasce=[30,45,60,90,130].map(s=>[s,morti.filter(x=>x<=s).length]);console.log('   morti entro i secondi:',fasce.map(([s,n])=>s+'s:'+n).join('  '),'| primi morti a',morti.slice(0,5).join(', '));
})().catch(e=>{console.error(e.stack);process.exit(1)});
