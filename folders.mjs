import fs from 'node:fs';
import path from 'node:path';
import {randomUUID} from 'node:crypto';

export const folderLimit=12;
export const automaticFolderName=name=>!name?.trim() || /^(novi folder|new folder|untitled|empty|folder(?: \d+)?)$/i.test(name.trim());
const starter=[{name:'Privatno'},{name:'Projekti'}];

function clean(name){
  if(typeof name!=='string')throw new Error('Unesi naziv foldera.');
  const title=name.trim();
  if(!title || title.length>40)throw new Error('Naziv foldera ima od 1 do 40 znakova.');
  return title;
}
function valid(folder){
  return folder && typeof folder.id==='string' && /^[\w-]{1,80}$/.test(folder.id) && typeof folder.name==='string' && folder.name.trim() && folder.name.length<=40;
}

export function createFolders(file){
  function read(){
    try{const data=JSON.parse(fs.readFileSync(file,'utf8'));if(Array.isArray(data))return data.filter(valid).slice(0,folderLimit);}catch{}
    return null;
  }
  function write(list){
    fs.mkdirSync(path.dirname(file),{recursive:true,mode:0o700});
    fs.writeFileSync(file,JSON.stringify(list),{mode:0o600});
  }
  let list=read();
  if(!list){list=starter.map(folder=>({id:randomUUID(),name:folder.name}));write(list);}
  return {
    list:()=>list.map(folder=>({...folder})),
    has:id=>list.some(folder=>folder.id===id),
    add(name){
      if(list.length>=folderLimit)throw new Error(`Moguće je najviše ${folderLimit} foldera.`);
      const auto=automaticFolderName(name);
      const folder={id:randomUUID(),name:auto?(name?.trim()||'Novi folder'):clean(name),nameAuto:auto};
      list.push(folder);write(list);return {...folder};
    },
    rename(id,name){
      const folder=list.find(item=>item.id===id);
      if(!folder)throw new Error('Folder nije pronađen.');
      folder.name=clean(name);folder.nameAuto=false;write(list);return {...folder};
    },
    update(id,changes){
      const folder=list.find(item=>item.id===id);
      if(!folder)throw new Error('Folder nije pronađen.');
      const auto=changes.name!==undefined && automaticFolderName(changes.name);
      const name=changes.name===undefined?folder.name:auto?'Novi folder':clean(changes.name);
      if(changes.shared!==undefined && typeof changes.shared!=='boolean')throw new Error('Izaberi da li folder deli kontekst.');
      folder.name=name;if(changes.name!==undefined)folder.nameAuto=auto;if(changes.shared!==undefined)folder.shared=changes.shared;
      write(list);return {...folder};
    },
    applyGeneratedName(id,name,expectedName){
      const folder=list.find(item=>item.id===id);
      if(!folder || folder.name!==expectedName || !(folder.nameAuto===true || (folder.nameAuto===undefined && automaticFolderName(folder.name))))return false;
      folder.name=clean(name);folder.nameAuto=false;write(list);return true;
    },
    remove(id){
      const index=list.findIndex(item=>item.id===id);
      if(index<0)throw new Error('Folder nije pronađen.');
      const [folder]=list.splice(index,1);
      write(list);return {...folder};
    },
  };
}
