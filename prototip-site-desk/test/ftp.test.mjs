import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawn} from 'node:child_process';
import {mkdtemp,mkdir,writeFile,readFile,rm,stat} from 'node:fs/promises';
import {createSiteDesk} from '../server.mjs';
import {validateHosting} from '../project-operations.mjs';
import {createFTPTransport,saveFTPPassword,curlTransfer} from '../ftp-transport.mjs';
import {createFTPFixture} from './ftp-fixture.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const FAKE='test:password"with\\escape and space';

test('FTP: pravi curl prenos, rezerva pre pisanja, podfolderi i bez lozinke u argumentima',async()=>{
 await mkdir(path.join(root,'data'),{recursive:true});const base=await mkdtemp(path.join(root,'data/ftp-test-')),remote=path.join(base,'remote'),build=path.join(base,'build');await mkdir(path.join(remote,'public_html'),{recursive:true});await mkdir(path.join(build,'assets'),{recursive:true});
 await writeFile(path.join(remote,'public_html/index.html'),'stara stranica');await writeFile(path.join(remote,'public_html/ostaje.txt'),'ostaje');await writeFile(path.join(build,'index.html'),'nova stranica');await writeFile(path.join(build,'assets/ime sa razmakom.txt'),'podfolder');
 const ftp=await createFTPFixture(remote);let invocations=0;
 try{
  const s={id:'ftp-site',hosting:validateHosting({type:'ftp',host:'127.0.0.1',port:ftp.port,user:'test@example.test',remote:'/public_html',output:'dist'})};await saveFTPPassword(base,s.id,FAKE);
  assert.equal((await stat(path.join(base,'credentials',s.id+'.password'))).mode&0o777,0o600);
  const transport=createFTPTransport({dataDir:base,transfer:config=>{invocations++;return curlTransfer(config,{spawnProcess:(exe,args,opts)=>{assert.equal(exe,'curl');assert.deepEqual(args,['-q','--config','-']);assert.ok(!JSON.stringify(args).includes(FAKE));return spawn(exe,args,opts)}})}});
  assert.equal((await transport.probe(s)).ok,true);const result=await transport.deploy(s,{revision:'rev-1',build:{folder:build}});
  assert.equal(await readFile(path.join(remote,'public_html/index.html'),'utf8'),'nova stranica');assert.equal(await readFile(path.join(remote,'public_html/assets/ime sa razmakom.txt'),'utf8'),'podfolder');assert.equal(await readFile(path.join(remote,'public_html/ostaje.txt'),'utf8'),'ostaje');assert.equal(await readFile(path.join(result.backup,'files/index.html'),'utf8'),'stara stranica');
  const manifest=JSON.parse(await readFile(path.join(result.backup,'manifest.json'),'utf8'));assert.equal(manifest.status,'done');assert.deepEqual(manifest.existing,['index.html']);assert.ok(manifest.added.includes('assets/ime sa razmakom.txt'));assert.ok(!JSON.stringify(manifest).includes(FAKE));
  const lastRead=ftp.commands.findLastIndex(c=>c.verb==='RETR'),firstWrite=ftp.commands.findIndex(c=>c.verb==='STOR');assert.ok(lastRead<firstWrite);assert.ok(invocations>=5);
  // FTPS nikad ne prelazi tiho na običan FTP ako server ne podržava TLS.
  await assert.rejects(()=>transport.probe({...s,hosting:{...s.hosting,type:'ftps'}}),/FTP\/FTPS/);
 }finally{await ftp.close();await rm(base,{recursive:true,force:true});}
});

test('FTP: nemogućnost rezervne kopije prekida objavu pre prvog STOR',async()=>{
 await mkdir(path.join(root,'data'),{recursive:true});const base=await mkdtemp(path.join(root,'data/ftp-denied-')),remote=path.join(base,'remote'),build=path.join(base,'build');await mkdir(remote);await mkdir(build);await writeFile(path.join(remote,'index.html'),'staro');await writeFile(path.join(build,'index.html'),'novo');const ftp=await createFTPFixture(remote,{denyDownload:true});
 try{const s={id:'ftp-site',hosting:validateHosting({type:'ftp',host:'127.0.0.1',port:ftp.port,user:'test',remote:'/'})};await saveFTPPassword(base,s.id,FAKE);const transport=createFTPTransport({dataDir:base});await assert.rejects(()=>transport.deploy(s,{revision:'r1',build:{folder:build}}),/nije završena/);assert.ok(!ftp.commands.some(c=>c.verb==='STOR'));assert.equal(await readFile(path.join(remote,'index.html'),'utf8'),'staro');}finally{await ftp.close();await rm(base,{recursive:true,force:true});}
});

test('FTP API: lozinka ostaje van projekata, odgovora i četa; promena hosta traži novu lozinku',async()=>{
 await mkdir(path.join(root,'data'),{recursive:true});const base=await mkdtemp(path.join(root,'data/ftp-api-'));const app=createSiteDesk({dataDir:base,port:0,apiPort:0,runtimeOptions:{binaries:{}},operationsFactory:()=>({})});
 try{await app.ready;await Promise.all([new Promise(r=>app.web.listen(0,'127.0.0.1',r)),new Promise(r=>app.api.listen(0,'127.0.0.1',r))]);const s={id:crypto.randomUUID(),name:'Test',folder:base,hosting:null,messages:[],sessions:{},approved:{id:'staro'},history:[]};app.store.projects.push(s);
 const origin='http://127.0.0.1:'+app.web.address().port,url='http://127.0.0.1:'+app.api.address().port;
 const update=body=>fetch(url+'/api/sites/'+s.id+'/hosting',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify(body)});
 const config={type:'ftps',host:'hosting.example.test',port:21,user:'test@example.test',remote:'/',output:'dist'};assert.equal((await update(config)).status,400);
 const response=await update({...config,password:FAKE});assert.equal(response.status,200);const text=await response.text();assert.ok(!text.includes('password'));assert.ok(!text.includes(FAKE));assert.equal(s.approved,null);assert.ok(!JSON.stringify(app.store).includes(FAKE));assert.ok(!(await readFile(path.join(base,'projects.json'),'utf8')).includes(FAKE));
 assert.equal((await update(config)).status,200);assert.equal((await update({...config,host:'drugi.example.test'})).status,400);
 const state=await (await fetch(url+'/api/state',{headers:{Origin:origin}})).text();assert.ok(!state.includes(FAKE));
 }finally{await app.close();await rm(base,{recursive:true,force:true});}
});

test('FTP: proverava protokol, port i korisničko ime bez config ubrizgavanja',()=>{
 assert.equal(validateHosting({type:'ftp',host:'host.test',user:'user@example.test',remote:'/'}).port,21);assert.equal(validateHosting({type:'ftps-implicit',host:'host.test',user:'user',remote:'/'}).port,990);assert.throws(()=>validateHosting({type:'ftp',host:'host.test',user:'user\nurl=x',remote:'/'}));assert.throws(()=>validateHosting({type:'ftp',host:'host.test',user:'user:password',remote:'/'}));assert.throws(()=>validateHosting({type:'ftp',host:'host.test',user:'user',remote:'/../'}));
});
