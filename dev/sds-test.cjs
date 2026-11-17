'use strict';
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const assert = require('node:assert/strict');
const { environment } = require('../../sys-design-gurukul/tools/mini-dom');
const root = path.resolve(__dirname,'..');
const files = [...fs.readFileSync(path.join(root,'index.html'),'utf8').matchAll(/<script\s+src="([^"]+)"/g)].map(m=>m[1]);
function boot(hash) {
  const env = environment(); env.sandbox.location.hash = hash;
  const context = vm.createContext(env.sandbox);
  for (const file of files) vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),context,{filename:file});
  return {env, SG:vm.runInContext('SG',context)};
}
const {env,SG} = boot('#level=sds-db-replay');
assert(env.document.getElementById('app').querySelector('.level-h').textContent.includes('Missed updates'),'Companion deep link opens the correct lesson');
assert(SG.trackUnlocked(SG.tracks.find(t=>t.id==='beginner')),'Beginner stays accessible');
assert(!SG.trackUnlocked(SG.tracks.find(t=>t.id==='intermediate')),'Sequential course gating stays intact');
assert(SG.trackUnlocked(SG.tracks.find(t=>t.id==='db-practice')),'New companion is directly accessible');
for (const id of [SG.levelSets.intermediate[0].id, SG.levelSets.beginner[1].id]) {
  const blocked = boot('#level='+id);
  assert(!blocked.env.document.getElementById('app').querySelector('.level-h'),'Deep link respects existing track and level gates');
  assert(blocked.env.document.getElementById('app').textContent.includes('Linked lesson abhi locked'));
  assert.equal(blocked.SG.state.completed.length,0,'Blocked link cannot grant completion');
}
let xp=0; SG.addXP=n=>{xp+=n;}; SG.noteMistake=()=>{};
const level=SG.levelSets['db-practice'][0], original=JSON.stringify(level);
function runFlow(stage, wrongFirst=false, correct=0) {
  const arena=env.document.createElement('div'); let count=0,score;
  SG.renderers.flow(stage,arena,value=>{count++;score=value;});
  const next=arena.querySelectorAll('.fl-ctl button')[1];
  const back=arena.querySelectorAll('.fl-ctl button')[0];
  const askIndex=stage.steps.findIndex(s=>s.ask);
  for(let i=0;i<=askIndex;i++) next.click();
  assert(next.disabled,'Unanswered question disables Next');
  const text=arena.querySelector('.fl-note').textContent; next.onclick();
  assert.equal(arena.querySelector('.fl-note').textContent,text,'Forced Next cannot skip the question');
  if(wrongFirst){arena.querySelectorAll('.fl-ask .choice')[(correct+1)%stage.steps[askIndex].ask.choices.length].click();assert.equal(count,0);assert(arena.querySelector('.fl-ask .feedback.bad').textContent.length>0);}
  back.click(); next.click();
  arena.querySelectorAll('.fl-ask .choice')[correct].click();
  const earned=xp; back.click(); next.click();
  assert.equal(xp,earned,'Revisiting an answered question does not farm XP');
  arena.querySelector('.fl-ask .btn').click();
  while(!arena.querySelectorAll('button').some(b=>b.textContent==='Aage badho →')) next.click();
  const done=arena.querySelectorAll('button').find(b=>b.textContent==='Aage badho →'); done.click(); done.onclick();
  assert.equal(count,1,'Completion is single use');
  assert.equal(score.total,1); assert.equal(score.firstTry,wrongFirst?0:1);
}
runFlow(level.stages[1],true);
runFlow({...level.stages[1],steps:[...level.stages[1].steps.slice(0,2),level.stages[1].steps[2]]});
assert.equal(JSON.stringify(level),original,'Renderer preserves source content');
const dedup=SG.levelSets['db-practice'].find(l=>l.id==='sds-db-dedup');
assert(dedup,'Atomic deduplication companion registered');
const dedupOriginal=JSON.stringify(dedup);
runFlow(dedup.stages[0],true,1);
assert.equal(JSON.stringify(dedup),dedupOriginal,'Deduplication walkthrough is repeatable without source mutation');
const requestFlow=dedup.stages.find(s=>s.title==='Same key; amount kyun badli?');
assert(requestFlow,'Request replay extends existing dedup lesson');
runFlow(requestFlow,true,2);
assert.equal(JSON.stringify(dedup),dedupOriginal,'Request replay preserves authored content');
const judgeFlow=dedup.stages.find(s=>s.title==='Old judge result, new generation');
assert(judgeFlow,'Judge verdict extends existing dedup lesson');
runFlow(judgeFlow,true,2);
assert.equal(JSON.stringify(dedup),dedupOriginal,'Judge flow preserves authored content');
const gatedDedup=boot('#level=sds-db-dedup');
assert(gatedDedup.env.document.getElementById('app').textContent.includes('Linked lesson abhi locked'),'Second DB practice lesson respects replay prerequisite');
const queryCost=SG.levelSets['db-practice'].find(l=>l.id==='sds-db-query-cost');
assert(queryCost,'Query cost and counter companion registered');
const queryOriginal=JSON.stringify(queryCost);
runFlow(queryCost.stages[1],true,2);
assert.equal(JSON.stringify(queryCost),queryOriginal,'Counter walkthrough preserves authored content');
const spatialFlow=queryCost.stages.find(s=>s.title==='Box mein driver; circle ke bahar');
assert(spatialFlow,'Spatial flow extends query-cost companion');
runFlow(spatialFlow,true,2);
assert.equal(JSON.stringify(queryCost),queryOriginal,'Spatial walkthrough preserves authored content');
const gatedQuery=boot('#level=sds-db-query-cost');
assert(gatedQuery.env.document.getElementById('app').textContent.includes('Linked lesson abhi locked'),'Third companion requires earlier practice completion');
const locks=Object.values(SG.levelSets).flat().find(l=>l.id==='locks');
const claimFlow=locks.stages.find(s=>s.title==='Version changed; was the seat sold?');
assert(claimFlow,'Seat claim walkthrough extends the existing locks lesson');
const locksOriginal=JSON.stringify(locks);
runFlow(claimFlow,true,1);
assert.equal(JSON.stringify(locks),locksOriginal,'Seat claim walkthrough preserves authored content');
for (const [owner,title] of [[queryCost,'Dono words hain; phrase kyun nahi?'],[locks,'Expired owner ka late payment']]) {
  const before=JSON.stringify(owner), flow=owner.stages.find(s=>s.title===title);
  assert(flow, 'Design method flow registered: '+title);
  runFlow(flow,true,2);
  assert.equal(JSON.stringify(owner),before,'Design method preserves authored content');
}
console.log('PASS: SQL deep link, track gates, wrong-answer feedback, skip prevention, back/forward scoring, final-step question, single completion (DOM model).');
