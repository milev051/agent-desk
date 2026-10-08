import test from 'node:test';
import assert from 'node:assert/strict';
import {createDraftHistory} from '../public/draft-history.mjs';

test('Undo i Redo vraćaju tekst i izbor, novi unos prekida redo, četovi su odvojeni',()=>{
 class Control extends EventTarget{value='';selectionStart=0;selectionEnd=0;disabled=false;focus(){}setSelectionRange(a,b){this.selectionStart=a;this.selectionEnd=b;}}
 const input=new Control(),undoButton=new Control(),redoButton=new Control();let id='a',saved='';
 const history=createDraftHistory(input,{chatId:()=>id,changed:()=>saved=input.value,undoButton,redoButton});
 function event(type,props={}){const e=new Event(type,{cancelable:true});Object.assign(e,props);input.dispatchEvent(e);return e;}
 function type(text){event('beforeinput',{inputType:'insertText'});input.value=text;input.setSelectionRange(text.length,text.length);event('input');}
 history.refresh();type('Prvi');type('Prvi drugi');
 assert.equal(undoButton.disabled,false);
 event('keydown',{key:'z',metaKey:true});assert.equal(input.value,'Prvi');assert.equal(saved,'Prvi');assert.equal(redoButton.disabled,false);
 event('keydown',{key:'z',metaKey:true,shiftKey:true});assert.equal(input.value,'Prvi drugi');assert.equal(input.selectionStart,10);
 event('beforeinput',{inputType:'historyUndo'});type('Izmenjeno');assert.equal(redoButton.disabled,true);
 event('keydown',{key:'y',ctrlKey:true});assert.equal(input.value,'Izmenjeno');
 id='b';input.value='Drugi čet';history.refresh();assert.equal(undoButton.disabled,true);
 id='a';input.value='Izmenjeno';history.refresh();undoButton.dispatchEvent(new Event('click'));assert.equal(input.value,'Prvi');
 input.value='Tekst sa drugog uređaja';history.refresh();assert.equal(undoButton.disabled,true);assert.equal(redoButton.disabled,true);
});
