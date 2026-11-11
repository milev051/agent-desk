import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createGithub} from '../github.mjs';

function fixture(){
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'desk-github-')),calls=[];
  let authenticated=true,opened=0,clock=1000,reply;
  const repo={name:'example',owner:{login:'tester'},default_branch:'main',private:true,description:'Untrusted description',pushed_at:'2026-10-29T00:00:00Z',token:'must-not-leak'};
  const options={configDir:dir,executable:'fake-gh',retryDelay:0,now:()=>clock,openLogin:async()=>{opened++;},run:async(file,args)=>{
    calls.push(args);if(reply)return reply(args);
    if(!authenticated)throw Error('secret stderr must-not-leak');
    const endpoint=args.at(-1);
    return JSON.stringify(endpoint==='/user'?{login:'tester',token:'must-not-leak'}:endpoint.startsWith('/search/')?{items:[repo],total_count:2}:endpoint.startsWith('/user/repos')?[repo]:repo);
  }};
  return {dir,calls,options,repo,get opened(){return opened;},auth(value){authenticated=value;},tick(){clock+=61000;},reply(value){reply=value;},close(){fs.rmSync(dir,{recursive:true,force:true});}};
}
test('GitHub koristi postojeću gh prijavu bez otvaranja browsera i čuva samo izbor integracije',async()=>{
  const f=fixture();try{
    const g=createGithub(f.options);assert.equal(g.status().connected,false);assert.equal(f.calls.length,0);
    await assert.rejects(g.repos(),/Poveži GitHub/);
    assert.equal((await g.connect()).username,'tester');assert.equal(f.opened,0);
    assert.deepEqual(JSON.parse(fs.readFileSync(path.join(f.dir,'github.json'),'utf8')),{enabled:true});
    assert.equal(fs.statSync(path.join(f.dir,'github.json')).mode&0o777,0o600);
    assert.ok(!JSON.stringify(g.status()).includes('must-not-leak'));
    g.disconnect();assert.equal(g.status().enabled,false);
    // Pored gh api dozvoljen je samo spisak naloga, bez --show-token.
    assert.ok(f.calls.every(args=>args[0]==='api' || args.join(' ')==='auth status --hostname github.com --json hosts'));
    assert.equal(createGithub(f.options).status().enabled,false);
  }finally{f.close();}
});
test('GitHub prijava iz podešavanja otvara Terminal samo jednom i provera je završava',async()=>{
  const f=fixture();try{
    f.auth(false);const g=createGithub(f.options);
    const results=await Promise.all([g.connect(),g.connect()]);assert.equal(results[0].state,'connecting');await g.connect();assert.equal(f.opened,1);
    assert.ok(!JSON.stringify(await g.refresh({force:true})).includes('must-not-leak'));
    f.auth(true);assert.equal((await g.refresh({force:true})).connected,true);
  }finally{f.close();}
});
test('GitHub spisak, pretraga, strane i detalji daju samo metapodatke repozitorijuma',async()=>{
  const f=fixture();try{
    const g=createGithub(f.options);await g.connect();
    const listed=await g.repos({page:2,perPage:1});assert.equal(listed.hasMore,true);assert.equal(listed.repos[0].fullName,'tester/example');assert.ok(!JSON.stringify(listed).includes('must-not-leak'));
    const endpoint=new URL(f.calls.at(-1).at(-1),'https://api.github.com');assert.equal(endpoint.searchParams.get('page'),'2');assert.equal(endpoint.searchParams.get('affiliation'),'owner,collaborator,organization_member');
    const found=await g.repos({q:'example',perPage:1});assert.equal(found.scope,'own');assert.equal(found.hasMore,true);
    assert.match(f.calls.at(-1).at(-1),/user%3Atester/);
    assert.equal((await g.repo('tester','example')).defaultBranch,'main');
    f.repo.name='.github';assert.equal((await g.repo('tester','.github')).fullName,'tester/.github');
    for(const args of [{page:0},{perPage:101},{page:NaN},{q:'x'.repeat(121)}])await assert.rejects(g.repos(args));
    await assert.rejects(g.repo('tester','../secret'));
    f.auth(false);f.tick();await assert.rejects(g.repos(),/nije povezan/);assert.equal(g.status().connected,false);
  }finally{f.close();}
});
test('prekid GitHub veze tokom provere ili čitanja ne vraća nalog i ne otvara prijavu',async()=>{
  const f=fixture();try{
    let release;f.reply(()=>new Promise(resolve=>{release=resolve;}));const g=createGithub(f.options);
    const connection=g.connect();g.disconnect();release(JSON.stringify({login:'tester'}));
    await assert.rejects(connection,/promenjena/);assert.equal(g.status().connected,false);assert.equal(f.opened,0);
    f.reply(null);await g.connect();f.reply(()=>new Promise(resolve=>{release=resolve;}));
    const reading=g.repo('tester','example');await new Promise(resolve=>setImmediate(resolve));g.disconnect();release(JSON.stringify(f.repo));
    await assert.rejects(reading,/promenjena/);
  }finally{f.close();}
});
test('jedan neuspeo GitHub poziv ne prekida vezu',async()=>{
  const f=fixture();try{
    const g=createGithub(f.options);await g.connect();
    let failed=0;f.reply(args=>{if(args.at(-1)==='/user' && failed++===0)throw Error('mreža');return JSON.stringify({login:'tester'});});
    const result=await g.refresh({force:true});assert.equal(result.connected,true);assert.equal(result.error,'');assert.equal(failed,2);
  }finally{f.close();}
});
