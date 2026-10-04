import {test} from 'node:test';
import assert from 'node:assert/strict';
import {advanceColumns} from '../public/folder-columns.mjs';
test('kolone čuvaju pretke pri prelasku u susedni folder ili drugu granu',()=>{
 const home={path:'/home',parent:null},desktop={path:'/home/Desktop',parent:home.path},first={path:desktop.path+'/first',parent:desktop.path},deep={path:first.path+'/deep',parent:first.path},second={path:desktop.path+'/second',parent:desktop.path},downloads={path:'/home/Downloads',parent:home.path};
 let columns=[home,desktop,first,deep];const original=[...columns];columns=advanceColumns(columns,second);assert.deepEqual(columns,[home,desktop,second]);assert.deepEqual(original,[home,desktop,first,deep]);
 columns=advanceColumns(columns,first);assert.deepEqual(columns,[home,desktop,first]);columns=advanceColumns(columns,desktop);assert.deepEqual(columns,[home,desktop]);columns=advanceColumns(columns,downloads);assert.deepEqual(columns,[home,downloads]);assert.deepEqual(advanceColumns(columns,home),[home]);
});
