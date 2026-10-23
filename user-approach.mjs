import fs from 'node:fs';
import path from 'node:path';

// Korisnikov stalni pristup: kratak tekst koji ide uz svaki glavni čet.
// Čuva se u data/, pa ostaje lokalan i ne ide u repo.
export const approachLimit=4000;
export function createUserApproach(file){
 return {
  get(){try{return fs.readFileSync(file,'utf8').trim();}catch{return '';}},
  set(value){
   const text=String(value ?? '').replace(/\r\n?/g,'\n').trim();
   if(text.length>approachLimit)throw Error(`Pristup može imati najviše ${approachLimit} znakova.`);
   fs.mkdirSync(path.dirname(file),{recursive:true});
   if(!text){fs.rmSync(file,{force:true});return '';}
   fs.writeFileSync(file+'.tmp',text+'\n',{mode:0o600});fs.renameSync(file+'.tmp',file);return text;
  }
 };
}
export function approachContext(text){
 if(!text)return '';
 return ` Korisnikov stalni pristup (podešava se u „Šta agent zna o aplikaciji“). Primenjuj ga na sadržajne odgovore: analize, tvrdnje, preporuke i odluke. Kod tehničkih potvrda ga ne ponavljaj. Kritiku i suprotno mišljenje daj posle glavnih redova, sažeto, a detaljno kad korisnik traži: «${text.replace(/\s+/g,' ')}»`;
}
