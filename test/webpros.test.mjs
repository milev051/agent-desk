import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {createWebpros} from '../webpros.mjs';

const json=(data,status=200,headers={})=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json',...headers}});
function fixture(t,options={}){
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'webpros-test-'));let auth,time=1000,handler;
  const calls=[];
  const fetchImpl=async(url,opts)=>{
    calls.push({url,opts});if(handler)return handler(url,opts);
    if(url.endsWith('/token'))return json({access_token:'fake-access',refresh_token:'fake-refresh',expires_in:3600});
    const msg=JSON.parse(opts.body);
    if(msg.method==='notifications/initialized')return new Response(null,{status:202});
    const result=msg.method==='initialize'?{protocolVersion:'2025-06-18'}:msg.method==='tools/list'?{tools:[{name:'si_cpanel_allowed_hosts_list',inputSchema:{type:'object'}},{name:'dashboard_servers_list',inputSchema:{type:'object'}},{name:'si_cpanel_user_api_method_execute',annotations:{readOnlyHint:true},inputSchema:{type:'object'}}]}:{content:[{type:'text',text:'done'}]};
    return json({jsonrpc:'2.0',id:msg.id,result},200,msg.method==='initialize'?{'mcp-session-id':'fake-session'}:{});
  };
  const w=createWebpros({configDir:dir,fetchImpl,callbackPort:0,now:()=>time,openBrowser:async url=>{auth=new URL(url);},...options});
  t.after(()=>{w.close();fs.rmSync(dir,{recursive:true,force:true});});
  return {w,dir,calls,get auth(){return auth;},set handler(v){handler=v;},clock(v){time=v;},callback(state=auth.searchParams.get('state')){const url=new URL(auth.searchParams.get('redirect_uri'));url.search=new URLSearchParams({state,code:'fake-code'});return fetch(url);},async login(){await w.connect();assert.equal((await this.callback()).status,200);}};
}

test('WebPros OAuth: state, PKCE, privatno čuvanje i MCP inicijalizacija',async t=>{
  const f=fixture(t);await f.w.connect();
  assert.equal((await f.callback('wrong')).status,400);assert.equal(f.calls.length,0);
  assert.equal(f.auth.searchParams.get('code_challenge_method'),'S256');
  assert.equal((await f.callback()).status,200);
  const tokenCall=f.calls[0];assert.equal(createHash('sha256').update(tokenCall.opts.body.get('code_verifier')).digest('base64url'),f.auth.searchParams.get('code_challenge'));
  assert.equal(f.w.status().connected,true);assert.equal(f.w.status().toolCount,3);assert.equal(f.w.status().canWrite,false);
  assert.equal(JSON.stringify(f.w.status()).includes('fake-access'),false);
  const file=path.join(f.dir,'webpros/connection.json');assert.equal(fs.statSync(file).mode&0o777,0o600);
  const list=f.calls.find(c=>typeof c.opts.body==='string' && JSON.parse(c.opts.body).method==='tools/list');assert.equal(list.opts.headers['Mcp-Session-Id'],'fake-session');assert.equal(list.opts.headers['MCP-Protocol-Version'],'2025-06-18');
  const restored=createWebpros({configDir:f.dir});assert.equal(restored.status().connected,true);assert.equal(restored.status().canWrite,false);restored.close();
});

test('WebPros: nepoznate i execute alate blokira bez dozvole i potvrde, bez obzira na annotations',async t=>{
  const f=fixture(t);await f.login();
  await f.w.call({name:'dashboard_servers_list'});
  await f.w.call({name:'si_cpanel_allowed_hosts_list',arguments:{page:1,pageSize:100}});
  await assert.rejects(f.w.call({name:'unknown'}),/nije dostupan/);
  const write={name:'si_cpanel_user_api_method_execute',arguments:{method:'example'}};
  await assert.rejects(f.w.call({...write,confirmed:true}),/dozvolu/);
  f.w.setWrite(true);await assert.rejects(f.w.call(write),/dozvolu/);
  await assert.rejects(f.w.call({...write,confirmed:true,readOnly:true}),/dozvolu/);
  const result=await f.w.call({...write,confirmed:true});assert.equal(result.content[0].text,'done');
  f.w.disconnect();assert.equal(f.w.status().connected,false);assert.equal(fs.existsSync(path.join(f.dir,'webpros/connection.json')),false);
});

test('WebPros: obnova tokena, JSON i SSE odgovor sa paginacijom alata',async t=>{
  const f=fixture(t);await f.login();f.clock(4000000);let refresh=0,pages=0;
  f.handler=(url,opts)=>{
    if(url.endsWith('/token')){refresh++;assert.equal(opts.body.get('grant_type'),'refresh_token');return json({access_token:'fake-new',expires_in:3600});}
    assert.equal(opts.headers.Authorization,'Bearer fake-new');const msg=JSON.parse(opts.body);
    if(msg.method==='tools/list'){pages++;const result=msg.params.cursor?{tools:[{name:'dashboard_websites_list'}]}:{tools:[{name:'dashboard_servers_list'}],nextCursor:'page2'};return new Response('event: message\r\ndata: '+JSON.stringify({jsonrpc:'2.0',id:msg.id,result})+'\r\n\r\n',{headers:{'Content-Type':'text/event-stream'}});}
    throw Error('unexpected request');
  };
  assert.equal((await f.w.listTools()).tools.length,2);assert.equal(refresh,1);assert.equal(pages,2);
});

test('WebPros: prekid veze tokom obnove ne vraća tokene na disk',async t=>{
  const f=fixture(t);await f.login();f.clock(4000000);let release,started;
  const ready=new Promise(r=>started=r);
  f.handler=()=>new Promise(r=>{release=r;started();});
  const work=f.w.verify();await ready;f.w.disconnect();release(json({access_token:'fake-late',expires_in:3600}));
  await assert.rejects(work,/promenjena/);assert.equal(f.w.status().connected,false);assert.equal(fs.existsSync(path.join(f.dir,'webpros/connection.json')),false);
});

test('WebPros: otkazivanje i odbijena prijava ne čuvaju prijavu niti spoljašnju grešku',async t=>{
  const f=fixture(t);await f.w.connect();const url=new URL(f.auth.searchParams.get('redirect_uri'));url.search=new URLSearchParams({state:f.auth.searchParams.get('state'),error:'access_denied',error_description:'fake-secret'});
  assert.equal((await fetch(url)).status,400);
  assert.equal(f.w.status().connected,false);assert.equal(JSON.stringify(f.w.status()).includes('fake-secret'),false);
  await f.w.connect();f.w.cancel();assert.equal(f.w.status().state,'disconnected');
});

test('WebPros: neuspešan tools/call se ne ponavlja',async t=>{
  const f=fixture(t);await f.login();f.w.setWrite(true);let count=0;
  f.handler=(url,opts)=>{const m=JSON.parse(opts.body);if(m.method==='tools/list')return json({id:m.id,result:{tools:[{name:'si_cpanel_user_api_method_execute'}]}});count++;return json({error:'fake-private-error'},500);};
  await assert.rejects(f.w.call({name:'si_cpanel_user_api_method_execute',confirmed:true}),/HTTP 500/);assert.equal(count,1);assert.equal(f.w.status().error.includes('fake-private'),false);
});
