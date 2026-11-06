import {resolveSiteOutput,staticRootFile} from './site-output.mjs';
import {createFTPTransport} from './ftp-transport.mjs';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {readFile,writeFile,mkdir,lstat,readdir,realpath} from 'node:fs/promises';
const exec=promisify(execFile);
export const sensitive=name=>name.split(/[\\/]/).some(p=>/^\.env(?:\..*)?$|^\.git$|^\.ssh$|^\.config$|^(?:id_rsa|id_ed25519)(?:\..*)?$|^(?:tokens|credentials|client_secret.*)\.json$|\.(?:pem|key|p12|pfx)$/i.test(p));
export async function runCommand(program,args,{cwd,input,timeout=30000}={}){
  if(input!==undefined)throw Error('Standardni ulaz nije podržan za ovu operaciju.');
  try{return (await exec(program,args,{cwd,timeout,maxBuffer:8*1024*1024,env:{...process.env,GIT_TERMINAL_PROMPT:'0',GCM_INTERACTIVE:'never'},windowsHide:true})).stdout;}
  catch{throw Error(`${program}: operacija nije uspela. Proveri instalaciju, prijavu i pristup iz terminala.`);}
}
export function githubURL(value){
  if(typeof value!=='string')throw Error('Unesi GitHub adresu repozitorijuma.');
  if(/^git@github\.com:[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+(?:\.git)?$/.test(value))return value;
  if(/^https:\/\/github\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+\/?$/.test(value))return value.replace(/\/$/,'');
  throw Error('Dozvoljen je GitHub HTTPS ili git@github.com URL, bez tokena i lozinki.');
}
export function validateHosting(body){
  const {host,user,remote,identity='',output='auto',type='ssh'}=body;const port=body.port||(type==='ssh'?22:type==='ftps-implicit'?990:21);
  if(!['ssh','ftp','ftps','ftps-implicit'].includes(type))throw Error('Nepoznat način povezivanja.');
  if(typeof host!=='string'||!/^[-A-Za-z0-9.]{1,253}$/.test(host)||host.startsWith('-'))throw Error('Unesi SSH host ili alias iz svog SSH podešavanja.');
  if(typeof user!=='string'||!(type==='ssh'?/^[A-Za-z0-9_][A-Za-z0-9_.-]{0,63}$/:/^[^:\r\n\0]{1,180}$/).test(user))throw Error('Unesi korisničko ime.');
  if(!Number.isInteger(Number(port))||Number(port)<1||Number(port)>65535)throw Error('Neispravan SSH port.');
  if(typeof remote!=='string'||!/^\/[A-Za-z0-9_./-]*$/.test(remote)||remote.split('/').some(p=>p==='..'||p==='.')||type==='ssh'&&(remote.replaceAll('/','').length<3||['/etc','/usr','/bin','/sbin','/root','/home','/var','/var/www'].includes(remote.replace(/\/$/,''))))throw Error('Unesi poseban apsolutni folder sajta na serveru.');
  if(typeof output!=='string'||!output||path.isAbsolute(output)||output.split(/[\\/]/).some(p=>p==='..'||p==='.')||sensitive(output)||['src','public','node_modules','data'].includes(output.split(/[\\/]/)[0]))throw Error('Izaberi poseban build folder, npr. dist ili .output/public.');
  if(typeof identity!=='string'||identity&&(!path.isAbsolute(identity)||/[\r\n\0]/.test(identity)))throw Error('Ključ se bira apsolutnom putanjom, bez čitanja sadržaja.');
  return {type,host,user,remote:remote.replace(/\/+$/,'')||'/',identity:type==='ssh'?identity:'',output,port:Number(port)};
}
export function sshArgs(h){return ['-o','BatchMode=yes','-o','ConnectTimeout=10','-p',String(h.port),...(h.identity?['-i',h.identity]:[]),`${h.user}@${h.host}`];}
const quote=s=>"'"+s.replaceAll("'","'\\''")+"'";
export function createOperations({dataDir,run=runCommand,ftpTransfer}){
  const ftp=createFTPTransport({dataDir,...(ftpTransfer?{transfer:ftpTransfer}:{})});
  const git=(s,args)=>run('git',['-C',s.folder,...args]);
  async function repo(s){const top=await realpath((await git(s,['rev-parse','--show-toplevel'])).trim());if(top!==await realpath(s.folder))throw Error('Lokalni folder mora biti koren sopstvenog Git repozitorijuma.');}
  async function status(s){await repo(s);const [head,branch,changes,remote]=await Promise.all([git(s,['rev-parse','HEAD']).catch(()=>''),git(s,['branch','--show-current']),git(s,['status','--porcelain=v1','--untracked-files=normal']),git(s,['remote','get-url','origin']).catch(()=>'')]);return {head:head.trim(),branch:branch.trim(),changes:changes.trim(),remote:(()=>{try{return githubURL(remote.trim())}catch{return ''}})(),clean:!changes.trim()};}
  async function digest(s){await repo(s);const files=(await git(s,['ls-files','-co','--exclude-standard','-z'])).split('\0').filter(Boolean);const hash=createHash('sha256');let bytes=0;
    for(const file of [...new Set(files)].sort()){if(sensitive(file)||file.split('/').some(x=>['node_modules','.next','.nuxt','dist','data'].includes(x)))continue;const target=path.resolve(s.folder,file);if(!target.startsWith(s.folder+path.sep))throw Error('Neispravna putanja u repozitorijumu.');let info;try{info=await lstat(target)}catch(e){if(e.code==='ENOENT'){hash.update(file+'\0deleted');continue;}throw e;}if(info.isSymbolicLink())throw Error('Revizija ne podržava simboličke veze.');if(!info.isFile())continue;bytes+=info.size;if(bytes>100*1024*1024||files.length>20000)throw Error('Projekat je prevelik za trenutni pregled revizije.');hash.update(file+'\0');hash.update(await readFile(target));}
    const head=(await git(s,['rev-parse','HEAD']).catch(()=>'')).trim();return hash.update(head).digest('hex');
  }
  async function artifact(s,destination){const h=s.hosting;if(!h)throw Error('Prvo poveži hosting.');const resolved=await resolveSiteOutput(s.folder,h.output);const source=await realpath(path.join(s.folder,resolved.output));if(!(resolved.staticRoot&&source===s.folder)&&!source.startsWith(s.folder+path.sep))throw Error('Build mora biti unutar lokalnog projekta.');const hash=createHash('sha256');let count=0,bytes=0;
    async function walk(dir,relative=''){for(const name of (await readdir(dir)).sort()){const rel=relative?relative+'/'+name:name;if(resolved.staticRoot&&sensitive(rel))continue;if(sensitive(rel))throw Error('Build sadrži fajl sa nazivom za tajne ili pristupne podatke. Ukloni ga iz build izlaza.');const file=path.join(dir,name),info=await lstat(file);if(resolved.staticRoot&&!staticRootFile(rel,info.isDirectory()))continue;if(info.isSymbolicLink())throw Error('Build sadrži simboličku vezu.');if(info.isDirectory())await walk(file,rel);else if(info.isFile()){bytes+=info.size;if(++count>20000||bytes>200*1024*1024)throw Error('Build je prevelik.');const content=await readFile(file);hash.update(rel+'\0');hash.update(content);if(destination){const out=path.join(destination,rel);await mkdir(path.dirname(out),{recursive:true,mode:0o700});await writeFile(out,content,{mode:0o600});}}}}
    await walk(source);if(!count)throw Error('Build folder je prazan.');return {hash:hash.digest('hex'),count,bytes,output:resolved.output};
  }
  return {status,digest,repo,buildState:s=>artifact(s),
    async clone(url,folder){githubURL(url);await run('git',['clone','--',url,folder],{timeout:180000});},
    async probe(s){if(!s.hosting)throw Error('Prvo sačuvaj hosting.');if(s.hosting.type&&s.hosting.type!=='ssh')return ftp.probe(s);await run('ssh',[...sshArgs(s.hosting),'printf SITE_DESK_OK'],{timeout:15000});return {ok:true};},
    async approve(s,{includeBuild=true}={}){const revision=await digest(s),gitState=await status(s),id=crypto.randomUUID();let build=null;
      if(s.hosting&&includeBuild){const folder=path.join(dataDir,'releases',s.id,id);build=await artifact(s,folder);build.folder=folder;}
      if(revision!==await digest(s))throw Error('Fajlovi su se promenili tokom pregleda. Ponovi pregled.');
      return {id,revision,head:gitState.head,build,createdAt:Date.now(),hosting:s.hosting?JSON.stringify(s.hosting):''};
    },
    async push(s,approvalId){if(!s.approved||s.approved.id!==approvalId||await digest(s)!==s.approved.revision)throw Error('Fajlovi su se promenili tokom pripreme. Pokušaj slanje ponovo.');const current=await status(s);if(!current.clean||!current.head||!current.branch)throw Error('Zatraži od agenta da proveri izmene i napravi lokalni commit pre slanja na GitHub.');githubURL(current.remote);if(current.head!==s.approved.head)throw Error('Commit je promenjen tokom pripreme. Pokušaj slanje ponovo.');await git(s,['push','origin',`HEAD:refs/heads/${current.branch}`]);return {ok:true,head:current.head};},
    async deploy(s,approvalId){const approved=s.approved,h=s.hosting;if(!h||!approved?.build||approved.id!==approvalId||approved.hosting!==JSON.stringify(h)||await digest(s)!==approved.revision)throw Error('Verzija nije spremna ili se promenila. Pokušaj slanje ponovo.');
      // Ponovo proveri snapshot pre slanja; u objavu ide odobrena kopija, ne radni folder.
      const snapshotSite={...s,folder:dataDir,hosting:{...h,output:path.relative(dataDir,approved.build.folder)}};
      if((await artifact(snapshotSite)).hash!==approved.build.hash)throw Error('Odobreni build je promenjen. Ponovi pregled.');
      if(h.type&&h.type!=='ssh')return ftp.deploy(s,approved);
      const backup=h.remote+'.site-desk-backup-'+Date.now();
      await run('ssh',[...sshArgs(h),`test -d ${quote(h.remote)} && cp -a ${quote(h.remote)} ${quote(backup)}`],{timeout:180000});
      const ssh=['ssh',...sshArgs(h).slice(0,-1)].map(quote).join(' ');
      await run('rsync',['-rlt','--safe-links','--chmod=D755,F644','-e',ssh,'--',approved.build.folder+'/',`${h.user}@${h.host}:${h.remote}/`],{timeout:180000});
      return {ok:true,backup,revision:approved.revision,note:'Dodat i prepisan odobreni statični build; udaljeni višak fajlova nije brisan.'};
    }
  };
}
