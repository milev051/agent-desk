import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {spawnSync} from 'node:child_process';
import {filePath,browseFiles,browseProject,gitSnapshot,fileChange,withFiles} from '../files.mjs';
test('pregled fajlova ne čita sadržaj i odbija skrivene putanje i symlink izlaz',()=>{
 const home=fs.mkdtempSync(path.join(os.tmpdir(),'desk-files-'));const elsewhere=fs.mkdtempSync(path.join(os.tmpdir(),'desk-other-'));
 try{fs.writeFileSync(path.join(home,'example.js'),'private file contents');fs.mkdirSync(path.join(home,'.config'));fs.writeFileSync(path.join(home,'.env'),'private');fs.symlinkSync(elsewhere,path.join(home,'outside'));
 const list=browseFiles(home,home,home);assert.deepEqual(list.entries.map(e=>e.name),['example.js']);assert.ok(!JSON.stringify(list).includes('private file contents'));assert.throws(()=>filePath(path.join(home,'.env'),home,home));assert.throws(()=>filePath(path.join(home,'outside'),home,home));assert.throws(()=>filePath(elsewhere,home,home));
 const text=withFiles('Pogledaj',[path.join(home,'example.js')],home);assert.match(text,/example\.js/);assert.ok(!text.includes('private file contents'));assert.equal(fs.readFileSync(path.join(home,'example.js'),'utf8'),'private file contents');assert.throws(()=>withFiles('x',Array(21).fill(home),home));
 const tree=browseProject(home,home,home);assert.deepEqual(tree.entries.map(e=>e.name),['example.js']);assert.equal(typeof tree.entries[0].size,'number');assert.ok(!JSON.stringify(tree).includes('private file contents'));
 const shown=browseProject(home,home,home,{hidden:true});assert.ok(shown.entries.some(e=>e.name==='.env' || e.name==='.config'));assert.ok(!JSON.stringify(shown).includes('private file contents'));
 }finally{fs.rmSync(home,{recursive:true,force:true});fs.rmSync(elsewhere,{recursive:true,force:true});}
});
test('git status čita izmene i ne menja fajl',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'desk-git-'));
 try{
  const git=(args)=>spawnSync('git',args,{cwd:dir,encoding:'utf8'});
  assert.equal(git(['init']).status,0);
  fs.writeFileSync(path.join(dir,'a.txt'),'a\n');
  assert.equal(git(['add','a.txt']).status,0);
  assert.equal(git(['-c','user.email=a@b.c','-c','user.name=t','commit','-m','a']).status,0);
  fs.appendFileSync(path.join(dir,'a.txt'),'b\n');
  const changed=fileChange(dir,path.join(dir,'a.txt'));
  assert.match(changed.diff,/\+b/);
  assert.equal(fs.readFileSync(path.join(dir,'a.txt'),'utf8'),'a\nb\n');
  const snap=gitSnapshot(dir);
  assert.equal(snap.repo,true);
  assert.equal(snap.added,1);
  assert.ok(snap.files.some(file=>file.endsWith(`${path.sep}a.txt`)));
  assert.equal(fs.readFileSync(path.join(dir,'a.txt'),'utf8'),'a\nb\n');
  const bare=fs.mkdtempSync(path.join(os.tmpdir(),'desk-not-git-'));
  try{assert.equal(gitSnapshot(bare).repo,false);}finally{fs.rmSync(bare,{recursive:true,force:true});}
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});

test('diff koristi radni folder četa i podržava obrisan praćeni fajl bez izlaska iz projekta',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'desk-deleted-'));
 try{
  const git=args=>spawnSync('git',args,{cwd:dir,encoding:'utf8'});
  assert.equal(git(['init']).status,0);
  fs.writeFileSync(path.join(dir,'gone.txt'),'sačuvana linija\n');
  git(['add','.']);assert.equal(git(['-c','user.email=a@b.c','-c','user.name=t','commit','-m','base']).status,0);
  fs.appendFileSync(path.join(dir,'gone.txt'),'nova linija\n');
  assert.match(fileChange(dir,'gone.txt',dir).diff,/\+nova linija/);
  fs.unlinkSync(path.join(dir,'gone.txt'));
  assert.match(fileChange(dir,'gone.txt',dir).diff,/-sačuvana linija/);
  assert.throws(()=>fileChange(dir,'missing.txt',dir));
  assert.throws(()=>fileChange(dir,'../outside.txt',dir));
  assert.throws(()=>fileChange(dir,'.env',dir));
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
