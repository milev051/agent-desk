import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createGoogleAccounts} from '../google-accounts.mjs';
import {createGithub} from '../github.mjs';

function fakeGmail(email,{connected=true,state}={}){
  let s={email,connected,state:state || (connected?'connected':'disconnected'),services:{},name:'',avatar:false,error:''};
  return {status:()=>s,close(){},connect:async()=>{s={...s,state:'connecting'};},disconnect:async()=>{s={...s,email:'',connected:false,state:'disconnected'};},verify:async()=>s,avatar:()=>null,set(v){s={...s,...v};}};
}
function setup(extra={}){
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'desk-accounts-'));
  fs.mkdirSync(path.join(dir,'gmail','accounts'),{recursive:true});
  for(const id of Object.keys(extra))fs.writeFileSync(path.join(dir,'gmail','accounts',id+'.json'),'{}');
  const made=[];
  const accounts=createGoogleAccounts({configDir:dir,makeGmail:({tokenFile})=>{const id=tokenFile?path.basename(tokenFile,'.json'):'primary';const g=extra[id] || fakeGmail(id==='primary'?'glavni@gmail.com':'');made.push(g);return g;},makeServices:g=>({g}),makeWrite:(g,services)=>({g,services})});
  return {dir,accounts,made};
}

test('Google nalozi: bez parametra glavni nalog, adresa bira dodatni, nepoznat nalog je greška',()=>{
  const {dir,accounts}=setup({room211aaaa:fakeGmail('marko@room211.studio')});
  assert.equal(accounts.pick('').id,'primary');
  assert.equal(accounts.pick('Marko@Room211.studio').id,'room211aaaa');
  assert.equal(accounts.pick('marko@room211.studio').write.g,accounts.pick('marko@room211.studio').gmail);
  assert.throws(()=>accounts.pick('neko@drugi.rs'),e=>e.status===404);
  assert.deepEqual(accounts.list().map(a=>[a.email,a.primary]),[['glavni@gmail.com',true],['marko@room211.studio',false]]);
  fs.rmSync(dir,{recursive:true,force:true});
});

test('Google nalozi: nepovezan nalog se ne koristi tiho, a isti nalog dvaput ostaje jednom',()=>{
  const {dir,accounts}=setup({staroooooo:fakeGmail('marko@room211.studio',{connected:false,state:'reconnect_required'}),duplikat00:fakeGmail('glavni@gmail.com')});
  assert.throws(()=>accounts.pick('marko@room211.studio'),e=>e.status===409);
  assert.deepEqual(accounts.list().map(a=>a.email),['glavni@gmail.com','marko@room211.studio']);
  assert.equal(fs.existsSync(path.join(dir,'gmail','accounts','duplikat00.json')),false);
  fs.rmSync(dir,{recursive:true,force:true});
});

test('Google nalozi: dodavanje otvara prijavu, a otkazana prijava nestaje iz spiska',async()=>{
  const {dir,accounts,made}=setup();
  const added=await accounts.add();
  assert.equal(added.state,'connecting');
  await assert.rejects(accounts.add(),/već otvorena/);
  made.at(-1).set({state:'disconnected'});
  assert.deepEqual(accounts.list().map(a=>a.id),['primary']);
  await assert.rejects(accounts.remove('primary'),/Prekini vezu/);
  fs.rmSync(dir,{recursive:true,force:true});
});

test('GitHub: spisak naloga iz gh prijave bez tokena, promena aktivnog naloga',async()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'desk-gh-accounts-'));
  fs.writeFileSync(path.join(dir,'github.json'),JSON.stringify({enabled:true}));
  let active='milev051';const calls=[];
  const run=async(file,args)=>{calls.push(args.join(' '));
    if(args[0]==='auth' && args[1]==='status')return JSON.stringify({hosts:{'github.com':['milev051','room211'].map(login=>({login,active:login===active,state:'success',token:'must-not-leak'}))}});
    if(args[0]==='auth' && args[1]==='switch'){active=args.at(-1);return '';}
    return JSON.stringify({login:active});};
  const g=createGithub({configDir:dir,executable:'gh',run,fetchImpl:async()=>({ok:true,headers:new Headers({'content-type':'image/png'}),arrayBuffer:async()=>new Uint8Array([1,2,3]).buffer})});
  let s=await g.refresh({force:true});
  assert.deepEqual(s.accounts,[{login:'milev051',active:true,ok:true},{login:'room211',active:false,ok:true}]);
  assert.equal(JSON.stringify(s).includes('must-not-leak'),false);
  s=await g.switchAccount('room211');
  assert.equal(s.username,'room211');assert.ok(calls.includes('auth switch --hostname github.com --user room211'));
  await assert.rejects(g.switchAccount('nepoznat'),e=>e.status===404);
  assert.equal((await g.avatar('room211')).length,3);
  assert.equal(await g.avatar('nepoznat'),null);
  fs.rmSync(dir,{recursive:true,force:true});
});
