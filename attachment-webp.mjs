import fs from 'node:fs';
import path from 'node:path';
import {execFile} from 'node:child_process';

// Slike iz data/prilozi/ čuvaju se kao WebP (75%), jer PNG i JPG snimci ekrana zauzimaju desetine puta više.
const convertible=/\.(png|jpe?g)$/i;
const textFile=/\.(html?|md|txt|json|css|svg)$/i;
const run=(cmd,args)=>new Promise(resolve=>execFile(cmd,args,{timeout:120000},error=>resolve(!error)));
const findTool=name=>['/opt/homebrew/bin','/usr/local/bin','/usr/bin'].map(dir=>path.join(dir,name)).find(file=>fs.existsSync(file));

export function createWebpConverter({quality=75,tools={magick:findTool('magick'),cwebp:findTool('cwebp')},exec=run}={}){
  // magick ispravlja okretanje fotografija sa telefona; cwebp je rezerva.
  const encode=async(source,target)=>{
    if(tools.magick && await exec(tools.magick,[source,'-auto-orient','-quality',String(quality),target]))return true;
    if(tools.cwebp && await exec(tools.cwebp,['-quiet','-q',String(quality),'-metadata','icc',source,'-o',target]))return true;
    return false;
  };
  // Vraća putanju WebP fajla, ili original ako konverzija ne uspe ili ne smanji fajl. Original se briše samo uz keep:false.
  async function convert(file,{keep=false}={}){
    if(!convertible.test(file) || !fs.existsSync(file))return file;
    let target=file.replace(convertible,'.webp');
    for(let i=2;fs.existsSync(target);i++)target=file.replace(convertible,`-${i}.webp`);
    const temp=target+'.tmp.webp';
    try{
      if(!await encode(file,temp) || !fs.existsSync(temp) || fs.statSync(temp).size>=fs.statSync(file).size){fs.rmSync(temp,{force:true});return file;}
      fs.renameSync(temp,target);fs.chmodSync(target,0o600);if(!keep)fs.unlinkSync(file);return target;
    }catch(error){fs.rmSync(temp,{force:true});console.error('WebP:',error.message);return file;}
  }
  return {convert,available:()=>!!(tools.magick || tools.cwebp)};
}

// Menja stare putanje u svim tekstovima objekta, na mestu, da reference na objekte ostanu iste.
export function replacePaths(value,renames){
  let changed=false;
  const fix=text=>{let out=text;for(const [from,to] of renames)if(out.includes(from))out=out.split(from).join(to);if(out!==text)changed=true;return out;};
  const walk=node=>{if(Array.isArray(node)){for(let i=0;i<node.length;i++){if(typeof node[i]==='string')node[i]=fix(node[i]);else if(node[i] && typeof node[i]==='object')walk(node[i]);}}else if(node && typeof node==='object')for(const key of Object.keys(node)){if(typeof node[key]==='string')node[key]=fix(node[key]);else if(node[key] && typeof node[key]==='object')walk(node[key]);}};
  walk(value);return changed;
}

// Jednom prolazi kroz postojeće priloge: pretvara slike, menja putanje u četovima, arhivi i HTML/MD fajlovima istog foldera, pa briše originale.
export async function migrateAttachments({dataDir,chats,save,converter=createWebpConverter(),log=console.log}){
  const dir=path.join(dataDir,'prilozi'),marker=path.join(dir,'.webp-v1.json');
  if(!fs.existsSync(dir) || fs.existsSync(marker) || !converter.available())return null;
  const renames=new Map(),byFolder=new Map();let before=0,after=0;
  for(const folder of fs.readdirSync(dir)){
    const full=path.join(dir,folder);if(!fs.statSync(full).isDirectory())continue;
    for(const name of fs.readdirSync(full)){
      const file=path.join(full,name);if(!convertible.test(name) || !fs.statSync(file).isFile())continue;
      const size=fs.statSync(file).size,target=await converter.convert(file,{keep:true});
      if(target===file)continue;
      before+=size;after+=fs.statSync(target).size;renames.set(file,target);
      if(!byFolder.has(full))byFolder.set(full,[]);byFolder.get(full).push([name,path.basename(target)]);
    }
  }
  if(renames.size){
    if(replacePaths(typeof chats==='function'?chats():chats,renames))save();
    const archiveDir=path.join(dataDir,'archive');
    if(fs.existsSync(archiveDir))for(const name of fs.readdirSync(archiveDir).filter(n=>n.endsWith('.json'))){
      const file=path.join(archiveDir,name);try{const record=JSON.parse(fs.readFileSync(file,'utf8'));if(replacePaths(record,renames)){fs.writeFileSync(file+'.tmp',JSON.stringify(record,null,2),{mode:0o600});fs.renameSync(file+'.tmp',file);}}catch(error){console.error('WebP arhiva:',name,error.message);}
    }
    // HTML pregledi u istom folderu upućuju na slike samo imenom.
    for(const [folder,pairs] of byFolder){
      const local=new Map(pairs.sort((a,b)=>b[0].length-a[0].length).flatMap(([from,to])=>[[from,to],[encodeURIComponent(from),encodeURIComponent(to)]]));
      for(const name of fs.readdirSync(folder).filter(n=>textFile.test(n))){
        const file=path.join(folder,name),text=fs.readFileSync(file,'utf8');let out=text;
        for(const [from,to] of local)out=out.split(from).join(to);
        if(out!==text)fs.writeFileSync(file,out);
      }
    }
    for(const file of renames.keys())fs.rmSync(file,{force:true});
  }
  const report={at:new Date().toISOString(),converted:renames.size,before,after};
  fs.writeFileSync(marker,JSON.stringify(report,null,2),{mode:0o600});
  log(`WebP prilozi: ${renames.size} slika, ${(before/1e6).toFixed(0)} MB u ${(after/1e6).toFixed(0)} MB.`);
  return report;
}
