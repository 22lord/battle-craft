const {load,THREE:T}=require('./harness-lite.cjs'),assert=require('assert');
(async()=>{const c=load(process.argv[2]);await c.init();const A=c.API;const G={scene:new T.Scene(),physics:new A.Physics(),time:0,chars:[],world:{}};G.physics.supportHeight=()=>0;const p=new A.Character(G,{isPlayer:true,colors:A.PALETTES[0]});G.player=p;G.chars=[p];p.onGround=true;p.pos.set(0,0,0);p.giveWeapon('ar');
const bones=[p.model.legL,p.model.legR,p.model.armL,p.model.armR].flatMap(l=>l.hp?[l.kn,l.ft]:[l.el,l.hand]);const lengths=bones.map(b=>b.position.length());
for(let i=0;i<60;i++){G.time+=1/60;p.animate(1/60);}p.crouch90=true;
let maxLift=0,maxCross=0,maxError=0,maxFootStep=0,prev=null;for(let i=0;i<360;i++){
 const theta=i<120?0:i<240?Math.PI/3:0; p.yaw=theta;p.vel.set(Math.sin(theta)*1.8,0,Math.cos(theta)*1.8);p.pos.addScaledVector(p.vel,1/60);G.time+=1/60;A.updateCrouch90(G,p,1/60);p.animate(1/60);
 const L=p.model.legL.ft.getWorldPosition(new T.Vector3()),R=p.model.legR.ft.getWorldPosition(new T.Vector3());
 if(i>60&&prev)maxFootStep=Math.max(maxFootStep,L.distanceTo(prev[0]),R.distanceTo(prev[1]));prev=[L.clone(),R.clone()];
 if(i>60){maxLift=Math.max(maxLift,L.y,R.y);const right=new T.Vector3(Math.cos(theta),0,-Math.sin(theta));maxCross=Math.max(maxCross,-L.clone().sub(R).dot(right));}
 bones.forEach((b,j)=>maxError=Math.max(maxError,Math.abs(b.position.length()-lengths[j])));
}
console.log(JSON.stringify({maxAnkleHeight:maxLift,maxCross,maxBoneLengthError:maxError,maxFootStep}));assert(maxFootStep<.18,'no foot teleport at a sharp turn');assert(maxLift<.19,'crouched steps must stay low, not retain upright clip lift');assert(maxCross<.02,'feet must not cross during a turn');assert(maxError<1e-7,'bone lengths must remain unchanged');
p.vel.set(0,0,0);for(let i=0;i<90;i++){A.updateCrouch90(G,p,1/60);p.animate(1/60);}assert(p.height<1.34&&p.height>1.32);
const roof=G.physics.add({type:'box',min:p.pos.clone().add(new T.Vector3(-2,1.4,-2)),max:p.pos.clone().add(new T.Vector3(2,1.6,2))});p.crouch90=false;A.updateCrouch90(G,p,1/60);assert(p.crouch90,'roof prevents standing');G.physics.remove(roof);p.crouch90=false;for(let i=0;i<90;i++){A.updateCrouch90(G,p,1/60);p.animate(1/60);}assert(p.height>1.749,'stands back up');assert(!p._crouch93,'low gait state clears on standing');console.log('PASS: low steps, no crossing or teleport, fixed limbs, roof clearance, return to standing');
})().catch(e=>{console.error(e);process.exit(1)});
