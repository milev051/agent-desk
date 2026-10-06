import {joinWavs} from '/wav.mjs';
import {preferredEffort} from './reasoning.mjs';
import {exportMessages} from './sidebar-groups.mjs';
import {advanceColumns} from './folder-columns.mjs';
import { marked } from '/marked.js';
import { sidebarGroups, placedChats, mergeDraft } from '/sidebar-groups.mjs';
import DOMPurify from '/purify.js';
const agentLogos = {"codex": "data:image/svg+xml;base64,PHN2ZyBjb2xvcj0iI2IzOGFmZiIgZmlsbD0iI2IzOGFmZiIgZmlsbC1ydWxlPSJldmVub2RkIiBoZWlnaHQ9IjFlbSIgc3R5bGU9ImZsZXg6bm9uZTtsaW5lLWhlaWdodDoxIiB2aWV3Qm94PSIwIDAgMjQgMjQiIHdpZHRoPSIxZW0iIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHRpdGxlPk9wZW5BSTwvdGl0bGU+PHBhdGggZD0iTTkuMjA1IDguNjU4di0yLjI2YzAtLjE5LjA3Mi0uMzMzLjIzOC0uNDI4bDQuNTQzLTIuNjE2Yy42MTktLjM1NyAxLjM1Ni0uNTIzIDIuMTE3LS41MjMgMi44NTQgMCA0LjY2MiAyLjIxMiA0LjY2MiA0LjU2NiAwIC4xNjcgMCAuMzU3LS4wMjQuNTQ3bC00LjcxLTIuNzU5YS43OTcuNzk3IDAgMDAtLjg1NiAwbC01Ljk3IDMuNDczem0xMC42MDkgOC44VjEyLjA2YzAtLjMzMy0uMTQzLS41Ny0uNDI5LS43MzdsLTUuOTctMy40NzMgMS45NS0xLjExOGEuNDMzLjQzMyAwIDAxLjQ3NiAwbDQuNTQzIDIuNjE3YzEuMzA5Ljc2IDIuMTg5IDIuMzc4IDIuMTg5IDMuOTQ4IDAgMS44MDgtMS4wNyAzLjQ3My0yLjc2IDQuMTYzek03LjgwMiAxMi43MDNsLTEuOTUtMS4xNDJjLS4xNjctLjA5NS0uMjM5LS4yMzgtLjIzOS0uNDI4VjUuODk5YzAtMi41NDUgMS45NS00LjQ3MiA0LjU5MS00LjQ3MiAxIDAgMS45MjcuMzMzIDIuNzEyLjkyOEw4LjIzIDUuMDY3Yy0uMjg1LjE2Ni0uNDI4LjQwNC0uNDI4LjczN3Y2Ljg5OHpNMTIgMTUuMTI4bC0yLjc5NS0xLjU3di0zLjMzTDEyIDguNjU4bDIuNzk1IDEuNTd2My4zM0wxMiAxNS4xMjh6bTEuNzk2IDcuMjNjLTEgMC0xLjkyNy0uMzMyLTIuNzEyLS45MjdsNC42ODYtMi43MTJjLjI4NS0uMTY2LjQyOC0uNDA0LjQyOC0uNzM3di02Ljg5OGwxLjk3NCAxLjE0MmMuMTY3LjA5NS4yMzguMjM4LjIzOC40Mjh2NS4yMzNjMCAyLjU0NS0xLjk3NCA0LjQ3Mi00LjYxNCA0LjQ3MnptLTUuNjM3LTUuMzAzbC00LjU0NC0yLjYxN2MtMS4zMDgtLjc2MS0yLjE4OC0yLjM3OC0yLjE4OC0zLjk0OEE0LjQ4MiA0LjQ4MiAwIDAxNC4yMSA2LjMyN3Y1LjQyM2MwIC4zMzMuMTQzLjU3MS40MjguNzM4bDUuOTQ3IDMuNDQ5LTEuOTUgMS4xMThhLjQzMi40MzIgMCAwMS0uNDc2IDB6bS0uMjYyIDMuOWMtMi42ODggMC00LjY2Mi0yLjAyMS00LjY2Mi00LjUxOSAwLS4xOS4wMjQtLjM4LjA0Ny0uNTdsNC42ODYgMi43MWMuMjg2LjE2Ny41NzEuMTY3Ljg1NiAwbDUuOTctMy40NDh2Mi4yNmMwIC4xOS0uMDcuMzMzLS4yMzcuNDI4bC00LjU0MyAyLjYxNmMtLjYxOS4zNTctMS4zNTYuNTIzLTIuMTE3LjUyM3ptNS44OTkgMi44M2E1Ljk0NyA1Ljk0NyAwIDAwNS44MjctNC43NTZDMjIuMjg3IDE4LjMzOSAyNCAxNS44NCAyNCAxMy4yOTZjMC0xLjY2NS0uNzEzLTMuMjgyLTEuOTk4LTQuNDQ4LjExOS0uNS4xOS0uOTk5LjE5LTEuNDk4IDAtMy40MDEtMi43NTktNS45NDctNS45NDYtNS45NDctLjY0MiAwLTEuMjYuMDk1LTEuODguMzFBNS45NjIgNS45NjIgMCAwMDEwLjIwNSAwYTUuOTQ3IDUuOTQ3IDAgMDAtNS44MjcgNC43NTdDMS43MTMgNS40NDcgMCA3Ljk0NSAwIDEwLjQ5YzAgMS42NjYuNzEzIDMuMjgzIDEuOTk4IDQuNDQ4LS4xMTkuNS0uMTkgMS0uMTkgMS40OTkgMCAzLjQwMSAyLjc1OSA1Ljk0NiA1Ljk0NiA1Ljk0Ni42NDIgMCAxLjI2LS4wOTUgMS44OC0uMzA5YTUuOTYgNS45NiAwIDAwNC4xNjIgMS43MTN6Ij48L3BhdGg+PC9zdmc+", "claude": "data:image/svg+xml;base64,PHN2ZyBjb2xvcj0iI2VmOTM1NCIgZmlsbD0iI2VmOTM1NCIgZmlsbC1ydWxlPSJldmVub2RkIiBoZWlnaHQ9IjFlbSIgc3R5bGU9ImZsZXg6bm9uZTtsaW5lLWhlaWdodDoxIiB2aWV3Qm94PSIwIDAgMjQgMjQiIHdpZHRoPSIxZW0iIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHRpdGxlPkNsYXVkZTwvdGl0bGU+PHBhdGggZD0iTTQuNzA5IDE1Ljk1NWw0LjcyLTIuNjQ3LjA4LS4yMy0uMDgtLjEyOEg5LjJsLS43OS0uMDQ4LTIuNjk4LS4wNzMtMi4zMzktLjA5Ny0yLjI2Ni0uMTIyLS41NzEtLjEyMUwwIDExLjc4NGwuMDU1LS4zNTIuNDgtLjMyMS42ODYuMDYgMS41Mi4xMDMgMi4yNzguMTU4IDEuNjUyLjA5NyAyLjQ0OS4yNTVoLjM4OWwuMDU1LS4xNTctLjEzNC0uMDk4LS4xMDMtLjA5Ny0yLjM1OC0xLjU5Ni0yLjU1Mi0xLjY4OC0xLjMzNi0uOTcyLS43MjQtLjQ5MS0uMzY0LS40NjItLjE1OC0xLjAwOC42NTYtLjcyMi44ODEuMDYuMjI1LjA2MS44OTMuNjg2IDEuOTA4IDEuNDc2IDIuNDkxIDEuODMzLjM2NS4zMDQuMTQ1LS4xMDMuMDE5LS4wNzMtLjE2NC0uMjc0LTEuMzU1LTIuNDQ2LTEuNDQ2LTIuNDktLjY0NC0xLjAzMi0uMTctLjYxOWEyLjk3IDIuOTcgMCAwMS0uMTA0LS43MjlMNi4yODMuMTM0IDYuNjk2IDBsLjk5Ni4xMzQuNDIuMzY0LjYyIDEuNDE0IDEuMDAyIDIuMjI5IDEuNTU1IDMuMDMuNDU2Ljg5OC4yNDMuODMyLjA5MS4yNTVoLjE1OFY5LjAxbC4xMjgtMS43MDYuMjM3LTIuMDk1LjIzLTIuNjk1LjA4LS43Ni4zNzYtLjkxLjc0Ny0uNDkyLjU4NC4yOC40OC42ODUtLjA2Ny40NDQtLjI4NiAxLjg1MS0uNTU5IDIuOTAzLS4zNjQgMS45NDJoLjIxMmwuMjQzLS4yNDIuOTg1LTEuMzA2IDEuNjUyLTIuMDY0LjczLS44Mi44NS0uOTA0LjU0Ny0uNDMxaDEuMDMzbC43NiAxLjEyOS0uMzQgMS4xNjYtMS4wNjQgMS4zNDctLjg4MSAxLjE0Mi0xLjI2NCAxLjctLjc5IDEuMzYuMDczLjExLjE4OC0uMDIgMi44NTYtLjYwNiAxLjU0My0uMjggMS44NDEtLjMxNS44MzMuMzg4LjA5MS4zOTUtLjMyOC44MDctMS45NjkuNDg2LTIuMzA5LjQ2Mi0zLjQzOS44MTMtLjA0Mi4wMy4wNDkuMDYxIDEuNTQ5LjE0Ni42NjIuMDM2aDEuNjIybDMuMDIuMjI1Ljc5LjUyMi40NzQuNjM4LS4wNzkuNDg1LTEuMjE1LjYyLTEuNjQtLjM4OS0zLjgyOS0uOTEtMS4zMTItLjMyOWgtLjE4MnYuMTFsMS4wOTMgMS4wNjggMi4wMDYgMS44MSAyLjUwOSAyLjMzLjEyNy41NzgtLjMyMi40NTUtLjM0LS4wNDktMi4yMDUtMS42NTctLjg1MS0uNzQ3LTEuOTI2LTEuNjJoLS4xMjh2LjE3bC40NDQuNjQ5IDIuMzQ1IDMuNTIxLjEyMiAxLjA4LS4xNy4zNTMtLjYwOC4yMTMtLjY2OC0uMTIyLTEuMzc0LTEuOTI1LTEuNDE1LTIuMTY3LTEuMTQzLTEuOTQzLS4xNC4wOC0uNjc0IDcuMjU0LS4zMTYuMzctLjcyOS4yOC0uNjA3LS40NjEtLjMyMi0uNzQ3LjMyMi0xLjQ3Ni4zODktMS45MjQuMzE1LTEuNTMuMjg2LTEuOS4xNy0uNjMyLS4wMTItLjA0Mi0uMTQuMDE4LTEuNDM0IDEuOTY3LTIuMTggMi45NDUtMS43MjYgMS44NDUtLjQxNC4xNjQtLjcxNy0uMzcuMDY3LS42NjIuNDAxLS41ODkgMi4zODgtMy4wMzYgMS40NC0xLjg4Mi45My0xLjA4Ni0uMDA2LS4xNThoLS4wNTVMNC4xMzIgMTguNTZsLTEuMTMuMTQ2LS40ODctLjQ1Ni4wNjEtLjc0Ni4yMzEtLjI0MyAxLjkwOC0xLjMxMi0uMDA2LjAwNnoiPjwvcGF0aD48L3N2Zz4=", "grok": "data:image/svg+xml;base64,PHN2ZyBjb2xvcj0iI2ZmZmZmZiIgZmlsbD0iI2ZmZmZmZiIgZmlsbC1ydWxlPSJldmVub2RkIiBoZWlnaHQ9IjFlbSIgc3R5bGU9ImZsZXg6bm9uZTtsaW5lLWhlaWdodDoxIiB2aWV3Qm94PSIwIDAgMjQgMjQiIHdpZHRoPSIxZW0iIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHRpdGxlPkdyb2s8L3RpdGxlPjxwYXRoIGQ9Ik05LjI3IDE1LjI5bDcuOTc4LTUuODk3Yy4zOTEtLjI5Ljk1LS4xNzcgMS4xMzcuMjcyLjk4IDIuMzY5LjU0MiA1LjIxNS0xLjQxIDcuMTY5LTEuOTUxIDEuOTU0LTQuNjY3IDIuMzgyLTcuMTQ5IDEuNDA2bC0yLjcxMSAxLjI1N2MzLjg4OSAyLjY2MSA4LjYxMSAyLjAwMyAxMS41NjItLjk1MyAyLjM0MS0yLjM0NCAzLjA2Ni01LjUzOSAyLjM4OC04LjQybC4wMDYuMDA3Yy0uOTgzLTQuMjMyLjI0Mi01LjkyNCAyLjc1LTkuMzgzLjA2LS4wODIuMTItLjE2NC4xNzktLjI0OGwtMy4zMDEgMy4zMDV2LS4wMUw5LjI2NyAxNS4yOTJNNy42MjMgMTYuNzIzYy0yLjc5Mi0yLjY3LTIuMzEtNi44MDEuMDcxLTkuMTg0IDEuNzYxLTEuNzYzIDQuNjQ3LTIuNDgzIDcuMTY2LTEuNDI1bDIuNzA1LTEuMjVhNy44MDggNy44MDggMCAwMC0xLjgyOS0xQTguOTc1IDguOTc1IDAgMDA1Ljk4NCA1LjgzYy0yLjUzMyAyLjUzNi0zLjMzIDYuNDM2LTEuOTYyIDkuNzY0IDEuMDIyIDIuNDg3LS42NTMgNC4yNDYtMi4zNCA2LjAyMi0uNTk5LjYzLTEuMTk5IDEuMjU5LTEuNjgyIDEuOTI1bDcuNjItNi44MTUiPjwvcGF0aD48L3N2Zz4=", "antigravity": "data:image/svg+xml;base64,PHN2ZyBjb2xvcj0iIzZhYWVmZiIgZmlsbD0iIzZhYWVmZiIgZmlsbC1ydWxlPSJldmVub2RkIiBoZWlnaHQ9IjFlbSIgc3R5bGU9ImZsZXg6bm9uZTtsaW5lLWhlaWdodDoxIiB2aWV3Qm94PSIwIDAgMjQgMjQiIHdpZHRoPSIxZW0iIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHRpdGxlPkFudGlncmF2aXR5PC90aXRsZT48cGF0aCBkPSJNMjEuNzUxIDIyLjYwN2MxLjM0IDEuMDA1IDMuMzUuMzM1IDEuNTA4LTEuNTA4QzE3LjczIDE1Ljc0IDE4LjkwNCAxIDEyLjAzNyAxIDUuMTcgMSA2LjM0MiAxNS43NC44MTUgMjEuMWMtMi4wMSAyLjAwOS4xNjcgMi41MTEgMS41MDcgMS41MDYgNS4xOTItMy41MTcgNC44NTctOS43MTQgOS43MTUtOS43MTQgNC44NTcgMCA0LjUyMiA2LjE5NyA5LjcxNCA5LjcxNXoiPjwvcGF0aD48L3N2Zz4="};
const $ = s => document.querySelector(s);
// One toolbar moves between the sidebar and the persistent phone header.
const agentToolbar=$('.sidebar-actions'),mobileHeader=$('#mobile-agent-header'),mobileLayout=matchMedia('(max-width:650px)');
function placeAgentToolbar(){if(mobileLayout.matches)mobileHeader.append(agentToolbar);else $('.sidebar').prepend(agentToolbar);}
mobileLayout.addEventListener('change',placeAgentToolbar);placeAgentToolbar();

// Tastatura na telefonu smanjuje vidljivi deo. Aplikacija staje u taj prozor, a čet se podiže da tekst ne ostane ispod nje.
let lastViewportHeight=window.visualViewport?.height || window.innerHeight;
function revealAboveComposer(extra=0){const view=$('#conversation');if(!view || !matchMedia('(max-width:650px)').matches)return;const nearBottom=view.scrollHeight-view.scrollTop-view.clientHeight<90;requestAnimationFrame(()=>{if(nearBottom)view.scrollTop=view.scrollHeight;else if(extra>0)view.scrollTop+=extra;});}
const fitViewport=()=>{const vv=window.visualViewport;if(!vv)return;const covered=lastViewportHeight-vv.height;lastViewportHeight=vv.height;document.documentElement.style.setProperty('--app-height',vv.height+'px');document.documentElement.style.setProperty('--vv-top',vv.offsetTop+'px');if(covered>40)revealAboveComposer(covered);};
window.visualViewport?.addEventListener('resize',fitViewport);window.visualViewport?.addEventListener('scroll',fitViewport);fitViewport();
let events, defaults = {}, models = {}, meta, chats = [], active = localStorage.getItem('agent-desk-active'), selectedAgent = 'codex', menuChat = null, menuFolder = null, lastMessages = '', connected = true, appReady = false, sawEvents = false;
const phoneRemote=!['127.0.0.1','localhost'].includes(location.hostname);
let speechClip=null,speechAbort=null,speechSeeking=false,speechSelection=null;
const speechAudio=new Audio();
speechAudio.id='speech-audio';
speechAudio.preload='auto';
document.body.append(speechAudio);
let titleSettings={};
let mobileAutofocus=localStorage.getItem('agent-desk-mobile-autofocus')==='1';
const linkedFiles=new Map();
const pendingMessages=new Map(),newEmptyChats=new Set(),historyCounts=new Map();
function focusPrompt(){if(!matchMedia('(max-width:650px)').matches || mobileAutofocus)$('#prompt').focus();}
let rename = null, creating = false, submitting = false, uploading = false, clickTimer, holdTimer, holdStart, held = false, suppressClickUntil=0;
let colorMode=localStorage.getItem('agent-desk-color-mode') || 'label';
document.body.classList.toggle('colored-responses',colorMode==='full');
const selectedMessages=new Set();
let messageSelectionMode=false,selectionAnchor=null;
const drafts = new Map(), switchingChats = new Set();
const draftDirty=new Map(),draftServer=new Map(),draftSaving=new Set();let draftTimer,draftSaveWarningShown=false;
try{for(const [id,value] of JSON.parse(localStorage.getItem('agent-desk-drafts')||'[]')){draftDirty.set(id,value);drafts.set(id,value.text);}}catch{}
function persistDrafts(){try{localStorage.setItem('agent-desk-drafts',JSON.stringify([...draftDirty]));}catch{}}
function recordDraft(id,text){
 if(!id){drafts.set(id,text);return;}
 const before=draftDirty.get(id),base=draftServer.get(id) || chats.find(c=>c.id===id)?.draft || {text:'',revision:0};
 drafts.set(id,text);draftDirty.set(id,{text,revision:before?.revision??base.revision,base:before?.base??base.text});persistDrafts();
 clearTimeout(draftTimer);draftTimer=setTimeout(flushDrafts,500);if(meta)renderSidebar();
}
function receiveDrafts(){
 for(const chat of chats){const received=chat.draft || {text:'',revision:0},known=draftServer.get(chat.id),remote=known?.revision>received.revision?known:received;draftServer.set(chat.id,remote);if(draftDirty.has(chat.id))continue;drafts.set(chat.id,remote.text);if(active===chat.id && $('#prompt').value!==remote.text){$('#prompt').value=remote.text;resizePrompt();}}
}
async function flushDrafts(){for(const id of draftDirty.keys())void saveDraft(id);}
async function saveDraft(id){
 if(draftSaving.has(id) || !draftDirty.has(id) || !chats.some(c=>c.id===id))return;draftSaving.add(id);
 try{
  const sent={...draftDirty.get(id)};
  const response=await fetch(`/api/chats/${id}/draft`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({text:sent.text,revision:sent.revision})});
  const result=await response.json();if(!response.ok && response.status!==409)throw Error(result.error||'Nacrt nije sinhronizovan.');
  const remote=result.draft;draftSaveWarningShown=false;draftServer.set(id,remote);const chat=chats.find(c=>c.id===id);if(chat)chat.draft=remote;const pending=draftDirty.get(id);
  if(response.status===409){
   const merged=mergeDraft(pending.base,pending.text,remote.text);draftDirty.set(id,{text:merged,base:remote.text,revision:remote.revision});drafts.set(id,merged);
   if(active===id && $('#prompt').value!==merged){$('#prompt').value=merged;resizePrompt();}
   if(merged!==pending.text)toast('Spojeni su nacrti izmenjeni na oba uređaja.');
  }else if(pending.text===sent.text){draftDirty.delete(id);drafts.set(id,remote.text);}
  else draftDirty.set(id,{text:pending.text,base:remote.text,revision:remote.revision});
  persistDrafts();if(meta)renderSidebar();
 }catch{if(!draftSaveWarningShown){draftSaveWarningShown=true;toast('Nacrt je sačuvan na ovom uređaju. Sinhronizacija će se ponoviti kada server bude dostupan.');}}
 finally{draftSaving.delete(id);}
}
setInterval(flushDrafts,3000);
function keepDraftOnExit(){if(active && draftDirty.has(active)){const value=draftDirty.get(active);void fetch(`/api/chats/${active}/draft`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({text:value.text,revision:value.revision}),keepalive:true}).catch(()=>{});}}
window.addEventListener('pagehide',keepDraftOnExit);
document.addEventListener('visibilitychange',()=>{if(document.hidden)keepDraftOnExit();else void flushDrafts();});

const escape = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const current = () => chats.find(c => c.id === active);
const agentName = id => meta.agents.find(a => a.id === id)?.name || id;
function toast(message) { $('#toast').textContent = message; $('#toast').hidden = false; clearTimeout(toast.timer); toast.timer = setTimeout(() => $('#toast').hidden = true, 5500); }
const bootLabels={'/api/meta':'Agenti i dostupnost','/api/defaults':'Podešavanja','/api/folders':'Folderi','/api/chats':'Istorija četova'};
const bootSteps=new Map(),bootStarted=performance.now();
function bootProgress(key,status){if(document.body.classList.contains('ready'))return;bootSteps.set(key,status);const list=$('#boot-progress');if(list)list.replaceChildren(...[...bootSteps].map(([name,state])=>{const li=document.createElement('li');li.textContent=`${name} · ${state}`;return li;}));}
function bootSize(bytes){return bytes<1024?`${bytes} B`:`${(bytes/1024).toFixed(1)} KB`;}
const bootClock=setInterval(()=>{if(document.body.classList.contains('ready')){clearInterval(bootClock);return;}const time=$('#boot-time');if(time)time.textContent=`Traje ${Math.floor((performance.now()-bootStarted)/1000)} s · veličina je učitani JSON, bez kompresije`;},1000);
$('#boot-stage').textContent='Učitavam podatke sa računara…';
async function api(url, method = 'GET', data) {
  const label=!appReady && method==='GET'?bootLabels[url]:null;
  if(label)bootProgress(label,'čekam odgovor servera');
  try{
   const res = await fetch(url, {method, headers:{'Content-Type':'application/json'},body:data ? JSON.stringify(data) : undefined});
   let b;
   if(label && res.body){const reader=res.body.getReader(),decoder=new TextDecoder();let text='',bytes=0;for(;;){const part=await reader.read();if(part.done)break;bytes+=part.value.byteLength;text+=decoder.decode(part.value,{stream:true});bootProgress(label,'preuzimam · '+bootSize(bytes));}text+=decoder.decode();b=JSON.parse(text);bootProgress(label,'učitano · '+bootSize(bytes));}else b=await res.json();
   if(!res.ok)throw new Error(b.error || 'Greška servera.');return b;
  }catch(error){if(label)bootProgress(label,'nije učitano · '+error.message);throw error;}
}
async function guard(fn) {try {await fn();} catch(e) {toast(e.message);}}
function localFileHref(value){try{const u=new URL(value,location.href);if(u.protocol==='file:')return decodeURIComponent(u.pathname);if(/^\/(Users|Volumes)\//.test(u.pathname) && (u.origin===location.origin||['127.0.0.1','localhost'].includes(u.hostname)))return decodeURIComponent(u.pathname);}catch{}return null;}
function markdown(text) {
  text=(text||'').replace(/\]\((file:\/\/[^)]+)\)/g,(match,p)=>{try{return '](/files'+new URL(p).pathname+')';}catch{return match;}});
  const html=DOMPurify.sanitize(marked.parse(text || '',{gfm:true,breaks:true}),{ALLOWED_TAGS:['p','br','strong','em','del','code','pre','blockquote','ul','ol','li','h1','h2','h3','h4','h5','h6','hr','a','table','thead','tbody','tr','th','td'],ALLOWED_ATTR:['href','title','align','start'],ALLOW_DATA_ATTR:false});
  // Dugačka putanja se lomi na kose crte, ne usred imena foldera.
  return html.replace(/<code>([^<]*\/[^<]*\/[^<]*)<\/code>/g,(all,inner)=>`<code>${inner.replaceAll('/','/<wbr>')}</code>`);
}
function effortsFor(agent,model) {
  const c=models[agent], selected=model || (agent==='claude' ? 'default' : agent==='grok' ? c?.defaultModel : '');
  return c?.models.find(m=>m.id===selected)?.efforts || [];
}
function effortOptions(s) {return '<option value="">Podrazumevano</option>'+effortsFor(s.agent,s.model).map(e=>`<option value="${escape(e.id)}" ${s.effort===e.id?'selected':''}>${escape(e.name)}</option>`).join('');}
function modelOptions(s) {
  const items=[...(models[s.agent]?.models || [])];if(s.model && !items.some(m=>m.id===s.model)) items.unshift({id:s.model,name:s.model});
  return `<option value="" ${!s.model?'selected':''}>Podrazumevani</option>`+items.map(m=>`<option value="${escape(m.id)}" ${s.model===m.id?'selected':''}>${escape(m.name)}</option>`).join('');
}
const copyIcon='<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><rect x="8" y="8" width="12" height="13" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h3"/></svg>';
const speakIcon='<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M4 10v4h3l4 3V7L7 10H4z"/><path d="M15 9.2a3.8 3.8 0 0 1 0 5.6"/></svg>';
const speakStopIcon='<svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="7" y="7" width="10" height="10" rx="1.5"/></svg>';
const selectBox='<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><rect x="4" y="4" width="16" height="16" rx="2"/></svg>';
const selectMark='<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M5 12.5 10 17.5 19 7"/></svg>';
const trashIcon='<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7"/></svg>';
const forkIcon='<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><circle cx="6" cy="5" r="2"/><circle cx="6" cy="19" r="2"/><circle cx="18" cy="5" r="2"/><path d="M6 7v10M6 15c0-5 12-3 12-8"/></svg>';
const stopIcon='<svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><rect x="4" y="4" width="12" height="12" rx="1"/></svg>';
const actionIcon=paths=>`<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;
const folderIcon=actionIcon('<path d="M3 7V5a2 2 0 0 1 2-2h5l2 3h7a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z"/><path d="M3 9h18"/>');
const recordIcon=actionIcon('<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6M8 13h8M8 17h8"/>');
let seen={};try {seen=JSON.parse(localStorage.getItem('agent-desk-seen') || '{}');} catch {}
const closedAgentGroups=new Set();
let folders=[],openFolder=null,folderRename=null,drag=null;try{openFolder=localStorage.getItem('agent-desk-folder');}catch{}
function completion(chat) {const m=[...chat.messages].reverse().find(m=>m.role==='assistant');return m && ['done','stopped','error','interrupted'].includes(m.status) ? {token:`${m.id}:${m.status}`,status:m.status} : null;}
function markRead(chat) {const c=chat && completion(chat);if(c && seen[chat.id]!==c.token){seen[chat.id]=c.token;localStorage.setItem('agent-desk-seen',JSON.stringify(seen));}}
function notification(chat) {const c=completion(chat);if(chat.running || !c || seen[chat.id]===c.token)return '';return c.status==='done'?'completed':'unread';}
function resizePrompt() {
  const input=$('#prompt'),view=$('#conversation');
  const before=view?view.scrollHeight-view.scrollTop-view.clientHeight:0;
  const saved=view?view.scrollTop:0,prevClient=view?view.clientHeight:0;
  const limit=Math.max(42,Math.round((window.visualViewport?.height || window.innerHeight)*0.4));
  input.style.overflowY='hidden';input.style.height='0px';
  const needed=input.scrollHeight || 21,next=Math.min(needed,limit);
  input.style.height=next+'px';input.style.overflowY=needed>next+1?'auto':'hidden';
  if(!view)return;
  if(matchMedia('(max-width:650px)').matches){if(before<90)view.scrollTop=view.scrollHeight;else view.scrollTop=saved+Math.max(0,prevClient-view.clientHeight);}
  else view.scrollTop=before<8?view.scrollHeight:saved;
}
function discardEmpty(id){const chat=chats.find(c=>c.id===id);if(!(newEmptyChats.has(id)||chat?.ephemeral)||!chat||chat.messages.length||chat.running||chat.queue?.length||pendingMessages.has(id)||drafts.get(id)?.trim())return;newEmptyChats.delete(id);api(`/api/chats/${id}/discard-empty`,'POST',{}).then(()=>{chats=chats.filter(c=>c.id!==id);drafts.delete(id);linkedFiles.delete(id);if(meta)renderSidebar();}).catch(()=>{});}
function choose(id,{replaceHistory=false}={}) {
  if(active && draftDirty.has(active))void saveDraft(active);
  receiveDrafts();
  const changed=active!==id;
  const parent=chats.find(c=>c.id===id)?.parentChatId;if(parent)closedAgentGroups.delete(parent);
  if(active!==id){discardEmpty(active);selectedMessages.clear();messageSelectionMode=false;selectionAnchor=null;renderMessageSelection();}
  showDefaults(false);document.body.classList.toggle('chat-view',!!id);
  speechSelection=null;$('#speech-selection').hidden=true;clearTimeout(clickTimer);drafts.set(active,$('#prompt').value);active=id;$('#prompt').value=drafts.get(id)||'';resizePrompt();
  const url=new URL(location.href);if(id)url.hash='chat='+encodeURIComponent(id);else url.hash='';if(mobileNavigation() && changed && id && !replaceHistory)history.pushState({agentDesk:true,agentDeskGuard:true,chatId:id},'',url);else history.replaceState(history.state,'',url);
  closePanels();
  if(speechClip && speechClip.chatId!==id)speechAudio.pause();
  if(id)localStorage.setItem('agent-desk-active',id);else localStorage.removeItem('agent-desk-active');
  if(current()){selectedAgent=current().settings.agent;markRead(current());}
  menuChat=null;rename=null;lastMessages='';forceBottom=!!id;render();renderSpeechBar();renderLinkedFiles();focusPrompt();
}
function putChat(chat) {if(chats.some(c=>c.id===chat.id))chats=chats.map(c=>c.id===chat.id?chat:c);else chats.unshift(chat);}
async function create(agent=selectedAgent,model,effort='') {
  if(creating)return;creating=true;
  try {
    const existing=current(), reusable=existing && !existing.running && !existing.messages.length && !Object.keys(existing.sessions).length;
    const sameFolder=(existing?.folderId||null)===(openFolder||null);
    const settings={agent,...(model!==undefined?{model,effort}:{})};const chat=reusable && sameFolder ? existing.settings.agent===agent && model===undefined ? existing : await api(`/api/chats/${existing.id}`,'PATCH',{settings}) : await api('/api/chats','POST',{settings,...(openFolder?{folderId:openFolder}:{})});
    if(!reusable)newEmptyChats.add(chat.id);putChat(chat);choose(chat.id);return chat;
  } finally {creating=false;}
}
function modelLabel(chat) {
  const last=chat.sessions[chat.settings.agent] && [...chat.messages].reverse().find(m=>m.agent===chat.settings.agent);
  const id=chat.settings.model || (last?.configuredModel===chat.settings.model ? last.model : '');
  return id ? modelName(chat.settings.agent,id) : 'Podrazumevani CLI model';
}
const agentOrder=['codex','claude','antigravity','grok'];
let limits={},lastNewAgents='';
function renderNewAgents() {const settings=$('#defaults-open');const html=agentOrder.map(id=>meta.agents.find(a=>a.id===id)).filter(Boolean).map(a=>`<button class="new-agent" data-new-agent="${a.id}" title="Novi čet · ${escape(a.name)}" aria-label="Novi čet · ${escape(a.name)}" ${!a.available?'disabled':''}><img src="${agentLogos[a.id]}" alt="" width="21" height="21"><small class="agent-limits ${limits[a.id]?.stale?'limits-stale':''}" title="${escape(limitDescription(a.id))}">${limitDisplay(a.id)}</small></button>`).join('');if(html!==lastNewAgents){$('#new-agents').innerHTML=html;$('#new-agents').append(settings);lastNewAgents=html;}}
let lastSidebar='', paintingSidebar=false;
function setOpenFolder(id){openFolder=folders.some(folder=>folder.id===id)?id:null;if(openFolder)localStorage.setItem('agent-desk-folder',openFolder);else localStorage.removeItem('agent-desk-folder');folderRename=null;renderSidebar();}
function visibleSidebarChats(){
 const ids=folders.map(folder=>folder.id),groups=[...(openFolder?placedChats(chats,ids,openFolder):[]),...placedChats(chats,ids)];
 return groups.flatMap(group=>[group.chat,...(closedAgentGroups.has(group.chat.id)?[]:group.children)]);
}
function renderSidebar() {
  const row=(c,index)=>{const shortcut=index<9?` · ⌘${index+1}`:'';return `<div role="button" tabindex="0" aria-label="${escape(c.title)}${shortcut}" class="chat-row ${c.parentChatId?'subagent-card':''} ${(drafts.has(c.id)?drafts.get(c.id):c.draft?.text||'').trim()?'has-draft':''} ${c.id===active?'active':''} ${c.running?'working':notification(c)} ${drag?.active && drag.id===c.id?'drag-source':''}" data-row="${c.id}" data-agent="${c.settings.agent}" title="${escape(c.title)} · ${escape(agentName(c.settings.agent))} · ${escape(modelLabel(c))}${shortcut}">
    <span class="chat-item"><span>${escape(c.title)}</span></span><span class="chat-drag-zone" aria-hidden="true" title="Zadrži desnu ivicu i prevuci čet"></span>
  </div>`;};
  const groups=sidebarGroups(chats),ids=folders.map(folder=>folder.id);
  if(openFolder && !ids.includes(openFolder))openFolder=null;
  const folderRow=folder=>{const count=groups.filter(group=>group.chat.folderId===folder.id).length;const editing=folderRename?.id===folder.id;return `<div class="folder-row ${openFolder===folder.id?'open':''}" data-folder="${folder.id}" role="button" tabindex="0" aria-expanded="${openFolder===folder.id}" aria-label="${escape(folder.name || 'Naziv foldera')}, ${count} četova" title="Otvori folder. Drži za radnje."><span class="folder-mark ${folder.shared?'shared':''}" aria-hidden="true"></span>${editing?`<input data-folder-name aria-label="Naziv foldera" placeholder="Naziv foldera" value="${escape(folderRename.value)}" maxlength="40">`:`<span class="folder-name">${escape(folder.name)}</span>`}<small>${count}</small><span class="folder-chevron" aria-hidden="true"></span></div>`;};
  const visible=openFolder?placedChats(chats,ids,openFolder):[],unassigned=placedChats(chats,ids);
  const shortcutOrder=visibleSidebarChats().map(c=>c.id);
  const folderItems=folderRename?.draft?[...folders,{id:folderRename.id,name:''}]:folders;
  const chatRows=list=>list.map(group=>`<div class="chat-group ${group.children.some(c=>c.id===active)?'has-active-child':''}">${row(group.chat,shortcutOrder.indexOf(group.chat.id))}${group.children.length?`<div class="subagent-folder"><button type="button" class="folder-row agent-group ${closedAgentGroups.has(group.chat.id)?'':'open'}" data-agent-group="${group.chat.id}" aria-expanded="${!closedAgentGroups.has(group.chat.id)}"><span class="folder-mark" aria-hidden="true"></span><span class="folder-name">Agenti</span><small>${group.children.length}</small><span class="folder-chevron" aria-hidden="true"></span></button>${closedAgentGroups.has(group.chat.id)?'':`<div class="subagent-chats">${group.children.map(child=>row(child,shortcutOrder.indexOf(child.id))).join('')}</div>`}</div>`:''}</div>`).join('');
  const content=folderItems.map(folder=>`<section class="sidebar-folder">${folderRow(folder)}${openFolder===folder.id?`<div class="folder-chats" data-folder-target="${folder.id}">${chatRows(visible)}${!visible.length?'<p class="folder-empty">Prazan folder</p>':''}</div>`:''}</section>`).join('')+`<section class="sidebar-folder"><button type="button" class="folder-row open" data-unassigned data-folder-out aria-expanded="true"><span class="folder-mark" aria-hidden="true"></span><span class="folder-name">Neraspoređeni</span><small>${unassigned.length}</small></button><div class="folder-chats" id="chat-list-items" data-folder-out>${chatRows(unassigned)}${!unassigned.length?'<p class="folder-empty">Nema neraspoređenih četova</p>':''}</div></section>`;

  if(content!==lastSidebar){const input=$('[data-folder-name]'), editing=input && document.activeElement===input, start=input?.selectionStart,end=input?.selectionEnd;paintingSidebar=true;$('#chats').innerHTML=content;lastSidebar=content;if(editing && folderRename){const replacement=$('[data-folder-name]');replacement.focus();replacement.setSelectionRange(start,end);}paintingSidebar=false;}
  renderPopover();renderNewAgents();
}
async function moveToFolder(id,folderId){const child=chats.find(c=>c.id===id)?.parentChatId;const chat=await api(`/api/chats/${id}${child?'/unlink':''}`,child?'POST':'PATCH',{folderId});putChat(chat);render();if(child)toast('Podagent je izdvojen u samostalan čet.');}
async function saveFolderRename(){if(!folderRename || paintingSidebar)return;const edit=folderRename;const name=edit.value.trim();folderRename=null;if(edit.draft){if(!name){lastSidebar='';renderSidebar();return;}try{const saved=edit.createdId?folders.find(folder=>folder.id===edit.createdId):await api('/api/folders','POST',{name});edit.createdId=saved.id;if(!folders.some(folder=>folder.id===saved.id))folders.push(saved);if(edit.chatId)await moveToFolder(edit.chatId,saved.id);}catch(error){folderRename=edit;lastSidebar='';renderSidebar();const input=$('[data-folder-name]');input?.focus();throw error;}lastSidebar='';renderSidebar();return;}const currentName=folders.find(folder=>folder.id===edit.id)?.name;if(name && name!==currentName){const saved=await api(`/api/folders/${edit.id}`,'PATCH',{name});folders=folders.map(folder=>folder.id===saved.id?saved:folder);}lastSidebar='';renderSidebar();}
function addFolder(chatId=null){if(folderRename?.draft){$('[data-folder-name]')?.focus();return;}folderRename={id:'draft',value:'',draft:true,chatId};menuFolder=null;lastSidebar='';renderSidebar();$('[data-folder-name]')?.focus();}
function openFolderMenu(id){if(!folders.some(folder=>folder.id===id))return;menuFolder=id;menuChat=null;rename=null;if(folderRename){folderRename=null;lastSidebar='';renderSidebar();}renderPopover();}
async function removeFolder(id){await api(`/api/folders/${id}`,'DELETE');folders=folders.filter(folder=>folder.id!==id);chats=chats.map(chat=>chat.folderId===id?{...chat,folderId:undefined}:chat);if(openFolder===id){openFolder=null;localStorage.removeItem('agent-desk-folder');}menuFolder=null;folderRename=null;pendingFolderDelete=null;lastSidebar='';closeDeleteDialog();render();}
function closeDeleteDialog(){pendingFolderDelete=null;pendingReset=null;$('#delete-only').textContent='Arhiviraj ovaj čet';$('#delete-family').hidden=false;$('#delete-dialog').close();}
function restoreQueued(text){const input=$('#prompt'),draft=input.value,next=draft.trim()?`${text}\n\n${draft}`:text;input.value=next;recordDraft(active,next);resizePrompt();input.focus();const cursor=draft.trim()?text.length:next.length;try{input.setSelectionRange(cursor,cursor);}catch{}}
function renderChatNavigation() {
  const chat=current();
  $('#chat-parent').hidden=!chats.some(c=>c.id===chat?.parentChatId);
  $('#chat-title').textContent=chat?.title || '';
  $('#chat-options').hidden=!chat;
  if(chat)$('#chat-options').dataset.options=chat.id;
  if(chat)$('#chat-options').innerHTML=`<img src="${agentLogos[chat.settings.agent]}" alt="" width="20" height="20">`;
}
function showChatList(){if(messageSelectionMode){clearMessageSelection();return;}const folderId=document.body.classList.contains('chat-view')?current()?.folderId:null;discardEmpty(active);document.body.classList.remove('chat-view');setOpenFolder(folderId);showDefaults(false);closePanels();menuChat=null;renderPopover();const url=new URL(location.href);url.hash='';history.replaceState(history.state,'',url);}
function backFromChat(){if(!$('#defaults').hidden){showDefaults(false);return;}if(messageSelectionMode){clearMessageSelection();return;}const parent=current()?.parentChatId;if(document.body.classList.contains('chat-view') && chats.some(c=>c.id===parent))choose(parent,{replaceHistory:true});else showChatList();}
$('#chat-back').onclick=backFromChat;
// A horizontal trackpad gesture goes back; horizontal document scrolling stays usable.
let backSwipeDistance=0,backSwipeAt=0,backSwipeDoneAt=0;
document.addEventListener('wheel',e=>{
 if(mobileNavigation() || e.ctrlKey || e.shiftKey || Math.abs(e.deltaX)<Math.abs(e.deltaY)*2 || !e.deltaX)return;
 for(let el=e.target;el && el!==document.body;el=el.parentElement){if(el.scrollWidth>el.clientWidth+2 && ['auto','scroll'].includes(getComputedStyle(el).overflowX))return;}
 const now=Date.now();if(now-backSwipeDoneAt<900){e.preventDefault();return;}
 if(now-backSwipeAt>250)backSwipeDistance=0;backSwipeAt=now;
 if(e.deltaX>=0){backSwipeDistance=0;return;}
 e.preventDefault();backSwipeDistance-=e.deltaX;
 if(backSwipeDistance<100)return;backSwipeDistance=0;backSwipeDoneAt=now;
 if(!$('#defaults').hidden || document.body.classList.contains('chat-view')){backFromChat();if(!mobileNavigation() && !document.body.classList.contains('chat-view'))choose(null,{replaceHistory:true});}
 else if(openFolder)setOpenFolder(null);
},{passive:false});
const mobileNavigation=()=>matchMedia('(max-width:650px)').matches;
let mobileHistoryActivated=false;
function activateMobileHistory(e){if(!e.isTrusted || !mobileNavigation() || mobileHistoryActivated)return;mobileHistoryActivated=true;history.pushState({agentDesk:true,agentDeskGuard:true},'',location.href);}
// Chrome may skip entries created before user activation, including restored PWA entries.
document.addEventListener('click',activateMobileHistory,{capture:true});document.addEventListener('keydown',activateMobileHistory,{capture:true});

function keepMobileHistory(){if(mobileNavigation())history.pushState({agentDesk:true,agentDeskGuard:true},'',location.href);}
window.addEventListener('popstate',()=>{if(!$('#defaults').hidden){showDefaults(false);const url=new URL(location.href);url.hash=document.body.classList.contains('chat-view') && active?'chat='+encodeURIComponent(active):'';history.replaceState(history.state,'',url);keepMobileHistory();return;}if($('#attachment-view').open){$('#attachment-view').close();attachmentHistory=false;keepMobileHistory();return;}if($('#files-dialog').open){guard(async()=>{if(!filePickerClosing && fileListing.path!==fileListing.home && fileListing.parent){history.pushState({agentDesk:true,filePicker:true},'',location.href);await browseFolder(fileListing.parent);}else{filePickerClosing=false;$('#files-dialog').close();keepMobileHistory();}});return;}if(mobileNavigation()){if(document.body.classList.contains('chat-view')){if($('#files-dialog').open)$('#files-dialog').close();if($('#delete-dialog').open)$('#delete-dialog').close();backFromChat();}else if(openFolder)setOpenFolder(null);else showChatList();keepMobileHistory();}});

$('#chat-parent').onclick=()=>{if(current()?.parentChatId)choose(current().parentChatId);};
$('#chat-options').onclick=()=>{if(current()){menuChat=menuChat===active?null:active;renderPopover();}};
let headerPull=null,headerSuppressUntil=0;
agentToolbar.addEventListener('pointerdown',e=>{if(!current() || !document.body.classList.contains('chat-view') || e.button!==0 || !e.isPrimary)return;headerPull={id:e.pointerId,x:e.clientX,y:e.clientY,chatId:active};});
agentToolbar.addEventListener('pointermove',e=>{const p=headerPull;if(!p || p.id!==e.pointerId)return;const dx=e.clientX-p.x,dy=e.clientY-p.y;if(Math.abs(dx)>20 || dy<-12){headerPull=null;return;}if(dy>10){e.preventDefault();agentToolbar.setPointerCapture(e.pointerId);}});
agentToolbar.addEventListener('pointerup',e=>{const p=headerPull;headerPull=null;if(!p || p.id!==e.pointerId || p.chatId!==active)return;if(e.clientY-p.y>=45 && Math.abs(e.clientX-p.x)<20){e.preventDefault();headerSuppressUntil=Date.now()+500;closeNewModels();menuFolder=null;menuChat=active;rename=null;renderPopover();}});
agentToolbar.addEventListener('pointercancel',()=>headerPull=null);
agentToolbar.addEventListener('click',e=>{if(Date.now()<headerSuppressUntil){e.preventDefault();e.stopImmediatePropagation();}},{capture:true});

const usageCount=n=>Number(n||0).toLocaleString('sr-Latn-RS');
function usageRange(a,b){return a===b?usageCount(a):`${usageCount(a)}-${usageCount(b)}`;}
function apiMoney(s){if(!s?.priced)return 'Cena nije poznata';const fmt=n=>'$'+n.toFixed(n<.01?4:3);return `≈ ${fmt(s.costMin)}${Math.abs(s.costMax-s.costMin)>1e-9?'-'+fmt(s.costMax):''}${s.unpriced || s.missing || s.sessionUnknown?' · delimično':''}`;}
function splitUsage(s){return `${usageRange(Math.max(0,s.total-s.cacheRead),Math.max(0,s.totalMax-s.cacheRead))}n ${usageCount(s.cacheRead)}k`;}

function usageTable(s){if(!s)return '';const rows=s.models || [];return `<div class="usage-table-wrap"><table class="usage-table"><thead><tr><th>Model</th><th>Novi ulaz¹</th><th>Izlaz</th><th>Keš</th><th>Upis keša</th><th>$</th></tr></thead><tbody>${rows.map(r=>`<tr><td>${escape(r.model ? modelName(r.agent,r.model) : agentName(r.agent)+' · nepoznat model')}${r.kind==='title'?' · naslov':r.kind==='handoff'?' · predaja':''}</td><td>${r.records?usageRange(Math.max(0,r.input-r.cacheRead),Math.max(0,r.inputMax-r.cacheRead)):'n/p'}</td><td>${r.records?usageCount(r.output):'n/p'}</td><td>${r.records?usageCount(r.cacheRead):'n/p'}</td><td>${r.records?usageCount(r.cacheWrite):'n/p'}</td><td>${escape(apiMoney(r))}</td></tr>`).join('') || '<tr><td colspan="6">Potrošnja još nije prijavljena.</td></tr>'}</tbody></table></div>${s.sessionUnknown?`<p class="usage-note">${s.sessionUnknown} starih kumulativnih zapisa nije sabrano bez pouzdane osnove.</p>`:''}${s.missing?`<p class="usage-note">Za ${s.missing} odgovora tokeni nisu prijavljeni.</p>`:''}${s.uncertain?'<p class="usage-note">Deo zapisa nema potpuno razdvojene ulazne i keširane tokene.</p>':''}`;}
function renderUsage(){const c=current(),box=$('#usage-details');if(!box)return;box.hidden=!c;if(!c)return;const u=c.usageSummary;if(!u){$('#usage-heading').textContent='Potrošnja';$('#usage-breakdown').innerHTML='';return;}
 const s=u.childCount?u.family:u.own;if(!c.messages.length&&!s.records){box.hidden=true;return;}$('#usage-heading').textContent=`${s.records?splitUsage(s):'Tokeni nisu prijavljeni'} · ${apiMoney(s)}`;
 const html=`<div class="usage-scope-label">Ovaj čet · ${escape(apiMoney(u.own))}</div>${usageTable(u.own)}${u.childCount?`<div class="usage-scope-label">Čet i podagenti · ${escape(apiMoney(u.family))}</div>${usageTable(u.family)}`:''}<div class="usage-scope-label" title="${escape(u.projectPath)}">Projekat: ${escape(u.projectPath)} · ${escape(apiMoney(u.project))}</div>${usageTable(u.project)}<p class="usage-note">¹ Novi ulaz ne uključuje čitanje keša; upis keša je deo novog ulaza. Novi tokeni u sažetku uključuju i izlaz. Razmišljanje je deo izlaza kada ga CLI tako prijavi. API procena prema cenovniku od 04.10.2026, standardne tarife. Raspon pokriva kratki/dugi kontekst i trajanje upisa keša. Zbir sačuvanih četova. Bez naknada za alate i skladištenje. Pretplata ima sopstvene limite.</p>${u.project.legacyProject?'<p class="usage-note">Stariji odgovori bez zabeleženog foldera pripisani su sadašnjem radnom folderu četa.</p>':''}<p class="usage-note">Native podagenti koje CLI ne prijavi nisu zasebno izmereni.</p>`;
 if($('#usage-breakdown').innerHTML!==html)$('#usage-breakdown').innerHTML=html;
}
const storedKeyMask='••••••••';
function fillTitleSettings(){if(!phoneRemote && meta)meta.titleSettings=titleSettings;
 const input=$('#google-title-key');input.value=titleSettings.configured?storedKeyMask:'';input.placeholder='Google API ključ';renderTitleStatus();
}
$('#google-title-key').onfocus=e=>{if(e.target.value===storedKeyMask)e.target.select();};
function renderTitleStatus(){ $('#title-status').textContent=titleSettings.lastError || (titleSettings.checked?'Google pristup je proveren.':titleSettings.configured?'Ključ je sačuvan lokalno.':'Google API ključ za Gemini 3.5 Flash-Lite.'); }
async function saveTitleSettings(){
 const value=$('#google-title-key').value.trim(),secret=value===storedKeyMask?'':value;
 if(secret.includes('•'))throw Error('Obriši sve tačkice pre unosa novog ključa.');
 titleSettings=await api('/api/title-settings','PUT',{enabled:true,model:'gemini-3.5-flash-lite',...(secret?{key:secret}:{})});fillTitleSettings();
}
$('#title-check').onclick=()=>guard(async()=>{const b=$('#title-check');b.disabled=true;try{await saveTitleSettings();titleSettings=await api('/api/title-settings/check','POST',{});renderTitleStatus();}finally{b.disabled=false;}});
function tokenRange(estimate) {return estimate ? `${estimate.minTokens.toLocaleString('sr-Latn-RS')}–${estimate.maxTokens.toLocaleString('sr-Latn-RS')}` : 'nepoznato';}
function renderPopover() {
  const pop=$('#chat-popover');
  const folder=folders.find(item=>item.id===menuFolder);
  if(folder){
    const content=`<div class="folder-menu"><input data-menu-folder-name data-folder-id="${folder.id}" aria-label="Naziv foldera" value="${escape(folder.name)}" maxlength="40"><button class="icon-action folder-shared" data-action="shared-folder" data-id="${folder.id}" aria-pressed="${folder.shared===true}" title="Zajednički kontekst agenata" aria-label="Zajednički kontekst agenata">${actionIcon('<circle cx="7" cy="12" r="3"/><circle cx="17" cy="12" r="3"/><path d="M10 12h4"/>')}</button><button class="icon-action delete-chat" data-action="delete-folder" data-id="${folder.id}" aria-label="Obriši folder" title="Obriši folder. Četovi ostaju u listi.">${actionIcon('<path d="M4 7h16M9 7V5h6v2M6 7l1 14h10l1-14"/>')}</button></div>`;
    const input=pop.querySelector('[data-menu-folder-name]');
    if(input?.dataset.folderId!==folder.id)pop.innerHTML=content;
    else if(document.activeElement!==input)input.value=folder.name;
    pop.querySelector('[data-action="shared-folder"]')?.setAttribute('aria-pressed',String(folder.shared===true));
    pop.hidden=false;positionPopover();return;
  }
  const c=chats.find(c=>c.id===menuChat);if(!c){pop.hidden=true;return;}
  const busy=c.running;
  const tool=(action,label,icon,disabled=false)=>`<button class="icon-action ${action==='delete'?'delete-chat':action==='stop'?'stop-chat':''}" data-action="${action}" data-id="${c.id}" aria-label="${escape(label)}" title="${escape(label)}" ${disabled?'disabled':''}>${icon}</button>`;
  const content=`<input data-menu-rename data-rename-chat="${c.id}" aria-label="Naziv četa" value="${escape(rename?.id===c.id?rename.value:c.title)}" maxlength="100"><div class="menu-agents" role="group" aria-label="Izaberi agenta">${agentOrder.map(id=>meta.agents.find(a=>a.id===id)).filter(a=>a && a.id!==c.settings.agent).map(a=>`<button class="menu-agent" data-card-agent="${a.id}" data-agent-source="${c.id}" aria-label="Promeni agenta · ${escape(a.name)}" title="${escape(a.name)} · prenos ${tokenRange(c.transfers?.[a.id])} tokena, procena; keš nije garantovan" ${!a.available || busy?'disabled':''}><img src="${agentLogos[a.id]}" alt="" width="21" height="21"></button>`).join('')}</div><div class="chat-tools" role="group" aria-label="Radnje četa">${tool('link','Kopiraj adresu četa',copyIcon)}${tool('copy-md','Kopiraj čet kao Markdown','MD')}${c.parentChatId?tool('unlink','Izdvoji podagenta u samostalan čet',actionIcon('<path d="M10 5H5v14h14v-5M12 12 21 3M15 3h6v6"/>'),busy):''}${tool('fork','Napravi granu četa',forkIcon,busy)}${tool('delete','Arhiviraj čet',actionIcon('<rect x="3" y="3" width="18" height="4" rx="1"/><path d="M5 7v13h14V7m-10 5h6"/>'),busy)}${tool('reveal','Prikaži u Finderu',folderIcon)}${tool('record','Otvori zapis četa',recordIcon)}${tool('reset-session',c.sessions?.[c.settings.agent]?'Nova sesija: poruke ostaju, sledeće slanje ide bez starog keša':'Nema sačuvane sesije',actionIcon('<path d="M21 12a9 9 0 1 1-2.6-6.3"/><path d="M21 3v6h-6"/>'),busy || !c.sessions?.[c.settings.agent])}${busy?tool('stop','Zaustavi',stopIcon):''}</div><label class="model-choice">Model<select data-chat-model="${c.id}" aria-label="Model četa" ${busy?'disabled':''}>${modelOptions(c.settings)}</select></label>${effortsFor(c.settings.agent,c.settings.model).length?`<label class="model-choice">Razmišljanje<select data-chat-effort="${c.id}" aria-label="Nivo razmišljanja" ${busy?'disabled':''}>${effortOptions(c.settings)}</select></label>`:''}`;
  const extras=`<div class="transfer-estimate">${transferLabel(c.context)}</div>`;
  const titleInput=pop.querySelector('[data-menu-rename]');if(!(document.activeElement===titleInput && titleInput?.dataset.renameChat===c.id) && pop.innerHTML!==content+extras)pop.innerHTML=content+extras;pop.hidden=false;
  positionPopover();autoCountHistory(c);
}
async function autoCountHistory(c){if(c.historyTokenCount||c.running||!meta.titleSettings?.configured)return;const key=c.id+':'+JSON.stringify(c.messages.map(m=>[m.id,m.text,m.actions]));const previous=historyCounts.get(key);if(previous==='pending'||previous==='done'||typeof previous==='number'&&Date.now()-previous<120000)return;historyCounts.set(key,'pending');try{const chat=await api(`/api/chats/${c.id}/count-tokens`,'POST',{consent:true});if(chats.some(x=>x.id===c.id))putChat(chat);historyCounts.set(key,'done');renderPopover();}catch(e){historyCounts.set(key,Date.now());if(menuChat===c.id){const el=$('#chat-popover .context-info');if(el)el.title=e.message;}}}
function positionPopover() {
  const pop=$('#chat-popover');if(pop.hidden)return;
  const fromHeader=!menuFolder && menuChat===active && mobileNavigation() && document.body.classList.contains('chat-view');
  const button=fromHeader?agentToolbar:menuFolder?document.querySelector(`[data-folder="${menuFolder}"]`):[...document.querySelectorAll('[data-row],[data-options],[data-agent-chat]')].find(b=>(b.dataset.row===menuChat || b.dataset.options===menuChat || b.dataset.agentChat===menuChat) && b.getClientRects().length);if(!button){menuChat=null;menuFolder=null;pop.hidden=true;return;}
  const rect=button.getBoundingClientRect(), box=pop.getBoundingClientRect();
  pop.style.left=Math.max(8,Math.min(rect.right+8,window.innerWidth-box.width-8))+'px';
  pop.style.top=Math.max(8,Math.min(fromHeader?rect.bottom+8:rect.top+rect.height/2-box.height/2,window.innerHeight-box.height-8))+'px';
}
function modelName(agent,id) {
  // CLI prijavljuje pun ID (claude-opus-5-5), a katalog kratak (opus, "Opus 5.5")
  const list=models[agent]?.models || [], flat=v=>String(v).toLowerCase().replace(/[^a-z0-9]/g,'');
  return list.find(m=>m.id===id)?.name || list.find(m=>m.id!=='default' && flat(id).includes(flat(m.name)))?.name || id;
}
function responseModel(message) {
  return message.model ? modelName(message.agent,message.model) : `${agentName(message.agent)} · model nije prijavljen`;
}
function tokenInfo(message) {
  const u=message.usage;
  if(!u)return message.usageTracked && message.status!=='running' ? '<span class="token-info" title="CLI nije prijavio broj tokena. Istorija nije posebno izmerena.">Tokeni nisu prijavljeni</span>' : '';
  const count=n=>n.toLocaleString('sr-Latn-RS');
  const parts=[];
  if(u.scope==='session')parts.push('Zbir sesije');
  if(u.input!==undefined)parts.push(u.inputIncludesCache!==true && u.inputIncludesCache!==false && u.cacheRead ? 'Novi ulaz nije razdvojen' : `Novi ulaz ${count(Math.max(0,u.input-(u.inputIncludesCache===true?(u.cacheRead||0):0)+(u.inputIncludesCache===false?(u.cacheWrite||0):0)))}`);
  if(u.output!==undefined)parts.push(`Izlaz ${count(u.output)}`);
  if(u.cacheRead!==undefined)parts.push(`Keš ${count(u.cacheRead)}`);
  if(u.cacheWrite)parts.push(`Upis keša ${count(u.cacheWrite)}`);
  if(u.reasoning)parts.push(`Razmišljanje ${count(u.reasoning)}`);
  const detail=`${u.scope==='session'?'Zbir native sesije do ovog odgovora; potrošnja samo ovog odgovora nije pouzdano izdvojena.':'CLI tokeni za ovaj odgovor'}${u.scope==='main-loop'?' (glavni agent, bez subagenata)':''}. Brojevi mogu obuhvatati više modelskih poziva i nisu veličina context window-a. Ulaz uključuje kontekst koji CLI šalje tokom rada; tokeni same istorije nisu posebno prijavljeni.${u.inputIncludesCache===true?' Keš je deo ulaza.':u.inputIncludesCache===null?' CLI ne razdvaja jasno da li je keš deo ulaza.':''}${message.historyTransferred?' Tekst prethodnih poruka prenet je novom agentu.':''}`;
  return `<span class="token-info" title="${escape(detail)}">${escape(parts.join(' · '))}</span>`;
}
function messageTime(m) {if(!Number.isFinite(m.createdAt))return '';const date=new Date(m.createdAt);return `<time datetime="${date.toISOString()}" title="${escape(date.toLocaleString('sr-Latn-RS'))}${m.origin==='queue'?' · iz reda čekanja':m.origin==='coordination'?' · koordinacija':m.origin==='delegate'?' · podzadatak':''}">${escape(date.toLocaleTimeString('sr-Latn-RS',{hour:'2-digit',minute:'2-digit'}))}</time>`;}
let renderedChatId=null,stickToken=0,forceBottom=false;
function cancelStick(){stickToken++;}
function stickToBottom(view){const token=++stickToken;const go=()=>{if(token!==stickToken)return;view.scrollTop=view.scrollHeight;};go();requestAnimationFrame(()=>{go();requestAnimationFrame(go);});}
function render() {
  receiveDrafts();
  renderQueue();renderTransfer();renderChatNavigation();renderUsage();renderChatQuota();
  const chat=current();if(document.visibilityState==='visible' && document.hasFocus())markRead(chat);renderSidebar();
  $('#prompt').disabled=!connected || !meta.agents.find(a=>a.id===(chat?.settings.agent || selectedAgent))?.available;
  $('#connection').hidden=connected;$('#stop-run').hidden=!chat?.running;$('#prompt').setAttribute('aria-busy',chat?.running?'true':'false');
  const messages=[...(chat?.messages || []),...(pendingMessages.has(active) && !chat?.messages.some(m=>m.requestId===pendingMessages.get(active).requestId)?[pendingMessages.get(active)]:[])];
  const quotaMessage=quotaTarget(chat);
  const key=JSON.stringify({id:chat?.id,messages,selectionMode:messageSelectionMode,selected:[...selectedMessages],speech:speakingId()});if(key===lastMessages)return;lastMessages=key;
  const view=$('#conversation'),switched=chat?.id!==renderedChatId,jump=forceBottom,atBottom=view.scrollHeight-view.scrollTop-view.clientHeight<100;renderedChatId=chat?.id || null;forceBottom=false;
  view.innerHTML=messages.map(m=>`<article data-message="${m.id}" class="message ${selectedMessages.has(m.id)?'message-selected':''} ${m.role} ${m.status==='running'?'writing':''} ${Object.hasOwn(agentLogos,m.agent)?m.agent:''}" aria-label="${m.role==='user'?'Tvoja poruka':'Odgovor agenta'}"><div class="message-body">${markdown(m.text)}</div>${attachmentThumbs(m.text)}${m.status==='running'?`<div class="activity">${escape(m.activity || 'Agent odgovara…')}</div>`:''}${m.status==='sending'?'<div class="activity">Šalje se…</div>':''}${m.status==='stopped'?'<div class="activity">Zaustavljeno.</div>':''}${m.error?`<div class="error">${escape(m.error)}</div>`:''}${m===messages.at(-1) && m.role==='assistant' && ['stopped','interrupted','error'].includes(m.status) && !current()?.running?'<button class="resume-queue" type="button" data-continue-reply>Nastavi odgovor</button>':''}<div class="message-footer"><span class="message-meta"><span class="response-model">${escape(m.role==='user'?'Korisnik':responseModel(m))}</span>${m.role==='assistant' && m.id===quotaMessage?.id?quotaInline():''}${messageTime(m)}${m.text?`<span class="message-actions"><button class="speak-message${speakingId()===m.id?' speaking':''}" data-speak="${m.id}" aria-label="${speakingId()===m.id?'Zaustavi čitanje':'Pročitaj poruku'}" title="${speakingId()===m.id?'Zaustavi čitanje':'Pročitaj'}">${speakingId()===m.id?speakStopIcon:speakIcon}</button><button class="copy-message" data-copy-message="${m.id}" aria-label="Kopiraj poruku" title="Kopiraj">${copyIcon}</button><button class="select-message" data-select-message="${m.id}" aria-label="Izaberi poruku" aria-pressed="${selectedMessages.has(m.id)}" title="Izaberi poruku">${selectedMessages.has(m.id)?selectMark:selectBox}</button></span>`:''}</span>${m.role==='assistant'?tokenInfo(m):''}</div></article>`).join('');
  for(const a of view.querySelectorAll('a')){const href=a.getAttribute('href');const p=href?.startsWith('/files/')?decodeURIComponent(href.slice(6)):localFileHref(href);if(p){a.dataset.localFile=p;a.href='/files'+p.split('/').map(encodeURIComponent).join('/');}}
  for(const quote of view.querySelectorAll('.message-body > blockquote')){
    const button=document.createElement('button');button.className='copy-excerpt';button.type='button';button.dataset.copyText='';button.setAttribute('aria-label','Kopiraj izdvojeni tekst');button.title='Kopiraj izdvojeni tekst';button.innerHTML=copyIcon;
    const subject=quote.previousElementSibling,heading=subject?.tagName==='P' && /^(Naslov|Subject|Predmet):/i.test(subject.textContent.trim())?subject.textContent.trim()+'\n\n':'';
    button.copyText=heading+excerptText(quote).replace(/\n{3,}/g,'\n\n').trim();quote.append(button);
  }
  for(const pre of view.querySelectorAll('pre')){if(!pre.querySelector('code'))continue;const button=document.createElement('button');button.className='copy-code';button.dataset.copyCode='';button.setAttribute('aria-label','Kopiraj blok koda');button.title='Kopiraj blok koda';button.innerHTML=copyIcon;pre.append(button);}
  if(!messageSelectionMode && (jump || switched || atBottom || !chat?.running)){stickToBottom(view);for(const img of view.querySelectorAll('img'))if(!img.complete)img.addEventListener('load',()=>{if(view.scrollHeight-view.scrollTop-view.clientHeight<160)view.scrollTop=view.scrollHeight;},{once:true});}
}
function beginRename(id){const c=chats.find(c=>c.id===id);if(!c)return;rename={id,value:c.title};menuChat=id;renderPopover();const input=$('[data-menu-rename]');input.focus();input.select();}
async function saveRename(){if(!rename)return;const edit=rename;if(edit.value.trim())putChat(await api(`/api/chats/${edit.id}`,'PATCH',{title:edit.value}));rename=null;renderSidebar();renderChatNavigation();}
let newMenuAgent=null,newMenuTimer;
function closeNewModels(){newMenuAgent=null;$('#new-models').hidden=true;}
function showNewModels(agent){clearTimeout(newMenuTimer);newMenuAgent=agent;const popup=$('#new-models'),anchor=$(`[data-new-agent="${agent}"]`);if(!anchor || anchor.disabled)return closeNewModels();const options=[{id:defaults[agent]?.model||'',name:'Podrazumevani',isDefault:true},...(models[agent]?.models||[])];popup.innerHTML=options.map(m=>`<button type="button" role="menuitem" data-new-model="${escape(m.id)}" data-new-default="${!!m.isDefault}">${escape(m.name)}</button>`).join('');popup.hidden=false;const r=anchor.getBoundingClientRect();popup.style.left=Math.max(8,Math.min(r.left,innerWidth-250))+'px';popup.style.top=r.bottom+'px';}
$('#new-agents').onpointerover=e=>{const b=e.target.closest('[data-new-agent]');if(b && e.pointerType!=='touch' && newMenuAgent!==b.dataset.newAgent)showNewModels(b.dataset.newAgent);else if(b)clearTimeout(newMenuTimer);};
$('#new-agents').onpointerleave=()=>{newMenuTimer=setTimeout(closeNewModels,180);};
$('#new-agents').onclick=e=>{const b=e.target.closest('[data-new-agent]');if(b)showNewModels(b.dataset.newAgent);else closeNewModels();};
$('#new-models').onpointerenter=()=>clearTimeout(newMenuTimer);$('#new-models').onpointerleave=()=>{newMenuTimer=setTimeout(closeNewModels,180);};
$('#new-models').onclick=e=>guard(async()=>{const b=e.target.closest('[data-new-model]');if(!b)return;const agent=newMenuAgent;closeNewModels();await create(agent,b.dataset.newModel,b.dataset.newDefault==='true'?defaults[agent]?.effort||preferredEffort(models,agent,b.dataset.newModel):preferredEffort(models,agent,b.dataset.newModel));});
document.addEventListener('pointerdown',e=>{if(!e.target.closest('#new-models,#new-agents'))closeNewModels();});document.addEventListener('keydown',e=>{if(e.key==='Escape')closeNewModels();});

function chooseAgentCard(id){const chat=chats.find(c=>c.id===id);choose(id===active && chats.some(c=>c.id===chat?.parentChatId)?chat.parentChatId:id);}
function cardId(e){return e.target.closest('[data-row]')?.dataset.row || e.target.closest('[data-agent-chat]')?.dataset.agentChat;}
function clearDrag(){document.body.classList.remove('dragging-chat','dragging-subagent');document.querySelectorAll('.drag-source,.drop-hover').forEach(el=>el.classList.remove('drag-source','drop-hover'));const ghost=$('#drag-ghost');if(ghost)ghost.hidden=true;drag=null;}
function markDrop(x,y){const target=document.elementFromPoint(x,y)?.closest('[data-folder],[data-folder-target],[data-folder-out],[data-folder-new],[data-row],[data-agent-chat],[data-child-out],#chats');document.querySelectorAll('.drop-hover').forEach(el=>{if(el!==target)el.classList.remove('drop-hover');});target?.classList.add('drop-hover');const ghost=$('#drag-ghost')||document.body.appendChild(Object.assign(document.createElement('div'),{id:'drag-ghost'}));const chat=chats.find(c=>c.id===drag?.id);ghost.textContent=chat?.title||'';ghost.hidden=false;ghost.style.left=(x+12)+'px';ghost.style.top=(y+12)+'px';}
function activateChatDrag(list,pointerId,x,y){if(!drag || drag.active)return;clearTimeout(holdTimer);drag.active=true;held=true;menuChat=null;menuFolder=null;renderPopover();list.setPointerCapture?.(pointerId);document.body.classList.add('dragging-chat');document.body.classList.toggle('dragging-subagent',!!chats.find(c=>c.id===drag.id)?.parentChatId);list.querySelector(`[data-row="${drag.id}"],[data-agent-chat="${drag.id}"]`)?.classList.add('drag-source');markDrop(x,y);}
for(const list of [$('#chats')]){
 list.onclick=e=>{if(list.id==='chats'){const agentGroup=e.target.closest('[data-agent-group]');if(agentGroup){const id=agentGroup.dataset.agentGroup;if(closedAgentGroups.has(id))closedAgentGroups.delete(id);else closedAgentGroups.add(id);renderSidebar();return;}if(e.target.closest('[data-unassigned]')){setOpenFolder(null);return;}if(e.target.closest('[data-folder-add]')){guard(addFolder);return;}if(e.target.closest('[data-folder-back]')){setOpenFolder(null);return;}if(e.target.closest('[data-folder-name]'))return;const folder=e.target.closest('[data-folder]');if(folder){if(folder.dataset.folder==='draft')return;if(held && Date.now()<suppressClickUntil){held=false;return;}if(menuFolder===folder.dataset.folder){menuFolder=null;renderPopover();}setOpenFolder(openFolder===folder.dataset.folder?null:folder.dataset.folder);return;}}const id=cardId(e);if(!id)return;if(held && Date.now()<suppressClickUntil){held=false;return;}held=false;menuFolder=null;chooseAgentCard(id);};
 list.onpointerdown=e=>{const id=cardId(e);if(e.button!==0)return;const folder=list.id==='chats'?e.target.closest('[data-folder]'):null;if(!id && !folder)return;held=false;holdStart={x:e.clientX,y:e.clientY,id,folderId:folder?.dataset.folder};const card=e.target.closest('[data-row],[data-agent-chat],[data-folder]');const bounds=card?.getBoundingClientRect();const right=id && bounds && e.clientX>=bounds.right-32;card?.classList.add('pressed');if(right){list.setPointerCapture?.(e.pointerId);drag={id,pointerId:e.pointerId,x:e.clientX,y:e.clientY,at:Date.now(),type:e.pointerType,active:false};}holdTimer=setTimeout(()=>{if(e.target.closest('[data-folder-name]'))return;held=true;card?.classList.remove('pressed');if(right && drag){activateChatDrag(list,e.pointerId,e.clientX,e.clientY);return;}if(folder){openFolderMenu(folder.dataset.folder);return;}menuFolder=null;menuChat=id;rename=null;renderPopover();},450);};
 list.onpointermove=e=>{if(drag && e.pointerId===drag.pointerId && !drag.active){const dist=Math.hypot(e.clientX-drag.x,e.clientY-drag.y);const touch=drag.type==='touch';if(touch && dist>10 && Date.now()-drag.at<280){clearTimeout(holdTimer);drag=null;}else if(dist>10 && (!touch || Date.now()-drag.at>=280)){activateChatDrag(list,e.pointerId,e.clientX,e.clientY);}}if(drag?.active && e.pointerId===drag.pointerId){e.preventDefault();markDrop(e.clientX,e.clientY);return;}if(holdStart&&Math.hypot(e.clientX-holdStart.x,e.clientY-holdStart.y)>10){clearTimeout(holdTimer);list.querySelectorAll('.pressed').forEach(c=>c.classList.remove('pressed'));}};
 for(const name of ['pointerup','pointercancel','pointerleave'])list.addEventListener(name,e=>{const dropping=name==='pointerup' && drag?.active && e.pointerId===drag.pointerId;const id=drag?.id;const heldMenu=name==='pointerup' && held && !drag?.active?holdStart:null;const target=dropping?document.elementFromPoint(e.clientX,e.clientY)?.closest('[data-folder],[data-folder-target],[data-folder-out],[data-folder-new],[data-row],[data-agent-chat],[data-child-out],#chats'):null;clearTimeout(holdTimer);if(held)suppressClickUntil=Date.now()+400;holdStart=null;list.querySelectorAll('.pressed').forEach(c=>c.classList.remove('pressed'));if(dropping){clearDrag();const folderId=target?.hasAttribute('data-folder-out') || target?.id==='chats'?null:target?.dataset.folder ?? target?.dataset.folderTarget;const chat=chats.find(c=>c.id===id);if(target && chat){const parentId=target.dataset.row || target.dataset.agentChat;if(parentId){if(parentId!==id)guard(async()=>{const linked=await api(`/api/chats/${id}/link`,'POST',{parentChatId:parentId});putChat(linked);renderSidebar();render();toast('Čet je povezan kao podagent.');});}else if(target.hasAttribute('data-folder-new'))guard(()=>addFolder(id));else if(chat.parentChatId || (chat.folderId||null)!==(folderId||null))guard(()=>moveToFolder(id,folderId));}}else if(drag && e.pointerId===drag.pointerId && !(name==='pointerleave' && drag.active))clearDrag();if(heldMenu){if(heldMenu.folderId)openFolderMenu(heldMenu.folderId);else if(heldMenu.id){menuFolder=null;menuChat=heldMenu.id;rename=null;renderPopover();}}});
 list.oncontextmenu=e=>{if(drag || holdStart && e.pointerType!=='mouse'){e.preventDefault();return;}const folder=list.id==='chats' && !e.target.closest('[data-folder-name]')?e.target.closest('[data-folder]'):null;if(folder){e.preventDefault();held=true;suppressClickUntil=Date.now()+400;openFolderMenu(folder.dataset.folder);return;}if(cardId(e)){e.preventDefault();held=true;suppressClickUntil=Date.now()+400;menuFolder=null;menuChat=cardId(e);renderPopover();}};
 list.onkeydown=e=>{if(e.target.closest('[data-agent-group]') && (e.key==='Enter'||e.key===' ')){e.preventDefault();e.target.closest('[data-agent-group]').click();return;}if(e.target.closest('[data-unassigned]') && (e.key==='Enter'||e.key===' ')){e.preventDefault();e.target.closest('[data-unassigned]').click();return;}if(e.target.matches('[data-folder-name]') && e.key==='Escape' && folderRename?.draft){e.preventDefault();e.stopPropagation();folderRename=null;lastSidebar='';renderSidebar();return;}if(e.target.matches('[data-folder-name]') && e.key==='Enter'){e.preventDefault();guard(saveFolderRename);return;}const folder=e.target.closest('[data-folder]');if(folder && !e.target.closest('[data-folder-name]') && (e.key==='Enter'||e.key===' ')){e.preventDefault();setOpenFolder(openFolder===folder.dataset.folder?null:folder.dataset.folder);return;}const id=cardId(e);if(id&&(e.key==='Enter'||e.key===' ')){e.preventDefault();chooseAgentCard(id);}};
}
$('#chats').addEventListener('focusout',e=>{if(e.target.matches('[data-folder-name]'))guard(saveFolderRename);});
$('#chats').addEventListener('input',e=>{if(e.target.matches('[data-folder-name]') && folderRename)folderRename.value=e.target.value;});
$('#chat-popover').oninput=e=>{if(e.target.matches('[data-menu-rename]'))rename={id:e.target.dataset.renameChat,value:e.target.value};};
$('#chat-popover').onkeydown=e=>{if(e.target.matches('[data-menu-folder-name]') && e.key==='Enter'){e.preventDefault();e.target.blur();return;}if(e.target.matches('[data-menu-rename]')&&e.key==='Enter'){e.preventDefault();e.target.blur();}};
$('#chats').onscroll=positionPopover;
$('#chat-popover').onclick=e=>guard(async()=>{
  const button=e.target.closest('[data-card-agent]');
  if(button){const id=button.dataset.agentSource,agent=button.dataset.cardAgent,source=chats.find(c=>c.id===id);if(!source || switchingChats.has(id))return;if(source.settings.agent===agent){choose(id);return;}
    switchingChats.add(id);try{const copy=await api(`/api/chats/${id}`,'PATCH',{settings:{agent}});putChat(copy);choose(copy.id);}finally{switchingChats.delete(id);}return;
  }
  const action=e.target.closest('[data-action]');if(!action)return;const id=action.dataset.id;
  if(action.dataset.action==='shared-folder'){const folder=folders.find(f=>f.id===id);if(!folder)return;const saved=await api(`/api/folders/${id}`,'PATCH',{shared:!folder.shared});folders=folders.map(f=>f.id===id?saved:f);lastSidebar='';renderSidebar();toast(saved.shared?'Agenti u folderu dele kontekst.':'Deljenje konteksta je isključeno.');return;}
  if(action.dataset.action==='rename-folder'){menuFolder=null;folderRename={id,value:folders.find(folder=>folder.id===id)?.name||''};lastSidebar='';renderSidebar();renderPopover();const input=$('[data-folder-name]');input?.focus();input?.select();return;}
  if(action.dataset.action==='delete-folder'){const name=folders.find(folder=>folder.id===id)?.name||'folder';menuFolder=null;renderPopover();const inside=chats.some(chat=>chat.folderId===id && !chat.parentChatId);if(!inside){await removeFolder(id);return;}pendingFolderDelete=id;$('#delete-title').textContent=`Obriši folder „${name}“? Četovi ostaju u listi.`;$('#delete-only').textContent='Obriši folder';$('#delete-family').hidden=true;$('#delete-dialog').showModal();return;}
  const c=chats.find(c=>c.id===id);if(!c)return;
  if(action.dataset.action==='unlink'){const saved=await api(`/api/chats/${id}/unlink`,'POST',{});putChat(saved);menuChat=null;render();toast('Podagent je izdvojen u samostalan čet.');return;}
  if(action.dataset.action==='copy-md'){await navigator.clipboard.writeText(exportMessages(chats,id,c.messages.map(m=>m.id),{modelName}));toast('Čet je kopiran kao Markdown.');return;}
  if(action.dataset.action==='rename'){beginRename(id);return;}
  if(action.dataset.action==='link'){await navigator.clipboard.writeText(`${location.origin}/#chat=${encodeURIComponent(id)}`);action.innerHTML='✓';action.title='Adresa četa je kopirana';setTimeout(()=>{if(action.isConnected)action.innerHTML=copyIcon;},1500);return;}
  if(action.dataset.action==='reveal'){await api(`/api/chats/${id}/reveal`,'POST',{});return;}
  if(action.dataset.action==='record'){const record=await api(`/api/chats/${id}/record`,'POST',{});closePanels();$('#record-text').value=record.text;$('#record-panel').hidden=false;for(const el of [$('#conversation'),$('.composer-area'),$('#usage-details')].filter(Boolean))el.inert=true;menuChat=null;renderSidebar();$('#record-text').focus();return;}
  if(action.dataset.action==='fork'){const copy=await api(`/api/chats/${id}/fork`,'POST',{});putChat(copy);choose(copy.id);}
  if(action.dataset.action==='stop'){await api(`/api/chats/${id}/stop`,'POST');menuChat=null;renderSidebar();}
  if(action.dataset.action==='reset-session'){pendingFolderDelete=null;deleteTarget=null;pendingReset=id;menuChat=null;renderPopover();$('#delete-title').textContent='Nova sesija? Poruke ostaju. Sledeće slanje ide bez starog keša, pa ulaz broji ovaj čet iznova.';$('#delete-only').textContent='Nova sesija';$('#delete-family').hidden=true;$('#delete-dialog').showModal();return;}
  if(action.dataset.action==='delete'){pendingFolderDelete=null;pendingReset=null;$('#delete-only').textContent='Arhiviraj ovaj čet';deleteTarget=id;$('#delete-title').textContent=`Arhiviraj čet „${c.title}“ na 30 dana?`;if(chats.some(x=>x.parentChatId===id)){$('#delete-family').hidden=false;$('#delete-dialog').showModal();}else await removeChat(false);}
});
$('#chat-popover').onchange=e=>guard(async()=>{
  if(e.target.matches('[data-menu-rename]')){rename={id:e.target.dataset.renameChat,value:e.target.value};await saveRename();return;}
  if(e.target.matches('[data-menu-folder-name]')){const input=e.target,name=input.value.trim(),id=input.dataset.folderId;const folder=folders.find(f=>f.id===id);if(!folder)return;if(!name){input.value=folder.name;return;}if(name!==folder.name){const saved=await api(`/api/folders/${id}`,'PATCH',{name});folders=folders.map(f=>f.id===id?saved:f);lastSidebar='';renderSidebar();}return;}
  const model=e.target.closest('[data-chat-model]'),effort=e.target.closest('[data-chat-effort]');if(!model && !effort)return;
  const id=model?.dataset.chatModel || effort.dataset.chatEffort;
  const chat=await api(`/api/chats/${id}`,'PATCH',{settings:model?{model:model.value,effort:preferredEffort(models,chats.find(c=>c.id===id)?.settings.agent,model.value)}:{effort:effort.value}});putChat(chat);renderSidebar();
});
document.addEventListener('pointerdown',e=>{if(menuFolder && !e.target.closest(`#chat-popover,[data-folder="${menuFolder}"]`)){menuFolder=null;renderPopover();}if(menuChat && !e.target.closest('#chat-popover,#chat-options,[data-row],[data-options],[data-chat],[data-agent-chat]')){menuChat=null;renderPopover();}});
let warmupSettings=null,warmupPoll,warmupWasRunning=false;
const scheduleDayNames=['Ponedeljak','Utorak','Sreda','Četvrtak','Petak','Subota','Nedelja'];
function excerptText(node){
 if(node.nodeType===3)return node.textContent;
 if(node.nodeType!==1)return '';
 if(node.tagName==='BR')return '\n';
 if(node.tagName==='BUTTON')return '';
 const text=[...node.childNodes].map(excerptText).join('');
 if(node.tagName==='LI'){const list=node.parentElement,number=Number(list.getAttribute('start') || 1)+[...list.children].indexOf(node);return (list.tagName==='OL'?number+'. ':'- ')+text.trim()+'\n';}
 return text+(['P','H1','H2','H3','H4','H5','H6','UL','OL','BLOCKQUOTE','PRE'].includes(node.tagName)?'\n\n':'');
}
function renderWarmupDays(){const days=warmupSettings?.days ?? (warmupSettings?.enabled===false?[]:[1,2,3,4,5,6,7]);$('#warmup-days').innerHTML=scheduleDayNames.map((name,index)=>`<button type="button" data-warmup-day="${index+1}" aria-label="${name}" title="${name}" aria-pressed="${days.includes(index+1)}">${name.slice(0,2)}</button>`).join('');}
function renderWarmupStatus(){
 const state=warmupSettings,last=state?.runs?.[0],progress=$('#warmup-progress');
 $('#warmup-run').disabled=!state || state.running;
 $('#warmup-status').textContent=!state?'Za ovu opciju potrebno je ponovno pokretanje servera.':'';
 progress.hidden=!state?.running;
 if(state?.running)progress.innerHTML=`<strong>Slanje kratkih poruka</strong>${(last?.agents || state.agents).map(agent=>{const result=last?.results?.find(r=>r.agent===agent);return `<div>${escape(agentName(agent))}<span>${result?result.status==='done'?'✓':'Greška':agent===state.currentAgent?'Odgovara…':'Čeka'}</span></div>`;}).join('')}`;
 else if(warmupWasRunning){const failed=last?.results?.filter(r=>r.status!=='done').length || 0;toast(failed?`Slanje je završeno. ${failed} agenata je prijavilo grešku; detalji su sačuvani u zapisu.`:'Kratke poruke su poslate. Privremeni četovi su uklonjeni.');}
 warmupWasRunning=!!state?.running;
 clearTimeout(warmupPoll);
 if(state?.running)warmupPoll=setTimeout(()=>guard(async()=>{warmupSettings=await api('/api/warmup');renderWarmupStatus();}),1500);
}
function renderWarmup(){
 renderWarmupDays();
 $('#warmup-time').value=warmupSettings?.time || '08:00';
 $('#warmup-agents').innerHTML=meta.agents.map(a=>`<label class="warmup-agent" data-warmup-agent="${a.id}"><span><input type="checkbox" ${a.available && (warmupSettings?.agents || []).includes(a.id)?'checked':''} ${a.available?'':'disabled'}> ${escape(a.name)}</span><select aria-label="Model za kratku poruku ${escape(a.name)}" ${a.available?'':'disabled'}><option value="">Automatski: lakši model</option>${modelOptions({agent:a.id,model:warmupSettings?.models?.[a.id] || ''}).replace(/^<option[^>]*>Podrazumevani<\/option>/,'')}</select></label>`).join('');
 for(const row of $('#warmup-agents').children)row.querySelector('select').value=warmupSettings?.models?.[row.dataset.warmupAgent] || '';
 renderWarmupStatus();
}
async function saveWarmup(){
 const rows=[...$('#warmup-agents').children].filter(row=>row.querySelector('input').checked);
 const days=[...$('#warmup-days').querySelectorAll('[aria-pressed="true"]')].map(button=>Number(button.dataset.warmupDay));
 warmupSettings=await api('/api/warmup','PUT',{enabled:days.length>0,days,time:$('#warmup-time').value,agents:rows.map(row=>row.dataset.warmupAgent),models:Object.fromEntries(rows.map(row=>[row.dataset.warmupAgent,row.querySelector('select').value]))});
 renderWarmupStatus();
}
let settingsSaveQueue=Promise.resolve();
function queueSettingsSave(work){const pending=settingsSaveQueue.catch(()=>{}).then(work);settingsSaveQueue=pending;return pending;}
$('#warmup-days').onclick=e=>{const button=e.target.closest('[data-warmup-day]');if(!button)return;button.setAttribute('aria-pressed',String(button.getAttribute('aria-pressed')!=='true'));guard(()=>queueSettingsSave(saveWarmup));};
$('#warmup-settings').onchange=e=>{if(e.target.id==='warmup-time' && !e.target.validity.valid)return;guard(()=>queueSettingsSave(saveWarmup));};
$('#warmup-time').oninput=e=>{const input=e.target;if(/^\d{4}$/.test(input.value))input.value=input.value.slice(0,2)+':'+input.value.slice(2);if(input.validity.valid && input.value.length===5)guard(()=>queueSettingsSave(saveWarmup));};
$('#warmup-run').onclick=()=>guard(async()=>{await queueSettingsSave(saveWarmup);warmupSettings=await api('/api/warmup/run','POST',{});renderWarmupStatus();});
function renderDefaults() {$('#default-agents').innerHTML=meta.agents.map(a=>{const s={agent:a.id,...defaults[a.id]};return `<div class="default-agent" data-default-agent="${a.id}"><img src="${agentLogos[a.id]}" alt="${escape(a.name)}" title="${escape(a.name)}" width="22" height="22"><select data-default-model aria-label="Podrazumevani model ${escape(a.name)}">${modelOptions(s)}</select><select data-default-effort aria-label="Podrazumevano razmišljanje ${escape(a.name)}" ${effortsFor(a.id,s.model).length?'':'disabled'}>${effortOptions(s)}</select></div>`;}).join('');}
function showDefaults(open) {document.body.classList.toggle('settings-view',open);if(open)refreshPhone();$('#defaults').hidden=!open;for(const el of [$('#conversation'),$('.composer-area'),$('#usage-details')].filter(Boolean))el.inert=open;if(open){closePanels();$('#default-agents select')?.focus();}else focusPrompt();}
$('#defaults-open').onclick=()=>guard(async()=>{const form=$('#defaults');if(!form.hidden){showDefaults(false);return;}const button=$('#defaults-open');button.disabled=true;try{[defaults,models,titleSettings,warmupSettings]=await Promise.all([api('/api/defaults'),api('/api/models'),phoneRemote?Promise.resolve(titleSettings):api('/api/title-settings'),api('/api/warmup').catch(()=>null)]);renderDefaults();renderWarmup();$('#statistics-open').hidden=phoneRemote;$('#statistics-download').hidden=!phoneRemote;fillTitleSettings();renderColorToggle();renderKeyboardToggle();menuChat=null;renderPopover();showDefaults(true);renderWarmupStatus();}finally{button.disabled=false;}});
$('#default-agents').onchange=e=>{
 const row=e.target.closest('[data-default-agent]');if(!row)return;
 if(e.target.matches('[data-default-model]')){const s={agent:row.dataset.defaultAgent,model:e.target.value,effort:preferredEffort(models,row.dataset.defaultAgent,e.target.value)},select=row.querySelector('[data-default-effort]');select.innerHTML=effortOptions(s);select.disabled=!effortsFor(s.agent,s.model).length;}
 const next=Object.fromEntries([...$('#default-agents').querySelectorAll('[data-default-agent]')].map(row=>[row.dataset.defaultAgent,{model:row.querySelector('[data-default-model]').value,effort:row.querySelector('[data-default-effort]').value}]));
 guard(()=>queueSettingsSave(async()=>{defaults=await api('/api/defaults','PUT',next);}));
};
$('#response-colors').onclick=()=>{colorMode=colorMode==='full'?'label':'full';localStorage.setItem('agent-desk-color-mode',colorMode);document.body.classList.toggle('colored-responses',colorMode==='full');renderColorToggle();};
$('#google-title-key').onchange=()=>{if(!phoneRemote)guard(()=>queueSettingsSave(saveTitleSettings));};
$('#defaults-form').onsubmit=e=>{e.preventDefault();e.target.querySelector(':focus')?.blur();};
$('#conversation').onclick=e=>{const preview=e.target.closest('.attachment-thumbs a');if(preview && (phoneRemote || mobileNavigation())){e.preventDefault();const image=preview.querySelector('img');if(image){openAttachmentPreview(preview.href,image.alt);return;}if(/\.pdf$/i.test(preview.getAttribute('title')||'')){openPdfPreview(preview.href);return;}guard(async()=>{const response=await fetch(preview.href);if(!response.ok){const data=await response.json().catch(()=>({}));throw Error(data.error || 'Prilog nije otvoren.');}const url=URL.createObjectURL(await response.blob());const link=document.createElement('a');link.href=url;link.download=preview.getAttribute('title') || 'prilog';link.click();setTimeout(()=>URL.revokeObjectURL(url),60000);});return;}const selection=e.target.closest('[data-select-message]'),article=e.target.closest('[data-message]');const speakButton=e.target.closest('[data-speak]');if(speakButton){e.preventDefault();guard(()=>speakMessage(speakButton.dataset.speak));return;}if(selection || (messageSelectionMode && article && !e.target.closest('[data-copy-code],[data-copy-text],[data-copy-message],[data-speak],.attachment-thumbs a'))){e.preventDefault();const id=selection?.dataset.selectMessage || article.dataset.message;if(!current()?.messages.some(m=>m.id===id && m.text))return;messageSelectionMode=true;const all=current().messages.filter(m=>m.text).map(m=>m.id);if(e.shiftKey && selectionAnchor && all.includes(selectionAnchor)){const a=all.indexOf(selectionAnchor),b=all.indexOf(id);for(const selected of all.slice(Math.min(a,b),Math.max(a,b)+1))selectedMessages.add(selected);}else{if(selectedMessages.has(id))selectedMessages.delete(id);else selectedMessages.add(id);selectionAnchor=id;}refreshMessageSelection();$('#conversation').focus({preventScroll:true});return;}const link=e.target.closest('[data-local-file]');if(link){e.preventDefault();guard(async()=>{if(phoneRemote){$('#local-file-frame').src=link.href;$('#local-file-dialog').showModal();}else await api('/api/open-file','POST',{path:link.dataset.localFile});});return;}guard(async()=>{const button=e.target.closest('[data-copy-code],[data-copy-text],[data-copy-message]');if(!button)return;const text=button.hasAttribute('data-copy-text')?button.copyText:button.hasAttribute('data-copy-code')?button.closest('pre').querySelector('code').textContent:current()?.messages.find(m=>m.id===button.dataset.copyMessage)?.text;if(text===undefined)return;await navigator.clipboard.writeText(text);button.textContent='✓';button.title='Kopirano';setTimeout(()=>{if(button.isConnected){button.innerHTML=copyIcon;button.title='Kopiraj';}},1500);});};
// Prekinut odgovor se nastavlja novom porukom u istoj sesiji; tekst iz unosa ima prednost.
$('#conversation').addEventListener('click',e=>{if(!e.target.closest('[data-continue-reply]'))return;const input=$('#prompt');if(!input.value.trim())input.value='Nastavi gde si stao.';$('#composer').requestSubmit();});
function selectedSpeechText(){
  const selection=window.getSelection();
  const element=node=>node?.nodeType===1?node:node?.parentElement;
  const start=element(selection?.anchorNode)?.closest('.message-body');
  const end=element(selection?.focusNode)?.closest('.message-body');
  if(!selection || selection.isCollapsed || !start || start!==end || !$('#conversation').contains(start))return null;
  const text=selection.toString().trim(),messageId=start.closest('[data-message]')?.dataset.message;
  return text && messageId?{chatId:active,messageId,text}:null;
}
document.addEventListener('selectionchange',()=>{
  if(document.activeElement===$('#speak-selection'))return;
  speechSelection=selectedSpeechText();
  $('#speech-selection').hidden=!speechSelection;
});
$('#speak-selection').onpointerdown=e=>e.preventDefault();
$('#speak-selection').onclick=()=>guard(async()=>{
  const chosen=speechSelection;
  if(!chosen || chosen.chatId!==active)return;
  speechSelection=null;$('#speech-selection').hidden=true;
  await speakMessage(chosen.messageId,chosen.text);
});
function speakingId(){const chat=current();return speechClip && speechClip.chatId===chat?.id && (speechClip.loading || !speechAudio.paused) ? speechClip.messageId : '';}
function speechClock(seconds){const value=Number.isFinite(seconds)&&seconds>0?Math.floor(seconds):0;return `${Math.floor(value/60)}:${String(value%60).padStart(2,'0')}`;}
function renderSpeechBar(){const bar=$('#speech-bar');if(!bar)return;if(!speechClip || speechClip.chatId!==active){bar.hidden=true;return;}bar.hidden=false;$('#speech-label').textContent=speechClip.label || '';const playing=!speechAudio.paused && !speechClip.loading;$('#speech-toggle').innerHTML=playing?speakStopIcon:speakIcon;$('#speech-toggle').setAttribute('aria-label',playing?'Pauziraj':'Pusti');const duration=speechAudio.duration,time=speechAudio.currentTime||0;if(!speechSeeking && Number.isFinite(duration) && duration>0)$('#speech-seek').value=String(Math.round(time/duration*1000));$('#speech-time').textContent=`${speechClock(time)} / ${speechClock(duration)}`;}
speechAudio.ontimeupdate=()=>renderSpeechBar();
speechAudio.onloadedmetadata=()=>renderSpeechBar();
speechAudio.onplay=()=>{lastMessages='';if(appReady)render();renderSpeechBar();};
speechAudio.onpause=()=>{lastMessages='';if(appReady)render();renderSpeechBar();};
speechAudio.onended=()=>renderSpeechBar();
speechAudio.onerror=()=>{if(speechClip && !speechClip.loading)toast('Snimak se ne može pustiti u pregledaču.');};
$('#speech-toggle').onclick=()=>guard(async()=>{if(!speechClip || speechClip.loading)return;if(speechAudio.paused)await speechAudio.play();else speechAudio.pause();});
$('#speech-seek').onpointerdown=()=>{speechSeeking=true;};
$('#speech-seek').oninput=()=>{const duration=speechAudio.duration;if(!Number.isFinite(duration)||duration<=0)return;speechAudio.currentTime=Number($('#speech-seek').value)/1000*duration;renderSpeechBar();};
$('#speech-seek').addEventListener('change',()=>{speechSeeking=false;});
$('#speech-seek').addEventListener('pointerup',()=>{speechSeeking=false;});
function releaseSpeechUrl(){if(speechClip?.url)URL.revokeObjectURL(speechClip.url);}
$('#speech-close').onclick=()=>{speechAbort?.abort();speechAudio.pause();releaseSpeechUrl();speechClip=null;lastMessages='';renderSpeechBar();if(appReady)render();};
function localSpeechLabel(){const time=new Date().toISOString().replace(/\.\d{3}Z$/,'Z').replace(/:/g,'-');const chat=String(current()?.title || 'Čet').replace(/[\\/:*?"<>|]+/g,' ').replace(/\s+/g,' ').trim().slice(0,60) || 'Čet';return `${chat} ${time} gpt-4o-mini-tts`;}
async function playSpeech(){try{await speechAudio.play();}catch(error){if(error.name==='NotSupportedError')throw new Error('Snimak se ne može pustiti u pregledaču.');if(error.name==='NotAllowedError')throw new Error('Pregledač je blokirao zvuk. Pritisni pusti na traci.');throw error;}}
async function speakMessage(messageId,selectedText=''){if(speechClip?.chatId===active && speechClip.messageId===messageId && (speechClip.selectedText || '')===selectedText){if(speechClip.loading){speechAbort?.abort();return;}if(speechAudio.paused){await playSpeech();return;}speechAudio.pause();return;}speechAbort?.abort();const chatId=active,abort=new AbortController();speechAbort=abort;speechAudio.pause();releaseSpeechUrl();speechClip={chatId,messageId,selectedText,loading:true,label:'Priprema čitanja…'};lastMessages='';render();renderSpeechBar();try{const response=await fetch(`/api/chats/${chatId}/speak`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({messageId,offset:0,...(selectedText?{selectedText}:{})}),signal:abort.signal});if(!response.ok){const data=await response.json().catch(()=>({}));throw Error(data.error||'Čitanje nije uspelo.');}const type=response.headers.get('content-type')||'';if(type.includes('application/json')){const data=await response.json();if(abort.signal.aborted || active!==chatId)return;if(selectedText && !data.selected)throw Error('Za čitanje izbora je potrebno ponovno pokretanje Agent Deska.');if(!data.id)throw Error('Snimak nije sačuvan.');speechClip={chatId,messageId,selectedText,id:data.id,label:data.label,loading:false};const src=`/api/chats/${chatId}/speech/${data.id}`;if(speechAudio.src!==new URL(src,location.href).href){speechAudio.src=src;speechAudio.load();}}else if(type.startsWith('audio/')){if(selectedText)throw Error('Za čitanje izbora je potrebno ponovno pokretanje Agent Deska.');const parts=[await response.arrayBuffer()];let offset=Number(response.headers.get('X-Speech-Next')||0);while(offset && !abort.signal.aborted){const next=await fetch(`/api/chats/${chatId}/speak`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({messageId,offset}),signal:abort.signal});if(!next.ok){const data=await next.json().catch(()=>({}));throw Error(data.error||'Čitanje nije uspelo.');}parts.push(await next.arrayBuffer());offset=Number(next.headers.get('X-Speech-Next')||0);}if(abort.signal.aborted || active!==chatId)return;let wav;try{wav=joinWavs(parts);}catch{throw Error('Zvuk koji je stigao nije ispravan.');}const url=URL.createObjectURL(new Blob([wav],{type:'audio/wav'}));speechClip={chatId,messageId,selectedText,label:localSpeechLabel(),loading:false,url};speechAudio.src=url;speechAudio.load();}else throw Error('Odgovor za čitanje nije zvuk.');renderSpeechBar();await playSpeech();}catch(error){if(speechClip?.messageId===messageId && speechClip.chatId===chatId && speechClip.loading){speechClip=null;renderSpeechBar();}if(error.name!=='AbortError')throw error;}finally{if(speechAbort===abort)speechAbort=null;lastMessages='';if(appReady)render();}}
function finishMessageInput(id){if(active!==id)return;const input=$('#prompt');if(mobileNavigation()){if(!input.value.trim())input.blur();}else input.focus();}
$('#composer').onsubmit=e=>{e.preventDefault();guard(async()=>{
  const input=$('#prompt'),text=input.value.trim() || ((linkedFiles.get(active)||[]).length?'Pogledaj priložene fajlove.':'');if(!text || current()?.running || submitting || uploading || !connected)return;submitting=true;
  const files=[...(linkedFiles.get(active)||[])],requestId=crypto.randomUUID();input.value='';recordDraft(active,'');linkedFiles.delete(active);renderLinkedFiles();resizePrompt();if(!mobileNavigation())input.focus();
  let id=active;pendingMessages.set(id,{id:requestId,requestId,role:'user',text,status:'sending',createdAt:Date.now()});lastMessages='';render();
  try{if(!current()){const created=await create();if(!created)return;pendingMessages.delete(id);id=created.id;pendingMessages.set(id,{id:requestId,requestId,role:'user',text,status:'sending',createdAt:Date.now()});render();}newEmptyChats.delete(id);await api(`/api/chats/${id}/send`,'POST',{text,files,requestId});pendingMessages.delete(id);finishMessageInput(id);}
  catch(error){let accepted=false;try{if(id){const chat=await api(`/api/chats/${id}`);putChat(chat);accepted=chat.messages.some(m=>m.requestId===requestId);}}catch{}pendingMessages.delete(id);if(!accepted){if(id && !chats.find(c=>c.id===id)?.messages.length)newEmptyChats.add(id);const old=drafts.get(id)||'';recordDraft(id,text+(old?'\n'+old:''));linkedFiles.set(id,files);if(active===id){input.value=text+(input.value?'\n'+input.value:'');renderLinkedFiles();resizePrompt();}throw error;}else finishMessageInput(id);}
  finally{submitting=false;lastMessages='';render();}
});};
function renderQueue() {
  const chat=current();
  $('#queue').innerHTML=(chat?.queue || []).map(m=>`<div class="queued-message"><span title="${escape(m.text)}">${escape(m.text)}</span><button type="button" data-unqueue="${m.id}" aria-label="Ukloni iz reda čekanja">×</button></div>`).join('')+((chat?.queuePaused || chat?.queueError) && chat?.queue?.length?`<button class="resume-queue" type="button" data-resume-queue>Nastavi red čekanja</button>${chat.queueError?`<div class="error">${escape(chat.queueError)}</div>`:''}`:'');
}
async function enqueueMessage() {
  const input=$('#prompt'),draft=input.value.trim(),text=draft || ((linkedFiles.get(active)||[]).length?'Pogledaj priložene fajlove.':'');if(!text || submitting || uploading || !connected)return;
  submitting=true;try {
    if(!current()){const created=await create();if(!created)return;}
    const id=active,chat=await api(`/api/chats/${id}/queue`,'POST',{text,files:linkedFiles.get(id)||[]});putChat(chat);
    if(active===id && input.value.trim()===draft){input.value='';recordDraft(id,'');linkedFiles.delete(id);renderLinkedFiles();resizePrompt();}
    render();finishMessageInput(id);
  } finally {submitting=false;}
}
$('#queue').onclick=e=>guard(async()=>{
  if(!current())return;const remove=e.target.closest('[data-unqueue]');
  if(remove){const item=current().queue?.find(m=>m.id===remove.dataset.unqueue);const chat=await api(`/api/chats/${active}/queue/${remove.dataset.unqueue}`,'DELETE');putChat(chat);if(item?.text)restoreQueued(item.text);renderQueue();}
  if(e.target.closest('[data-resume-queue]')){const chat=await api(`/api/chats/${active}/queue/resume`,'POST',{});putChat(chat);render();}
});
// Na telefonu Enter dodaje novi red. Na računaru Enter šalje, a dok agent radi tekst ide u istu poruku u redu.
$('#send').onclick=e=>{if(current()?.running){e.preventDefault();guard(enqueueMessage);}};
$('#stop-run').onclick=()=>{const id=active;if(!current()?.running)return;guard(()=>api(`/api/chats/${id}/stop`,'POST'));};
// A dedicated control owns the gesture, leaving text selection untouched.
const joystick=$('#composer-joystick'),joystickHint=$('#joystick-hint');let joystickDrag=null;
function joystickDirection(dx,dy){if(Math.max(Math.abs(dx),Math.abs(dy))<22)return null;if(Math.abs(dy)>Math.abs(dx)*1.25)return dy<0?'send':'stop';if(Math.abs(dx)>Math.abs(dy)*1.25)return dx<0?'attach':'computer';return null;}
function resetJoystick(){joystickDrag=null;joystick.style.removeProperty('--stick-x');joystick.style.removeProperty('--stick-y');delete joystick.dataset.action;joystickHint.hidden=true;}
function runJoystickAction(action){if(action==='send')$('#send').click();else if(action==='stop' && current()?.running)$('#stop-run').click();else if(action==='attach')$('#files-open').click();else if(action==='computer' && !uploading)openComputerFiles();}
joystick.addEventListener('pointerdown',e=>{if(e.button!==0 || !e.isPrimary)return;e.preventDefault();joystickDrag={id:e.pointerId,x:e.clientX,y:e.clientY,chatId:active};joystick.setPointerCapture(e.pointerId);});
joystick.addEventListener('pointermove',e=>{const drag=joystickDrag;if(!drag || e.pointerId!==drag.id)return;e.preventDefault();if(active!==drag.chatId){resetJoystick();return;}const dx=e.clientX-drag.x,dy=e.clientY-drag.y,action=joystickDirection(dx,dy);joystick.style.setProperty('--stick-x',Math.max(-20,Math.min(20,dx/2))+'px');joystick.style.setProperty('--stick-y',Math.max(-20,Math.min(20,dy/2))+'px');joystick.dataset.action=action||'';joystickHint.textContent=action==='send'?(current()?.running?'U red čekanja':'Pošalji'):action==='stop'?(current()?.running?'Zaustavi':'Agent ne radi'):action==='attach'?'Fajl sa uređaja':action==='computer'?'Fajl sa Maca':'';joystickHint.hidden=!action;});
joystick.addEventListener('pointerup',e=>{const drag=joystickDrag;if(!drag || e.pointerId!==drag.id)return;e.preventDefault();const action=joystickDirection(e.clientX-drag.x,e.clientY-drag.y);resetJoystick();if(active===drag.chatId)runJoystickAction(action);});
joystick.addEventListener('pointercancel',resetJoystick);joystick.addEventListener('lostpointercapture',resetJoystick);
joystick.onkeydown=e=>{const action={ArrowUp:'send',ArrowDown:'stop',ArrowLeft:'attach',ArrowRight:'computer',Enter:'send',' ':'send'}[e.key];if(action){e.preventDefault();if(!e.repeat)runJoystickAction(action);}};

$('#prompt').onkeydown=e=>{if(e.key!=='Enter' || e.isComposing || e.shiftKey || matchMedia('(max-width:650px)').matches)return;e.preventDefault();if(current()?.running || e.metaKey || e.ctrlKey)guard(enqueueMessage);else $('#composer').requestSubmit();};
$('#prompt').oninput=()=>{resizePrompt();recordDraft(active,$('#prompt').value);};
$('#prompt').addEventListener('blur',flushDrafts);
$('#prompt').addEventListener('focus',()=>{if(!matchMedia('(max-width:650px)').matches)return;setTimeout(fitViewport,50);setTimeout(()=>revealAboveComposer(0),80);setTimeout(fitViewport,320);});
window.addEventListener('resize',()=>{resizePrompt();positionPopover();});
window.addEventListener('focus',()=>{if(meta)render();});document.addEventListener('visibilitychange',()=>{if(meta)render();});
document.addEventListener('copy',e=>{if(!messageSelectionMode || e.target.closest('input,textarea,select,[contenteditable="true"]') || !$('#defaults').hidden || document.querySelector('dialog[open]'))return;const text=selectedMessagesMarkdown();if(!text)return;e.preventDefault();e.clipboardData.setData('text/plain',text);toast('Markdown je kopiran.');});
document.onkeydown=e=>{if(e.metaKey && !e.shiftKey && !e.altKey && e.key===','){e.preventDefault();if(!e.repeat && !document.querySelector('dialog[open]'))$('#defaults-open').click();return;}const editable=e.target.closest('input,textarea,select,[contenteditable="true"]');if(messageSelectionMode && !editable && $('#defaults').hidden && !document.querySelector('dialog[open]')){if((e.metaKey || e.ctrlKey) && e.key.toLowerCase()==='a'){e.preventDefault();selectAllMessages();return;}if((e.metaKey || e.ctrlKey) && e.key.toLowerCase()==='c'){e.preventDefault();guard(copySelectedMessages);return;}if(e.key==='Escape'){e.preventDefault();clearMessageSelection();return;}}const digit=(e.metaKey || e.ctrlKey) && !e.shiftKey && !e.altKey && /^Digit([1-9])$/.exec(e.code);if(digit && $('#defaults').hidden && !document.querySelector('dialog[open]') && !e.target.closest('[data-folder-name]')){const chat=visibleSidebarChats()[Number(digit[1])-1];if(chat){e.preventDefault();if(!e.repeat && chat.id!==active)choose(chat.id);return;}}if($('#defaults').hidden && (e.metaKey || e.ctrlKey) && e.key.toLowerCase()==='k'){e.preventDefault();guard(()=>create());}if(e.key==='Escape'){closePanels();menuChat=null;menuFolder=null;if(!$('#defaults').hidden)showDefaults(false);renderPopover();}};
const isImage=name=>/\.(png|jpe?g|gif|webp)$/i.test(name);
try {
  // Prva SSE poruka već nosi sve četove. Ako veza ne javi ništa, posle 8 s ostaje običan zahtev, da ekran ne ostane prazan.
  const initialChats=new Promise(resolve=>{let first=true;const finish=value=>{if(!first)return;first=false;clearTimeout(timer);resolve(value);};const timer=setTimeout(()=>{bootProgress('Veza za poruke','spora veza · pokušavam direktno preuzimanje');finish(api('/api/chats'));},8000);connectEvents(list=>{sawEvents=true;finish(list);return true;},()=>finish(api('/api/chats')));});
  const [metaValue,listed,defaultsValue,folderValue]=await Promise.all([api('/api/meta'),initialChats,api('/api/defaults'),api('/api/folders').catch(()=>[])]);meta=metaValue;defaults=defaultsValue;folders=Array.isArray(folderValue)?folderValue:[];if(openFolder && !folders.some(folder=>folder.id===openFolder))openFolder=null;if(!sawEvents)chats=listed;receiveDrafts();appReady=true;
  const linked=new URLSearchParams(location.hash.slice(1)).get('chat');if(linked && chats.some(c=>c.id===linked))active=linked;if(!current())active=null;else selectedAgent=current().settings.agent;
  $('#prompt').value=drafts.get(active)||'';
  document.body.classList.toggle('chat-view',!!linked && !!current());for(const c of chats)if(!Object.hasOwn(seen,c.id))markRead(c);
  if(mobileNavigation()){const entry=new URL(location.href);if(!(linked && current()))entry.hash='';history.replaceState({agentDesk:true,agentDeskGuard:true},'',entry);}
  render();resizePrompt();refreshLimits();import('/battery.mjs').then(({startBatteryStatus})=>startBatteryStatus()).catch(()=>{});document.body.classList.add('ready');api('/api/models').then(value=>{models=value;lastMessages='';render();if(newMenuAgent)showNewModels(newMenuAgent);}).catch(()=>{});enablePush(false);
  // Telefon u pozadini često prekine vezu bez greške; povratak u aplikaciju otvara novu i dobija punu listu.
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)connectEvents();});
} catch(e){const boot=$('#boot-stage');if(boot)boot.textContent=`Aplikacija nije dostupna: ${e.message}`;}
let pullRefreshLock=false;
async function refreshChatList(){
  if(pullRefreshLock)return;
  pullRefreshLock=true;
  const bar=$('#pull-refresh');
  bar.classList.add('show');bar.textContent='Osvežavam…';
  try{
    const [listed,folderValue]=await Promise.all([api('/api/chats'),api('/api/folders').catch(()=>folders)]);
    chats=listed;folders=Array.isArray(folderValue)?folderValue:folders;
    if(openFolder && !folders.some(folder=>folder.id===openFolder))openFolder=null;
    lastSidebar='';connectEvents();
    if(active && !current())choose(null);else render();
    try{const response=await api('/api/limits');limits=response.agents || {};renderNewAgents();renderChatQuota();}catch{}
  }finally{pullRefreshLock=false;bar.textContent='';bar.classList.remove('show');}
}
function bindPullToRefresh(){
  const list=$('#chats'),bar=$('#pull-refresh');
  if(!list || !bar)return;
  let startY=0,tracking=false,ready=false;
  list.addEventListener('touchstart',e=>{
    tracking=matchMedia('(max-width:650px)').matches && !document.body.classList.contains('chat-view') && list.scrollTop<=0 && e.touches.length===1 && !e.target.closest('input,textarea');
    startY=e.touches[0]?.clientY || 0;ready=false;
  },{passive:true});
  list.addEventListener('touchmove',e=>{
    if(!tracking || pullRefreshLock)return;
    if(list.scrollTop>0){tracking=false;bar.classList.remove('show');return;}
    const dy=e.touches[0].clientY-startY;
    if(dy<12){ready=false;if(dy<=0)bar.classList.remove('show');return;}
    ready=dy>70;bar.classList.add('show');bar.textContent=ready?'Pusti za osvežavanje':'Povuci za osvežavanje';
    e.preventDefault();
  },{passive:false});
  list.addEventListener('touchend',()=>{if(tracking && ready)guard(refreshChatList);tracking=false;ready=false;if(!pullRefreshLock){bar.textContent='';bar.classList.remove('show');}});
  list.addEventListener('touchcancel',()=>{tracking=false;ready=false;if(!pullRefreshLock){bar.textContent='';bar.classList.remove('show');}});
}
bindPullToRefresh();
function connectEvents(initial,failed){
  events?.close();events=new EventSource('/api/events');if(!appReady)bootProgress('Veza za poruke','povezujem se');events.onopen=()=>{if(!appReady)bootProgress('Veza za poruke','otvorena · čekam istoriju četova');};
  events.onmessage=e=>{const data=JSON.parse(e.data),next=Array.isArray(data)?data:mergeChats(data);connected=true;if(!appReady){bootProgress('Istorija četova',`učitano · ${bootSize(new TextEncoder().encode(e.data).length)} · ${next.length} četova`);bootProgress('Veza za poruke','povezana');chats=next;initial?.(next);return;}chats=next;if(active && !current())choose(null);else render();};
  events.addEventListener('folders',e=>{folders=JSON.parse(e.data);if(openFolder && !folders.some(folder=>folder.id===openFolder))setOpenFolder(null);else{lastSidebar='';if(appReady)renderSidebar();}});
  events.addEventListener('reload',()=>{if(!$('#prompt').value.trim() && !document.querySelector('dialog[open]'))location.reload();else toast('Interfejs je izmenjen. Osveži stranicu kad završiš unos.');});
  events.onerror=()=>{if(!appReady)bootProgress('Veza za poruke','veza prekinuta · pokušavam ponovo');failed?.();connected=false;if(appReady)render();};
}
// Izmena sadrži ceo opis izmenjenog četa, redosled poruka i samo nove ili promenjene poruke.
function mergeChats(delta){const byId=new Map(chats.map(c=>[c.id,c]));for(const x of delta.changed){const old=new Map((byId.get(x.chat.id)?.messages || []).map(m=>[m.id,m])),fresh=new Map(x.messages.map(m=>[m.id,m]));byId.set(x.chat.id,{...x.chat,messages:x.order.map(id=>fresh.get(id) || old.get(id)).filter(Boolean)});}return delta.order.map(id=>byId.get(id)).filter(Boolean);}

function transferLabel(stats) {return `Prenos ≈ ${tokenRange(stats?.transfer)} tokena sa skraćivanjem · ${tokenRange(stats?.withoutShortening)} bez`;}
function renderTransfer(){const el=$('#transfer-preview');if(!el)return;el.hidden=true;}

function closePanels(){$('#record-panel').hidden=true;for(const el of [$('#conversation'),$('.composer-area'),$('#usage-details')].filter(Boolean))el.inert=!$('#defaults').hidden;}
for(const button of document.querySelectorAll('[data-close-panel]'))button.onclick=closePanels;
window.addEventListener('hashchange',()=>{const id=new URLSearchParams(location.hash.slice(1)).get('chat');if(chats.some(c=>c.id===id))choose(id);});

let phoneTimer;
async function refreshPhone(){
 clearTimeout(phoneTimer);
 $('.phone-settings').hidden=phoneRemote;$('#token-count-settings').hidden=phoneRemote;if(phoneRemote)return;
 try {const info=await api('/api/phone');$('#phone-status').textContent=info.origin?'Link važi još '+Math.max(0,Math.ceil((info.expiresAt-Date.now())/1000))+' s. Prijava traje '+info.sessionDays+' dana.':'Tailscale nije povezan.';
 $('#phone-address').hidden=true;$('#phone-address').textContent=info.origin || '';if(info.origin)$('#phone-address').href=info.origin;
 $('#phone-link').hidden=true;$('#phone-link').value=info.url || '';$('#phone-copy').disabled=!info.url;$('#phone-qr').hidden=!info.url;
 if(info.url){const src='/api/phone/qr?v='+info.expiresAt;if($('#phone-qr').getAttribute('src')!==src)$('#phone-qr').src=src;}
 $('#phone-revoke').hidden=!info.origin;
 }catch(e){$('#phone-status').textContent=e.message;$('#phone-qr').hidden=true;$('#phone-link').hidden=true;$('#phone-address').hidden=true;}
 if(!$('#defaults').hidden)phoneTimer=setTimeout(refreshPhone,5000);
}
$('#phone-copy').onclick=()=>guard(async()=>{await navigator.clipboard.writeText($('#phone-link').value);toast('Link je kopiran.');});
$('#phone-revoke').onclick=()=>guard(async()=>{await api('/api/phone/revoke','POST',{});await refreshPhone();toast('Prijave telefona su odjavljene.');});

function limitDescription(id){const s=limits[id];if(!s)return 'Preostali limiti: '+(id==='grok'?'7 dana':'5 sati · 7 dana')+'; učitavam';return (s.stale?'Poslednje uspešno očitavanje · ':'')+(s.updatedAt?new Date(s.updatedAt).toLocaleTimeString('sr-Latn-RS')+' · ':'')+(s.error || 'Preostalo: '+(id==='grok'?'7 dana':'5 sati · 7 dana'))+(s.nextAttemptAt>Date.now()?' · Sledeća provera '+new Date(s.nextAttemptAt).toLocaleTimeString('sr-Latn-RS'):'');}

function limitCountdown(resetAt,now=Date.now()){if(!Number.isFinite(resetAt))return null;const minutes=Math.ceil((resetAt-now)/60000);if(minutes<=0)return '↻';if(minutes>=1440)return `${Math.floor(minutes/1440)}d${Math.floor(minutes%1440/60)}h`;return `${Math.floor(minutes/60)}:${String(minutes%60).padStart(2,'0')}`;}
function limitDisplay(id){const s=limits[id];const slot=key=>{const w=s?.windows?.find(w=>w.period===key);if(!w)return '<span class="limit-slot limit-unknown"><span>?</span></span>';const left=Math.max(0,Math.min(100,w.remaining)),countdown=limitCountdown(w.resetAt);return `<span class="limit-slot ${left>65?'limit-good':left>=35?'limit-mid':'limit-low'}"><span>${Math.round(left)}</span>${countdown?`<span class="limit-reset" title="${escape(key==='fiveHour'?'5 sati':'7 dana')} · ${escape(countdown==='↻'?'Čekam novo očitavanje':'Obnova za '+countdown)}">${countdown}</span>`:''}</span>`;};return id==='grok'?slot('weekly'):slot('fiveHour')+slot('weekly');}

setInterval(()=>{if(meta && !document.hidden)renderNewAgents();},30000);
async function refreshLimits(){let wait=120000;try{const response=await api('/api/limits');limits=response.agents || {};renderNewAgents();renderChatQuota();}catch{}setTimeout(refreshLimits,wait);}
function quotaFamily(agent,modelId,label){const hay=`${modelId} ${label}`.toLowerCase();if(agent==='claude' && hay.includes('opus'))return 'weeklyOpus';if(agent==='claude' && hay.includes('sonnet'))return 'weeklySonnet';return null;}
function quotaReset(ts){if(!Number.isFinite(ts))return '';const d=new Date(ts),same=d.toDateString()===new Date().toDateString();return same?d.toLocaleTimeString('sr-Latn-RS',{hour:'2-digit',minute:'2-digit'}):d.toLocaleString('sr-Latn-RS',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'});}
function quotaTarget(chat){const list=chat?.messages || [];return [...list].reverse().find(m=>m.role==='assistant' && m.status==='running') || [...list].reverse().find(m=>m.role==='assistant' && m.agent) || null;}
function quotaView(agent,modelId,label){const s=limits[agent],windows=s?.windows || [];
 const family=quotaFamily(agent,modelId,label),week=family && windows.some(w=>w.period===family)?family:'weekly',keys=agent==='grok'?['weekly']:['fiveHour',week];
 const slot=key=>{const w=windows.find(x=>x.period===key);if(!w)return '<span class="limit-unknown">?</span>';const left=Math.max(0,Math.min(100,Math.round(w.remaining)));return `<span class="${left>65?'limit-good':left>=35?'limit-mid':'limit-low'}">${left}</span>`;};
 const shared=agent==='codex'?'Isti limit za sve Codex modele.':agent==='grok'?'Nedeljni limit, zajednički za Grok Build i chat.':agent==='antigravity'?'Gemini kvota na Antigravity nalogu.':week==='weeklyOpus'?'5 sati je zajednički Claude limit. 7 dana je poseban Opus limit.':week==='weeklySonnet'?'5 sati je zajednički Claude limit. 7 dana je poseban Sonnet limit.':'5 sati i 7 dana su zajednički za sve Claude modele.';
 const accountWeek=windows.find(w=>w.period==='weekly'),modelWeek=family?windows.find(w=>w.period===family):null;
 const extra=modelWeek && accountWeek && week!=='weekly'?` Zajednička nedelja naloga: ${Math.round(accountWeek.remaining)}.`:'';
 const resets=keys.map(key=>{const w=windows.find(x=>x.period===key);return w?.resetAt?`${key==='fiveHour'?'5h':'7d'} se obnavlja ${quotaReset(w.resetAt)}`:''}).filter(Boolean).join('. ');
 const state=!s?'Kvota se učitava. ':s.stale?'Poslednje uspešno očitavanje. ':'';
 const legend=keys.length===1?'Cifra je nedeljni limit. ':'Prva cifra je 5 sati, druga je 7 dana. ';
 return {stale:!!s?.stale,html:s?keys.map(slot).join(' '):'<span class="limit-unknown">…</span>',title:`${label}. ${state}${legend}${shared}${extra}${resets?` ${resets}.`:''}${s?.error?` ${s.error}`:''}`.replace(/\s+/g,' ').trim()};
}
function quotaInline(){const chat=current(),m=quotaTarget(chat);if(!chat || !m)return '';const view=quotaView(m.agent,m.model || chat.settings.model || '',responseModel(m));return `<span class="message-quota${view.stale?' limits-stale':''}" title="${escape(view.title)}">${view.html}</span>`;}
function renderChatQuota(){const chat=current(),inline=document.querySelector('#conversation .message-quota');if(!inline || !chat)return;
 const m=quotaTarget(chat);if(!m){inline.remove();return;}const view=quotaView(m.agent,m.model || chat.settings.model || '',responseModel(m));
 inline.classList.toggle('limits-stale',view.stale);inline.title=view.title;if(inline.innerHTML!==view.html)inline.innerHTML=view.html;
}

let fileListing,deleteTarget;
// Slike dodate kao prilog prikazuju se kao sličice, u unosu i u poslatoj poruci.
function attachmentUrl(p,images=true){const m=String(p).match(/\/data\/prilozi\/([\w-]+)\/([^/"]+)$/);return m && (!images || isImage(m[2]))?`/api/chats/${m[1]}/prilog?name=${encodeURIComponent(m[2])}`:null;}
// Prilozi u porukama: putanje iz data/prilozi postaju sličice ili linkovi za preuzimanje, i u odgovorima agenta.
function attachmentThumbs(text){
  const found=new Map();for(const m of String(text||'').matchAll(/\/[^\n"'`<>]*?\/data\/prilozi\/[\w-]+\/[^\n"'`<>/]+?\.[A-Za-z0-9]{1,8}(?=["'`<>)\s]|$)/g))found.set(m[0],attachmentUrl(m[0],false));
  const fileIcon='<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6"/></svg>';
  const items=[...found].filter(([,u])=>u).map(([p,u])=>{const name=p.split('/').pop();return isImage(name)?`<a href="${escape(u)}" ${phoneRemote?'':'target="_blank" rel="noopener"'}><img src="${escape(u)}" alt="${escape(name)}" loading="lazy"></a>`:`<a class="attachment-file" href="${escape(u)}" ${phoneRemote?'':`data-local-file="${escape(p)}" `}title="${escape(name)}">${fileIcon}<span>${escape(name)}</span></a>`;});
  return items.length?`<div class="attachment-thumbs">${items.join('')}</div>`:'';
}
function renderLinkedFiles(){const paths=linkedFiles.get(active)||[];$('#linked-files').innerHTML=paths.map((p,i)=>{const url=attachmentUrl(p);return `<button type="button" data-remove-file="${i}" title="${escape(p)}">${url?`<img src="${escape(url)}" alt="">`:''}${escape(p.split('/').pop())} ×</button>`;}).join('');}
$('#linked-files').onclick=e=>{const b=e.target.closest('[data-remove-file]');if(!b)return;const paths=linkedFiles.get(active)||[];paths.splice(Number(b.dataset.removeFile),1);linkedFiles.set(active,paths);renderLinkedFiles();};
function linkFile(p){const paths=linkedFiles.get(active)||[];if(!paths.includes(p)){if(paths.length>=20)throw Error('Najviše 20 putanja.');paths.push(p);}linkedFiles.set(active,paths);renderLinkedFiles();}
let filePickerClosing=false,folderRequest=0,folderColumns=[];
async function browseFolder(p){const id=active,request=++folderRequest;const listing=await api(`/api/chats/${id}/files${p?'?path='+encodeURIComponent(p):'?place=home'}`);if(active!==id || request!==folderRequest)return;fileListing=listing;
 $('#folder-breadcrumbs').innerHTML=listing.crumbs.map((e,i)=>`<button type="button" data-folder-crumb="${i}" ${e.path===listing.path?'aria-current="location"':''}>${escape(e.name)}</button>`).join('<span aria-hidden="true">/</span>');
 folderColumns=advanceColumns(folderColumns,listing);renderFileColumns();}
function renderFileColumns(){const desktop=!mobileNavigation(),columns=desktop?folderColumns:[fileListing];$('#file-entries').classList.toggle('columns',desktop);$('#file-entries').innerHTML=columns.map(listing=>{const column=folderColumns.indexOf(listing),next=folderColumns[column+1]?.path;return `<section class="file-column" aria-label="${escape(listing.path)}">${desktop?`<small class="column-title">${escape(listing.crumbs.at(-1)?.name||'Home')}</small>`:''}${listing.entries.map((e,i)=>`<button type="button" class="file-card ${e.directory?'directory':'file'} ${next===e.path?'selected':''}" data-file-column="${column}" data-file-entry="${i}" aria-label="${e.directory?'Folder':'Fajl'}: ${escape(e.name)}">${escape(e.name)}</button>`).join('')}${listing.truncated?'<small>Prvih 500 stavki. Otvori uži folder.</small>':''}</section>`;}).join('');if(desktop)$('#file-entries').lastElementChild?.scrollIntoView({block:'nearest',inline:'end'});}

function closeFilePicker(){if(!$('#files-dialog').open || filePickerClosing)return;filePickerClosing=true;history.back();}
$('#files-open').onclick=e=>{e.stopPropagation();if(uploading)return;if(mobileNavigation() || matchMedia('(pointer:coarse)').matches){$('#attach-menu').hidden=true;$('#device-files').click();return;}$('#attach-menu').hidden=!$('#attach-menu').hidden;};
document.addEventListener('click',e=>{if(!e.target.closest('#attach-menu'))$('#attach-menu').hidden=true;});
$('#attach-menu').onclick=e=>{const choice=e.target.closest('[data-attach]')?.dataset.attach;if(!choice)return;$('#attach-menu').hidden=true;if(choice==='device')$('#device-files').click();else openComputerFiles();};
$('#device-files').onchange=e=>{const files=[...e.target.files];e.target.value='';guard(()=>uploadFiles(files));};
$('#prompt').addEventListener('paste',e=>{const files=[...(e.clipboardData?.files || [])];if(!files.length)return;e.preventDefault();guard(()=>uploadFiles(files));});
// Fajl sa uređaja se kopira na računar, pa ga agent čita kao i svaku drugu povezanu putanju.
async function uploadFiles(files){
  if(!files.length || uploading)return;
  if(files.some(file=>file.size>25*1024*1024))throw Error('Svaki prilog može imati najviše 25 MB.');
  if((linkedFiles.get(active)||[]).length+files.length>20)throw Error('Najviše 20 priloga u jednoj poruci.');
  uploading=true;const button=$('#files-open');button.disabled=true;button.textContent='…';button.setAttribute('aria-label','Dodavanje priloga…');
  try{
    if(!current() && !await create())return;const id=active;
    for(const file of files){
      const r=await fetch(`/api/chats/${id}/upload`,{method:'POST',headers:{'Content-Type':'application/octet-stream','X-File-Name':encodeURIComponent(file.name || 'slika.png')},body:file});
      const data=await r.json().catch(()=>({}));
      if(!r.ok || !data.path)throw Error(data.error || 'Prilog nije sačuvan. Pokušaj ponovo.');
      linkedFiles.set(id,[...(linkedFiles.get(id) || []),data.path]);
      if(active===id)renderLinkedFiles();
    }
  }finally{uploading=false;button.disabled=false;button.textContent='+';button.setAttribute('aria-label','Dodaj prilog');renderLinkedFiles();}
}
const openComputerFiles=()=>guard(async()=>{if(!current())await create();folderColumns=[];await browseFolder();filePickerClosing=false;$('#files-dialog').showModal();history.pushState({agentDesk:true,filePicker:true},'',location.href);});
$('#files-dialog').addEventListener('cancel',e=>{e.preventDefault();closeFilePicker();});
$('#folder-breadcrumbs').onclick=e=>guard(()=>{const b=e.target.closest('[data-folder-crumb]');if(b)return browseFolder(fileListing.crumbs[Number(b.dataset.folderCrumb)].path);});
$('#folder-select').onclick=()=>guard(()=>{linkFile(fileListing.path);closeFilePicker();});
$('#file-entries').onclick=e=>guard(async()=>{const b=e.target.closest('[data-file-entry]');if(!b || filePickerClosing)return;const entry=folderColumns[Number(b.dataset.fileColumn)].entries[Number(b.dataset.fileEntry)];if(entry.directory)await browseFolder(entry.path);else{linkFile(entry.path);closeFilePicker();}});
let pendingFolderDelete=null,pendingReset=null;
$('#delete-cancel').onclick=closeDeleteDialog;
async function resetSession(id){const chat=await api(`/api/chats/${id}/reset-session`,'POST',{});putChat(chat);closeDeleteDialog();toast('Sledeća poruka ide kao nova sesija, bez starog keša.');render();}
async function removeChat(children){const id=deleteTarget;const result=await api(`/api/chats/${id}${children?'?children=1':''}`,'DELETE');closeDeleteDialog();chats=await api('/api/chats');menuChat=null;if(result.deleted.includes(active)){if(mobileNavigation()){choose(null);showChatList();}else choose(chats[0]?.id||null);}else render();}
$('#delete-only').onclick=()=>guard(()=>pendingReset?resetSession(pendingReset):pendingFolderDelete?removeFolder(pendingFolderDelete):removeChat(false));
$('#delete-family').onclick=()=>guard(()=>removeChat(true));


$('#local-file-close').onclick=()=>{$('#local-file-dialog').close();$('#local-file-frame').src='about:blank';};
let attachmentHistory=false,pdfViewer;
function showAttachmentDialog(){if(!$('#attachment-view').open)$('#attachment-view').showModal();if(!attachmentHistory){attachmentHistory=true;history.pushState({agentDesk:true,attachment:true},'',location.href);}}
function openPdfPreview(src){$('#attachment-view-image').hidden=true;$('#attachment-pdf').hidden=false;$('#attachment-pdf').textContent='Učitavanje PDF-a…';showAttachmentDialog();guard(async()=>{pdfViewer ||= await import('/pdf-view.mjs');if($('#attachment-view').open && !$('#attachment-pdf').hidden)await pdfViewer.showPdf(src);});}
function openAttachmentPreview(src,alt){pdfViewer?.closePdf();$('#attachment-pdf').hidden=true;const view=$('#attachment-view-image');view.hidden=false;view.alt=alt||'';view.src=src;showAttachmentDialog();}
function closeAttachmentPreview(){if(attachmentHistory){attachmentHistory=false;history.back();return;}if($('#attachment-view').open)$('#attachment-view').close();}
$('#attachment-view-close').onclick=closeAttachmentPreview;
$('#attachment-view').addEventListener('cancel',e=>{e.preventDefault();closeAttachmentPreview();});
$('#attachment-view').addEventListener('click',e=>{if(e.target===$('#attachment-view'))closeAttachmentPreview();});
$('#attachment-view').addEventListener('close',()=>{pdfViewer?.closePdf();$('#attachment-pdf').hidden=true;$('#attachment-view-image').removeAttribute('src');});
$('#attachment-view-image').addEventListener('error',()=>{if($('#attachment-view').open && $('#attachment-view-image').getAttribute('src'))toast('Slika nije učitana.');});

async function renderArchive(){const records=await api('/api/archive');$('#archive-list').innerHTML=records.map(r=>`<div class="archive-row"><span>${r.chats.map(c=>escape(c.title)).join(' · ')}<small>Još ${Math.max(1,Math.ceil((r.expiresAt-Date.now())/86400000))} dana</small></span><button type="button" data-archive-restore="${r.id}" aria-label="Vrati iz arhive">${actionIcon('<path d="M9 10 4 15l5 5M4 15h12a4 4 0 0 0 4-4V4"/>')}</button></div>`).join('') || '<small>Arhiva je prazna.</small>';}
$('#archive-open').onclick=()=>guard(async()=>{const box=$('#archive-list');box.hidden=!box.hidden;if(!box.hidden)await renderArchive();});
$('#archive-list').onclick=e=>guard(async()=>{const b=e.target.closest('[data-archive-restore]');if(!b)return;await api(`/api/archive/${b.dataset.archiveRestore}/restore`,'POST',{});chats=await api('/api/chats');render();await renderArchive();});
function pushKeyBytes(base64){const padded=base64.replace(/-/g,'+').replace(/_/g,'/')+'==='.slice((base64.length+3)%4);const raw=atob(padded);return Uint8Array.from(raw,c=>c.charCodeAt(0));}
async function enablePush(ask){
  const status=$('#notifications-status');
  if(!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)){if(ask)status.textContent='Ovaj pregledač ne prima obaveštenja u pozadini. Na iPhone-u Agent Desk treba da stoji na početnom ekranu i da se otvori odatle (iOS 16.4 ili noviji).';return;}
  if(Notification.permission==='denied'){if(ask)status.textContent='Dozvola za obaveštenja je isključena u podešavanjima telefona. Obaveštenja u aplikaciji ostaju.';return;}
  if(Notification.permission!=='granted'){if(!ask)return;const permission=await Notification.requestPermission();if(permission!=='granted'){status.textContent='Dozvola za obaveštenja nije uključena. Obaveštenja u aplikaciji ostaju.';return;}}
  try{
    const reg=await navigator.serviceWorker.register('/sw.js');
    const key=await api('/api/push/key');
    const sub=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:pushKeyBytes(key.publicKey)});
    await api('/api/push/subscribe','POST',sub.toJSON());
    if(ask)status.textContent='Obaveštenja stižu i kad aplikacija nije otvorena. Na Androidu treba dozvola za obaveštenja. Na iPhone-u Agent Desk treba da stoji na početnom ekranu (iOS 16.4 ili noviji).';
  }catch(error){
    if(!ask)return;
    const text=String(error.message||'');
    status.textContent=/Nije pronađeno|ServiceWorker|failed to register/i.test(text)?'Obaveštenja na telefonu kreću posle ponovnog pokretanja Agent Deska, kad nijedan agent ne radi.':text;
  }
}
$('#notifications-enable').onclick=()=>enablePush(true);
navigator.serviceWorker?.addEventListener('message',event=>{const id=event.data?.chatId;if(id && chats.some(c=>c.id===id)){showDefaults(false);choose(id);}});

function quotaRows(events){return events.map(e=>`<div class="quota-change"><time>${new Date(e.from).toLocaleTimeString('sr-Latn-RS')} - ${new Date(e.to).toLocaleTimeString('sr-Latn-RS')}</time><div>${escape(agentName(e.agent))} · ${e.windows.map(w=>({fiveHour:'5h',weekly:'7d',weeklyOpus:'7d Opus',weeklySonnet:'7d Sonnet'}[w.period] || w.period)+' '+w.before+' → '+w.after).join(' · ')}</div><small>${e.turns.length?e.turns.map(t=>escape(t.title)+' · '+escape(modelName(t.agent,t.model))).join(' / '):'Bez prepoznatog odgovora u Agent Desku'}</small></div>`).join('');}

function renderMessageSelection(){$('#message-selection').hidden=!messageSelectionMode;$('#copy-selected-messages').disabled=!selectedMessages.size;$('#conversation').classList.toggle('selection-mode',messageSelectionMode);}
function refreshMessageSelection(){const view=$('#conversation'),scroll=view.scrollTop;renderMessageSelection();lastMessages='';render();cancelStick();view.scrollTop=scroll;}
function selectAllMessages(){for(const m of current()?.messages||[])if(m.text)selectedMessages.add(m.id);refreshMessageSelection();}
function clearMessageSelection(){selectedMessages.clear();messageSelectionMode=false;selectionAnchor=null;refreshMessageSelection();}
function selectedMessagesMarkdown(){return exportMessages(chats,active,[...selectedMessages],{includeContext:true,modelName});}
async function copySelectedMessages(){const text=selectedMessagesMarkdown();if(!text)return;await navigator.clipboard.writeText(text);toast('Markdown je kopiran.');}
$('#select-all-messages').onclick=selectAllMessages;
$('#copy-selected-messages').onclick=()=>guard(copySelectedMessages);

$('#statistics-open').onclick=()=>guard(()=>api('/api/statistics/reveal','POST',{}));

function renderKeyboardToggle(){const button=$('#mobile-autofocus');button.setAttribute('aria-pressed',String(mobileAutofocus));button.title=`Tastatura pri otvaranju četa: ${mobileAutofocus?'uključena':'isključena'}`;}
$('#mobile-autofocus').onclick=()=>{mobileAutofocus=!mobileAutofocus;localStorage.setItem('agent-desk-mobile-autofocus',mobileAutofocus?'1':'0');renderKeyboardToggle();};
renderKeyboardToggle();

function renderColorToggle(){const button=$('#response-colors');button.setAttribute('aria-pressed',String(colorMode==='full'));button.title=`Bojenje celih odgovora: ${colorMode==='full'?'uključeno':'isključeno'}`;}
renderColorToggle();
