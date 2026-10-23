import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {detectProject,applyDetected,projectDir,setProject} from '../chat-project.mjs';

const desk='/Users/a/Desktop/Agent Desk',fon='/Users/a/Desktop/ROOM211/FON',site=fon+'/id.fon.bg.ac.rs';
const rows=[{name:'Agent Desk',path:desk},{name:'FON',path:fon},{name:'FON knjižara',path:site}];
const ignore=[desk+'/data',desk+'/docs'];

test('projekat se određuje po najužem folderu iz komandi i izmena',()=>{
 const actions=[{kind:'command',text:`cd "${site}" && git status`},{kind:'file',change:true,text:site+'/resources/views/home.blade.php'},{kind:'command',text:`sed -n 1,20p "${desk}/docs/agent-environment.md"`},{kind:'command',text:'ls'}];
 assert.deepEqual(detectProject(actions,rows,{cwd:desk,ignore}),{dir:site,name:'FON knjižara',score:4});
});

test('prilozi i uputstva Agent Deska ne određuju projekat',()=>{
 const actions=[{kind:'file',text:desk+'/data/prilozi/c/slika.webp'},{kind:'command',text:`cat "${desk}/docs/google.md"`}];
 assert.equal(detectProject(actions,rows,{cwd:site,ignore}),null);
});

test('jedna komanda ili nerešen odnos ne menja projekat',()=>{
 assert.equal(detectProject([{kind:'command',text:`ls "${site}"`}],rows,{cwd:desk,ignore}),null);
 assert.equal(detectProject([{kind:'file',text:site+'/a'},{kind:'file',text:desk+'/b.mjs'}],rows,{cwd:desk,ignore}),null);
 assert.equal(detectProject([{kind:'file',text:'/Users/a/Desktop/Agent Desktop/x'}],rows,{cwd:site,ignore}),null);
});

test('automatski izbor ne gazi ručni i javlja samo stvarnu promenu',t=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'desk-project-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
 const chat={settings:{cwd:desk}};
 assert.equal(applyDetected(chat,{dir:desk,name:'Agent Desk'}),false);
 assert.equal(applyDetected(chat,{dir:site,name:'FON knjižara'}),true);
 assert.equal(applyDetected(chat,{dir:site,name:'FON knjižara'}),false);
 assert.equal(setProject(chat,dir,[{name:'Probni',path:dir}]).name,'Probni');
 assert.equal(applyDetected(chat,{dir:site,name:'FON knjižara'}),false);
 assert.equal(projectDir(chat),dir);
 assert.throws(()=>setProject(chat,'relativno',[]));
 assert.equal(setProject(chat,null,[]),null);assert.equal(chat.project,undefined);
});
