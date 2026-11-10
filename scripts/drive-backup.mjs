#!/usr/bin/env node
// Lokalni backup Google Drive-a preko Agent Desk API-ja (server mora da radi).
// Upotreba: node scripts/drive-backup.mjs --dest ~/Backup/Drive [--account adresa] [--full "Putanja/foldera"]... [--docs] [--dry-run]
//  --full  folder (putanja od korena Drive-a) koji se kopira ceo, sa slikama i videom
//  --docs  iz ostatka Drive-a uzima samo dokumente (Docs/Sheets/Slides u Office formatu, PDF, Office, tekst, dizajn fajlove)
// Ponovno pokretanje preskače fajlove koji već postoje sa istom veličinom i datumom; spisak je u _manifest.json.
import fs from 'node:fs';import path from 'node:path';import os from 'node:os';import {pipeline} from 'node:stream/promises';import {Readable} from 'node:stream';
const api='http://127.0.0.1:4317/api/integrations/drive';
const args=process.argv.slice(2),opt=k=>{const i=args.indexOf(k);return i<0?null:args[i+1];},all=k=>args.flatMap((a,i)=>a===k?[args[i+1]]:[]);
const dest=path.resolve((opt('--dest') || '').replace(/^~/,os.homedir()));if(!opt('--dest')){console.error('Navedi --dest');process.exit(1);}
const account=opt('--account'),full=all('--full'),docsOnly=args.includes('--docs'),dry=args.includes('--dry-run');
const q=p=>account?{...p,account}:p;
async function get(route,params={}){const u=new URL(api+route);for(const [k,v] of Object.entries(q(params)))if(v)u.searchParams.set(k,v);const r=await fetch(u);if(!r.ok)throw Error(`${r.status} ${await r.text()}`);return r.json();}
const docTypes=/^(application\/(pdf|msword|rtf|zip|postscript|illustrator|json|xml|x-iwork|vnd\.(openxmlformats|ms-|oasis|apple|google-apps\.(document|spreadsheet|presentation|drawing|script))|x-photoshop)|image\/(svg|x-photoshop|vnd\.adobe)|text\/)/;
const safe=s=>s.replace(/[\/\x00-\x1f]/g,'_').replace(/^\.+/,'_').slice(0,200).trim() || '_';
const files=[];let token='';do{const d=await get('/files',{maxResults:'100',pageToken:token});files.push(...d.files);token=d.nextPageToken;}while(token);
const byId=new Map(files.map(f=>[f.id,f]));
const pathOf=(f,depth=0)=>{const p=byId.get(f.parents?.[0]);return p && depth<40?[...pathOf(p,depth+1),safe(p.name)]:[];};
const manifestFile=path.join(dest,'_manifest.json');const manifest=fs.existsSync(manifestFile)?JSON.parse(fs.readFileSync(manifestFile,'utf8')):{};
const plan=[];
for(const f of files){
  if(/folder|shortcut/.test(f.mimeType))continue;
  const dirs=pathOf(f),rel=dirs.join('/');
  const inFull=full.some(p=>rel===p || rel.startsWith(p+'/'));
  if(!inFull && !(docsOnly && docTypes.test(f.mimeType)))continue;
  if(/vnd\.google-apps\.(form|site|map|fusiontable)/.test(f.mimeType))continue;
  plan.push({f,dirs});
}
const total=plan.reduce((s,{f})=>s+Number(f.size || 0),0);
console.log(`Fajlova: ${plan.length}, oko ${(total/1e9).toFixed(2)} GB (Google Docs nisu uračunati)`);
if(dry){for(const {f,dirs} of plan.slice(0,50))console.log([...dirs,f.name].join('/'));process.exit(0);}
let done=0,skipped=0,failed=[];const used=new Set();
const save=()=>fs.writeFileSync(manifestFile,JSON.stringify(manifest,null,1));
async function one({f,dirs}){
  const prev=manifest[f.id];
  if(prev && prev.modifiedTime===f.modifiedTime && fs.existsSync(path.join(dest,prev.path))){skipped++;used.add(prev.path);return;}
  const r=await fetch(`${api}/files/${f.id}/download?`+new URLSearchParams(q({format:'office'})));
  if(!r.ok)throw Error(`${r.status} ${(await r.text()).slice(0,200)}`);
  const ext=r.headers.get('x-drive-extension') || '';let base=safe(f.name);if(ext && !base.toLowerCase().endsWith(ext))base+=ext;
  let rel=path.join(...dirs,base),n=1;while(used.has(rel) && manifest[f.id]?.path!==rel){const e=path.extname(base);rel=path.join(...dirs,`${path.basename(base,e)} (${++n})${e}`);}
  used.add(rel);const target=path.join(dest,rel);fs.mkdirSync(path.dirname(target),{recursive:true});
  await pipeline(Readable.fromWeb(r.body),fs.createWriteStream(target+'.part'));fs.renameSync(target+'.part',target);
  const t=new Date(f.modifiedTime);if(!isNaN(t))fs.utimesSync(target,t,t);
  manifest[f.id]={path:rel,modifiedTime:f.modifiedTime,mimeType:f.mimeType,size:f.size || null,webViewLink:f.webViewLink};done++;
}
for(const {f} of plan){const p=manifest[f.id];if(p)used.add(p.path);}
let i=0;const workers=Array.from({length:4},async()=>{while(i<plan.length){const item=plan[i++];try{await one(item);}catch(e){failed.push({name:[...item.dirs,item.f.name].join('/'),error:e.message});}if((done+skipped+failed.length)%25===0){save();console.log(`${done+skipped+failed.length}/${plan.length}`);}}});
await Promise.all(workers);save();
fs.writeFileSync(path.join(dest,'_greske.json'),JSON.stringify(failed,null,1));
console.log(`Gotovo: preuzeto ${done}, preskočeno ${skipped}, greške ${failed.length}`);
