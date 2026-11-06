import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {mkdtemp,mkdir,writeFile,readFile,rm,readdir,symlink} from 'node:fs/promises';
import {createSiteDesk} from '../server.mjs';
import {createOperations,runCommand,validateHosting} from '../project-operations.mjs';
import {resolveSiteOutput} from '../site-output.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
async function temp(){await mkdir(path.join(root,'data'),{recursive:true});return mkdtemp(path.join(root,'data/output-test-'));}
async function html(base,dir){await mkdir(path.join(base,dir),{recursive:true});await writeFile(path.join(base,dir,'index.html'),'<h1>Sajt</h1>');}

test('Izlaz sajta: prepoznavanje framework izlaza, agentova konfiguracija i odbijanje nagađanja',async()=>{
 const base=await temp();try{
 await html(base,'dist');assert.equal((await resolveSiteOutput(base)).output,'dist');
 await html(base,'out');await assert.rejects(()=>resolveSiteOutput(base),/više izlaznih/);
 await writeFile(path.join(base,'package.json'),JSON.stringify({dependencies:{vite:'test'}}));assert.equal((await resolveSiteOutput(base)).output,'dist');
 await writeFile(path.join(base,'site-desk.json'),JSON.stringify({output:'out'}));assert.equal((await resolveSiteOutput(base)).output,'out');
 await writeFile(path.join(base,'site-desk.json'),JSON.stringify({output:'../nešto'}));await assert.rejects(()=>resolveSiteOutput(base),/poseban izlazni/);
 await rm(path.join(base,'site-desk.json'));await rm(path.join(base,'dist'),{recursive:true});await rm(path.join(base,'out'),{recursive:true});await html(base,'.');
 await writeFile(path.join(base,'package.json'),JSON.stringify({scripts:{build:'test'}}));await assert.rejects(()=>resolveSiteOutput(base),/pripremi statični build/);
 await rm(path.join(base,'package.json'));assert.equal((await resolveSiteOutput(base)).staticRoot,true);
 await writeFile(path.join(base,'izvan.json'),'{}');await symlink(path.join(base,'izvan.json'),path.join(base,'site-desk.json'));await assert.rejects(()=>resolveSiteOutput(base),/simbolička veza/);
 }finally{await rm(base,{recursive:true,force:true});}
});

test('Jednostavan HTML sajt: automatski snapshot ne šalje Git, tajne, alate i konfiguraciju projekta',async()=>{
 const base=await temp(),project=path.join(base,'sajt');try{
 await html(project,'.');await mkdir(path.join(project,'assets'));await writeFile(path.join(project,'assets/site.css'),'body{}');
 await writeFile(path.join(project,'.env'),'LAZNI_TEST_PODATAK');await writeFile(path.join(project,'package.json'),'{}');await writeFile(path.join(project,'script.sh'),'test');await mkdir(path.join(project,'tools'));await writeFile(path.join(project,'tools/proba.js'),'test');
 for(const args of [['init'],['config','user.email','test@example.test'],['config','user.name','Test'],['add','index.html','assets/site.css'],['commit','-m','Test']])await runCommand('git',['-C',project,...args]);
 const ops=createOperations({dataDir:base}),s={id:'site',folder:project,hosting:validateHosting({host:'host.test',user:'test',remote:'/home/test/public_html'})};assert.equal(s.hosting.output,'auto');const prepared=await ops.approve(s);
 assert.equal(prepared.build.output,'.');assert.deepEqual((await readdir(prepared.build.folder)).sort(),['assets','index.html']);assert.equal(await readFile(path.join(prepared.build.folder,'assets/site.css'),'utf8'),'body{}');
 // Git priprema ne zahteva build čak ni kada povezani hosting nema izlazni folder.
 s.hosting.output='nedostaje';assert.equal((await ops.approve(s,{includeBuild:false})).build,null);
 }finally{await rm(base,{recursive:true,force:true});}
});

test('Dva dugmeta: API sam priprema verziju pre izabranog prenosa i odbija nepotvrđenu radnju',async()=>{
 const base=await temp(),calls=[];const app=createSiteDesk({dataDir:base,port:0,apiPort:0,runtimeOptions:{binaries:{}},operationsFactory:()=>({approve:async(s,options)=>{calls.push(['prepare',options.includeBuild]);return {id:'prepared',revision:'r1',head:'head',build:options.includeBuild?{}:null};},push:async(s,id)=>{calls.push(['push',id]);return {ok:true};},deploy:async(s,id)=>{calls.push(['deploy',id]);return {ok:true};}})});
 try{await app.ready;const s={id:crypto.randomUUID(),messages:[],sessions:{},hosting:{},history:[]};app.store.projects.push(s);await Promise.all([new Promise(r=>app.web.listen(0,'127.0.0.1',r)),new Promise(r=>app.api.listen(0,'127.0.0.1',r))]);const origin='http://127.0.0.1:'+app.web.address().port,api='http://127.0.0.1:'+app.api.address().port;
 const send=(action,body)=>fetch(api+'/api/sites/'+s.id+'/'+action,{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify(body)});
 assert.equal((await send('push',{prepare:true})).status,400);assert.deepEqual(calls,[]);
 assert.equal((await send('push',{prepare:true,confirmed:true})).status,200);assert.deepEqual(calls,[['prepare',false],['push','prepared']]);
 assert.equal((await send('deploy',{prepare:true,confirmed:true})).status,200);assert.deepEqual(calls.slice(2),[['prepare',true],['deploy','prepared']]);
 }finally{await app.close();await rm(base,{recursive:true,force:true});}
});
