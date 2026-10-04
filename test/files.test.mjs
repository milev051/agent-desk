import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {filePath,browseFiles,withFiles} from '../files.mjs';
test('pregled fajlova ne čita sadržaj i odbija skrivene putanje i symlink izlaz',()=>{
 const home=fs.mkdtempSync(path.join(os.tmpdir(),'desk-files-'));const elsewhere=fs.mkdtempSync(path.join(os.tmpdir(),'desk-other-'));
 try{fs.writeFileSync(path.join(home,'example.js'),'private file contents');fs.mkdirSync(path.join(home,'.config'));fs.writeFileSync(path.join(home,'.env'),'private');fs.symlinkSync(elsewhere,path.join(home,'outside'));
 const list=browseFiles(home,home,home);assert.deepEqual(list.entries.map(e=>e.name),['example.js']);assert.ok(!JSON.stringify(list).includes('private file contents'));assert.throws(()=>filePath(path.join(home,'.env'),home,home));assert.throws(()=>filePath(path.join(home,'outside'),home,home));assert.throws(()=>filePath(elsewhere,home,home));
 const text=withFiles('Pogledaj',[path.join(home,'example.js')],home);assert.match(text,/example\.js/);assert.ok(!text.includes('private file contents'));assert.equal(fs.readFileSync(path.join(home,'example.js'),'utf8'),'private file contents');assert.throws(()=>withFiles('x',Array(21).fill(home),home));
 }finally{fs.rmSync(home,{recursive:true,force:true});fs.rmSync(elsewhere,{recursive:true,force:true});}
});
