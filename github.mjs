import fs from 'node:fs';
import path from 'node:path';
import {execFile} from 'node:child_process';

const execute=(file,args)=>new Promise((resolve,reject)=>execFile(file,args,{timeout:20000,maxBuffer:2*1024*1024,env:{...process.env,GH_PROMPT_DISABLED:'1',GH_NO_UPDATE_NOTIFIER:'1',GIT_TERMINAL_PROMPT:'0'}},(error,stdout)=>error?reject(error):resolve(stdout)));
const segment=value=>typeof value==='string' && /^[a-zA-Z0-9_.-]{1,100}$/.test(value) && value!=='.' && value!=='..';
function repository(data){
  if(!data || !segment(data.owner?.login) || !segment(data.name))throw Error('GitHub nije vratio ispravan repozitorijum.');
  const fullName=data.owner.login+'/'+data.name;
  return {fullName,url:'https://github.com/'+fullName,cloneUrl:'https://github.com/'+fullName+'.git',private:data.private===true,archived:data.archived===true,defaultBranch:typeof data.default_branch==='string'?data.default_branch:'',description:typeof data.description==='string'?data.description.slice(0,500):'',pushedAt:data.pushed_at || null};
}

export function createGithub({configDir,executable,run=execute,openLogin=async()=>{},now=Date.now,fetchImpl=fetch}={}){
  const file=path.join(configDir,'github.json');
  let enabled=false;try{enabled=JSON.parse(fs.readFileSync(file,'utf8')).enabled===true;}catch{}
  let accounts=[],avatars=new Map(),connected=false,username='',error='',checkedAt=null,loginUntil=0,pending=null,connecting=null,epoch=0;
  const persist=()=>{fs.mkdirSync(configDir,{recursive:true,mode:0o700});fs.writeFileSync(file,JSON.stringify({enabled})+'\n',{mode:0o600});};
  const status=()=>({installed:!!executable,enabled,connected:enabled && connected,username:enabled?username:'',state:!executable?'unavailable':!enabled?'disconnected':connected?'connected':loginUntil>now()?'connecting':'disconnected',readOnly:true,canWrite:false,checkedAt,error,accounts:enabled?accounts:[]});
  // Svi nalozi iz gh prijave (gh auth login dodaje nalog, gh auth switch bira aktivni); tokeni se ne čitaju.
  async function loadAccounts(){
    try{const data=JSON.parse(await run(executable,['auth','status','--hostname','github.com','--json','hosts']));
      accounts=(data?.hosts?.['github.com'] || []).filter(a=>segment(a?.login)).map(a=>({login:a.login,active:a.active===true,ok:a.state==='success'}));}catch{}
  }
  async function api(endpoint){
    if(!executable)throw Error('GitHub CLI nije instaliran. Instaliraj gh, pa ponovo poveži nalog.');
    // Never return CLI stderr, authentication status output or credentials to callers.
    try{return JSON.parse(await run(executable,['api','--hostname','github.com',endpoint]));}
    catch{throw Error('GitHub zahtev nije uspeo. Proveri internet, prijavu i pristup repozitorijumu.');}
  }
  async function refresh({force=false}={}){
    if(!enabled || !executable)return status();
    if(pending)return pending;
    if(!force && checkedAt!==null && now()-checkedAt<(loginUntil>now()?3000:60000))return status();
    const generation=epoch;
    const work=(async()=>{
      try{
        const user=await api('/user');
        if(!segment(user?.login))throw Error();
        if(generation!==epoch)return status();
        username=user.login;connected=true;error='';loginUntil=0;await loadAccounts();
      }catch{
        if(generation!==epoch)return status();
        connected=false;username='';error=loginUntil>now()?'':'GitHub prijava nije potvrđena. Proveri vezu ili poveži nalog.';
      }
      if(generation===epoch)checkedAt=now();
      return status();
    })();
    pending=work;try{return await work;}finally{if(pending===work)pending=null;}
  }
  async function requireConnection(){
    if(!enabled)throw Error('Poveži GitHub u podešavanjima Agent Deska.');
    await refresh();if(!connected)throw Error('GitHub nije povezan. Proveri prijavu u podešavanjima.');
    return epoch;
  }
  function guard(generation){if(!enabled || generation!==epoch)throw Error('GitHub veza je promenjena.');}
  return {
    status,refresh,
    async connect(){
      if(connecting)return connecting;
      const work=(async()=>{
        if(!executable)throw Error('GitHub CLI nije instaliran. Instaliraj gh, pa ponovo poveži nalog.');
        if(loginUntil>now())return status();
        const generation=epoch;
        enabled=true;persist();await refresh({force:true});guard(generation);
        if(connected)return status();
        try{await openLogin();guard(generation);loginUntil=now()+600000;error='';return status();}
        catch{if(generation===epoch){enabled=false;persist();}throw Error('GitHub prijava nije otvorena. Povezivanje pokreni na računaru.');}
      })();
      connecting=work;try{return await work;}finally{if(connecting===work)connecting=null;}
    },
    async switchAccount(login){
      if(!enabled || !executable)throw Error('Poveži GitHub u podešavanjima Agent Deska.');
      if(!accounts.some(a=>a.login===login))throw Object.assign(Error('GitHub nalog nije u gh prijavi.'),{status:404});
      try{await run(executable,['auth','switch','--hostname','github.com','--user',login]);}catch{throw Error('GitHub nalog nije promenjen.');}
      epoch++;pending=null;return refresh({force:true});
    },
    async addAccount(){
      if(!executable)throw Error('GitHub CLI nije instaliran.');
      try{await openLogin();}catch{throw Error('GitHub prijava nije otvorena. Povezivanje pokreni na računaru.');}
      enabled=true;persist();loginUntil=now()+600000;checkedAt=null;return status();
    },
    // Odjava jednog naloga iz gh prijave; kad nestane poslednji, GitHub se isključuje u Agent Desku.
    async removeAccount(login){
      if(!executable)throw Error('GitHub CLI nije instaliran.');
      if(!accounts.some(a=>a.login===login))throw Object.assign(Error('GitHub nalog nije u gh prijavi.'),{status:404});
      try{await run(executable,['auth','logout','--hostname','github.com','--user',login]);}catch{throw Error('GitHub nalog nije uklonjen.');}
      accounts=accounts.filter(a=>a.login!==login);avatars.delete(login);epoch++;pending=null;
      if(!accounts.length){enabled=false;connected=false;username='';persist();return status();}
      return refresh({force:true});
    },
    async avatar(login){
      if(!accounts.some(a=>a.login===login))return null;
      const cached=avatars.get(login);if(cached && now()-cached.at<86400000)return cached.data;
      try{const response=await fetchImpl('https://github.com/'+login+'.png?size=96',{signal:AbortSignal.timeout(15000)});
        if(!response.ok || !(response.headers.get('content-type') || '').startsWith('image/'))return null;
        const data=Buffer.from(await response.arrayBuffer());if(data.length>500000)return null;avatars.set(login,{data,at:now()});return data;}catch{return null;}
    },
    disconnect(){epoch++;pending=null;connecting=null;enabled=false;connected=false;username='';error='';checkedAt=null;loginUntil=0;persist();return status();},
    async repos({q='',page=1,perPage=30}={}){
      if(typeof q!=='string' || q.length>120 || !Number.isInteger(page) || page<1 || page>1000 || !Number.isInteger(perPage) || perPage<1 || perPage>100)throw Error('Neispravna pretraga ili strana repozitorijuma.');
      const generation=await requireConnection();
      const query=q.trim().replace(/[^\p{L}\p{N}_. -]/gu,'');
      const endpoint=query?'/search/repositories?'+new URLSearchParams({q:query+' in:name user:'+username+' fork:true',per_page:String(perPage),page:String(page),sort:'updated'}):'/user/repos?'+new URLSearchParams({per_page:String(perPage),page:String(page),sort:'updated',affiliation:'owner,collaborator,organization_member'});
      const result=await api(endpoint);guard(generation);
      const items=query?result.items:result;
      if(!Array.isArray(items))throw Error('GitHub nije vratio spisak repozitorijuma.');
      return {repos:items.map(repository),page,perPage,hasMore:query?page*perPage<result.total_count:items.length===perPage,scope:query?'own':'accessible'};
    },
    async repo(owner,name){
      if(!segment(owner) || !segment(name))throw Error('Neispravno ime repozitorijuma.');
      const generation=await requireConnection(),result=repository(await api('/repos/'+owner+'/'+name));guard(generation);return result;
    }
  };
}
