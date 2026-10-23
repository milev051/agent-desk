import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {adaptiveChatGroups,adaptiveFolder,adaptiveFolderId} from '../public/adaptive-chats.mjs';
import {sidebarGroups} from '../public/sidebar-groups.mjs';

test('lista nema uklonjeni pregled poslednjih četova i čuva prilagođavanje',()=>{
 const app=readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
 assert.doesNotMatch(app,/recentFolder|recentChat|data-recent|recent-chats/);
 assert.match(app,/const content=adaptiveContent\+/);
});

test('prilagođavanje: četovi agenata i predloga su u svom folderu, ne u ostalim',()=>{
 const chats=[{id:'obican',settings:{agent:'codex'},updatedAt:1,messages:[]},{id:'agent',adaptiveAgent:'a1',settings:{agent:'claude'},updatedAt:3,messages:[]},{id:'predlog',adaptivePropose:'/p',settings:{agent:'claude'},updatedAt:2,messages:[]},{id:'stari',adaptiveAgent:'a1',continuedTo:'agent',settings:{agent:'claude'},updatedAt:0,messages:[]}];
 assert.deepEqual(sidebarGroups(chats).map(g=>g.chat.id),['obican']);
 const groups=adaptiveChatGroups(chats);
 assert.deepEqual(groups.map(g=>g.chat.id),['agent','predlog']);
 assert.deepEqual(groups[0].parts.map(c=>c.id),['stari']);
 assert.equal(adaptiveFolder.id,adaptiveFolderId);
});
