import fs from 'node:fs';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {parseFolderColor,parseFolderEmoji} from './public/folder-face.mjs';

export const folderLimit=12;
export const automaticFolderName=name=>!name?.trim() || /^(novi folder|new folder|untitled|empty|folder(?: \d+)?)$/i.test(name.trim());
const starter=[{name:'Privatno'},{name:'Projekti'}];
// Neraspoređeni su folder sa nazivom, emotikonom i bojom kao ostali, ali ne može da se obriše ni da primi čet preko folderId.
export const unassignedId='unassigned';

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
    try{const data=JSON.parse(fs.readFileSync(file,'utf8'));if(Array.isArray(data))return data.filter(valid);}catch{}
    return null;
  }
  function write(){
    fs.mkdirSync(path.dirname(file),{recursive:true,mode:0o700});
    fs.writeFileSync(file,JSON.stringify([...list,unassigned]),{mode:0o600});
  }
  const saved=read();
  const unassigned={id:unassignedId,name:'Neraspoređeni',...(saved?.find(folder=>folder.id===unassignedId) ?? {}),system:true};
  let list=saved?saved.filter(folder=>folder.id!==unassignedId).slice(0,folderLimit):null;
  if(!list){list=starter.map(folder=>({id:randomUUID(),name:folder.name}));write();}
  return {
    list:()=>list.map(folder=>({...folder})),
    all:()=>[...list,unassigned].map(folder=>({...folder})),
    has:id=>list.some(folder=>folder.id===id),
    add(name){
      if(list.length>=folderLimit)throw new Error(`Moguće je najviše ${folderLimit} foldera.`);
      const auto=automaticFolderName(name);
      const folder={id:randomUUID(),name:auto?(name?.trim()||'Novi folder'):clean(name),nameAuto:auto};
      list.push(folder);write();return {...folder};
    },
    rename(id,name){
      const folder=list.find(item=>item.id===id);
      if(!folder)throw new Error('Folder nije pronađen.');
      folder.name=clean(name);folder.nameAuto=false;write();return {...folder};
    },
    update(id,changes){
      const folder=id===unassignedId?unassigned:list.find(item=>item.id===id);
      if(folder===unassigned)delete changes.shared;
      if(!folder)throw new Error('Folder nije pronađen.');
      const auto=changes.name!==undefined && automaticFolderName(changes.name);
      const name=changes.name===undefined?folder.name:auto?'Novi folder':clean(changes.name);
      if(changes.shared!==undefined && typeof changes.shared!=='boolean')throw new Error('Izaberi da li folder deli kontekst.');
      folder.name=name;if(changes.name!==undefined)folder.nameAuto=auto;if(changes.shared!==undefined)folder.shared=changes.shared;
      if(Object.hasOwn(changes,'emoji')){const emoji=parseFolderEmoji(changes.emoji);if(emoji)folder.emoji=emoji;else delete folder.emoji;folder.iconManual=true;}
      if(Object.hasOwn(changes,'color')){folder.color=parseFolderColor(changes.color);folder.iconManual=true;}
      write();return {...folder};
    },
    applyFace(id,{emoji,color},force=false){
      const folder=list.find(item=>item.id===id);
      if(!folder || (!force && (folder.iconManual || folder.emoji)))return false;
      folder.emoji=parseFolderEmoji(emoji);folder.color=parseFolderColor(color);write();return {...folder};
    },
    applyGeneratedName(id,name,expectedName){
      const folder=list.find(item=>item.id===id);
      if(!folder || folder.name!==expectedName || !(folder.nameAuto===true || (folder.nameAuto===undefined && automaticFolderName(folder.name))))return false;
      folder.name=clean(name);folder.nameAuto=false;write();return true;
    },
    remove(id){
      if(id===unassignedId)throw new Error('Folder Neraspoređeni ne može da se obriše.');
      const index=list.findIndex(item=>item.id===id);
      if(index<0)throw new Error('Folder nije pronađen.');
      const [folder]=list.splice(index,1);
      write();return {...folder};
    },
  };
}
