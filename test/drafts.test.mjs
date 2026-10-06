import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mergeDraft} from '../public/sidebar-groups.mjs';
test('nacrti sa oba uređaja se spajaju bez odbacivanja teksta',()=>{
 assert.equal(mergeDraft('Hej','Hej A','Hej B'),'Hej B A');
 assert.equal(mergeDraft('Hej','Nova verzija','Druga verzija'),'Druga verzija\n\nNova verzija');
 assert.equal(mergeDraft('Hej','','Hej B'),'Hej B');
 assert.equal(mergeDraft('Hej','Hej A','Hej'),'Hej A');
 assert.equal(mergeDraft('','Isto','Isto'),'Isto');
});
