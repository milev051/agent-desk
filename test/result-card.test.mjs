import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {resultCardData,resultCardHtml} from '../public/result-card.mjs';
import {composeAgentContext} from '../context-inspector.mjs';
import {historyText,transferPlan} from '../context.mjs';
import {exportMessages} from '../public/sidebar-groups.mjs';
import {createChatSearch} from '../public/chat-search.mjs';

const escape=text=>String(text).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const render=message=>resultCardHtml(message,{escape,markdown:text=>'<p>'+escape(text)+'</p>'});
const original='Proveravam fajlove.\n\nInterni detalj: ne dirati ugovor broj 7123.\n\nUrađeno: [g]Dodat je novi meni.[/g]\nSvih 10 testova prolazi.\nProveri: [Otvori primer](http://127.0.0.1:4317/primer)\nPitanje: Koju boju biraš?';
const message=()=>({id:'r',role:'assistant',status:'done',text:original,createdAt:2});
test('kartica izdvaja rezultat, pitanje i proveru, a ne uvod i testove',()=>{
 const data=resultCardData(message());assert.equal(data.result,'Dodat je novi meni.');assert.equal(data.question,'Koju boju biraš?');assert.equal(data.status,'waiting');
 assert.match(data.check,/Otvori primer/);assert.equal(data.fullText,original);
 const html=render(message()),summary=html.split('<div class="result-full-text"')[0];assert.ok(!summary.includes('7123'));assert.ok(!summary.includes('10 testova'));assert.match(html,/7123/);assert.match(html,/result-full-text" hidden/);
});
test('oznaka u kodu ne postaje zahtev korisniku, a dugačak tekst ostaje u detaljima',()=>{
 const m=message();m.text='Urađeno: '+ 'Dugačak tekst '.repeat(100)+'\n\n```txt\nPitanje: Lažno pitanje\n```';
 const data=resultCardData(m);assert.equal(data.question,'');assert.ok(data.result.length<=221);assert.equal(data.fullText,m.text);assert.ok(data.result.endsWith('…'));
});
test('tok rada, greške, korisničke poruke i sažeci prelaska ostaju u dosadašnjem prikazu',()=>{
 for(const status of ['running','error','stopped','interrupted'])assert.equal(resultCardData({...message(),status}),null);
 assert.equal(resultCardData({...message(),role:'user'}),null);assert.equal(resultCardData({...message(),handoffFrom:'old'}),null);
 assert.equal(resultCardData({...message(),text:''}),null);
});
test('kartica ne menja zamrznutu poruku, sačuvanu istoriju, izvoz ni obnovljeni kontekst',()=>{
 const m=Object.freeze(message()),chat={id:'c',title:'Čet',settings:{agent:'codex',cwd:'/project'},sessions:{codex:'native-session'},sessionOffsets:{codex:2},messages:[{id:'u',role:'user',text:'Popravi meni',createdAt:1},m]};
 const before=structuredClone(chat),stored=JSON.stringify(chat),history=historyText(chat.messages);
 render(m);assert.equal(JSON.stringify(chat),stored);assert.deepEqual(chat,before);assert.equal(historyText(chat.messages),history);
 assert.match(exportMessages([chat],'c',['r']),/7123/);
 const reset={...chat,sessions:{}};
 assert.match(transferPlan(reset).text,/7123/);
 const renewed=composeAgentContext(reset,'Nastavi rad',{application:'Kontekst aplikacije',sentAt:3});
 assert.match(renewed.text,/7123/);assert.match(renewed.text,/Koju boju biraš/);assert.match(renewed.text,/10 testova/);
});
test('glavni tekst kartice se escapuje, a ceo odgovor prolazi kroz isti markdown renderer',()=>{
 const m={...message(),text:'Urađeno: <img src=x onerror=alert(1)>\nPitanje: <script>x</script>'};let rendered='';
 const html=resultCardHtml(m,{escape,markdown:text=>{rendered=text;return escape(text);}});
 assert.ok(!html.includes('<img'));assert.ok(!html.includes('<script>'));assert.match(html,/&lt;img/);assert.equal(rendered,m.text);
});
test('pretraga kartice pretražuje originalni tekst bez dupliranja sažetka',()=>{
 const full={},body={querySelector:()=>full,normalize(){}},view={querySelectorAll:selector=>selector==='.message-body'?[body]:[]};let searched;
 const savedDocument=globalThis.document;globalThis.document={createTreeWalker(root){searched=root;return {nextNode:()=>null};}};
 const savedFilter=globalThis.NodeFilter;globalThis.NodeFilter={SHOW_TEXT:4};
 try{
  const panel={hidden:true,querySelector:()=>({})},input={value:'skriven tekst',addEventListener(){},focus(){},select(){}};
  createChatSearch({view,panel,input,count:{}}).open();assert.equal(searched,full);
 }finally{globalThis.document=savedDocument;globalThis.NodeFilter=savedFilter;}
});
test('pogodak pretrage prikazuje skriveni ceo odgovor',()=>{
 const source=readFileSync(new URL('../public/chat-search.mjs',import.meta.url),'utf8').split('\n').find(line=>line.trimStart().startsWith('function go(delta)'));
 let scrolled=0,shown=false;const full={removeAttribute:name=>{if(name==='hidden')shown=true;}},mark={closest:selector=>selector==='details'?null:full,scrollIntoView(){scrolled++;}};
 const context={matches:[[mark]],selected:0,status(){}};vm.runInNewContext(source+';go(0);',context);assert.equal(shown,true);assert.equal(scrolled,1);
});
test('rezultat kartice počinje velikim slovom',async()=>{const {resultCardData}=await import('../public/result-card.mjs');assert.equal(resultCardData({role:'assistant',status:'done',text:'Urađeno: [g]šema je gotova.[/g]'}).result,'Šema je gotova.');});

test('ponuđeni odgovori: red Ponuđeno, da/ne za pitanje i dugmad samo kad su traženi',()=>{
 const m=text=>({role:'assistant',status:'done',text});
 const data=resultCardData(m('Urađeno: gotovo.\nPitanje: koju boju?\nPonuđeno: Plava | Zelena | <b>'));
 assert.deepEqual(data.replies,['Plava','Zelena','<b>']);assert.equal(data.question,'Koju boju?'.replace('K','k'));
 assert.deepEqual(resultCardData(m('Urađeno: gotovo.\nPitanje: da li da nastavim?')).replies,['Da','Ne']);
 const html=render(m('Urađeno: gotovo.\nPonuđeno: Plava | <b>'));assert.doesNotMatch(html,/data-quick-reply/);
 const shown=resultCardHtml(m('Urađeno: gotovo.\nPonuđeno: Plava | <b>'),{escape,markdown:t=>t,replies:true});
 assert.match(shown,/data-quick-reply="Plava"/);const summary=shown.split("result-full-text")[0];assert.match(summary,/&lt;b&gt;/);assert.doesNotMatch(summary,/<b>/);
});
