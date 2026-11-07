import {test} from 'node:test';
import assert from 'node:assert/strict';
import {quietParentFinish} from '../child-report.mjs';

test('glavni čet posle izveštaja ćuti dok drugi podčet radi ili čeka izveštaj',()=>{
  const main={id:'m',queue:[]},a={id:'a',parentChatId:'m'},b={id:'b',parentChatId:'m'};
  const chats=[main,a,b];
  assert.equal(quietParentFinish(main,{origin:'child-report',chats,isRunning:id=>id==='b'}),true);
  assert.equal(quietParentFinish(main,{origin:'child-report',chats,isRunning:()=>false}),false);
  assert.equal(quietParentFinish({...main,queue:[{origin:'child-report'}]},{origin:'child-report',chats}),true);
  assert.equal(quietParentFinish(main,{origin:undefined,chats,isRunning:()=>true}),false);
});
