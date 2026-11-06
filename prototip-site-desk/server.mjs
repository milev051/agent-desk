import http from 'node:http';
import path from 'node:path';
import os from 'node:os';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {randomUUID} from 'node:crypto';
import {readFile,writeFile,mkdir,rename,realpath,stat,access,constants} from 'node:fs/promises';
import {saveFTPPassword,hasFTPPassword} from './ftp-transport.mjs';
import {createRuntime} from './agent-runtime.mjs';
import {createOperations,validateHosting,githubURL} from './project-operations.mjs';

const root=path.dirname(fileURLToPath(import.meta.url));
export function createSiteDesk({dataDir=path.join(root,'data'),port=4390,apiPort=4392,runtimeOptions={},operationsFactory=createOperations}={}){
 const file=path.join(dataDir,'projects.json'),store={projects:[]};let saving=Promise.resolve(),mutating=Promise.resolve(),closing=false;
 const save=()=>{const data=JSON.stringify(store.projects.map(({messages,sessions,chatId,...project})=>project),null,2);saving=saving.then(async()=>{await writeFile(file+'.new',data,{mode:0o600});await rename(file+'.new',file);});return saving;};
 const ready=(async()=>{await mkdir(dataDir,{recursive:true,mode:0o700});try{const projects=JSON.parse(await readFile(file,'utf8'));if(!Array.isArray(projects))throw Error('Neispravni podaci.');store.projects=projects;for(const s of projects){s.messages=[];s.sessions={};s.chatId=randomUUID();}await save();}catch(e){if(e.code!=='ENOENT')throw e;}})();
 const runtime=createRuntime({store,save,...runtimeOptions}),ops=operationsFactory({dataDir});
 const publicSite=s=>{const {messages,sessions,chatId,approved,...visible}=s;return {...visible,approved:approved?{id:approved.id,revision:approved.revision,head:approved.head,hasBuild:!!approved.build,createdAt:approved.createdAt}:null};};
 async function folder(value){if(typeof value!=='string'||!path.isAbsolute(value))throw Error('Unesi apsolutnu putanju foldera.');const dir=await realpath(value);if([path.parse(dir).root,os.homedir(),root,path.dirname(root)].includes(dir)||dir.split(path.sep).some(p=>['.ssh','.config'].includes(p))||!(await stat(dir)).isDirectory())throw Error('Izaberi poseban lokalni folder sajta.');return dir;}
 async function add(body){
   if(typeof body.name!=='string'||!body.name.trim()||body.name.length>100)throw Error('Unesi naziv sajta.');
   let domain='';if(body.domain){let url;try{url=new URL(body.domain.includes('://')?body.domain:'https://'+body.domain);}catch{throw Error('Neispravan domen.');}if(!['http:','https:'].includes(url.protocol)||url.username||url.password||url.port||url.pathname!=='/'||url.search||url.hash)throw Error('Unesi samo domen, bez putanje i tajni.');domain=url.origin;}
   if(typeof body.folder!=='string'||!path.isAbsolute(body.folder))throw Error('Unesi apsolutnu lokalnu putanju.');
   if(store.projects.some(s=>s.folder===path.resolve(body.folder)))throw Error('Folder je već povezan.');
   const agent=body.agent||'codex';if(!runtime.agents().some(a=>a.id===agent))throw Error('Nepoznat agent.');
   if(body.repo){githubURL(body.repo);try{await access(body.folder);throw Error('Za kloniranje izaberi nov, nepostojeći folder.');}catch(e){if(e.code!=='ENOENT')throw e;}const parent=await folder(path.dirname(body.folder));await ops.clone(body.repo,path.join(parent,path.basename(body.folder)));}
   const dir=await folder(body.folder);if(store.projects.some(s=>s.folder===dir))throw Error('Folder je već povezan.');
   const s={id:randomUUID(),name:body.name.trim(),domain,folder:dir,agent,model:'',messages:[],sessions:{},hosting:null,approved:null,createdAt:Date.now(),history:[]};await ops.repo(s);store.projects.push(s);await save();return publicSite(s);
 }
 const body=async req=>{let data='';for await(const chunk of req){data+=chunk;if(Buffer.byteLength(data)>50000)throw Error('Zahtev je predugačak.');}try{return JSON.parse(data||'{}')}catch{throw Error('Neispravan JSON zahtev.');}};
 let web,api;
 const handler=isApi=>async(req,res)=>{
  const json=(code,data)=>{res.writeHead(code,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(data));};
  try{await ready;const url=new URL(req.url,'http://localhost'),webPort=web.address()?.port||port,actualPort=(isApi?api:web).address()?.port||(isApi?apiPort:port),hosts=[`127.0.0.1:${actualPort}`,`localhost:${actualPort}`];
   if(!hosts.includes(req.headers.host))return json(403,{error:'Program je dostupan samo lokalno na ovom računaru.'});
   if(url.pathname.startsWith('/api/')){
    if(!isApi||![`http://127.0.0.1:${webPort}`,`http://localhost:${webPort}`].includes(req.headers.origin))return json(403,{error:'Otvori samostalni Site Desk direktno na njegovoj lokalnoj adresi.'});
    res.setHeader('Access-Control-Allow-Origin',req.headers.origin);res.setHeader('Vary','Origin');res.setHeader('Access-Control-Allow-Methods','GET, POST, OPTIONS');res.setHeader('Access-Control-Allow-Headers','Content-Type');
    if(req.method==='OPTIONS'){res.writeHead(204);return res.end();}
    if(req.method==='GET'&&url.pathname==='/api/state')return json(200,{projects:store.projects.map(publicSite),agents:runtime.agents(),standalone:true});
    const match=url.pathname.match(/^\/api\/sites\/([a-f0-9-]+)\/(chat|new-chat|agent|status|send|stop|hosting|probe|approve|push|deploy)$/),s=match&&store.projects.find(p=>p.id===match[1]);
    if(req.method==='GET'&&match){if(!s)return json(404,{error:'Sajt nije pronađen.'});if(match[2]==='chat')return json(200,runtime.chat(s));if(match[2]==='status'){const revision=await ops.digest(s),state=await ops.status(s);let buildHash=null,buildError='';if(s.hosting)try{buildHash=(await ops.buildState(s)).hash}catch{buildError='Build nije spreman. Pokreni build projekta i proveri izlazni folder.';}if(revision!==await ops.digest(s))throw Error('Fajlovi su se promenili tokom pregleda. Ponovi pregled.');return json(200,{...state,revision,buildHash,buildError,approved:publicSite(s).approved,history:s.history});}}
    if(req.method==='POST'){
      const b=await body(req);const work=mutating.then(async()=>{
       if(closing)throw Error('Server se zaustavlja.');if(url.pathname==='/api/sites')return json(201,await add(b));
       if(!s)return json(404,{error:'Sajt nije pronađen.'});const action=match[2];
       if(action==='stop'){runtime.stop(s.id);return json(200,{ok:true});}
       if(action==='send'){
        if(typeof b.text!=='string'||!b.text.trim()||b.text.length>20000||typeof b.requestId!=='string'||!/^[-a-zA-Z0-9]{1,80}$/.test(b.requestId))throw Error('Unesi poruku i ID zahteva.');
        if(await folder(s.folder)!==s.folder)throw Error('Lokalni folder je promenjen.');await runtime.send(s,{text:b.text.trim(),requestId:b.requestId});return json(202,{ok:true});
       }
       if(runtime.isRunning(s.id))return json(409,{error:'Sačekaj da agent završi ili ga zaustavi.'});
       if(action==='new-chat'||action==='agent'){if(action==='agent'){if(!runtime.agents().some(a=>a.id===b.agent&&a.available))throw Error('Izabrani CLI agent nije instaliran.');s.agent=b.agent;s.model='';}s.messages=[];s.sessions={};s.chatId=randomUUID();await save();return json(200,publicSite(s));}
       if(action==='hosting'){const next=validateHosting(b);if(next.type!=='ssh'){const same=s.hosting&&s.hosting.host===next.host&&s.hosting.user===next.user&&s.hosting.type!=='ssh';if(b.password){await saveFTPPassword(dataDir,s.id,b.password);}else if(!same||!await hasFTPPassword(dataDir,s.id))throw Error('Unesi FTP lozinku za ovu adresu i korisnika.');next.hasPassword=true;}s.hosting=next;s.approved=null;await save();return json(200,publicSite(s));}
       if(action==='probe')return json(200,await ops.probe(s));
       if(action==='approve'){if(typeof b.revision!=='string'||b.revision!==await ops.digest(s))throw Error('Verzija se promenila od pregleda. Ponovi pregled.');const approved=await ops.approve(s);if(approved.revision!==b.revision||(approved.build?.hash||null)!==(b.buildHash||null))throw Error('Izvori ili build su promenjeni od pregleda. Ponovi pregled.');s.approved=approved;await save();return json(200,publicSite(s));}
       if(['push','deploy'].includes(action)){
        if(b.confirmed!==true)throw Error('Potvrdi slanje.');
        if(b.prepare===true){s.approved=await ops.approve(s,{includeBuild:action==='deploy'});await save();}
        const approvalId=b.prepare===true?s.approved.id:b.approvalId;if(typeof approvalId!=='string')throw Error('Nedostaje verzija za slanje.');
        const result=await ops[action](s,approvalId);s.history.unshift({action,at:Date.now(),...result});await save();return json(200,result);
       }
       return json(404,{error:'Radnja nije dostupna.'});
      });mutating=work.catch(()=>{});await work;return;
    }
    return json(404,{error:'Radnja nije dostupna.'});
   }
   if(!isApi&&req.method==='GET'&&['/','/index.html'].includes(url.pathname)){
    let html=await readFile(new URL('./index.html',import.meta.url),'utf8');html=html.replaceAll('__PHONE_ORIGIN__','""').replaceAll('__API_PORT__',String(api.address()?.port||apiPort)).replaceAll('__WEB_PORT__',String(webPort));
    res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff','Content-Security-Policy':`default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; connect-src 'self' http://127.0.0.1:${api.address()?.port||apiPort} http://localhost:${api.address()?.port||apiPort}; frame-src 'none'; frame-ancestors 'none'; object-src 'none'; base-uri 'none'`});return res.end(html);
   }
   return json(404,{error:'Nije pronađeno.'});
  }catch(e){if(!res.headersSent)json(e.status||400,{error:e.message});else res.end();}
 };
 web=http.createServer(handler(false));api=http.createServer(handler(true));
 return {web,api,ready,store,runtime,save,async close(){closing=true;runtime.close();await Promise.all([web,api].map(server=>new Promise(resolve=>{if(!server.listening)return resolve();server.close(resolve);server.closeAllConnections();})));await saving;}};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const port=Number(process.env.SITE_DESK_PORT||4390),apiPort=Number(process.env.SITE_DESK_API_PORT||port+2);const app=createSiteDesk({port,apiPort});await app.ready;
 app.web.on('error',e=>{console.error('Web port nije dostupan:',e.code);process.exitCode=1;void app.close();});app.api.on('error',e=>{console.error('API port nije dostupan:',e.code);process.exitCode=1;void app.close();});
 app.web.listen(port,'127.0.0.1',()=>console.log(`Site Desk samostalno: http://127.0.0.1:${port}/`));app.api.listen(apiPort,'127.0.0.1');
 const shutdown=()=>{void app.close().finally(()=>process.exit(0));};process.on('SIGINT',shutdown);process.on('SIGTERM',shutdown);
}
