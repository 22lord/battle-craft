const {load,THREE:T}=require('./harness.cjs');const vm=require('vm'),assert=require('assert');
(async()=>{const c=load(process.argv[2]);await c.init();c.window.keysDefaults();c.document.documentElement={style:{setProperty(){}}};const A=c.API;const G=Object.create(A.Game.prototype);Object.assign(G,{scene:new T.Scene(),physics:new A.Physics(),state:'title',time:0,chars:[],bots:[],outfit:0,playerName:'Test',canvas:c.document.createElement('canvas'),renderer:{toneMappingExposure:1,setPixelRatio(){},setSize(){}},lobbyCam:new T.PerspectiveCamera(),sens:1,jumpBuf:0,zoneTickT:0,camera:new T.PerspectiveCamera(),stats:{xp:0}});G.scene.fog=new T.Fog(0,50,80);G.world=new A.World(G);G.world.build();
for(const [key,cls] of Object.entries({audio:'AudioSys',fx:'FX',input:'Input',cam:'CameraRig',hud:'HUD',combat:'Combat',build:'BuildSystem',edit:'EditSystem',harvest:'Harvest',items:'Items',zone:'SafeZone',drop88:'Drop88'})){G[key]=new A[cls](key==='input'?G.canvas:G);}
G.sun=new T.DirectionalLight();G.hemi=new T.HemisphereLight();for(const k of Object.getOwnPropertyNames(A.HUD.prototype))if(k!=='constructor')G.hud[k]=()=>{};
G.ui=Object.fromEntries(['title','end','pause','pauseNote','q1','q2'].map(k=>[k,c.document.createElement('div')]));G.bindUI();
G.startMatch();
const [a,b]=G.bots,p=G.player;for(const x of G.chars)x.air88=null;for(const x of G.bots.slice(2))x.pos.set(0,-900,0);p.pos.set(0,-900,0);
G.physics.clearLine=()=>true;
function place(dist){a.pos.set(0,5,0);b.pos.set(0,5,dist);a.yaw=0;b.yaw=Math.PI;a.brain.home92=a.pos.clone();b.brain.home92=b.pos.clone();a.brain.target=null;}
const r={};
place(40);a.brain.perceive();r.lontaniInTregua=!!a.brain.target;
place(20);a.brain.perceive();r.vicini=!!a.brain.target;
place(40);p.pos.set(0,5,30);a.brain.perceive();r.giocatore=a.brain.target===p;p.pos.set(0,-900,0);
place(40);a.brain.pace102=0;a.brain.perceive();r.dopoTregua=!!a.brain.target;
place(40);a.brain.pace102=50;b.brain.pace102=50;a.brain.onDamaged(b,{});a.brain.target=null;a.brain.perceive();r.colpito=!!a.brain.target;
// la tregua scende col tempo
a.brain.pace102=10;const t0=a.brain.pace102;a.alive=true;for(let i=0;i<60;i++)a.brain.update(1/60);r.treguaScende=+(t0-a.brain.pace102).toFixed(2);
console.log(r);
assert.equal(r.lontaniInTregua,false);assert.equal(r.vicini,true);assert.equal(r.giocatore,true);assert.equal(r.dopoTregua,true);assert.equal(r.colpito,true);assert(Math.abs(r.treguaScende-1)<.05);
const pace=G.bots.map(x=>x.brain.pace102);console.log('tregua iniziale bot (s):',Math.min(...pace).toFixed(0),'-',Math.max(...pace).toFixed(0));
console.log('BOTS PASS');
})().catch(e=>{console.error(e.stack);process.exit(1)});
