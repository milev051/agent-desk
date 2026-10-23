import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const app=readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
const html=readFileSync(new URL('../public/index.html',import.meta.url),'utf8');

test('direktan ulazak iz obaveštenja postavlja početnu stranu ispod četa i uz obnovljeni guard',()=>{
 const script=html.match(/<body>\s*<script>([\s\S]*?)<\/script>/)[1];
 for(const previous of [null,{agentDesk:true,agentDeskGuard:true}]){
  const entries=[],location={href:'https://desk.local/#chat=abc',hash:'#chat=abc'};
  const history={state:previous,replaceState:(state,unused,url)=>entries.push(['replace',String(url)]),pushState:(state,unused,url)=>entries.push(['push',String(url)])};
  vm.runInNewContext(script,{matchMedia:()=>({matches:true}),history,location,URL,URLSearchParams,window:{addEventListener(){}}});
  assert.deepEqual(entries,[['replace','https://desk.local/'],['push','https://desk.local/#chat=abc']]);
 }
});

test('Nazad iz četa na telefonu vraća listu sa istim otvorenim folderima i položajem',()=>{
 const start=app.indexOf('function showHomeScreen(){'),end=app.indexOf('function backFromChat(){',start);
 const navigation=[{chatId:null,folders:['folder'],scroll:300},{chatId:'previous',folders:[],scroll:0}],list={scrollTop:0};let selected=true,pruned=0,rendered=0,shown=0;
 const context={messageSelectionMode:true,chatNavigation:navigation,openFolders:new Set(),
  clearMessageSelection:()=>{selected=false;},showChatList:options=>{assert.equal(options.replaceHistory,true);shown++;},
  pruneOpenFolders:()=>pruned++,renderSidebar:()=>rendered++,$:()=>list};
 vm.runInNewContext(app.slice(start,end)+';showHomeScreen()',context);
 assert.equal(selected,false);assert.equal(navigation.length,0);assert.deepEqual([...context.openFolders],['folder']);
 assert.equal(list.scrollTop,300);assert.equal(pruned,1);assert.equal(rendered,1);assert.equal(shown,1);
});

test('slanje sa telefona vraća listu bez otvaranja foldera četa ili roditelja',()=>{
 const finish=app.slice(app.indexOf('function finishMessageInput(id){'),app.indexOf("$('#composer').onsubmit="));
 const show=app.match(/^function showChatList\(.*$/m)[0];
 let blurred=0,rendered=0,inChat=true;
 const folders=new Set(['recent-chats']);
 const context={active:'a',messageSelectionMode:false,appReady:false,
  $:()=>({blur(){blurred++;}}),mobileNavigation:()=>true,localStorage:{getItem:()=>null},
  current:()=>({folderId:'project',parentChatId:'parent'}),chats:[{id:'parent',folderId:'parent-project'}],
  clearMessageSelection(){},rememberChatView(){},renderSidebar(){rendered++;},showDefaults(){},closePanels(){},renderPopover(){},
  document:{body:{classList:{contains:()=>inChat,remove:()=>{inChat=false;}}}},
  menuChat:'a',location:{href:'https://desk.local/#chat=a'},history:{state:null,replaceState(){}},URL,
  setOpenFolder(){throw Error('Folder ne sme sam da se otvori');}
 };
 vm.runInNewContext(show+'\n'+finish+'\nfinishMessageInput("a");',context);
 assert.equal(blurred,1);assert.equal(inChat,false);assert.equal(rendered,1);assert.equal(context.menuChat,null);
 assert.deepEqual([...folders],['recent-chats']);
});
