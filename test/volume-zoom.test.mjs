import test from 'node:test';
import assert from 'node:assert/strict';
import {volumeDirection,nextZoom,installVolumeZoom} from '../public/volume-zoom.mjs';

test('prepoznaje dugmad za jačinu zvuka', () => {
  assert.equal(volumeDirection({key:'AudioVolumeUp'}),1);
  assert.equal(volumeDirection({key:'AudioVolumeDown'}),-1);
  assert.equal(volumeDirection({key:'Unidentified',keyCode:175}),1);
  assert.equal(volumeDirection({key:'a'}),0);
});

test('uvećanje ostaje između 50% i 200%', () => {
  assert.equal(nextZoom(1,1),1.1);
  assert.equal(nextZoom(2,1),2);
  assert.equal(nextZoom(0.5,-1),0.5);
});

test('na telefonu menja i pamti uvećanje', () => {
  const handlers={},stored=new Map(),root={style:{zoom:''}};
  const win={addEventListener:(type,fn)=>{handlers[type]=fn;}};
  const storage={getItem:k=>stored.get(k)??null,setItem:(k,v)=>stored.set(k,v),removeItem:k=>stored.delete(k)};
  const state=installVolumeZoom({win,doc:{documentElement:root},storage,isPhone:()=>true});
  let prevented=false;
  handlers.keydown({key:'AudioVolumeUp',preventDefault:()=>{prevented=true;}});
  assert.equal(state.zoom,1.1);
  assert.equal(root.style.zoom,'1.1');
  assert.equal(prevented,true);
  handlers.keydown({key:'AudioVolumeDown',preventDefault(){}});
  assert.equal(root.style.zoom,'');
  assert.equal(stored.size,0);
});
