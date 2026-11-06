import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {buildBoard,analyzeBehavior,createBoardLog,boardMessage,projectFor,questionText,nextFromState,suggest} from '../board.mjs';
import {cardHtml,behaviorHtml,ago} from '../public/project-board.mjs';

const H=3600000,now=Date.UTC(2026,10,6,15);
const rows=[{name:'Sajt',path:'/p/sajt',state:'radi',date:'2026-11-06'},{name:'Video',path:'/p/video',state:'',date:''}];
const chat=(id,cwd,messages,extra={})=>({id,title:id,settings:{cwd,agent:'claude'},messages,updatedAt:messages.at(-1)?.createdAt || now,...extra});
const user=(at,text='x',origin='user')=>({role:'user',text,createdAt:at,origin});
const reply=(id,at,text)=>({id,role:'assistant',status:'done',text,createdAt:at-1000,completedAt:at});

test('projekat je najuži folder iz spiska, a nepoznat folder postaje sopstveni projekat',()=>{
 assert.equal(projectFor('/p/sajt/src',rows).name,'Sajt');
 assert.equal(projectFor('/x/novo',rows).name,'novo');
});

test('tabla stavlja na vrh projekat koji čeka odgovor i čita samo pitanje iz poslednjeg odgovora',()=>{
 const chats=[
  chat('a','/p/sajt',[user(now-3*H),reply('r1',now-2*H,'Urađeno: x.\nPitanje: da objavim? Preporučujem da.')]),
  chat('b','/p/video',[user(now-H),reply('r2',now-0.5*H,'Urađeno: y.\nSledeće: render.')]),
  chat('c','/p/video',[user(now-0.2*H)]),
  chat('d','/p/sajt',[user(now-5*H)],{dispatcher:true})
 ];
 const memory=c=>c.settings.cwd==='/p/sajt'?{openQuestions:[{id:'q1',messageId:'r1',chatId:'a',text:'da objavim?',at:now-2*H},{id:'old',messageId:'r0',chatId:'a',text:'staro',at:now-9*H}],records:[{result:'objavljeno',remaining:'',at:now-2*H,chatId:'a'}]}:{openQuestions:[],records:[{result:'video',remaining:'render',at:now,chatId:'b'}]};
 const board=buildBoard({rows,chats,isRunning:id=>id==='c',memoryView:memory,now});
 assert.deepEqual(board.map(p=>[p.name,p.status]),[['Sajt','ceka'],['Video','radi']]);
 assert.equal(board[0].questions.length,1);
 assert.equal(board[0].questions[0].id,'q1');
 assert.equal(board[0].questions[0].text,'da objavim? Preporučujem da.');
 assert.equal(board[0].staleQuestions,1);
 assert.equal(board[1].next,'render');
 assert.equal(board[1].chats.find(c=>c.id==='c').running,true);
});

test('pitanje starije od 3 dana ne drži projekat u stanju čekanja',()=>{
 const chats=[chat('a','/p/sajt',[user(now-6*24*H),reply('r',now-5*24*H,'Pitanje: x?')])];
 const [p]=buildBoard({rows,chats,now});
 assert.equal(p.status,'stoji');assert.equal(p.questions.length,0);assert.equal(p.oldQuestions.length,1);
});

test('stari projekat bez pitanja i rada ne ulazi u tablu',()=>{
 const chats=[chat('a','/p/sajt',[user(now-30*24*H),reply('r',now-30*24*H,'Urađeno.')])];
 assert.equal(buildBoard({rows,chats,now}).length,0);
});

test('pomoćne funkcije za tekst odgovora',()=>{
 assert.equal(questionText('a\n**Pitanje:** koje ime?'),'koje ime?');
 assert.equal(questionText('bez pitanja'),'');
 assert.equal(nextFromState('# Stanje\n- Sledeći korak: proba na telefonu'),'proba na telefonu');
 assert.match(boardMessage({kind:'accept',question:'da objavim?'}),/Prihvatam tvoju preporuku.*da objavim\?/);
 assert.equal(boardMessage({kind:'answer',text:' ne ',question:''}),'ne');
});

test('analiza ponašanja broji prelaze između projekata i vreme odgovora na pitanje',()=>{
 const chats=[
  chat('a','/p/sajt',[reply('r1',now-4*H,'Pitanje: x?'),user(now-4*H+10*60000),reply('r2',now-3*H,'Pitanje: y?')]),
  chat('b','/p/video',[user(now-4*H+15*60000),user(now-4*H+20*60000,'z','delegate')])
 ];
 const {summary,daily,suggestions}=analyzeBehavior({chats,rows,now,tzOffset:0});
 assert.equal(summary.messages,2);
 assert.equal(daily.at(-1).switches,1);
 assert.equal(summary.medianQuestionReplyMinutes,10);
 assert.equal(summary.questionsAsked,2);
 assert.equal(summary.questionsOpen,1);
 assert.ok(Array.isArray(suggestions));
 assert.ok(suggest({avgSwitchesPerDay:20,avgProjectsPerDay:2,questionsOpen:0,medianQuestionReplyMinutes:5,questionsAsked:0,boardAccepts:0,boardAnswers:0,messages:5})[0].includes('prelaza'));
});

test('dnevnik table čuva samo vrstu radnje, projekat i čet',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'board-')),log=createBoardLog(path.join(dir,'e.jsonl'),{now:()=>5});
 log.add('accept',{project:'/p/sajt',chatId:'a',text:'tajna',waitedMs:60000});
 assert.deepEqual(log.read(),[{at:5,type:'accept',project:'/p/sajt',chatId:'a',waitedMs:60000}]);
 assert.throws(()=>log.add('nesto'));
});

test('kartica table escapuje tekst i nudi radnje',()=>{
 const html=cardHtml({name:'<b>S</b>',path:'/p',status:'ceka',lastActivity:now,mainChatId:'a',chats:[{id:'a',title:'Čet'}],running:0,oldQuestions:[{chatId:'z',chatTitle:'Staro',at:now-5*24*H}],questions:[{id:'q',text:'<i>?</i> Preporučujem da.',chatId:'a',at:now}],lastResult:null,next:'',stateLine:''},now);
 assert.ok(html.includes('&lt;b&gt;S&lt;/b&gt;') && !html.includes('<i>?'));
 assert.ok(html.includes('data-board="accept"') && html.includes('board-instruct') && html.includes('Starija pitanja bez odgovora (1)'));
 assert.ok(!cardHtml({name:'S',path:'/p',status:'ceka',lastActivity:now,mainChatId:'a',chats:[],running:0,questions:[{id:'q',text:'koje ime?',chatId:'a',at:now}]},now).includes('data-board="accept"'));
 assert.ok(behaviorHtml({summary:{days:7,avgSwitchesPerDay:3,medianQuestionReplyMinutes:null,questionsOpen:0},daily:[],suggestions:['a']}).includes('board-suggestions'));
 assert.equal(ago(now-5*60000,now),'pre 5 min');
});
