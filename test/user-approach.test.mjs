import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createUserApproach,approachContext,approachLimit} from '../user-approach.mjs';
test('pristup se čuva lokalno, prazan tekst briše fajl, predug se odbija',t=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'desk-approach-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
 const file=path.join(dir,'data','pristup.md'),store=createUserApproach(file);
 assert.equal(store.get(),'');
 assert.equal(store.set('  Budi kritičan.\r\nNavedi studije.  '),'Budi kritičan.\nNavedi studije.');
 assert.equal(store.get(),'Budi kritičan.\nNavedi studije.');assert.equal(fs.statSync(file).mode&0o777,0o600);
 assert.throws(()=>store.set('x'.repeat(approachLimit+1)));assert.equal(store.get(),'Budi kritičan.\nNavedi studije.');
 assert.equal(store.set('   '),'');assert.equal(fs.existsSync(file),false);
});
test('kontekst pristupa je prazan bez teksta i u jednom redu sa tekstom',()=>{
 assert.equal(approachContext(''),'');
 const line=approachContext('Budi kritičan.\nNavedi studije.');
 assert.ok(line.includes('Budi kritičan. Navedi studije.'));assert.ok(!line.includes('\n'));
});
