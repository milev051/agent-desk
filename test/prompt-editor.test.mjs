import test from 'node:test';
import assert from 'node:assert/strict';
import {caretAfterChange,observePromptChanges} from '../public/prompt-editor.mjs';

function setup(tagName){
 let mutation,frames=[],resizes=[];
 class Control extends EventTarget{
  text='';tagName=tagName;
  get value(){return this.text;}
  set value(value){this.text=String(value);}
 }
 const input=new Control();
 const view={HTMLTextAreaElement:Control,requestAnimationFrame(fn){frames.push(fn);return frames.length;},MutationObserver:class{constructor(fn){mutation=fn;}observe(target,options){assert.equal(target,input);assert.equal(options.attributes,undefined);assert.equal(options.characterData,true);}}};
 input.ownerDocument={defaultView:view};
 observePromptChanges(input,()=>resizes.push(input.value));
 return {input,resizes,mutation:()=>mutation(),frame(){const pending=frames;frames=[];for(const fn of pending)fn();}};
}

test('Android diktat bez input događaja i naknadna ispravka pokreću merenje novog teksta',()=>{
 const f=setup('DIV');
 f.input.text='Duga glasovna poruka '.repeat(40);f.mutation();f.mutation();
 assert.equal(f.resizes.length,0);f.frame();assert.deepEqual(f.resizes,[f.input.value]);
 f.input.text+=' Završetak';f.mutation();f.frame();assert.equal(f.resizes.at(-1),f.input.value);
 f.input.text='';f.mutation();f.frame();assert.equal(f.resizes.at(-1),'');
});
test('programski upis u textarea bez događaja takođe menja visinu',()=>{
 const f=setup('TEXTAREA');f.input.value='Glasovni unos '.repeat(30);
 f.frame();assert.deepEqual(f.resizes,[f.input.value]);
});
test('merenje čeka kraj input frejma i compositionend, bez dupliranja za istu grupu događaja',()=>{
 const f=setup('DIV');
 f.input.dispatchEvent(new Event('beforeinput'));f.input.text='Tekst posle prepoznavanja';
 f.input.dispatchEvent(new Event('input'));f.input.dispatchEvent(new Event('compositionend'));
 f.frame();assert.deepEqual(f.resizes,['Tekst posle prepoznavanja']);
});
test('posle upisa nacrta kursor sa kraja ostaje na kraju, da sledeći diktat ide iza prethodnog',()=>{
 assert.deepEqual(caretAfterChange('Prva poruka','Prva poruka druga',[11,11]),[17,17]);
 assert.deepEqual(caretAfterChange('','Prva poruka'),[11,11]);
 assert.deepEqual(caretAfterChange('Prva poruka','Prva poruka druga',[4,4]),[4,4]);
 assert.deepEqual(caretAfterChange('Prva poruka','Kratko',[8,10]),[6,6]);
});
