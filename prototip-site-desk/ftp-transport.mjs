import {spawn} from 'node:child_process';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {readFile,writeFile,mkdir,rename,lstat,readdir,chmod,access} from 'node:fs/promises';

const idCheck=id=>{if(!/^[a-zA-Z0-9-]{1,80}$/.test(id))throw Error('Neispravan projekat.');return id;};
const secretFile=(dataDir,id)=>path.join(dataDir,'credentials',idCheck(id)+'.password');
export async function hasFTPPassword(dataDir,id){try{await access(secretFile(dataDir,id));return true}catch{return false}}
export async function saveFTPPassword(dataDir,id,value){
 if(typeof value!=='string'||!value||value.length>4096||/[\r\n\0]/.test(value))throw Error('Unesi FTP lozinku bez preloma reda.');
 const dir=path.join(dataDir,'credentials');await mkdir(dir,{recursive:true,mode:0o700});await chmod(dir,0o700);
 const file=secretFile(dataDir,id),temp=file+'.'+randomUUID();await writeFile(temp,value,{mode:0o600});await rename(temp,file);await chmod(file,0o600);
}
const configValue=value=>'"'+String(value).replaceAll('\\','\\\\').replaceAll('"','\\"').replaceAll('\n','\\n').replaceAll('\r','\\r')+'"';
export function curlTransfer(config,{spawnProcess=spawn}={}){
 return new Promise((resolve,reject)=>{
  // Prvi -q isključuje korisnikov .curlrc; tajna putuje samo standardnim ulazom.
  const child=spawnProcess('curl',['-q','--config','-'],{stdio:['pipe','pipe','pipe'],env:{...process.env},windowsHide:true});
  let output='',finished=false;
  const finish=(error)=>{if(finished)return;finished=true;clearTimeout(timer);if(error)reject(error);else resolve(output);};
  const timer=setTimeout(()=>{child.kill('SIGKILL');finish(Error('FTP prenos je prekoračio dozvoljeno vreme.'));},135000);timer.unref();
  child.stdout.on('data',chunk=>{output+=chunk.toString();if(output.length>2*1024*1024){child.kill('SIGKILL');finish(Error('FTP odgovor je prevelik.'));}});
  child.stderr.on('data',()=>{});child.stdin.on('error',()=>{});
  child.on('error',()=>finish(Error('curl nije dostupan. Instaliraj curl sa FTP/FTPS podrškom.')));
  child.on('close',code=>finish(code===0?null:Error('FTP/FTPS operacija nije uspela. Proveri adresu, prijavu, sertifikat i dozvole foldera.')));
  child.stdin.end(config);
 });
}
export function createFTPTransport({dataDir,transfer=curlTransfer}){
 async function invoke(s,{file='',list=false,download,upload}){
  const h=s.hosting;let password;try{password=await readFile(secretFile(dataDir,s.id),'utf8')}catch{throw Error('FTP lozinka nije sačuvana. Unesi je u podešavanjima hostinga.');}
  const scheme=h.type==='ftps-implicit'?'ftps':'ftp';
  const remote=(h.remote==='/'?'':h.remote)+'/'+file;
  const url=`${scheme}://${h.host}:${h.port}/`+remote.split('/').map(encodeURIComponent).join('/')+(list&&!remote.endsWith('/')?'/':'');
  const lines=['silent','show-error','globoff','ftp-skip-pasv-ip','connect-timeout = 10','max-time = 120','proxy = ""','proto = "=ftp,ftps"',`url = ${configValue(url)}`,`user = ${configValue(h.user+':'+password)}`];
  if(h.type!=='ftp')lines.push('ssl-reqd');
  if(list)lines.push('list-only');
  if(download)lines.push(`output = ${configValue(download)}`);
  if(upload)lines.push('ftp-create-dirs',`upload-file = ${configValue(upload)}`);
  // Ne vraćaj curl konfiguraciju ili stderr u API/dnevnik, jer sadrže pristupne podatke.
  return transfer(lines.join('\n')+'\n');
 }
 async function files(folder,relative=''){
  const result=[];for(const name of (await readdir(path.join(folder,relative))).sort()){
   if(/[\r\n\0]/.test(name)||name==='.'||name==='..')throw Error('Build sadrži nepodržan naziv fajla.');
   const rel=relative?relative+'/'+name:name,info=await lstat(path.join(folder,rel));
   if(info.isSymbolicLink())throw Error('Build sadrži simboličku vezu.');
   if(info.isDirectory())result.push(...await files(folder,rel));else if(info.isFile())result.push(rel);
  }return result;
 }
 return {
  async probe(s){await invoke(s,{list:true});return {ok:true};},
  async deploy(s,approved){
   const names=await files(approved.build.folder),backup=path.join(dataDir,'backups',s.id,randomUUID());await mkdir(backup,{recursive:true,mode:0o700});
   const cache=new Map(),manifest={siteId:s.id,at:Date.now(),status:'backing-up',existing:[],added:[],uploaded:[]};
   const record=()=>writeFile(path.join(backup,'manifest.json'),JSON.stringify(manifest,null,2),{mode:0o600});await record();
   async function listing(dir){
    if(cache.has(dir))return cache.get(dir);
    if(dir){const parent=path.posix.dirname(dir)==='.'?'':path.posix.dirname(dir),entries=await listing(parent);if(!entries||!entries.has(path.posix.basename(dir))){cache.set(dir,null);return null;}}
    const data=await invoke(s,{file:dir,list:true});const entries=new Set(data.split(/\r?\n/).filter(Boolean).map(n=>path.posix.basename(n.replace(/\/$/,''))));cache.set(dir,entries);return entries;
   }
   try{
    // Sve postojeće fajlove koji će biti prepisani sačuvaj pre prvog upisa na server.
    await listing('');
    for(const rel of names){const parent=path.posix.dirname(rel)==='.'?'':path.posix.dirname(rel),entries=await listing(parent);
     if(entries?.has(path.posix.basename(rel))){const target=path.join(backup,'files',rel);await mkdir(path.dirname(target),{recursive:true,mode:0o700});await writeFile(target,'',{mode:0o600});await invoke(s,{file:rel,download:target});await chmod(target,0o600);manifest.existing.push(rel);}
     else manifest.added.push(rel);
    }
    manifest.status='uploading';await record();
    for(const rel of names){await invoke(s,{file:rel,upload:path.join(approved.build.folder,rel)});manifest.uploaded.push(rel);await record();}
    manifest.status='done';await record();return {ok:true,backup,revision:approved.revision,note:'FTP objava; lokalna rezerva prepisanih fajlova. Udaljeni višak nije brisan.'};
   }catch{
    manifest.status='failed';await record();throw Error('FTP objava nije završena. Proveri server pre ponavljanja. Lokalna rezerva i dnevnik: '+backup);
   }
  }
 };
}
