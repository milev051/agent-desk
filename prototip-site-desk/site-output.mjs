import path from 'node:path';
import {readFile,lstat,realpath} from 'node:fs/promises';

export function validateOutput(value){
 if(typeof value!=='string'||!value||path.isAbsolute(value)||value.split(/[\\/]/).some(p=>p==='..'||p==='.'||['.env','.git','.ssh','.config','node_modules','data','src','server'].includes(p)))throw Error('Agent treba da podesi poseban izlazni folder sajta.');
 return value;
}
async function jsonFile(file,label){try{const info=await lstat(file);if(info.isSymbolicLink()||info.size>1024*1024)throw Error('Neispravan konfiguracioni fajl.');return JSON.parse(await readFile(file,'utf8'))}catch(e){if(e.code==='ENOENT')return null;throw Error(`Agent treba da proveri ${label}.`);}}
async function ready(folder,output){try{const source=await realpath(path.join(folder,output));if(!source.startsWith(folder+path.sep))throw Error('outside');const info=await lstat(path.join(source,'index.html'));return info.isFile()&&!info.isSymbolicLink();}catch{return false;}}
export async function resolveSiteOutput(folder,configured='auto'){
 const configFile=path.join(folder,'site-desk.json');try{if((await lstat(configFile)).isSymbolicLink())throw Error('site-desk.json ne sme biti simbolička veza.');}catch(e){if(e.code!=='ENOENT')throw e;}
 const config=await jsonFile(configFile,'site-desk.json');
 const output=config?.output||configured||'auto';
 if(output!=='auto')return {output:validateOutput(output),staticRoot:false};
 const pkg=await jsonFile(path.join(folder,'package.json'),'package.json'),deps={...pkg?.dependencies,...pkg?.devDependencies};
 const candidates=[];for(const dir of ['dist','.output/public','out','build'])if(await ready(folder,dir))candidates.push(dir);
 const preferred=deps?.nuxt?'.output/public':deps?.next?'out':deps?.['react-scripts']?'build':deps?.vite||deps?.astro?'dist':null;
 if(preferred&&candidates.includes(preferred))return {output:preferred,staticRoot:false};
 if(candidates.length===1)return {output:candidates[0],staticRoot:false};
 if(candidates.length>1)throw Error('Postoji više izlaznih foldera. Zatraži od agenta da izabere onaj za objavu.');
 const needsBuild=!!pkg?.scripts?.build||['nuxt','next','vite','astro','react-scripts','webpack','parcel'].some(key=>deps?.[key]);
 if(!needsBuild){try{const info=await lstat(path.join(folder,'index.html'));if(info.isFile()&&!info.isSymbolicLink())return {output:'.',staticRoot:true};}catch{}}
 throw Error('Sajt još nije spreman za objavu. Zatraži od agenta da pripremi statični build i podesi izlazni folder.');
}
const excluded=new Set(['node_modules','data','src','server','api','test','tests','tools','scripts','coverage','dist','build','out']);
export function staticRootFile(relative,isDirectory){
 const parts=relative.split('/');if(parts.some(p=>excluded.has(p)||p.startsWith('.')&&p!=='.well-known'))return false;
 if(isDirectory)return true;
 if(/^(?:package(?:-lock)?|npm-shrinkwrap|site-desk|tsconfig[^/]*|jsconfig|composer(?:\.lock)?)\.json$/i.test(path.posix.basename(relative)))return false;
 return /\.(?:html?|css|js|mjs|json|xml|txt|svg|webp|png|jpe?g|gif|ico|avif|woff2?|ttf|otf|eot|wasm|mp4|webm|mp3|ogg|pdf)$/i.test(relative);
}
