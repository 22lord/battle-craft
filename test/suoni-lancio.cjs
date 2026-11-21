// Prova dei suoni del lancio: finto AudioContext che registra volumi e partenze.
const {load,THREE:T}=require('./harness.cjs');const vm=require('vm'),assert=require('assert');
(async()=>{const c=load(process.argv[2]);
const log=[];let now=0;
const param=(name,v)=>({value:v,target:v,setTargetAtTime(x,t,tc){this.target=x;},setValueAtTime(x){this.value=this.target=x;},exponentialRampToValueAtTime(){}});
class Node_{connect(n){return n;}disconnect(){}}
class Fake{constructor(){this.sampleRate=44100;this.destination=new Node_();this.state='running';}get currentTime(){return now;}
 createGain(){const n=new Node_();n.gain=param('g',1);return n;}
 createBiquadFilter(){const n=new Node_();n.frequency=param('f',350);n.Q=param('q',1);return n;}
 createStereoPanner(){const n=new Node_();n.pan=param('p',0);return n;}
 createOscillator(){const n=new Node_();n.frequency=param('f',440);n.start=()=>{};n.stop=()=>{};return n;}
 createBuffer(ch,len){return {getChannelData:()=>new Float32Array(len),duration:1};}
 createBufferSource(){const n=new Node_();n.playbackRate=param('r',1);n.start=(w,o)=>{n.started=true;if(n.buffer&&n.buffer.name)log.push([now,'start',n.buffer.name,n.loop?'loop':'',n._g]);};n.stop=()=>{n.stopped=true;};return n;}
 decodeAudioData(){return null;}}
c.window.AudioContext=Fake;
await c.init();c.window.keysDefaults();c.document.documentElement={style:{setProperty(){}}};const A=c.API;const G=Object.create(A.Game.prototype);Object.assign(G,{scene:new T.Scene(),physics:new A.Physics(),state:'title',time:0,chars:[],bots:[],outfit:0,playerName:'Test',canvas:c.document.createElement('canvas'),renderer:{toneMappingExposure:1,setPixelRatio(){},setSize(){}},lobbyCam:new T.PerspectiveCamera(),sens:1,jumpBuf:0,zoneTickT:0,camera:new T.PerspectiveCamera(),stats:{xp:0}});G.scene.fog=new T.Fog(0,50,80);G.world=new A.World(G);G.world.build();
for(const [key,cls] of Object.entries({audio:'AudioSys',fx:'FX',input:'Input',cam:'CameraRig',hud:'HUD',combat:'Combat',build:'BuildSystem',edit:'EditSystem',harvest:'Harvest',items:'Items',zone:'SafeZone',drop88:'Drop88'})){G[key]=new A[cls](key==='input'?G.canvas:G);}
G.sun=new T.DirectionalLight();G.hemi=new T.HemisphereLight();G.dropAudio99=new (vm.runInContext('DropAudio99',c))(G);G.aim99=new (vm.runInContext("AimAssist99",c))(G);G.touch84={active:true,sync(){}};
G.audio.init();assert(G.audio.ctx,'audio non inizializzato');
const keys=vm.runInContext('Object.keys(SFX_B64)',c);for(const k of ['drop_jet','drop_wind','drop_para','drop_land'])assert(keys.includes(k),k);
for(const k of keys)G.audio.buf[k]={name:k,duration:k==='drop_jet'||k==='drop_wind'?20.53:2};
G.ui=Object.fromEntries(['title','end','pause','pauseNote','q1','q2'].map(k=>[k,c.document.createElement('div')]));G.bindUI();G.startMatch();
for(const k of Object.getOwnPropertyNames(A.HUD.prototype))if(k!=="constructor")G.hud[k]=()=>{};const p=G.player,D=G.dropAudio99;assert.equal(p.air88.phase,'bus');
const dt=1/60;let t=0,rows=[],jumped=false,landedAt=null,bad=[];
const tgt=n=>D.loops[n]?+D.loops[n].g.gain.target.toFixed(3):0;
while(t<70){
 if(!jumped&&t>=6){G.drop88.jump(p);jumped=true;}
 G.update(dt);D.update(dt);now+=dt;t+=dt;
 const ph=p.air88?p.air88.phase:'terra';if(ph==='terra'&&landedAt===null)landedAt=t;
 for(const n of ['jet','wind']){const v=tgt(n);if(v>.4)bad.push([t,n,v]);}
 if(Math.abs(t*2-Math.round(t*2))<dt)rows.push([t.toFixed(1),ph,tgt('jet'),D.loops.jet?Math.round(D.loops.jet.f.frequency.target):'-',tgt('wind'),p.vel.length().toFixed(1),D.out.gain.target]);
 if(landedAt&&t>landedAt+4&&!(G.drop88.bus&&G.drop88.bus.visible))break;
}
for(const r of rows.filter((r,i)=>i%4===0))console.log(r.join('\t'));
console.log('EVENTI');const mine=log.filter(e=>e[1]==='start');
const counts={};for(const e of mine)counts[e[2]]=(counts[e[2]]||0)+1;console.log(counts);
console.log(mine.filter(e=>e[2].startsWith('drop')).filter(e=>e[2]!=='drop_land'||e[0]>landedAt-0.1).slice(0,12).map(e=>e[0].toFixed(2)+' '+e[2]+' '+e[3]).join('\n'));
assert(landedAt,'non atterrato');assert(!bad.length,'volume oltre .4: '+JSON.stringify(bad.slice(0,3)));
assert.equal(counts.drop_jet,1,'il loop del motore deve partire una volta sola');
assert(counts.drop_para>=1&&counts.drop_land>=1);
// dopo l'atterraggio i loop devono essere spenti o a zero
assert(tgt('jet')===0&&tgt('wind')===0,'loop ancora accesi');
// pausa: il bus del lancio va a zero
G.state='paused';D.update(dt);assert.equal(D.out.gain.target,0);G.state='playing';
G.resetDynamic();G.startMatch();D.update(dt);console.log('RIAVVIO ok',G.chars.length,G.player.air88.phase);
console.log('DROP AUDIO PASS');
})().catch(e=>{console.error(e.stack);process.exit(1)});
