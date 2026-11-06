import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawn} from 'node:child_process';
import {mkdtemp,mkdir,readFile,writeFile,rm} from 'node:fs/promises';
import {createSiteDesk} from '../server.mjs';
import {createOperations,runCommand,validateHosting,githubURL} from '../project-operations.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const fixture=fileURLToPath(new URL('./cli-fixture.mjs',import.meta.url));
async function git(folder,args){return runCommand('git',['-C',folder,...args]);}
async function init(folder){await mkdir(folder,{recursive:true});await git(folder,['init']);await git(folder,['config','user.email','test@example.test']);await git(folder,['config','user.name','Site Desk test']);await writeFile(path.join(folder,'index.html'),'<h1>Primer</h1>');await git(folder,['add','.']);await git(folder,['commit','-m','Početak']);}
const waitFor=async fn=>{for(let i=0;i<1000;i++){const result=await fn();if(result)return result;await new Promise(r=>setTimeout(r,25));}throw Error('Proces nije završio na vreme.');};

test('Site Desk radi samostalno: lokalni CLI, sesije, projekti, hosting i revizije',async t=>{
 await mkdir(path.join(root,'data'),{recursive:true});const base=await mkdtemp(path.join(root,'data/test-'));const project=path.join(base,'projekat');await init(project);
 let calls=[];const options={dataDir:path.join(base,'app'),port:0,apiPort:0,runtimeOptions:{binaries:{codex:'test-cli',claude:'test-cli'},spawnProcess:(exe,args,opts)=>{calls.push({args,cwd:opts.cwd});return spawn(process.execPath,[fixture,...args],opts);}}};
 let app=createSiteDesk(options),origin,apiOrigin;
 async function start(){await app.ready;await Promise.all([new Promise(r=>app.web.listen(0,'127.0.0.1',r)),new Promise(r=>app.api.listen(0,'127.0.0.1',r))]);origin='http://127.0.0.1:'+app.web.address().port;apiOrigin='http://127.0.0.1:'+app.api.address().port;}
 const request=(route,method='GET',body,headers={})=>fetch(apiOrigin+route,{method,headers:{Origin:origin,'Content-Type':'application/json',...headers},...(body?{body:JSON.stringify(body)}:{})});
 let site;
 try{await start();
 await t.test('nema poziva ka Agent Desku i ne prihvata tuđi Origin ili proxy',async()=>{
  const state=await (await request('/api/state')).json();assert.equal(state.standalone,true);assert.deepEqual(state.projects,[]);assert.equal(state.agents.find(a=>a.id==='codex').available,true);
  assert.equal((await request('/api/state','GET',null,{Origin:'https://evil.test'})).status,403);assert.equal((await fetch(origin+'/api/state')).status,403);
  const html=await (await fetch(origin)).text();assert.ok(!html.includes('__WEB_PORT__'));assert.ok(html.includes(String(app.api.address().port)));
 });
 await t.test('dodaje stvarni Git projekat bez pokretanja procesa',async()=>{
  assert.equal((await request('/api/sites','POST',{name:'Loše',folder:base})).status,400);
  const response=await request('/api/sites','POST',{name:'Primer',domain:'primer.rs',folder:project,agent:'codex'});assert.equal(response.status,201);site=await response.json();assert.equal(calls.length,0);assert.equal(site.sessions,undefined);
  assert.equal((await request('/api/sites','POST',{name:'Duplikat',folder:project})).status,400);
 });
 await t.test('pokreće sopstveni CLI u folderu projekta i ne duplira zahtev',async()=>{
  const body={text:'Prvi zadatak',requestId:'prvi'};const url='/api/sites/'+site.id;
  assert.equal((await request(url+'/send','POST',body)).status,202);assert.equal((await request(url+'/send','POST',body)).status,202);
  const chat=await waitFor(async()=>{const c=await (await request(url+'/chat')).json();return c.messages.at(-1)?.status==='done'?c:null;});assert.equal(calls.length,3);assert.equal(calls[0].cwd,project);assert.equal(chat.messages.at(-1).text,'Odgovor lokalnog procesa.');
 });
 await t.test('nastavlja sesiju u memoriji, novi čet je resetuje i agent se menja zasebno',async()=>{
  const url='/api/sites/'+site.id;
  await request(url+'/send','POST',{text:'Drugi zadatak',requestId:'drugi'});
  await waitFor(async()=>{const c=await (await request(url+'/chat')).json();return c.messages.length===4&&c.messages.at(-1).status==='done'?c:null;});assert.ok(calls[4].args.includes('resume'));
  const before=await (await request(url+'/chat')).json();assert.equal((await request(url+'/new-chat','POST',{})).status,200);const after=await (await request(url+'/chat')).json();assert.deepEqual(after.messages,[]);assert.notEqual(after.id,before.id);
  assert.equal((await request(url+'/agent','POST',{agent:'grok'})).status,400);
  assert.equal((await request(url+'/agent','POST',{agent:'claude'})).status,200);assert.equal(app.store.projects[0].agent,'claude');assert.deepEqual(app.store.projects[0].sessions,{});
  assert.equal((await request(url+'/agent','POST',{agent:'codex'})).status,200);
  await request(url+'/send','POST',{text:'Treći zadatak',requestId:'novi'});await waitFor(async()=>{const c=await (await request(url+'/chat')).json();return c.messages.at(-1)?.status==='done';});assert.ok(!calls.at(-2).args.includes('resume'));
 });
 await t.test('automatski menja sesiju za novu temu i posle 30 minuta, ali prekida pri lošoj odluci',async()=>{
  const url='/api/sites/'+site.id;
  for(const text of ['NOVA_TEMA','Posle pauze']){const before=(await (await request(url+'/chat')).json()).id;if(text==='Posle pauze')app.store.projects[0].lastTurnAt=Date.now()-31*60*1000;
    await request(url+'/send','POST',{text,requestId:crypto.randomUUID()});const c=await waitFor(async()=>{const c=await (await request(url+'/chat')).json();return c.messages.at(-1)?.status==='done'?c:null;});assert.notEqual(c.id,before);assert.equal(c.messages.length,2);assert.ok(!calls.at(-2).args.includes('resume'));}
  const count=calls.length;await request(url+'/send','POST',{text:'LOS_PLAN',requestId:'los-plan'});const c=await waitFor(async()=>{const c=await (await request(url+'/chat')).json();return c.messages.at(-1)?.status==='error'?c:null;});assert.match(c.messages.at(-1).text,/JSON/);assert.equal(calls.length,count+1);
 });
 await t.test('README se uključuje pre rada, a poruke i sesije nisu na disku niti se vraćaju posle restarta',async()=>{
  const url='/api/sites/'+site.id;await writeFile(path.join(project,'README.md'),'# Projekat\nTrajna-memorija-primera\n');
  await request(url+'/send','POST',{text:'PROVERA_README',requestId:'readme'});const c=await waitFor(async()=>{const c=await (await request(url+'/chat')).json();return c.messages.at(-1)?.status==='done'?c:null;});assert.equal(c.messages.at(-1).text,'README i pravilo istorije su prosleđeni.');
  const saved=JSON.parse(await readFile(path.join(options.dataDir,'projects.json'),'utf8'))[0];assert.equal(saved.messages,undefined);assert.equal(saved.sessions,undefined);assert.ok(!JSON.stringify(saved).includes('PROVERA_README'));
  await app.close();app=createSiteDesk(options);await start();assert.equal((await (await request('/api/state')).json()).projects[0].id,site.id);assert.deepEqual((await (await request(url+'/chat')).json()).messages,[]);
  assert.equal(await readFile(path.join(project,'README.md'),'utf8'),'# Projekat\nTrajna-memorija-primera\n');
 });
 await t.test('dodatni prompt beleži stvarni korak u README i čuva prethodnu dokumentaciju',async()=>{
  const url='/api/sites/'+site.id;await request(url+'/send','POST',{text:'URADI_IZMENU',requestId:'izmena'});await waitFor(async()=>{const c=await (await request(url+'/chat')).json();return c.messages.at(-1)?.status==='done';});const readme=await readFile(path.join(project,'README.md'),'utf8');assert.match(readme,/Trajna-memorija-primera/);assert.match(readme,/2026-10-24: Zabeležena lokalna izmena/);
 });
 await t.test('zaustavlja lokalni proces i ne ispisuje sirovi stderr',async()=>{
  const url='/api/sites/'+site.id;await request(url+'/send','POST',{text:'CEKAJ_TEST',requestId:'treci'});assert.equal((await request(url+'/send','POST',{text:'Paralelno',requestId:'cetvrti'})).status,409);
  assert.equal((await request(url+'/new-chat','POST',{})).status,409);assert.equal((await request(url+'/agent','POST',{agent:'claude'})).status,409);
  assert.equal((await request(url+'/stop','POST',{})).status,200);await waitFor(async()=>!(await (await request(url+'/chat')).json()).running);
  await request(url+'/send','POST',{text:'GRESKA_TEST',requestId:'peti'});const c=await waitFor(async()=>{const c=await (await request(url+'/chat')).json();return c.messages.at(-1)?.status==='error'?c:null;});assert.ok(!JSON.stringify(c).includes('test-stderr-ne-sme-u-chat'));
 });
 await t.test('SSH podešavanja su odvojena po projektu i odbijaju unos komande',async()=>{
  const url='/api/sites/'+site.id;assert.equal((await request(url+'/hosting','POST',{host:'$(id)',user:'demo',remote:'/home/demo/public_html',output:'dist'})).status,400);
  const response=await request(url+'/hosting','POST',{host:'primer.test',user:'demo',remote:'/home/demo/public_html',output:'dist',port:22});assert.equal(response.status,200);assert.equal((await response.json()).hosting.user,'demo');
 });
 await t.test('odobrenje pravi kopiju build izlaza, a izmena izvora poništava slanje',async()=>{
  await mkdir(path.join(project,'dist'));await writeFile(path.join(project,'dist/index.html'),'<h1>Build</h1>');await writeFile(path.join(project,'.gitignore'),'dist/\n');await git(project,['add','.']);await git(project,['commit','-m','Build podešavanja']);
  const url='/api/sites/'+site.id,review=await (await request(url+'/status')).json(),response=await request(url+'/approve','POST',{revision:review.revision,buildHash:review.buildHash});assert.equal(response.status,200);const result=await response.json();assert.equal(result.approved.hasBuild,true);
  await writeFile(path.join(project,'dist/index.html'),'drugi build');assert.equal((await request(url+'/approve','POST',{revision:review.revision,buildHash:review.buildHash})).status,400);
  await writeFile(path.join(project,'index.html'),'<h1>Promenjeno posle odobrenja</h1>');assert.equal((await request(url+'/push','POST',{confirmed:true,approvalId:result.approved.id})).status,400);assert.equal((await request(url+'/deploy','POST',{confirmed:true,approvalId:result.approved.id})).status,400);
  assert.equal((await request(url+'/push','POST',{approvalId:result.approved.id})).status,400);
 });
 }finally{await app.close();await rm(base,{recursive:true,force:true});}
});

test('Site Desk: statična objava šalje odobreni snapshot, pravi rezervu i ne briše udaljene fajlove',async()=>{
 await mkdir(path.join(root,'data'),{recursive:true});const base=await mkdtemp(path.join(root,'data/deploy-test-'));const project=path.join(base,'projekat');await init(project);const calls=[];
 try{await writeFile(path.join(project,'.gitignore'),'dist/\n');await mkdir(path.join(project,'dist'));await writeFile(path.join(project,'dist/index.html'),'prvi build');await git(project,['add','.']);await git(project,['commit','-m','Ignore build']);await git(project,['remote','add','origin','https://github.com/test/projekat.git']);
 const ops=createOperations({dataDir:base,run:async(program,args,options)=>{if(program==='git'&&!args.includes('push'))return runCommand(program,args,options);calls.push({program,args});return '';}});
 const site={id:'primer',folder:project,hosting:validateHosting({host:'hosting.test',user:'demo',remote:'/home/demo/public_html',output:'dist'})};site.approved=await ops.approve(site);
 await writeFile(path.join(project,'dist/index.html'),'novi neodobreni build');const result=await ops.deploy(site,site.approved.id);assert.equal(result.ok,true);assert.equal(await readFile(path.join(site.approved.build.folder,'index.html'),'utf8'),'prvi build');assert.ok(calls[0].args.at(-1).includes('cp -a'));assert.equal(calls[1].program,'rsync');assert.ok(calls[1].args.includes(site.approved.build.folder+'/'));assert.ok(!calls[1].args.includes('--delete'));
 await ops.push(site,site.approved.id);assert.equal(calls[2].program,'git');assert.ok(calls[2].args.includes('push'));
 await writeFile(path.join(site.approved.build.folder,'index.html'),'izmenjen snapshot');await assert.rejects(()=>ops.deploy(site,site.approved.id),/build je promenjen/);
 await writeFile(path.join(project,'dist/.env'),'TEST');await assert.rejects(()=>ops.approve(site),/tajne/);
 }finally{await rm(base,{recursive:true,force:true});}
});

test('Site Desk: GitHub i SSH unosi ne prihvataju tokene, opcije i izlazak iz foldera',()=>{
 assert.equal(githubURL('git@github.com:nalog/sajt.git'),'git@github.com:nalog/sajt.git');assert.throws(()=>githubURL('https://token@github.com/nalog/sajt'));assert.throws(()=>githubURL('file:///etc/passwd'));assert.throws(()=>validateHosting({host:'-oProxyCommand=id',user:'demo',remote:'/home/demo/sajt',output:'dist'}));assert.throws(()=>validateHosting({host:'host',user:'demo',remote:'/home/demo/../sajt',output:'dist'}));assert.throws(()=>validateHosting({host:'host',user:'demo',remote:'/home/demo/sajt',output:'../dist'}));
});
