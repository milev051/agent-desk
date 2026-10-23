import test from 'node:test';
import assert from 'node:assert/strict';
import {createDraftHistory} from '../public/draft-history.mjs';

test('Undo i Redo vraćaju tekst i izbor, novi unos prekida redo, četovi su odvojeni',()=>{
 class Control extends EventTarget{value='';selectionStart=0;selectionEnd=0;disabled=false;focus(){}setSelectionRange(a,b){this.selectionStart=a;this.selectionEnd=b;}}
 const input=new Control();let id='a',saved='';
 const history=createDraftHistory(input,{chatId:()=>id,changed:()=>saved=input.value});
 function event(type,props={}){const e=new Event(type,{cancelable:true});Object.assign(e,props);input.dispatchEvent(e);return e;}
 function type(text){event('beforeinput',{inputType:'insertText'});input.value=text;input.setSelectionRange(text.length,text.length);event('input');}
 history.refresh();type('Prvi');type('Prvi drugi');
 event('keydown',{key:'z',metaKey:true});assert.equal(input.value,'Prvi');assert.equal(saved,'Prvi');
 event('keydown',{key:'z',metaKey:true,shiftKey:true});assert.equal(input.value,'Prvi drugi');assert.equal(input.selectionStart,10);
 const undo=event('beforeinput',{inputType:'historyUndo'});assert.equal(undo.defaultPrevented,false);assert.equal(input.value,'Prvi drugi');type('Izmenjeno');
 event('keydown',{key:'y',ctrlKey:true});assert.equal(input.value,'Izmenjeno');
 id='b';input.value='Drugi čet';history.refresh();event('keydown',{key:'z',metaKey:true});assert.equal(input.value,'Drugi čet');
 id='a';input.value='Izmenjeno';history.refresh();event('keydown',{key:'z',metaKey:true});assert.equal(input.value,'Prvi drugi');
 input.value='Tekst sa drugog uređaja';history.refresh();event('keydown',{key:'z',metaKey:true});assert.equal(input.value,'Tekst sa drugog uređaja');
});

test('upis preko Pristupačnosti ne briše stari nacrt, a ispravke istog diktata ostaju netaknute',async()=>{
 const {overwrittenDraft}=await import('../public/draft-history.mjs');
 class Control extends EventTarget{value='';selectionStart=0;selectionEnd=0;focus(){}setSelectionRange(a,b){this.selectionStart=a;this.selectionEnd=b;}}
 const input=new Control();let clock=100000,draft='';
 createDraftHistory(input,{chatId:()=>'a',changed(){},known:()=>draft,now:()=>clock});
 // Poslednji slušalac je kao oninput u aplikaciji: beleži ono što je ostalo u polju.
 input.addEventListener('input',()=>{draft=input.value;});
 const external=text=>{input.value=text;input.dispatchEvent(new Event('input'));};
 external('prvi deo');assert.equal(draft,'prvi deo');
 clock+=1000;external('Prvi deo poruke');assert.equal(draft,'Prvi deo poruke');
 clock+=1000;external('Prvi deo');assert.equal(draft,'Prvi deo');
 clock+=20000;external('nastavak');assert.equal(draft,'Prvi deo nastavak');assert.equal(input.selectionStart,17);
 clock+=500;external('Prvi deo nastavak diktata');assert.equal(draft,'Prvi deo nastavak diktata');
 clock+=20000;input.dispatchEvent(new Event('beforeinput'));input.value='otkucano';input.dispatchEvent(new Event('input'));assert.equal(draft,'otkucano');
 draft='';clock+=20000;external('posle slanja');assert.equal(draft,'posle slanja');
 assert.equal(overwrittenDraft('stari nacrt','stari nacrt i još',60000),null);
 assert.equal(overwrittenDraft('stari nacrt','nov',1000),null);
});
