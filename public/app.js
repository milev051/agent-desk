import {advanceColumns} from './folder-columns.mjs';
import { marked } from '/marked.js';
import { sidebarGroups } from '/sidebar-groups.mjs';
import DOMPurify from '/purify.js';
const agentLogos = {"codex": "data:image/svg+xml;base64,PHN2ZyBjb2xvcj0iI2IzOGFmZiIgZmlsbD0iI2IzOGFmZiIgZmlsbC1ydWxlPSJldmVub2RkIiBoZWlnaHQ9IjFlbSIgc3R5bGU9ImZsZXg6bm9uZTtsaW5lLWhlaWdodDoxIiB2aWV3Qm94PSIwIDAgMjQgMjQiIHdpZHRoPSIxZW0iIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHRpdGxlPk9wZW5BSTwvdGl0bGU+PHBhdGggZD0iTTkuMjA1IDguNjU4di0yLjI2YzAtLjE5LjA3Mi0uMzMzLjIzOC0uNDI4bDQuNTQzLTIuNjE2Yy42MTktLjM1NyAxLjM1Ni0uNTIzIDIuMTE3LS41MjMgMi44NTQgMCA0LjY2MiAyLjIxMiA0LjY2MiA0LjU2NiAwIC4xNjcgMCAuMzU3LS4wMjQuNTQ3bC00LjcxLTIuNzU5YS43OTcuNzk3IDAgMDAtLjg1NiAwbC01Ljk3IDMuNDczem0xMC42MDkgOC44VjEyLjA2YzAtLjMzMy0uMTQzLS41Ny0uNDI5LS43MzdsLTUuOTctMy40NzMgMS45NS0xLjExOGEuNDMzLjQzMyAwIDAxLjQ3NiAwbDQuNTQzIDIuNjE3YzEuMzA5Ljc2IDIuMTg5IDIuMzc4IDIuMTg5IDMuOTQ4IDAgMS44MDgtMS4wNyAzLjQ3My0yLjc2IDQuMTYzek03LjgwMiAxMi43MDNsLTEuOTUtMS4xNDJjLS4xNjctLjA5NS0uMjM5LS4yMzgtLjIzOS0uNDI4VjUuODk5YzAtMi41NDUgMS45NS00LjQ3MiA0LjU5MS00LjQ3MiAxIDAgMS45MjcuMzMzIDIuNzEyLjkyOEw4LjIzIDUuMDY3Yy0uMjg1LjE2Ni0uNDI4LjQwNC0uNDI4LjczN3Y2Ljg5OHpNMTIgMTUuMTI4bC0yLjc5NS0xLjU3di0zLjMzTDEyIDguNjU4bDIuNzk1IDEuNTd2My4zM0wxMiAxNS4xMjh6bTEuNzk2IDcuMjNjLTEgMC0xLjkyNy0uMzMyLTIuNzEyLS45MjdsNC42ODYtMi43MTJjLjI4NS0uMTY2LjQyOC0uNDA0LjQyOC0uNzM3di02Ljg5OGwxLjk3NCAxLjE0MmMuMTY3LjA5NS4yMzguMjM4LjIzOC40Mjh2NS4yMzNjMCAyLjU0NS0xLjk3NCA0LjQ3Mi00LjYxNCA0LjQ3MnptLTUuNjM3LTUuMzAzbC00LjU0NC0yLjYxN2MtMS4zMDgtLjc2MS0yLjE4OC0yLjM3OC0yLjE4OC0zLjk0OEE0LjQ4MiA0LjQ4MiAwIDAxNC4yMSA2LjMyN3Y1LjQyM2MwIC4zMzMuMTQzLjU3MS40MjguNzM4bDUuOTQ3IDMuNDQ5LTEuOTUgMS4xMThhLjQzMi40MzIgMCAwMS0uNDc2IDB6bS0uMjYyIDMuOWMtMi42ODggMC00LjY2Mi0yLjAyMS00LjY2Mi00LjUxOSAwLS4xOS4wMjQtLjM4LjA0Ny0uNTdsNC42ODYgMi43MWMuMjg2LjE2Ny41NzEuMTY3Ljg1NiAwbDUuOTctMy40NDh2Mi4yNmMwIC4xOS0uMDcuMzMzLS4yMzcuNDI4bC00LjU0MyAyLjYxNmMtLjYxOS4zNTctMS4zNTYuNTIzLTIuMTE3LjUyM3ptNS44OTkgMi44M2E1Ljk0NyA1Ljk0NyAwIDAwNS44MjctNC43NTZDMjIuMjg3IDE4LjMzOSAyNCAxNS44NCAyNCAxMy4yOTZjMC0xLjY2NS0uNzEzLTMuMjgyLTEuOTk4LTQuNDQ4LjExOS0uNS4xOS0uOTk5LjE5LTEuNDk4IDAtMy40MDEtMi43NTktNS45NDctNS45NDYtNS45NDctLjY0MiAwLTEuMjYuMDk1LTEuODguMzFBNS45NjIgNS45NjIgMCAwMDEwLjIwNSAwYTUuOTQ3IDUuOTQ3IDAgMDAtNS44MjcgNC43NTdDMS43MTMgNS40NDcgMCA3Ljk0NSAwIDEwLjQ5YzAgMS42NjYuNzEzIDMuMjgzIDEuOTk4IDQuNDQ4LS4xMTkuNS0uMTkgMS0uMTkgMS40OTkgMCAzLjQwMSAyLjc1OSA1Ljk0NiA1Ljk0NiA1Ljk0Ni42NDIgMCAxLjI2LS4wOTUgMS44OC0uMzA5YTUuOTYgNS45NiAwIDAwNC4xNjIgMS43MTN6Ij48L3BhdGg+PC9zdmc+", "claude": "data:image/svg+xml;base64,PHN2ZyBjb2xvcj0iI2VmOTM1NCIgZmlsbD0iI2VmOTM1NCIgZmlsbC1ydWxlPSJldmVub2RkIiBoZWlnaHQ9IjFlbSIgc3R5bGU9ImZsZXg6bm9uZTtsaW5lLWhlaWdodDoxIiB2aWV3Qm94PSIwIDAgMjQgMjQiIHdpZHRoPSIxZW0iIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHRpdGxlPkNsYXVkZTwvdGl0bGU+PHBhdGggZD0iTTQuNzA5IDE1Ljk1NWw0LjcyLTIuNjQ3LjA4LS4yMy0uMDgtLjEyOEg5LjJsLS43OS0uMDQ4LTIuNjk4LS4wNzMtMi4zMzktLjA5Ny0yLjI2Ni0uMTIyLS41NzEtLjEyMUwwIDExLjc4NGwuMDU1LS4zNTIuNDgtLjMyMS42ODYuMDYgMS41Mi4xMDMgMi4yNzguMTU4IDEuNjUyLjA5NyAyLjQ0OS4yNTVoLjM4OWwuMDU1LS4xNTctLjEzNC0uMDk4LS4xMDMtLjA5Ny0yLjM1OC0xLjU5Ni0yLjU1Mi0xLjY4OC0xLjMzNi0uOTcyLS43MjQtLjQ5MS0uMzY0LS40NjItLjE1OC0xLjAwOC42NTYtLjcyMi44ODEuMDYuMjI1LjA2MS44OTMuNjg2IDEuOTA4IDEuNDc2IDIuNDkxIDEuODMzLjM2NS4zMDQuMTQ1LS4xMDMuMDE5LS4wNzMtLjE2NC0uMjc0LTEuMzU1LTIuNDQ2LTEuNDQ2LTIuNDktLjY0NC0xLjAzMi0uMTctLjYxOWEyLjk3IDIuOTcgMCAwMS0uMTA0LS43MjlMNi4yODMuMTM0IDYuNjk2IDBsLjk5Ni4xMzQuNDIuMzY0LjYyIDEuNDE0IDEuMDAyIDIuMjI5IDEuNTU1IDMuMDMuNDU2Ljg5OC4yNDMuODMyLjA5MS4yNTVoLjE1OFY5LjAxbC4xMjgtMS43MDYuMjM3LTIuMDk1LjIzLTIuNjk1LjA4LS43Ni4zNzYtLjkxLjc0Ny0uNDkyLjU4NC4yOC40OC42ODUtLjA2Ny40NDQtLjI4NiAxLjg1MS0uNTU5IDIuOTAzLS4zNjQgMS45NDJoLjIxMmwuMjQzLS4yNDIuOTg1LTEuMzA2IDEuNjUyLTIuMDY0LjczLS44Mi44NS0uOTA0LjU0Ny0uNDMxaDEuMDMzbC43NiAxLjEyOS0uMzQgMS4xNjYtMS4wNjQgMS4zNDctLjg4MSAxLjE0Mi0xLjI2NCAxLjctLjc5IDEuMzYuMDczLjExLjE4OC0uMDIgMi44NTYtLjYwNiAxLjU0My0uMjggMS44NDEtLjMxNS44MzMuMzg4LjA5MS4zOTUtLjMyOC44MDctMS45NjkuNDg2LTIuMzA5LjQ2Mi0zLjQzOS44MTMtLjA0Mi4wMy4wNDkuMDYxIDEuNTQ5LjE0Ni42NjIuMDM2aDEuNjIybDMuMDIuMjI1Ljc5LjUyMi40NzQuNjM4LS4wNzkuNDg1LTEuMjE1LjYyLTEuNjQtLjM4OS0zLjgyOS0uOTEtMS4zMTItLjMyOWgtLjE4MnYuMTFsMS4wOTMgMS4wNjggMi4wMDYgMS44MSAyLjUwOSAyLjMzLjEyNy41NzgtLjMyMi40NTUtLjM0LS4wNDktMi4yMDUtMS42NTctLjg1MS0uNzQ3LTEuOTI2LTEuNjJoLS4xMjh2LjE3bC40NDQuNjQ5IDIuMzQ1IDMuNTIxLjEyMiAxLjA4LS4xNy4zNTMtLjYwOC4yMTMtLjY2OC0uMTIyLTEuMzc0LTEuOTI1LTEuNDE1LTIuMTY3LTEuMTQzLTEuOTQzLS4xNC4wOC0uNjc0IDcuMjU0LS4zMTYuMzctLjcyOS4yOC0uNjA3LS40NjEtLjMyMi0uNzQ3LjMyMi0xLjQ3Ni4zODktMS45MjQuMzE1LTEuNTMuMjg2LTEuOS4xNy0uNjMyLS4wMTItLjA0Mi0uMTQuMDE4LTEuNDM0IDEuOTY3LTIuMTggMi45NDUtMS43MjYgMS44NDUtLjQxNC4xNjQtLjcxNy0uMzcuMDY3LS42NjIuNDAxLS41ODkgMi4zODgtMy4wMzYgMS40NC0xLjg4Mi45My0xLjA4Ni0uMDA2LS4xNThoLS4wNTVMNC4xMzIgMTguNTZsLTEuMTMuMTQ2LS40ODctLjQ1Ni4wNjEtLjc0Ni4yMzEtLjI0MyAxLjkwOC0xLjMxMi0uMDA2LjAwNnoiPjwvcGF0aD48L3N2Zz4=", "grok": "data:image/svg+xml;base64,PHN2ZyBjb2xvcj0iI2ZmZmZmZiIgZmlsbD0iI2ZmZmZmZiIgZmlsbC1ydWxlPSJldmVub2RkIiBoZWlnaHQ9IjFlbSIgc3R5bGU9ImZsZXg6bm9uZTtsaW5lLWhlaWdodDoxIiB2aWV3Qm94PSIwIDAgMjQgMjQiIHdpZHRoPSIxZW0iIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHRpdGxlPkdyb2s8L3RpdGxlPjxwYXRoIGQ9Ik05LjI3IDE1LjI5bDcuOTc4LTUuODk3Yy4zOTEtLjI5Ljk1LS4xNzcgMS4xMzcuMjcyLjk4IDIuMzY5LjU0MiA1LjIxNS0xLjQxIDcuMTY5LTEuOTUxIDEuOTU0LTQuNjY3IDIuMzgyLTcuMTQ5IDEuNDA2bC0yLjcxMSAxLjI1N2MzLjg4OSAyLjY2MSA4LjYxMSAyLjAwMyAxMS41NjItLjk1MyAyLjM0MS0yLjM0NCAzLjA2Ni01LjUzOSAyLjM4OC04LjQybC4wMDYuMDA3Yy0uOTgzLTQuMjMyLjI0Mi01LjkyNCAyLjc1LTkuMzgzLjA2LS4wODIuMTItLjE2NC4xNzktLjI0OGwtMy4zMDEgMy4zMDV2LS4wMUw5LjI2NyAxNS4yOTJNNy42MjMgMTYuNzIzYy0yLjc5Mi0yLjY3LTIuMzEtNi44MDEuMDcxLTkuMTg0IDEuNzYxLTEuNzYzIDQuNjQ3LTIuNDgzIDcuMTY2LTEuNDI1bDIuNzA1LTEuMjVhNy44MDggNy44MDggMCAwMC0xLjgyOS0xQTguOTc1IDguOTc1IDAgMDA1Ljk4NCA1LjgzYy0yLjUzMyAyLjUzNi0zLjMzIDYuNDM2LTEuOTYyIDkuNzY0IDEuMDIyIDIuNDg3LS42NTMgNC4yNDYtMi4zNCA2LjAyMi0uNTk5LjYzLTEuMTk5IDEuMjU5LTEuNjgyIDEuOTI1bDcuNjItNi44MTUiPjwvcGF0aD48L3N2Zz4=", "antigravity": "data:image/svg+xml;base64,PHN2ZyBjb2xvcj0iIzZhYWVmZiIgZmlsbD0iIzZhYWVmZiIgZmlsbC1ydWxlPSJldmVub2RkIiBoZWlnaHQ9IjFlbSIgc3R5bGU9ImZsZXg6bm9uZTtsaW5lLWhlaWdodDoxIiB2aWV3Qm94PSIwIDAgMjQgMjQiIHdpZHRoPSIxZW0iIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHRpdGxlPkFudGlncmF2aXR5PC90aXRsZT48cGF0aCBkPSJNMjEuNzUxIDIyLjYwN2MxLjM0IDEuMDA1IDMuMzUuMzM1IDEuNTA4LTEuNTA4QzE3LjczIDE1Ljc0IDE4LjkwNCAxIDEyLjAzNyAxIDUuMTcgMSA2LjM0MiAxNS43NC44MTUgMjEuMWMtMi4wMSAyLjAwOS4xNjcgMi41MTEgMS41MDcgMS41MDYgNS4xOTItMy41MTcgNC44NTctOS43MTQgOS43MTUtOS43MTQgNC44NTcgMCA0LjUyMiA2LjE5NyA5LjcxNCA5LjcxNXoiPjwvcGF0aD48L3N2Zz4="};
const $ = s => document.querySelector(s);
let defaults = {}, models = {}, meta, chats = [], active = localStorage.getItem('agent-desk-active'), selectedAgent = 'codex', menuChat = null, lastMessages = '', connected = true;
let titleSettings={}, usageReport={};
let agentPanelOpen=true;
let mobileAutofocus=localStorage.getItem('agent-desk-mobile-autofocus')==='1';
const linkedFiles=new Map();
const pendingMessages=new Map(),newEmptyChats=new Set(),historyCounts=new Map();
function focusPrompt(){if(!matchMedia('(max-width:650px)').matches || mobileAutofocus)$('#prompt').focus();}
let rename = null, creating = false, submitting = false, clickTimer, holdTimer, holdStart, held = false, suppressClickUntil=0;
let colorMode=localStorage.getItem('agent-desk-color-mode') || 'label';
document.body.classList.toggle('colored-responses',colorMode==='full');
const drafts = new Map(), switchingChats = new Set();
const escape = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const current = () => chats.find(c => c.id === active);
const agentName = id => meta.agents.find(a => a.id === id)?.name || id;
function toast(message) { $('#toast').textContent = message; $('#toast').hidden = false; clearTimeout(toast.timer); toast.timer = setTimeout(() => $('#toast').hidden = true, 5500); }
async function api(url, method = 'GET', data) {
  const res = await fetch(url, {method, headers:{'Content-Type':'application/json'},body:data ? JSON.stringify(data) : undefined});
  const b = await res.json(); if(!res.ok) throw new Error(b.error || 'Greška servera.');return b;
}
async function guard(fn) {try {await fn();} catch(e) {toast(e.message);}}
function localFileHref(value){try{const u=new URL(value,location.href);if(u.protocol==='file:')return decodeURIComponent(u.pathname);if(/^\/(Users|Volumes)\//.test(u.pathname) && (u.origin===location.origin||['127.0.0.1','localhost'].includes(u.hostname)))return decodeURIComponent(u.pathname);}catch{}return null;}
function markdown(text) {
  text=(text||'').replace(/\]\((file:\/\/[^)]+)\)/g,(match,p)=>{try{return '](/files'+new URL(p).pathname+')';}catch{return match;}});
  return DOMPurify.sanitize(marked.parse(text || '',{gfm:true,breaks:true}),{ALLOWED_TAGS:['p','br','strong','em','del','code','pre','blockquote','ul','ol','li','h1','h2','h3','h4','h5','h6','hr','a','table','thead','tbody','tr','th','td'],ALLOWED_ATTR:['href','title','align','start'],ALLOW_DATA_ATTR:false});
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
const trashIcon='<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7"/></svg>';
const forkIcon='<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><circle cx="6" cy="5" r="2"/><circle cx="6" cy="19" r="2"/><circle cx="18" cy="5" r="2"/><path d="M6 7v10M6 15c0-5 12-3 12-8"/></svg>';
const stopIcon='<svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><rect x="4" y="4" width="12" height="12" rx="1"/></svg>';
const actionIcon=paths=>`<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;
const folderIcon=actionIcon('<path d="M3 7V5a2 2 0 0 1 2-2h5l2 3h7a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z"/><path d="M3 9h18"/>');
const recordIcon=actionIcon('<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6M8 13h8M8 17h8"/>');
let seen={};try {seen=JSON.parse(localStorage.getItem('agent-desk-seen') || '{}');} catch {}
function completion(chat) {const m=[...chat.messages].reverse().find(m=>m.role==='assistant');return m && ['done','stopped','error','interrupted'].includes(m.status) ? {token:`${m.id}:${m.status}`,status:m.status} : null;}
function markRead(chat) {const c=chat && completion(chat);if(c && seen[chat.id]!==c.token){seen[chat.id]=c.token;localStorage.setItem('agent-desk-seen',JSON.stringify(seen));}}
function notification(chat) {const c=completion(chat);return !chat.running && c && seen[chat.id]!==c.token ? 'unread' : '';}
function resizePrompt() {const input=$('#prompt');input.style.height='auto';input.style.height=Math.min(input.scrollHeight,window.innerHeight/2)+'px';}
function discardEmpty(id){const chat=chats.find(c=>c.id===id);if(!(newEmptyChats.has(id)||chat?.ephemeral)||!chat||chat.messages.length||chat.running||chat.queue?.length||pendingMessages.has(id))return;newEmptyChats.delete(id);api(`/api/chats/${id}/discard-empty`,'POST',{}).then(()=>{chats=chats.filter(c=>c.id!==id);drafts.delete(id);linkedFiles.delete(id);if(meta)renderSidebar();}).catch(()=>{});}
function choose(id) {
  if(active!==id)discardEmpty(active);
  showDefaults(false);$('#usage-details').open=false;document.body.classList.toggle('chat-view',!!id);agentPanelOpen=true;
  clearTimeout(clickTimer);drafts.set(active,$('#prompt').value);active=id;$('#prompt').value=drafts.get(id)||'';resizePrompt();
  const url=new URL(location.href);if(id)url.hash='chat='+encodeURIComponent(id);else url.hash='';history.replaceState(null,'',url);
  closePanels();
  if(id)localStorage.setItem('agent-desk-active',id);else localStorage.removeItem('agent-desk-active');
  if(current()){selectedAgent=current().settings.agent;markRead(current());}
  menuChat=null;rename=null;lastMessages='';render();renderLinkedFiles();focusPrompt();
}
function putChat(chat) {if(chats.some(c=>c.id===chat.id))chats=chats.map(c=>c.id===chat.id?chat:c);else chats.unshift(chat);}
async function create(agent=selectedAgent) {
  if(creating)return;creating=true;
  try {
    const existing=current(), reusable=existing && !existing.running && !existing.messages.length && !Object.keys(existing.sessions).length;
    const chat=reusable ? existing.settings.agent===agent ? existing : await api(`/api/chats/${existing.id}`,'PATCH',{settings:{agent}}) : await api('/api/chats','POST',{settings:{agent}});
    if(!reusable)newEmptyChats.add(chat.id);putChat(chat);choose(chat.id);return chat;
  } finally {creating=false;}
}
function modelLabel(chat) {
  const last=chat.sessions[chat.settings.agent] && [...chat.messages].reverse().find(m=>m.agent===chat.settings.agent);
  const id=chat.settings.model || (last?.configuredModel===chat.settings.model ? last.model : '');
  return id ? modelName(chat.settings.agent,id) : 'Podrazumevani CLI model';
}
const agentOrder=['codex','claude','antigravity','grok'];
let limits={};
function renderNewAgents() {const settings=$('#defaults-open');$('#new-agents').innerHTML=agentOrder.map(id=>meta.agents.find(a=>a.id===id)).filter(Boolean).map(a=>`<button class="new-agent" data-new-agent="${a.id}" title="Novi čet · ${escape(a.name)}" aria-label="Novi čet · ${escape(a.name)}" ${!a.available?'disabled':''}><img src="${agentLogos[a.id]}" alt="" width="21" height="21"><small class="agent-limits" title="${escape(limitDescription(a.id))}">${limitDisplay(a.id)}</small></button>`).join('');$('#new-agents').append(settings);}
let lastSidebar='', paintingSidebar=false;
function renderSidebar() {
  const row=c=>`<div role="button" tabindex="0" aria-label="${escape(c.title)}" class="chat-row ${c.id===active?'active':''} ${c.running?'working':notification(c)}" data-row="${c.id}" data-agent="${c.settings.agent}" title="${escape(c.title)} · ${escape(agentName(c.settings.agent))} · ${escape(modelLabel(c))}">
    <span class="chat-item"><span>${escape(c.title)}</span><small class="card-model">${escape(modelLabel(c))}</small>${cardUsage(c)}</span>
  </div>`;
  const groups=sidebarGroups(chats);
  const content=groups.map(g=>{
    return `<div class="chat-group ${g.children.some(c=>c.id===active)?'has-active-child':''}">${row(g.chat,g.children.length)}</div>`;
  }).join('');
  if(content!==lastSidebar){const input=$('[data-rename]'), editing=input && document.activeElement===input, start=input?.selectionStart,end=input?.selectionEnd;paintingSidebar=true;$('#chats').innerHTML=content;lastSidebar=content;if(editing && rename){const replacement=$('[data-rename]');replacement.focus();replacement.setSelectionRange(start,end);}paintingSidebar=false;}
  renderPopover();renderNewAgents();
}
function renderAgentPanel() {
  const chat=current(),children=chats.filter(c=>c.parentChatId===active && c.id!==active).sort((a,b)=>(b.updatedAt||0)-(a.updatedAt||0));
  const visible=agentPanelOpen && children.length>0;
  $('#agent-panel').hidden=!visible;
  $('#subagents-toggle').hidden=!children.length;$('#subagents-toggle').setAttribute('aria-expanded',String(visible));$('#subagents-toggle').setAttribute('aria-label',visible?'Sakrij podagente':'Prikaži podagente');
  $('#chat-parent').hidden=!chats.some(c=>c.id===chat?.parentChatId);
  $('#chat-title').textContent=chat?.title || '';
  $('#chat-options').hidden=!chat;
  if(chat)$('#chat-options').dataset.options=chat.id;
  if(chat)$('#chat-options').innerHTML=`<img src="${agentLogos[chat.settings.agent]}" alt="" width="20" height="20">`;
  const row=c=>`<button class="agent-tree-item ${c.id===active?'active':''} ${c.running?'working':notification(c)}" data-agent="${c.settings.agent}" data-agent-chat="${c.id}" title="${escape(agentName(c.settings.agent))} · ${escape(modelLabel(c))}"><span><span class="agent-card-title">${escape(c.title)}</span><small class="card-model">${escape(modelLabel(c))}</small>${cardUsage(c)}</span></button>`;
  const html=children.reverse().map(row).join('');
  if($('#agent-tree').innerHTML!==html)$('#agent-tree').innerHTML=html;
}
function showChatList(){discardEmpty(active);document.body.classList.remove('chat-view');showDefaults(false);closePanels();menuChat=null;renderPopover();const url=new URL(location.href);url.hash='';history.replaceState(history.state,'',url);}
$('#chat-back').onclick=showChatList;
$('#subagents-toggle').onclick=()=>{agentPanelOpen=!agentPanelOpen;renderAgentPanel();};
const mobileNavigation=()=>matchMedia('(max-width:650px)').matches;
function keepMobileHistory(){if(mobileNavigation())history.pushState({agentDesk:true},'',location.href);}
window.addEventListener('popstate',()=>{if($('#files-dialog').open){guard(async()=>{if(!filePickerClosing && fileListing.path!==fileListing.home && fileListing.parent){history.pushState({agentDesk:true,filePicker:true},'',location.href);await browseFolder(fileListing.parent);}else{filePickerClosing=false;$('#files-dialog').close();keepMobileHistory();}});return;}if(mobileNavigation()){if(!$('#files-dialog').open && !$('#delete-dialog').open && document.body.classList.contains('chat-view') && chats.some(c=>c.id===current()?.parentChatId))choose(current().parentChatId);else{if($('#files-dialog').open)$('#files-dialog').close();if($('#delete-dialog').open)$('#delete-dialog').close();showChatList();}keepMobileHistory();}});

$('#chat-parent').onclick=()=>{if(current()?.parentChatId)choose(current().parentChatId);};
$('#chat-options').onclick=()=>{if(current()){menuChat=menuChat===active?null:active;renderPopover();}};
const usageCount=n=>Number(n||0).toLocaleString('sr-Latn-RS');
function usageRange(a,b){return a===b?usageCount(a):`${usageCount(a)}-${usageCount(b)}`;}
function apiMoney(s){if(!s?.priced)return 'Cena nije poznata';const fmt=n=>'$'+n.toFixed(n<.01?4:3);return `≈ ${fmt(s.costMin)}${Math.abs(s.costMax-s.costMin)>1e-9?'-'+fmt(s.costMax):''}${s.unpriced || s.missing || s.sessionUnknown?' · delimično':''}`;}
function splitUsage(s){return `${usageRange(Math.max(0,s.total-s.cacheRead),Math.max(0,s.totalMax-s.cacheRead))} novih · ${usageCount(s.cacheRead)} keširanih`;}
function cardUsage(c){const s=c.usageSummary?.own;return `<small class="card-usage">${s?.records?escape(splitUsage(s)):'Tokeni nisu prijavljeni'}</small>`;}

function usageTable(s){if(!s)return '';const rows=s.models || [];return `<div class="usage-table-wrap"><table class="usage-table"><thead><tr><th>Model</th><th>Novi ulaz¹</th><th>Izlaz</th><th>Keš</th><th>Upis keša</th><th>$</th></tr></thead><tbody>${rows.map(r=>`<tr><td>${escape(r.model ? modelName(r.agent,r.model) : agentName(r.agent)+' · nepoznat model')}${r.kind==='title'?' · naslov':r.kind==='handoff'?' · predaja':''}</td><td>${r.records?usageRange(Math.max(0,r.input-r.cacheRead),Math.max(0,r.inputMax-r.cacheRead)):'n/p'}</td><td>${r.records?usageCount(r.output):'n/p'}</td><td>${r.records?usageCount(r.cacheRead):'n/p'}</td><td>${r.records?usageCount(r.cacheWrite):'n/p'}</td><td>${escape(apiMoney(r))}</td></tr>`).join('') || '<tr><td colspan="6">Potrošnja još nije prijavljena.</td></tr>'}</tbody></table></div>${s.sessionUnknown?`<p class="usage-note">${s.sessionUnknown} starih kumulativnih zapisa nije sabrano bez pouzdane osnove.</p>`:''}${s.missing?`<p class="usage-note">Za ${s.missing} odgovora tokeni nisu prijavljeni.</p>`:''}${s.uncertain?'<p class="usage-note">Deo zapisa nema potpuno razdvojene ulazne i keširane tokene.</p>':''}`;}
function renderUsage(){const c=current(),box=$('#usage-details');box.hidden=!c;if(!c)return;const u=c.usageSummary;if(!u){$('#usage-heading').textContent='Potrošnja';$('#usage-breakdown').innerHTML='';return;}
 const s=u.childCount?u.family:u.own;if(!c.messages.length&&!s.records){box.hidden=true;return;}$('#usage-heading').textContent=`${s.records?splitUsage(s):'Tokeni nisu prijavljeni'} · ${apiMoney(s)}`;
 const html=`<div class="usage-scope-label">Ovaj čet · ${escape(apiMoney(u.own))}</div>${usageTable(u.own)}${u.childCount?`<div class="usage-scope-label">Čet i podagenti · ${escape(apiMoney(u.family))}</div>${usageTable(u.family)}`:''}<div class="usage-scope-label" title="${escape(u.projectPath)}">Projekat: ${escape(u.projectPath)} · ${escape(apiMoney(u.project))}</div>${usageTable(u.project)}<p class="usage-note">¹ Novi ulaz ne uključuje čitanje keša; upis keša je deo novog ulaza. Novi tokeni u sažetku uključuju i izlaz. Razmišljanje je deo izlaza kada ga CLI tako prijavi. API procena prema cenovniku od 04.10.2026, standardne tarife. Raspon pokriva kratki/dugi kontekst i trajanje upisa keša. Zbir sačuvanih četova. Bez naknada za alate i skladištenje. Pretplata ima sopstvene limite.</p>${u.project.legacyProject?'<p class="usage-note">Stariji odgovori bez zabeleženog foldera pripisani su sadašnjem radnom folderu četa.</p>':''}<p class="usage-note">Native podagenti koje CLI ne prijavi nisu zasebno izmereni.</p>`;
 if($('#usage-breakdown').innerHTML!==html)$('#usage-breakdown').innerHTML=html;
}
function renderProjectUsage(){const html=Object.entries(usageReport.projects || {}).map(([cwd,s])=>`<div class="usage-scope-label">${escape(cwd)} · ${splitUsage(s)} · ${escape(apiMoney(s))}</div>${usageTable(s)}`).join('') || '<p class="usage-note">Nema zabeležene potrošnje.</p>';$('#project-usage-list').innerHTML=html;}
$('#agent-tree').onscroll=positionPopover;
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
  const pop=$('#chat-popover'), c=chats.find(c=>c.id===menuChat);if(!c){pop.hidden=true;return;}
  const busy=c.running;
  const tool=(action,label,icon,disabled=false)=>`<button class="icon-action ${action==='delete'?'delete-chat':action==='stop'?'stop-chat':''}" data-action="${action}" data-id="${c.id}" aria-label="${escape(label)}" title="${escape(label)}" ${disabled?'disabled':''}>${icon}</button>`;
  const content=`<div class="menu-agents" role="group" aria-label="Izaberi agenta">${agentOrder.map(id=>meta.agents.find(a=>a.id===id)).filter(a=>a && a.id!==c.settings.agent).map(a=>`<button class="menu-agent" data-card-agent="${a.id}" data-agent-source="${c.id}" aria-label="Promeni agenta · ${escape(a.name)}" title="${escape(a.name)} · prenos ${tokenRange(c.transfers?.[a.id])} tokena, procena; keš nije garantovan" ${!a.available || busy?'disabled':''}><img src="${agentLogos[a.id]}" alt="" width="21" height="21"></button>`).join('')}</div><div class="chat-tools" role="group" aria-label="Radnje četa">${tool('rename','Preimenuj čet',actionIcon('<path d="M4 20h4L20 8l-4-4L4 16Z"/><path d="m14 6 4 4"/>'))}${tool('link','Kopiraj adresu četa',copyIcon)}${tool('fork','Napravi granu četa',forkIcon,busy)}${tool('delete','Arhiviraj čet',actionIcon('<rect x="3" y="3" width="18" height="4" rx="1"/><path d="M5 7v13h14V7m-10 5h6"/>'),busy)}${tool('reveal','Prikaži u Finderu',folderIcon)}${tool('record','Otvori zapis četa',recordIcon)}${busy?tool('stop','Zaustavi',stopIcon):''}</div>${rename?.id===c.id?`<input data-menu-rename aria-label="Naziv četa" value="${escape(rename.value)}" maxlength="100">`:""}<label class="model-choice">Model<select data-chat-model="${c.id}" aria-label="Model četa" ${busy?'disabled':''}>${modelOptions(c.settings)}</select></label>${effortsFor(c.settings.agent,c.settings.model).length?`<label class="model-choice">Razmišljanje<select data-chat-effort="${c.id}" aria-label="Nivo razmišljanja" ${busy?'disabled':''}>${effortOptions(c.settings)}</select></label>`:''}<div class="context-info" title="Gruba procena vidljivih poruka: 2–6 znakova po tokenu. Native kontekst sadrži i alate, fajlove i sistemska uputstva i nije izmeren ovim brojem. Hover na agentu prikazuje procenu dopune njegove sesije. Cena i keš zavise od pretplate i ciljnog modela.">${c.historyTokenCount?'Istorija · '+usageCount(c.historyTokenCount.tokens)+' tokena (Gemini)':'Istorija ≈ '+tokenRange(c.context?.history)+' tokena'}</div><small class="count-history-status">${c.historyTokenCount?'':busy?'Brojanje nakon završetka odgovora':meta.titleSettings?.configured?'Automatsko brojanje · Gemini':'Za brojanje unesi Google ključ u podešavanjima'}</small>`;
  const extras=`<div class="transfer-estimate">${transferLabel(c.context)}</div>`;
  if(pop.innerHTML!==content+extras)pop.innerHTML=content+extras;pop.hidden=false;
  positionPopover();autoCountHistory(c);
}
async function autoCountHistory(c){if(c.historyTokenCount||c.running||!meta.titleSettings?.configured)return;const key=c.id+':'+JSON.stringify(c.messages.map(m=>[m.id,m.text,m.actions]));const previous=historyCounts.get(key);if(previous==='pending'||previous==='done'||typeof previous==='number'&&Date.now()-previous<120000)return;historyCounts.set(key,'pending');try{const chat=await api(`/api/chats/${c.id}/count-tokens`,'POST',{consent:true});if(chats.some(x=>x.id===c.id))putChat(chat);historyCounts.set(key,'done');renderPopover();}catch(e){historyCounts.set(key,Date.now());if(menuChat===c.id){const el=$('#chat-popover .context-info');if(el)el.title=e.message;}}}
function positionPopover() {
  const pop=$('#chat-popover');if(pop.hidden)return;
  const button=[...document.querySelectorAll('[data-row],[data-options],[data-agent-chat]')].find(b=>(b.dataset.row===menuChat || b.dataset.options===menuChat || b.dataset.agentChat===menuChat) && b.getClientRects().length);if(!button){menuChat=null;pop.hidden=true;return;}
  const rect=button.getBoundingClientRect(), box=pop.getBoundingClientRect();
  pop.style.left=Math.max(8,Math.min(rect.right+8,window.innerWidth-box.width-8))+'px';
  pop.style.top=Math.max(8,Math.min(rect.top+rect.height/2-box.height/2,window.innerHeight-box.height-8))+'px';
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
function render() {
  renderQueue();renderTransfer();renderAgentPanel();renderUsage();
  const chat=current();if(document.visibilityState==='visible' && document.hasFocus())markRead(chat);renderSidebar();
  $('#prompt').disabled=!connected || !meta.agents.find(a=>a.id===(chat?.settings.agent || selectedAgent))?.available;
  $('#connection').hidden=connected;$('#prompt').setAttribute('aria-busy',chat?.running?'true':'false');
  const messages=[...(chat?.messages || []),...(pendingMessages.has(active) && !chat?.messages.some(m=>m.requestId===pendingMessages.get(active).requestId)?[pendingMessages.get(active)]:[])];
  const key=JSON.stringify({id:chat?.id,messages});if(key===lastMessages)return;lastMessages=key;
  const view=$('#conversation'),atBottom=view.scrollHeight-view.scrollTop-view.clientHeight<100;
  view.innerHTML=messages.map(m=>`<article class="message ${m.role} ${Object.hasOwn(agentLogos,m.agent)?m.agent:''}" aria-label="${m.role==='user'?'Tvoja poruka':'Odgovor agenta'}">${m.role==='assistant'?`<div class="response-model">${escape(responseModel(m))}</div>`:''}<div class="message-body">${markdown(m.text)}</div>${m.status==='running'?`<div class="activity">${escape(m.activity || 'Agent odgovara…')}</div>`:''}${m.status==='sending'?'<div class="activity">Šalje se…</div>':''}${m.status==='stopped'?'<div class="activity">Zaustavljeno.</div>':''}${m.error?`<div class="error">${escape(m.error)}</div>`:''}<div class="message-footer">${messageTime(m)}${m.role==='assistant'?tokenInfo(m):''}${m.text?`<button class="copy-message" data-copy-message="${m.id}" aria-label="Kopiraj poruku" title="Kopiraj">${copyIcon}</button>`:''}</div></article>`).join('');
  for(const a of view.querySelectorAll('a')){const href=a.getAttribute('href');const p=href?.startsWith('/files/')?decodeURIComponent(href.slice(6)):localFileHref(href);if(p){a.dataset.localFile=p;a.href='/files'+p.split('/').map(encodeURIComponent).join('/');}}
  for(const pre of view.querySelectorAll('pre')){if(!pre.querySelector('code'))continue;const button=document.createElement('button');button.className='copy-code';button.dataset.copyCode='';button.setAttribute('aria-label','Kopiraj blok koda');button.title='Kopiraj blok koda';button.innerHTML=copyIcon;pre.append(button);}
  if(atBottom || !chat?.running)view.scrollTop=view.scrollHeight;
}
function beginRename(id){const c=chats.find(c=>c.id===id);if(!c)return;rename={id,value:c.title};menuChat=id;renderPopover();const input=$('[data-menu-rename]');input.focus();input.select();}
async function saveRename(){if(!rename)return;const edit=rename;if(edit.value.trim())putChat(await api(`/api/chats/${edit.id}`,'PATCH',{title:edit.value}));rename=null;renderSidebar();renderAgentPanel();}
$('#new-agents').onclick=e=>guard(async()=>{const button=e.target.closest('[data-new-agent]');if(button)await create(button.dataset.newAgent);});
function cardId(e){return e.target.closest('[data-row]')?.dataset.row || e.target.closest('[data-agent-chat]')?.dataset.agentChat;}
for(const list of [$('#chats'),$('#agent-tree')]){
 list.onclick=e=>{const id=cardId(e);if(!id)return;if(held && Date.now()<suppressClickUntil){held=false;return;}held=false;choose(id);};
 list.onpointerdown=e=>{const id=cardId(e);if(!id||e.button!==0)return;held=false;holdStart={x:e.clientX,y:e.clientY};const card=e.target.closest('[data-row],[data-agent-chat]');card.classList.add('pressed');holdTimer=setTimeout(()=>{held=true;card.classList.remove('pressed');menuChat=id;rename=null;renderPopover();},600);};
 list.onpointermove=e=>{if(holdStart&&Math.hypot(e.clientX-holdStart.x,e.clientY-holdStart.y)>10){clearTimeout(holdTimer);list.querySelectorAll('.pressed').forEach(c=>c.classList.remove('pressed'));}};
 for(const name of ['pointerup','pointercancel','pointerleave'])list.addEventListener(name,()=>{clearTimeout(holdTimer);if(held)suppressClickUntil=Date.now()+400;holdStart=null;list.querySelectorAll('.pressed').forEach(c=>c.classList.remove('pressed'));});
 list.oncontextmenu=e=>{if(cardId(e)){e.preventDefault();held=true;suppressClickUntil=Date.now()+400;menuChat=cardId(e);renderPopover();}};
 list.onkeydown=e=>{const id=cardId(e);if(id&&(e.key==='Enter'||e.key===' ')){e.preventDefault();choose(id);}};
}
$('#chat-popover').oninput=e=>{if(e.target.matches('[data-menu-rename]')&&rename)rename.value=e.target.value;};
$('#chat-popover').onkeydown=e=>{if(e.target.matches('[data-menu-rename]')&&e.key==='Enter'){e.preventDefault();guard(saveRename);}};
$('#chats').onscroll=positionPopover;
$('#chat-popover').onclick=e=>guard(async()=>{
  const button=e.target.closest('[data-card-agent]');
  if(button){const id=button.dataset.agentSource,agent=button.dataset.cardAgent,source=chats.find(c=>c.id===id);if(!source || switchingChats.has(id))return;if(source.settings.agent===agent){choose(id);return;}
    switchingChats.add(id);try{const copy=await api(`/api/chats/${id}`,'PATCH',{settings:{agent}});putChat(copy);choose(copy.id);}finally{switchingChats.delete(id);}return;
  }
  const action=e.target.closest('[data-action]');if(!action)return;const id=action.dataset.id,c=chats.find(c=>c.id===id);if(!c)return;
  if(action.dataset.action==='rename'){beginRename(id);return;}
  if(action.dataset.action==='link'){await navigator.clipboard.writeText(`${location.origin}/#chat=${encodeURIComponent(id)}`);action.innerHTML='✓';action.title='Adresa četa je kopirana';setTimeout(()=>{if(action.isConnected)action.innerHTML=copyIcon;},1500);return;}
  if(action.dataset.action==='reveal'){await api(`/api/chats/${id}/reveal`,'POST',{});return;}
  if(action.dataset.action==='record'){const record=await api(`/api/chats/${id}/record`,'POST',{});closePanels();$('#record-text').value=record.text;$('#record-panel').hidden=false;for(const el of [$('#conversation'),$('.composer-area'),$('#usage-details')])el.inert=true;menuChat=null;renderSidebar();$('#record-text').focus();return;}
  if(action.dataset.action==='fork'){const copy=await api(`/api/chats/${id}/fork`,'POST',{});putChat(copy);choose(copy.id);}
  if(action.dataset.action==='stop'){await api(`/api/chats/${id}/stop`,'POST');menuChat=null;renderSidebar();}
  if(action.dataset.action==='delete'){deleteTarget=id;$('#delete-title').textContent=`Arhiviraj čet „${c.title}“ na 30 dana?`;$('#delete-family').hidden=!chats.some(x=>x.parentChatId===id);$('#delete-dialog').showModal();}
});
$('#chat-popover').onchange=e=>guard(async()=>{
  const model=e.target.closest('[data-chat-model]'),effort=e.target.closest('[data-chat-effort]');if(!model && !effort)return;
  const id=model?.dataset.chatModel || effort.dataset.chatEffort;
  const chat=await api(`/api/chats/${id}`,'PATCH',{settings:model?{model:model.value,effort:''}:{effort:effort.value}});putChat(chat);renderSidebar();
});
document.addEventListener('pointerdown',e=>{if(menuChat && !e.target.closest('#chat-popover,#chat-options,[data-row],[data-options],[data-chat],[data-agent-chat]')){menuChat=null;renderPopover();}});
function renderDefaults() {$('#default-agents').innerHTML=meta.agents.map(a=>{const s={agent:a.id,...defaults[a.id]};return `<div class="default-agent" data-default-agent="${a.id}"><img src="${agentLogos[a.id]}" alt="${escape(a.name)}" title="${escape(a.name)}" width="22" height="22"><select data-default-model aria-label="Podrazumevani model ${escape(a.name)}">${modelOptions(s)}</select><select data-default-effort aria-label="Podrazumevano razmišljanje ${escape(a.name)}" ${effortsFor(a.id,s.model).length?'':'disabled'}>${effortOptions(s)}</select></div>`;}).join('');}
function showDefaults(open) {document.body.classList.toggle('settings-view',open);if(open)refreshPhone();$('#defaults').hidden=!open;for(const el of [$('#conversation'),$('.composer-area'),$('#usage-details')])el.inert=open;if(open){closePanels();$('#defaults-close').focus();}else focusPrompt();}
$('#defaults-open').onclick=()=>guard(async()=>{const form=$('#defaults');if(!form.hidden){showDefaults(false);return;}const button=$('#defaults-open');button.disabled=true;try{[defaults,models,titleSettings,usageReport]=await Promise.all([api('/api/defaults'),api('/api/models'),phoneRemote?Promise.resolve(titleSettings):api('/api/title-settings'),api('/api/usage')]);renderDefaults();fillTitleSettings();renderProjectUsage();$('#response-colors').value=colorMode;$('#mobile-autofocus').checked=mobileAutofocus;menuChat=null;renderPopover();showDefaults(true);}finally{button.disabled=false;}});
$('#defaults-close').onclick=()=>showDefaults(false);
$('#default-agents').onchange=e=>{const row=e.target.closest('[data-default-agent]');if(!row || !e.target.matches('[data-default-model]'))return;const s={agent:row.dataset.defaultAgent,model:e.target.value,effort:''},select=row.querySelector('[data-default-effort]');select.innerHTML=effortOptions(s);select.disabled=!effortsFor(s.agent,s.model).length;};
$('#defaults-form').onsubmit=e=>{e.preventDefault();guard(async()=>{const next=Object.fromEntries([...$('#default-agents').querySelectorAll('[data-default-agent]')].map(row=>[row.dataset.defaultAgent,{model:row.querySelector('[data-default-model]').value,effort:row.querySelector('[data-default-effort]').value}]));if(!phoneRemote)await saveTitleSettings();defaults=await api('/api/defaults','PUT',next);mobileAutofocus=$('#mobile-autofocus').checked;localStorage.setItem('agent-desk-mobile-autofocus',mobileAutofocus?'1':'0');colorMode=$('#response-colors').value;localStorage.setItem('agent-desk-color-mode',colorMode);document.body.classList.toggle('colored-responses',colorMode==='full');showDefaults(false);});};
$('#conversation').onclick=e=>{const link=e.target.closest('[data-local-file]');if(link){e.preventDefault();guard(async()=>{if(phoneRemote){$('#local-file-frame').src=link.href;$('#local-file-dialog').showModal();}else await api('/api/open-file','POST',{path:link.dataset.localFile});});return;}guard(async()=>{const button=e.target.closest('[data-copy-code],[data-copy-message]');if(!button)return;const text=button.hasAttribute('data-copy-code')?button.closest('pre').querySelector('code').textContent:current()?.messages.find(m=>m.id===button.dataset.copyMessage)?.text;if(text===undefined)return;await navigator.clipboard.writeText(text);button.textContent='✓';button.title='Kopirano';setTimeout(()=>{if(button.isConnected){button.innerHTML=copyIcon;button.title='Kopiraj';}},1500);});};
$('#composer').onsubmit=e=>{e.preventDefault();guard(async()=>{
  const input=$('#prompt'),text=input.value.trim();if(!text || current()?.running || submitting || !connected)return;submitting=true;
  const files=[...(linkedFiles.get(active)||[])],requestId=crypto.randomUUID();input.value='';drafts.delete(active);linkedFiles.delete(active);renderLinkedFiles();resizePrompt();input.focus();
  let id=active;pendingMessages.set(id,{id:requestId,requestId,role:'user',text,status:'sending',createdAt:Date.now()});lastMessages='';render();
  try{if(!current()){const created=await create();if(!created)return;pendingMessages.delete(id);id=created.id;pendingMessages.set(id,{id:requestId,requestId,role:'user',text,status:'sending',createdAt:Date.now()});render();}newEmptyChats.delete(id);await api(`/api/chats/${id}/send`,'POST',{text,files,requestId});pendingMessages.delete(id);}
  catch(error){let accepted=false;try{if(id){const chat=await api(`/api/chats/${id}`);putChat(chat);accepted=chat.messages.some(m=>m.requestId===requestId);}}catch{}pendingMessages.delete(id);if(!accepted){if(id && !chats.find(c=>c.id===id)?.messages.length)newEmptyChats.add(id);const old=drafts.get(id)||'';drafts.set(id,text+(old?'\n'+old:''));linkedFiles.set(id,files);if(active===id){input.value=text+(input.value?'\n'+input.value:'');renderLinkedFiles();resizePrompt();}throw error;}}
  finally{submitting=false;lastMessages='';render();}
});};
function renderQueue() {
  const chat=current();
  $('#queue').innerHTML=(chat?.queue || []).map(m=>`<div class="queued-message"><span title="${escape(m.text)}">${escape(m.text)}</span><button type="button" data-unqueue="${m.id}" aria-label="Ukloni iz reda čekanja">×</button></div>`).join('')+((chat?.queuePaused || chat?.queueError) && chat?.queue?.length?`<button class="resume-queue" type="button" data-resume-queue>Nastavi red čekanja</button>${chat.queueError?`<div class="error">${escape(chat.queueError)}</div>`:''}`:'');
}
async function enqueueMessage() {
  const input=$('#prompt'),text=input.value.trim();if(!text || submitting || !connected)return;
  submitting=true;try {
    if(!current()){const created=await create();if(!created)return;}
    const id=active,chat=await api(`/api/chats/${id}/queue`,'POST',{text,files:linkedFiles.get(id)||[]});putChat(chat);
    if(active===id && input.value.trim()===text){input.value='';drafts.delete(id);linkedFiles.delete(id);renderLinkedFiles();resizePrompt();}
    render();input.focus();
  } finally {submitting=false;}
}
$('#queue').onclick=e=>guard(async()=>{
  if(!current())return;const remove=e.target.closest('[data-unqueue]');
  if(remove){const chat=await api(`/api/chats/${active}/queue/${remove.dataset.unqueue}`,'DELETE');putChat(chat);renderQueue();}
  if(e.target.closest('[data-resume-queue]')){const chat=await api(`/api/chats/${active}/queue/resume`,'POST',{});putChat(chat);render();}
});
$('#prompt').onkeydown=e=>{if(e.key==='Enter' && !e.isComposing && (e.metaKey || e.ctrlKey)){e.preventDefault();guard(enqueueMessage);}else if(e.key==='Enter' && !e.shiftKey && !e.isComposing){e.preventDefault();$('#composer').requestSubmit();}};
$('#prompt').oninput=resizePrompt;
window.addEventListener('resize',()=>{resizePrompt();positionPopover();});
window.addEventListener('focus',()=>{if(meta)render();});document.addEventListener('visibilitychange',()=>{if(meta)render();});
document.onkeydown=e=>{if($('#defaults').hidden && (e.metaKey || e.ctrlKey) && e.key.toLowerCase()==='k'){e.preventDefault();guard(()=>create());}if(e.key==='Escape'){closePanels();menuChat=null;if(!$('#defaults').hidden)showDefaults(false);renderPopover();}};
try {
  [meta,chats,defaults]=await Promise.all([api('/api/meta'),api('/api/chats'),api('/api/defaults')]);const linked=new URLSearchParams(location.hash.slice(1)).get('chat');if(linked && chats.some(c=>c.id===linked))active=linked;if(!current())active=null;else selectedAgent=current().settings.agent;
  document.body.classList.toggle('chat-view',!!linked && !!current());for(const c of chats)if(!Object.hasOwn(seen,c.id))markRead(c);
  if(mobileNavigation()){const entry=new URL(location.href);entry.hash='';history.replaceState({agentDesk:true},'',entry);history.pushState({agentDesk:true},'',linked && current()?location.origin+'/#chat='+encodeURIComponent(active):entry.href);}
  render();resizePrompt();refreshLimits();api('/api/models').then(value=>{models=value;lastMessages='';render();}).catch(()=>{});
  const events=new EventSource('/api/events');events.onmessage=e=>{const next=JSON.parse(e.data);notifyFinished(chats,next);chats=next;connected=true;if(active && !current())choose(null);else render();};events.onerror=()=>{connected=false;render();};
} catch(e){toast(`Aplikacija nije dostupna: ${e.message}`);}

function transferLabel(stats) {return `Prenos ≈ ${tokenRange(stats?.transfer)} tokena sa skraćivanjem · ${tokenRange(stats?.withoutShortening)} bez`;}
function renderTransfer(){const chat=current(),el=$('#transfer-preview');el.hidden=!chat || !chat.context?.transfer?.characters || !!chat.running;el.textContent=chat?transferLabel(chat.context):'';}

function closePanels(){$('#record-panel').hidden=true;for(const el of [$('#conversation'),$('.composer-area'),$('#usage-details')])el.inert=!$('#defaults').hidden;}
for(const button of document.querySelectorAll('[data-close-panel]'))button.onclick=closePanels;
window.addEventListener('hashchange',()=>{const id=new URLSearchParams(location.hash.slice(1)).get('chat');if(chats.some(c=>c.id===id))choose(id);});

const phoneRemote=!['127.0.0.1','localhost'].includes(location.hostname);
let phoneTimer;
async function refreshPhone(){
 clearTimeout(phoneTimer);
 $('.phone-settings').hidden=phoneRemote;$('.title-settings').hidden=phoneRemote;if(phoneRemote)return;
 try {const info=await api('/api/phone');$('#phone-status').textContent=info.origin?'Link važi još '+Math.max(0,Math.ceil((info.expiresAt-Date.now())/1000))+' s. Prijava traje '+info.sessionDays+' dana.':'Tailscale nije povezan.';
 $('#phone-address').hidden=!info.origin;$('#phone-address').textContent=info.origin || '';if(info.origin)$('#phone-address').href=info.origin;
 $('#phone-link').hidden=!info.url;$('#phone-link').value=info.url || '';$('#phone-qr').hidden=!info.url;
 if(info.url){const src='/api/phone/qr?v='+info.expiresAt;if($('#phone-qr').getAttribute('src')!==src)$('#phone-qr').src=src;}
 $('#phone-revoke').hidden=!info.origin;
 }catch(e){$('#phone-status').textContent=e.message;$('#phone-qr').hidden=true;$('#phone-link').hidden=true;$('#phone-address').hidden=true;}
 if(!$('#defaults').hidden)phoneTimer=setTimeout(refreshPhone,5000);
}
$('#phone-copy').onclick=()=>guard(async()=>{await navigator.clipboard.writeText($('#phone-link').value);toast('Link je kopiran.');});
$('#phone-revoke').onclick=()=>guard(async()=>{await api('/api/phone/revoke','POST',{});await refreshPhone();toast('Prijave telefona su odjavljene.');});

function limitDescription(id){const s=limits[id];if(!s)return 'Preostali limiti: '+(id==='grok'?'7 dana':'5 sati · 7 dana')+'; učitavam';return s.error || 'Preostalo: '+(id==='grok'?'7 dana':'5 sati · 7 dana')+(s.updatedAt?' · '+new Date(s.updatedAt).toLocaleTimeString('sr-Latn-RS'): '');}
function limitDisplay(id){const s=limits[id];const slot=key=>{const w=s?.windows?.find(w=>w.period===key);if(!w)return '<span class="limit-unknown">?</span>';const left=Math.max(0,Math.min(100,w.remaining));return `<span class="${left>65?'limit-good':left>=35?'limit-mid':'limit-low'}">${Math.round(left)}</span>`;};return id==='grok'?slot('weekly'):slot('fiveHour')+' '+slot('weekly');}
async function refreshLimits(){let wait=120000;try{const response=await api('/api/limits');limits=response.agents || {};if(response.loading)wait=5000;renderNewAgents();}catch{}setTimeout(refreshLimits,wait);}

let fileListing,deleteTarget;
function renderLinkedFiles(){const paths=linkedFiles.get(active)||[];$('#linked-files').innerHTML=paths.map((p,i)=>`<button type="button" data-remove-file="${i}" title="${escape(p)}">${escape(p.split('/').pop())} ×</button>`).join('');}
$('#linked-files').onclick=e=>{const b=e.target.closest('[data-remove-file]');if(!b)return;const paths=linkedFiles.get(active)||[];paths.splice(Number(b.dataset.removeFile),1);linkedFiles.set(active,paths);renderLinkedFiles();};
function linkFile(p){const paths=linkedFiles.get(active)||[];if(!paths.includes(p)){if(paths.length>=20)throw Error('Najviše 20 putanja.');paths.push(p);}linkedFiles.set(active,paths);renderLinkedFiles();}
let filePickerClosing=false,folderRequest=0,folderColumns=[];
async function browseFolder(p){const id=active,request=++folderRequest;const listing=await api(`/api/chats/${id}/files${p?'?path='+encodeURIComponent(p):'?place=home'}`);if(active!==id || request!==folderRequest)return;fileListing=listing;
 $('#folder-breadcrumbs').innerHTML=listing.crumbs.map((e,i)=>`<button type="button" data-folder-crumb="${i}" ${e.path===listing.path?'aria-current="location"':''}>${escape(e.name)}</button>`).join('<span aria-hidden="true">/</span>');
 folderColumns=advanceColumns(folderColumns,listing);renderFileColumns();}
function renderFileColumns(){const desktop=!mobileNavigation(),columns=desktop?folderColumns:[fileListing];$('#file-entries').classList.toggle('columns',desktop);$('#file-entries').innerHTML=columns.map(listing=>{const column=folderColumns.indexOf(listing),next=folderColumns[column+1]?.path;return `<section class="file-column" aria-label="${escape(listing.path)}">${desktop?`<small class="column-title">${escape(listing.crumbs.at(-1)?.name||'Home')}</small>`:''}${listing.entries.map((e,i)=>`<button type="button" class="file-card ${e.directory?'directory':'file'} ${next===e.path?'selected':''}" data-file-column="${column}" data-file-entry="${i}" aria-label="${e.directory?'Folder':'Fajl'}: ${escape(e.name)}">${escape(e.name)}</button>`).join('')}${listing.truncated?'<small>Prvih 500 stavki. Otvori uži folder.</small>':''}</section>`;}).join('');if(desktop)$('#file-entries').lastElementChild?.scrollIntoView({block:'nearest',inline:'end'});}

function closeFilePicker(){if(!$('#files-dialog').open || filePickerClosing)return;filePickerClosing=true;history.back();}
$('#files-open').onclick=()=>guard(async()=>{if(!current())await create();folderColumns=[];await browseFolder();filePickerClosing=false;$('#files-dialog').showModal();history.pushState({agentDesk:true,filePicker:true},'',location.href);});
$('#files-dialog').addEventListener('cancel',e=>{e.preventDefault();closeFilePicker();});
$('#folder-breadcrumbs').onclick=e=>guard(()=>{const b=e.target.closest('[data-folder-crumb]');if(b)return browseFolder(fileListing.crumbs[Number(b.dataset.folderCrumb)].path);});
$('#folder-select').onclick=()=>guard(()=>{linkFile(fileListing.path);closeFilePicker();});
$('#file-entries').onclick=e=>guard(async()=>{const b=e.target.closest('[data-file-entry]');if(!b || filePickerClosing)return;const entry=folderColumns[Number(b.dataset.fileColumn)].entries[Number(b.dataset.fileEntry)];if(entry.directory)await browseFolder(entry.path);else{linkFile(entry.path);closeFilePicker();}});
$('#delete-cancel').onclick=()=>$('#delete-dialog').close();
async function removeChat(children){const id=deleteTarget;const result=await api(`/api/chats/${id}${children?'?children=1':''}`,'DELETE');$('#delete-dialog').close();chats=await api('/api/chats');menuChat=null;if(result.deleted.includes(active)){if(mobileNavigation()){choose(null);showChatList();}else choose(chats[0]?.id||null);}else render();}
$('#delete-only').onclick=()=>guard(()=>removeChat(false));
$('#delete-family').onclick=()=>guard(()=>removeChat(true));


$('#local-file-close').onclick=()=>{$('#local-file-dialog').close();$('#local-file-frame').src='about:blank';};

async function renderArchive(){const records=await api('/api/archive');$('#archive-list').innerHTML=records.map(r=>`<div class="archive-row"><span>${r.chats.map(c=>escape(c.title)).join(' · ')}<small>Još ${Math.max(1,Math.ceil((r.expiresAt-Date.now())/86400000))} dana</small></span><button type="button" data-archive-restore="${r.id}" aria-label="Vrati iz arhive">${actionIcon('<path d="M9 10 4 15l5 5M4 15h12a4 4 0 0 0 4-4V4"/>')}</button></div>`).join('') || '<small>Arhiva je prazna.</small>';}
$('#archive-open').onclick=()=>guard(async()=>{const box=$('#archive-list');box.hidden=!box.hidden;if(!box.hidden)await renderArchive();});
$('#archive-list').onclick=e=>guard(async()=>{const b=e.target.closest('[data-archive-restore]');if(!b)return;await api(`/api/archive/${b.dataset.archiveRestore}/restore`,'POST',{});chats=await api('/api/chats');render();await renderArchive();});
function notifyFinished(previous,next){for(const c of next){if(!previous.find(p=>p.id===c.id)?.running || c.running)continue;const result=completion(c);if(!result)continue;const notice=document.createElement('button');notice.className='completion-notice';notice.textContent=c.title+' · '+({done:'Završeno',error:'Greška',stopped:'Zaustavljeno',interrupted:'Prekinuto'}[result.status]||'Završeno');notice.onclick=()=>{showDefaults(false);choose(c.id);notice.remove();};$('#completion-notices').append(notice);while($('#completion-notices').children.length>3)$('#completion-notices').firstElementChild.remove();setTimeout(()=>notice.remove(),8000);if('Notification' in window && Notification.permission==='granted' && (document.hidden || active!==c.id)){const n=new Notification('Agent Desk',{body:notice.textContent,tag:c.id});n.onclick=()=>{window.focus();choose(c.id);n.close();};}}}
$('#notifications-enable').onclick=()=>guard(async()=>{if(!('Notification' in window)){$('#notifications-status').textContent='Pregledač ne podržava obaveštenja.';return;}const permission=await Notification.requestPermission();$('#notifications-status').textContent=permission==='granted'?'Obaveštenja su uključena.':'Dozvola za obaveštenja nije uključena. Obaveštenja u aplikaciji ostaju.';});
