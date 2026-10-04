import {test} from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {once} from 'node:events';
import {createPhoneAuth,createPhoneAccess} from '../phone-access.mjs';

test('jednokratna predaja pristupa: rotacija, rokovi, sesije i opoziv',()=>{
 let time=1000;const a=createPhoneAuth({now:()=>time,lifetime:60000,sessionLifetime:100000});
 const p=a.pairing();assert.equal(a.pairing().token,p.token);assert.equal(a.redeem('wrong'),null);
 time=p.expiresAt;assert.equal(a.redeem(p.token),null);const next=a.pairing();assert.notEqual(next.token,p.token);
 const session=a.redeem(next.token);assert.ok(session);assert.equal(a.redeem(next.token),null);assert.ok(a.valid(session));assert.equal(a.valid('wrong'),false);
 time+=100000;assert.equal(a.valid(session),false);assert.equal(a.count,0);
 const s=a.redeem(a.pairing().token);a.revoke();assert.equal(a.valid(s),false);assert.notEqual(a.pairing().token,next.token);
});

test('gateway štiti podatke, proverava Host/Origin i blokira radnje sa računara',async()=>{
 const upstream=http.createServer((req,res)=>{res.setHeader('Content-Type','application/json');res.end(JSON.stringify({host:req.headers.host,origin:req.headers.origin,cookie:req.headers.cookie,forwarded:req.headers['x-forwarded-for']}));});
 upstream.listen(0,'127.0.0.1');await once(upstream,'listening');
 const origin='https://agent.test.ts.net',access=createPhoneAccess({port:upstream.address().port,gatewayPort:0,origin});access.start();await once(access.server,'listening');const port=access.server.address().port;
 async function request(path,{method='GET',headers={},data}={}){return new Promise((resolve,reject)=>{const req=http.request({host:'127.0.0.1',port,path,method,headers:{Host:'agent.test.ts.net',...headers}},res=>{let body='';res.on('data',b=>body+=b);res.on('end',()=>resolve({status:res.statusCode,headers:res.headers,body}));});req.on('error',reject);req.end(data?JSON.stringify(data):undefined);});}
 try{
 assert.equal((await request('/api/chats')).status,401);
 assert.equal((await request('/app.js')).status,401);
 assert.equal((await request('/api/chats',{headers:{Host:'attacker.example'}})).status,403);
 assert.equal((await request('/login')).status,200);
 assert.ok(!(await request('/login')).body.includes((await access.info()).url));
 const token=new URL((await access.info()).url).hash.slice('#pair='.length);
 assert.equal((await request('/api/phone/login',{method:'POST',headers:{Origin:'https://evil.test'},data:{token}})).status,403);
 assert.equal((await request('/api/phone/login',{method:'POST',data:{token}})).status,403);
 const login=await request('/api/phone/login',{method:'POST',headers:{Origin:origin},data:{token}});assert.equal(login.status,200);
 const set=login.headers['set-cookie'][0];assert.match(set,/HttpOnly/);assert.match(set,/Secure/);assert.match(set,/SameSite=Strict/);const cookie=set.split(';')[0];
 assert.equal((await request('/api/phone/login',{method:'POST',headers:{Origin:origin},data:{token}})).status,401);
 const accepted=await request('/api/chats',{method:'POST',headers:{Origin:origin,Cookie:cookie,'X-Forwarded-For':'127.0.0.1'}});assert.equal(accepted.status,200);const result=JSON.parse(accepted.body);assert.equal(result.host,`127.0.0.1:${upstream.address().port}`);assert.equal(result.origin,`http://127.0.0.1:${upstream.address().port}`);assert.equal(result.cookie,undefined);assert.equal(result.forwarded,undefined);
 for(const path of ['/api/phone','/api/phone/qr','/api/title-settings','/api/title-settings/check','/api/chats/test/reveal','/api/chats/test/record','/api/antigravity/login'])assert.equal((await request(path,{headers:{Cookie:cookie}})).status,403,path);
 assert.equal((await request('/api/chats',{method:'POST',headers:{Cookie:cookie,Origin:'https://evil.test'}})).status,403);
 access.revoke();assert.equal((await request('/api/chats',{headers:{Cookie:cookie}})).status,401);
 }finally{access.close();upstream.closeAllConnections();await new Promise(resolve=>upstream.close(resolve));}
});
