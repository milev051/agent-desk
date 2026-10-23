import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createProjectsIndex} from '../projects-index.mjs';
import {refreshDesktopProjects} from '../desktop-projects.mjs';

test('pregled prati nove, premeštene i uklonjene projekte i čuva ručno stanje',()=>{
  const base=fs.mkdtempSync(path.resolve('data/projects-test-'));
  try{
    const desktop=path.join(base,'Desktop'),projectRoot=path.join(desktop,'Agent Desk');
    const old=path.join(desktop,'Projects','Random','Google Speech to Text');
    const moved=path.join(desktop,'Projects','Android apps','Google Speech to Text');
    fs.mkdirSync(projectRoot,{recursive:true});fs.mkdirSync(old,{recursive:true});
    const file=path.join(base,'projekti.md'),index=createProjectsIndex(file);
    index.add([old]);
    fs.writeFileSync(file,fs.readFileSync(file,'utf8').replace('nema zabeleženog stanja','čeka podešavanje'));
    const options={desktop,projectRoot};
    let result=refreshDesktopProjects(index,options);
    assert.match(fs.readFileSync(result.file,'utf8'),/Google Speech to Text/);
    fs.mkdirSync(path.dirname(moved),{recursive:true});fs.renameSync(old,moved);
    refreshDesktopProjects(index,options);
    const row=index.list().find(row=>row.path===moved);
    assert.equal(row.state,'čeka podešavanje');
    assert.equal(index.list().filter(row=>row.name==='Google Speech to Text').length,1);
    assert.match(fs.readFileSync(result.file,'utf8'),/Android%20apps/);
    const added=path.join(desktop,'Projects','Android apps','Novi projekat');fs.mkdirSync(added);
    refreshDesktopProjects(index,options);
    assert.match(fs.readFileSync(result.file,'utf8'),/Novi projekat/);
    fs.rmSync(moved,{recursive:true});refreshDesktopProjects(index,options);
    assert.doesNotMatch(fs.readFileSync(result.file,'utf8'),/Google Speech to Text/);
    assert.equal(index.list().find(row=>row.path===moved).state,'čeka podešavanje');
    const before=fs.statSync(result.file).mtimeMs;refreshDesktopProjects(index,options);
    assert.equal(fs.statSync(result.file).mtimeMs,before);
  }finally{fs.rmSync(base,{recursive:true,force:true});}
});
