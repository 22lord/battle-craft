const {load,THREE:T}=require('./harness.cjs');const vm=require('vm'),assert=require('assert');
(async()=>{const c=load(process.argv[2]);await c.init();c.window.keysDefaults();c.document.documentElement={style:{setProperty(){}}};const A=c.API;const G=Object.create(A.Game.prototype);Object.assign(G,{scene:new T.Scene(),physics:new A.Physics(),state:'title',time:0,chars:[],bots:[],outfit:0,playerName:'Test',canvas:c.document.createElement('canvas'),renderer:{toneMappingExposure:1,setPixelRatio(){},setSize(){}},lobbyCam:new T.PerspectiveCamera(),sens:1,jumpBuf:0,zoneTickT:0,camera:new T.PerspectiveCamera(),stats:{xp:0}});G.scene.fog=new T.Fog(0,50,80);G.world=new A.World(G);G.world.build();
for(const [key,cls] of Object.entries({audio:'AudioSys',fx:'FX',input:'Input',cam:'CameraRig',hud:'HUD',combat:'Combat',build:'BuildSystem',edit:'EditSystem',harvest:'Harvest',items:'Items',zone:'SafeZone',drop88:'Drop88'})){G[key]=new A[cls](key==='input'?G.canvas:G);}
G.sun=new T.DirectionalLight();G.hemi=new T.HemisphereLight();
G.aim99=new (vm.runInContext('AimAssist99',c))(G);
assert.equal(G.world.sunSprite93,null,'sprite del sole ancora presente');
assert(!G.scene.children.some(o=>o.isSprite&&o.scale.x>=100),'sprite grande nel cielo');
G.ui=Object.fromEntries(['title','end','pause','pauseNote','q1','q2'].map(k=>[k,c.document.createElement('div')]));G.bindUI();G.startMatch();
const p=G.player,b=G.bots[0],inp=G.input;
for(const x of G.chars){x.air88=null;}for(const x of G.bots.slice(1)){x.pos.set(0,-500,0);}
// punto aperto: giocatore e bot a 20 m con linea libera
let spot=null;for(let x=-120;x<120&&!spot;x+=6)for(let z=-120;z<120&&!spot;z+=6){const h=A.terrainHeight(x,z),h2=A.terrainHeight(x,z+20);if(h<1.5||h2<1.5||Math.abs(h-h2)>1)continue;const e1=new T.Vector3(x,h+1.6,z),e2=new T.Vector3(x,h2+1.6,z+20);if(G.physics.clearLine(e1,e2))spot=[x,z];}
assert(spot,'nessun punto aperto');
function setup(offDeg){p.pos.set(spot[0],A.terrainHeight(spot[0],spot[1]),spot[1]);b.pos.set(spot[0],A.terrainHeight(spot[0],spot[1]+20),spot[1]+20);b.alive=true;p.weapon='ar';p.mode='weapon';p.reloading=false;p.ads=false;G.cam.yaw=offDeg*Math.PI/180;G.cam.pitch=-.05;G.aim99.reset();G.cam.update(1/60,p,false);}
function run(mode,fire,sec=1){G.touch84={active:mode==='touch'};G.pad88={active:mode==='pad'};inp.mouseL=false;inp.padFire88=false;if(fire)mode==='pad'?inp.padFire88=true:inp.mouseL=true;
 let adsAt=null;const dt=1/60;for(let i=0;i<sec*60;i++){G.cam.update(dt,p,false);p.ads=false;G.aim99.update(dt,p);if(p.ads&&adsAt===null)adsAt=i*dt;}
 G.cam.update(1/60,p,false);const e=G.aim99._err(b);return {err:+(e.ang*180/Math.PI).toFixed(2),ads:adsAt,slow:+G.aim99.slow.toFixed(2),target:!!G.aim99.target};}
const r={};
setup(6);const e0=G.aim99._err(b);r.inizio=+(e0.ang*180/Math.PI).toFixed(2);
setup(6);r.mouse=run('mouse',true);
setup(6);r.telefonoSpara=run('touch',true);
setup(6);r.telefonoNonSpara=run('touch',false);
setup(6);r.controllerSpara=run('pad',true);
setup(25);r.telefonoLontanoDalMirino=run('touch',true);
// dietro un muro: linea bloccata
setup(6);const clear=G.physics.clearLine;G.physics.clearLine=()=>false;r.telefonoMuro=run('touch',true);G.physics.clearLine=clear;
// fuori portata (pompa: 38 m)
setup(6);p.weapon='sg';b.pos.z+=40;r.pompaLontano=run('touch',true);
console.log(JSON.stringify(r,null,1));
assert(r.mouse.err>=r.inizio-.01&&!r.mouse.ads,'col mouse non deve aiutare');
assert(r.telefonoSpara.ads!==null&&r.telefonoSpara.ads<.05,'telefono: deve entrare in mira subito');
assert(r.telefonoSpara.err<1,'telefono: deve tirare sul bersaglio');
assert(r.telefonoNonSpara.ads===null&&r.telefonoNonSpara.err>r.inizio-.5,'senza sparare niente mira e niente tiro');
assert(r.controllerSpara.ads===null&&r.controllerSpara.err<r.inizio&&r.controllerSpara.err>r.telefonoSpara.err,'controller: aiuto piccolo, niente auto-mira');
assert(!r.telefonoLontanoDalMirino.target&&r.telefonoLontanoDalMirino.ads===null,'25 gradi fuori: niente');
assert(!r.telefonoMuro.target&&r.telefonoMuro.ads===null,'dietro un muro: niente');
assert(!r.pompaLontano.target,'oltre la portata: niente');
console.log('AIM PASS');
})().catch(e=>{console.error(e.stack);process.exit(1)});
