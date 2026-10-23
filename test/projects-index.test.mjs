import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createProjectsIndex,parseProjects,chatDirs,projectsLine} from '../projects-index.mjs';

test('spisak se dopunjuje iz radnih foldera bez duplikata i čuva ručne redove',()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'agent-projects-'));
  const a=path.join(dir,'Okanović'),b=path.join(dir,'x','Okanović');
  fs.mkdirSync(a);fs.mkdirSync(b,{recursive:true});
  const file=path.join(dir,'data','projekti.md');
  const index=createProjectsIndex(file,{skip:[dir]});
  assert.equal(index.add([a,a,'/nema/ovog',dir,'relativno']).length,1);
  assert.equal(index.add([a]).length,0);
  fs.appendFileSync(file,'Ručni · /negde/drugo · gotovo · 2026-01-01\n');
  assert.equal(index.add([b]).length,1);
  const rows=createProjectsIndex(file).list();
  assert.deepEqual(rows.map(row=>row.name),['Okanović','Ručni','Okanović (x)']);
  assert.equal(rows[1].state,'gotovo');
  assert.equal(fs.statSync(file).mode&0o777,0o600);
  assert.equal(createProjectsIndex(file).add([a,b]).length,0);
});
test('parser preskače komentare i neispravne redove; rečenica za kontekst',()=>{
  assert.equal(parseProjects('# x\nsamo ime\nA · /a · stanje · 2026-01-01').length,1);
  assert.deepEqual(chatDirs([{settings:{cwd:'/a'}},{settings:{cwd:'/a'}},{}]),['/a']);
  assert.match(projectsLine('/d/projekti.md'),/STANJE\.md/);
});
