import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {linkLocalPaths} from '../public/path-links.mjs';
import {openTarget,filePath} from '../files.mjs';

test('putanja u tekstu i kodu postaje link, a blok koda i postojeći link ne',()=>{
 const html=linkLocalPaths('<p>Ključ je <code>~/.config/mistral/api_key</code>.</p>');
 assert.match(html,/data-path-link="~\/\.config\/mistral\/api_key"/);
 assert.match(html,/~\/<wbr>\.config\/<wbr>mistral\/<wbr>api_key/);
 const pre=linkLocalPaths('<pre><code>~/.config/mistral/api_key</code></pre>');
 assert.equal(pre.includes('data-path-link'),false);
 const linked=linkLocalPaths('<p><a href="/files/Users/a">/Users/a/b</a> i /Users/a/c.</p>');
 assert.equal([...linked.matchAll(/data-path-link/g)].length,1);
 assert.match(linked,/data-path-link="\/Users\/a\/c"/);
 const spaced=linkLocalPaths('<p>Otvori /Users/milev051/Desktop/Projects/Random/20261001 Newsmax Balkan/NEDOUMICE.md odmah.</p>');
 assert.match(spaced,/data-path-link="\/Users\/milev051\/Desktop\/Projects\/Random\/20261001 Newsmax Balkan\/NEDOUMICE.md"/);
 assert.equal(spaced.includes('data-path-link="/Users/milev051/Desktop/Projects/Random/20261001"'),false);
 const sentence=linkLocalPaths('<p>Vidi /Users/a/b and then more.</p>');
 assert.match(sentence,/data-path-link="\/Users\/a\/b"/);
 assert.equal(sentence.includes('and then'),true);
 assert.equal((sentence.match(/data-path-link/g)||[]).length,1);
 const quoted=linkLocalPaths('<p>Fajl je "/Users/a/my file.md".</p>');
 assert.match(quoted,/data-path-link="\/Users\/a\/my file.md"/);
 const curly=linkLocalPaths('<p>“/Users/a/my file.md”</p>');
 assert.match(curly,/data-path-link="\/Users\/a\/my file.md"/);
});

test('otvaranje dozvoljava skrivenu putanju u home-u i ne vraća sadržaj',()=>{
 const home=fs.mkdtempSync(path.join(os.tmpdir(),'desk-open-home-'));
 const cwd=fs.mkdtempSync(path.join(os.tmpdir(),'desk-open-cwd-'));
 const outside=fs.mkdtempSync(path.join(os.tmpdir(),'desk-open-out-'));
 try{
  const file=path.join(home,'.config','mistral','api_key');
  fs.mkdirSync(path.dirname(file),{recursive:true});
  fs.writeFileSync(file,'tajna-vrednost');
  const found=openTarget('~/.config/mistral/api_key',cwd,home);
  assert.equal(found.path,fs.realpathSync(file));
  assert.equal(found.directory,false);
  assert.equal(found.missing,false);
  assert.equal(JSON.stringify(found).includes('tajna'),false);
  assert.equal(fs.readFileSync(file,'utf8'),'tajna-vrednost');
  assert.throws(()=>filePath('~/.config/mistral/api_key',cwd,home));
  fs.symlinkSync(outside,path.join(home,'.config','izlaz'));
  assert.throws(()=>openTarget('~/.config/izlaz',cwd,home));
  const spacedDir=path.join(home,'Desktop','20261001 Newsmax Balkan');
  fs.mkdirSync(spacedDir,{recursive:true});
  const spacedFile=path.join(spacedDir,'NEDOUMICE.md');
  fs.writeFileSync(spacedFile,'nedoumica');
  const spaced=openTarget(spacedFile,cwd,home);
  assert.equal(spaced.path,fs.realpathSync(spacedFile));
  assert.equal(spaced.directory,false);
  const missing=openTarget('~/.config/mistral/nema',cwd,home);
  assert.equal(missing.missing,true);
  assert.equal(missing.directory,true);
  assert.throws(()=>openTarget(path.join(outside,'nema'),cwd,home));
 }finally{
  fs.rmSync(home,{recursive:true,force:true});
  fs.rmSync(cwd,{recursive:true,force:true});
  fs.rmSync(outside,{recursive:true,force:true});
 }
});
