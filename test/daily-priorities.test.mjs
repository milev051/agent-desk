import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createDailyPriorities,dailyDate} from '../daily-priorities.mjs';
function fixture(t){const dir=fs.mkdtempSync(path.join(os.tmpdir(),'daily-priorities-')),file=path.join(dir,'days.json');let time=Date.parse('2026-10-07T10:00:00Z');const create=()=>createDailyPriorities(file,{now:()=>time});t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));return {create,clock:value=>time=Date.parse(value)};}
test('današnji kontekst čuva redosled, vreme i završene stavke izostavlja, uz trajno čuvanje',t=>{
 const f=fixture(t),p=f.create(),v=p.view();assert.equal(v.today,'2026-10-07');assert.equal(v.time,'12:00');
 const saved=p.update({date:v.date,enabled:true,revision:v.revision,items:[{id:'first',title:'Završi sajt',time:'13:00',done:false},{id:'done',title:'Završen posao',time:'',done:true}]});
 assert.equal(saved.revision,1);assert.match(p.context(),/12:00/);assert.match(p.context(),/Završi sajt/);assert.match(p.context(),/13:00/);assert.ok(!p.context().includes('Završen posao'));assert.deepEqual(f.create().view().items,saved.items);
 assert.throws(()=>p.update({date:v.date,enabled:true,revision:0,items:[]}),error=>error.status===409);
});
test('ponoć u Beogradu menja kontekst, prethodni dan ostaje, a isključivanje poništava stari plan',t=>{
 const f=fixture(t),p=f.create();p.update({date:'2026-10-07',enabled:true,revision:0,items:[{id:'first',title:'Juče',time:'',done:false}]});
 f.clock('2026-10-07T22:01:00Z');assert.equal(p.view().today,'2026-10-08');assert.match(p.context(),/nema otvorenih/);assert.ok(!p.context().includes('Juče'));assert.equal(p.view('2026-10-07').items[0].title,'Juče');
 p.update({date:'2026-10-08',enabled:false,revision:1,items:[]});assert.match(p.context(),/isključeno/);assert.match(p.context(),/Ne koristi ranije/);
 assert.equal(dailyDate(Date.parse('2026-10-25T23:30:00Z')),'2026-10-26');
});
test('prioriteti odbijaju neispravne datume, duple ID-jeve, predugačke stavke i vreme',t=>{
 const f=fixture(t),p=f.create(),item={id:'first',title:'Test',time:'',done:false},value={date:'2026-10-07',enabled:true,revision:0,items:[item]};
 for(const bad of [{...value,date:'2026-02-30'},{...value,items:[item,item]},{...value,items:[{...item,time:'25:00'}]},{...value,items:[{...item,title:'x'.repeat(201)}]},{...value,items:[{...item,title:'Novi\nred'}]},{...value,items:Array.from({length:21},(_,i)=>({...item,id:String(i)}))}])assert.throws(()=>p.update(bad));assert.equal(p.view().revision,0);
});
