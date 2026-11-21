import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {createAppUpdates} from '../app-update.mjs';
import {updateSummary} from '../public/app-update.mjs';

const root=path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const env={...process.env,GIT_CONFIG_GLOBAL:'/dev/null',GIT_CONFIG_SYSTEM:'/dev/null',GIT_AUTHOR_NAME:'t',GIT_AUTHOR_EMAIL:'t@example.test',GIT_COMMITTER_NAME:'t',GIT_COMMITTER_EMAIL:'t@example.test'};
const git=(cwd,...args)=>execFileSync('git',args,{cwd,env,encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();

function fixture(t){
 const base=fs.mkdtempSync(path.join(os.tmpdir(),'agent-desk-update-'));t.after(()=>fs.rmSync(base,{recursive:true,force:true}));
 const origin=path.join(base,'origin.git'),upstream=path.join(base,'upstream'),local=path.join(base,'local');
 git(base,'init','--quiet','--bare','-b','main',origin);
 git(base,'init','--quiet','-b','main',upstream);
 fs.writeFileSync(path.join(upstream,'app.txt'),'1\n');fs.writeFileSync(path.join(upstream,'package-lock.json'),'{"v":1}\n');
 git(upstream,'add','.');git(upstream,'commit','--quiet','-m','Prvi');git(upstream,'remote','add','origin',origin);git(upstream,'push','--quiet','origin','main');
 git(base,'clone','--quiet',origin,local);
 const commit=(file,text,msg)=>{fs.writeFileSync(path.join(upstream,file),text);git(upstream,'add','.');git(upstream,'commit','--quiet','-m',msg);git(upstream,'push','--quiet','origin','main');};
 const calls=[],restarts=[];
 const updates=createAppUpdates({dir:local,execute:async(file,args)=>{calls.push([path.basename(file),...args]);if(file==='npm')return {stdout:''};return {stdout:git(local,...args)};},restart:()=>{restarts.push(1);return {status:200,body:{ok:true,scheduled:true}};}});
 return {local,upstream,commit,updates,calls,restarts};
}

test('provera bez novih izmena ne prikazuje ikonicu',async t=>{
 const f=fixture(t);const view=await f.updates.check();
 assert.equal(view.available,false);assert.equal(view.behind,0);assert.equal(view.branch,'main');
});

test('nove izmene sa GitHub-a daju broj i naslove commitova',async t=>{
 const f=fixture(t);f.commit('app.txt','2\n','Druga izmena');f.commit('app.txt','3\n','Treća izmena');
 const view=await f.updates.check();
 assert.equal(view.available,true);assert.equal(view.behind,2);
 assert.deepEqual(view.commits.map(c=>c.subject),['Treća izmena','Druga izmena']);
});

test('ažuriranje radi fast-forward, bez npm install kad se lock nije promenio, pa restart',async t=>{
 const f=fixture(t);f.commit('app.txt','2\n','Druga');await f.updates.check();
 const view=await f.updates.update();
 assert.equal(fs.readFileSync(path.join(f.local,'app.txt'),'utf8'),'2\n');
 assert.equal(view.available,false);assert.match(view.message,/Restart čeka/);
 assert.equal(f.calls.some(c=>c[0]==='npm'),false);assert.equal(f.restarts.length,1);
});

test('promenjen package-lock pokreće npm install',async t=>{
 const f=fixture(t);f.commit('package-lock.json','{"v":2}\n','Paketi');
 await f.updates.update();
 assert.deepEqual(f.calls.find(c=>c[0]==='npm'),['npm','install','--no-audit','--no-fund']);
});

test('necommitovane izmene: ništa se ne dira',async t=>{
 const f=fixture(t);f.commit('app.txt','2\n','Druga');fs.writeFileSync(path.join(f.local,'app.txt'),'lokalno\n');
 const head=git(f.local,'rev-parse','HEAD');const view=await f.updates.update();
 assert.match(view.message,/necommitovanih/);assert.equal(git(f.local,'rev-parse','HEAD'),head);
 assert.equal(fs.readFileSync(path.join(f.local,'app.txt'),'utf8'),'lokalno\n');assert.equal(f.restarts.length,0);
});

test('lokalni commitovi kojih nema na GitHub-u: bez pull-a',async t=>{
 const f=fixture(t);f.commit('app.txt','2\n','Druga');
 fs.writeFileSync(path.join(f.local,'drugo.txt'),'x');git(f.local,'add','.');git(f.local,'commit','--quiet','-m','Lokalno');
 const head=git(f.local,'rev-parse','HEAD');const view=await f.updates.update();
 assert.match(view.message,/ne može samo da se pomeri napred/);assert.equal(git(f.local,'rev-parse','HEAD'),head);assert.equal(f.restarts.length,0);
});

test('bez git-a ili mreže provera tiho ne prikazuje ništa',async()=>{
 const updates=createAppUpdates({dir:root,execute:async()=>{throw Error('offline');}});
 const view=await updates.check();
 assert.equal(view.available,false);assert.equal(view.message,'');
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'agent-desk-nogit-'));
 try{assert.equal((await createAppUpdates({dir}).check()).available,false);}finally{fs.rmSync(dir,{recursive:true,force:true});}
});

test('tekst ikonice i ikonica stoje levo od zupčanika',()=>{
 assert.equal(updateSummary({behind:0}),'');
 assert.equal(updateSummary({behind:1}),'1 nova izmena na GitHub-u');
 assert.equal(updateSummary({behind:3}),'3 nove izmene na GitHub-u');
 assert.equal(updateSummary({behind:12}),'12 novih izmena na GitHub-u');
 const html=fs.readFileSync(path.join(root,'public/index.html'),'utf8'),app=fs.readFileSync(path.join(root,'public/app.js'),'utf8');
 assert.match(html,/<div id="new-agents"[^>]*><button id="app-update-open"[^>]*hidden>/);
 assert.match(app,/append\(\.\.\.\[update\]\.filter\(Boolean\),settings\)/);
});

test('server odgovara na GET /api/app-update',async t=>{
 const {spawn}=await import('node:child_process');const {once}=await import('node:events');
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'app-update-api-'));fs.mkdirSync(path.join(temp,'data'));
 const port=5100+Math.floor(Math.random()*400);
 const server=spawn(process.execPath,['server.mjs'],{cwd:root,env:{...process.env,PORT:String(port),AGENT_DESK_DISABLE_LIMITS:'1',AGENT_DESK_CHILD_REPORTS:'0',AGENT_DESK_CONFIG:path.join(temp,'config'),AGENT_DESK_DATA:path.join(temp,'data')},stdio:['ignore','pipe','pipe']});
 t.after(async()=>{const exited=once(server,'exit');server.kill();await exited;fs.rmSync(temp,{recursive:true,force:true,maxRetries:5,retryDelay:100});});
 await once(server.stdout,'data');
 const response=await fetch(`http://127.0.0.1:${port}/api/app-update`);
 assert.equal(response.status,200);
 const view=await response.json();
 assert.equal(typeof view.available,'boolean');assert.ok(Array.isArray(view.commits));
});
