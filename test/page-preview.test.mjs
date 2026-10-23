import test from 'node:test';
import assert from 'node:assert/strict';
import {previewTarget} from '../public/page-preview.mjs';
import {snapshotUrl,snapshotName,findChrome} from '../page-snapshot.mjs';

test('pregled uzima adresu iz polja za poruku pre linkova iz četa', () => {
  const messages=[{role:'assistant',text:'Proveri: http://localhost:4321/o-nama/.'}];
  assert.deepEqual(previewTarget(' http://127.0.0.1:3000/ ',messages),{url:'http://127.0.0.1:3000/',typed:true});
  assert.deepEqual(previewTarget('pogledaj ovo',messages),{url:'http://localhost:4321/o-nama/',typed:false});
});

test('pregled preskače API i priloge Agent Deska i vraća null bez linka', () => {
  const messages=[{text:'Sajt: https://milev.rs/'},{text:'Slika http://127.0.0.1:4317/api/chats/x/prilog?name=a.webp'}];
  assert.equal(previewTarget('',messages).url,'https://milev.rs/');
  assert.equal(previewTarget('',[{text:'bez linka'}]),null);
});

test('snimak prihvata samo http i https i pravi čitljiv naziv fajla', () => {
  assert.equal(snapshotUrl('http://localhost:3000'),'http://localhost:3000/');
  assert.throws(()=>snapshotUrl('file:///etc/passwd'),/http i https/);
  assert.throws(()=>snapshotUrl('nije adresa'),/nije ispravna/);
  assert.equal(snapshotName('http://localhost:3000/o-nama/','desktop',new Date('2026-10-23T15:00:00Z')),'20261023-150000-pregled-racunar-localhost-3000-o-nama.webp');
  assert.equal(findChrome(['/nema/chrome']),'');
});

test('Chrome snimi celu stranicu u širini 1920 px posle skrolovanja kroz animacije', {skip:!findChrome() && 'Chrome nije instaliran',timeout:90000}, async () => {
  const {default:http}=await import('node:http'),{default:fs}=await import('node:fs'),{default:os}=await import('node:os'),{default:path}=await import('node:path');
  const {capturePage}=await import('../page-snapshot.mjs');
  // Element na dnu postaje vidljiv tek kad uđe u ekran; naslov stranice beleži da li se to desilo pre snimka.
  const html='<!doctype html><body style="margin:0"><div style="height:3000px"></div><p id="dno" style="height:200px;margin:0;opacity:0">Dno</p><script>new IntersectionObserver(e=>{if(e[0].isIntersecting){dno.style.opacity=1;document.title="vidljivo"}}).observe(dno)</script></body>';
  const server=http.createServer((req,res)=>{res.writeHead(200,{'Content-Type':'text/html'});res.end(html);});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'snimak-test-'));
  try{
    const shot=await capturePage({url:`http://127.0.0.1:${server.address().port}/`,target:path.join(dir,'s.webp'),settle:300,inspect:'document.title'});
    assert.equal(shot.width,1920);assert.equal(shot.height,3200);assert.equal(shot.truncated,false);assert.equal(shot.inspected,'vidljivo');
    assert.ok(fs.statSync(shot.path).size>0);
  }finally{server.close();fs.rmSync(dir,{recursive:true,force:true});}
});
