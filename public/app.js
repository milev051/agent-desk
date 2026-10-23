import {createContextInspector} from './context-inspector.mjs';
import {adaptiveChatGroups,adaptiveFolder,adaptiveFolderId} from './adaptive-chats.mjs';
import {createDispatcherPanel} from './dispatcher-panel.mjs';
import {createAdaptivePanel} from './adaptive-panel.mjs';
import {installVolumeZoom} from './volume-zoom.mjs';
import {createThoughtsPanel} from './thoughts-panel.mjs';
import {answerText} from './final-answer.mjs';
import {needsCacheConfirm,changeColumnHtml,lastTouchedMessage,touchedFiles,sameFile,fileState,fileParts,fileStamp,fileSize,changesLabel,diffPreviewHtml,githubDiffHtml,fileDiffStatsHtml,changedLinesHtml,messageChangeHtml} from './desk-modes.mjs';
import {createAndroidPrompt,observePromptChanges} from './prompt-editor.mjs';
import {createDraftHistory} from './draft-history.mjs';
import {startNotificationPresence} from './notification-presence.mjs';
import {noticeTone,chooseNoticeSound} from './notice-sound.mjs';
import {createCliUpdatesPanel} from './cli-updates.mjs';
import {createGmailSettings} from './gmail-settings.mjs';
import {patchMessages} from './message-patch.mjs';
import {mergeBrowserChats,mergeChatPage} from './chat-cache.mjs';
import {createChatSearch} from './chat-search.mjs';
import {folderContext} from './folder-context.mjs';
import {joinWavs} from '/wav.mjs';
import {preferredEffort} from './reasoning.mjs';
import {exportMessages,copiedMessage} from './sidebar-groups.mjs';
import {advanceColumns} from './folder-columns.mjs';
import {chatBlocked,unreadMark,folderAvatar} from './chat-preview.mjs';
import {folderPalette} from './folder-face.mjs';
import {compactCount,money} from './number-format.mjs';
import {shareLabel,chatShare} from './limit-share.mjs';
import { marked } from '/marked.js';
import {colorExtension} from './color-markup.mjs';
marked.use({extensions:[colorExtension]});
installVolumeZoom();
import { sidebarGroups, placedChats, mergeDraft, latestPart, lockedPart } from '/sidebar-groups.mjs';
import DOMPurify from '/purify.js';
import { createBootTracker, createRestartStatus } from './restart-notice.mjs';
import { handoffOffer, sessionMarkText, cacheStatus } from './handoff-advice.mjs';
import { getAgentColor } from './agent-icons.mjs';
const bootTracker = createBootTracker({ onRestart: ({ message }) => toast(message) });
const agentLogos = {"codex": "data:image/svg+xml;base64,PHN2ZyBjb2xvcj0iI2IzOGFmZiIgZmlsbD0iI2IzOGFmZiIgZmlsbC1ydWxlPSJldmVub2RkIiBoZWlnaHQ9IjFlbSIgc3R5bGU9ImZsZXg6bm9uZTtsaW5lLWhlaWdodDoxIiB2aWV3Qm94PSIwIDAgMjQgMjQiIHdpZHRoPSIxZW0iIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHRpdGxlPk9wZW5BSTwvdGl0bGU+PHBhdGggZD0iTTkuMjA1IDguNjU4di0yLjI2YzAtLjE5LjA3Mi0uMzMzLjIzOC0uNDI4bDQuNTQzLTIuNjE2Yy42MTktLjM1NyAxLjM1Ni0uNTIzIDIuMTE3LS41MjMgMi44NTQgMCA0LjY2MiAyLjIxMiA0LjY2MiA0LjU2NiAwIC4xNjcgMCAuMzU3LS4wMjQuNTQ3bC00LjcxLTIuNzU5YS43OTcuNzk3IDAgMDAtLjg1NiAwbC01Ljk3IDMuNDczem0xMC42MDkgOC44VjEyLjA2YzAtLjMzMy0uMTQzLS41Ny0uNDI5LS43MzdsLTUuOTctMy40NzMgMS45NS0xLjExOGEuNDMzLjQzMyAwIDAxLjQ3NiAwbDQuNTQzIDIuNjE3YzEuMzA5Ljc2IDIuMTg5IDIuMzc4IDIuMTg5IDMuOTQ4IDAgMS44MDgtMS4wNyAzLjQ3My0yLjc2IDQuMTYzek03LjgwMiAxMi43MDNsLTEuOTUtMS4xNDJjLS4xNjctLjA5NS0uMjM5LS4yMzgtLjIzOS0uNDI4VjUuODk5YzAtMi41NDUgMS45NS00LjQ3MiA0LjU5MS00LjQ3MiAxIDAgMS45MjcuMzMzIDIuNzEyLjkyOEw4LjIzIDUuMDY3Yy0uMjg1LjE2Ni0uNDI4LjQwNC0uNDI4LjczN3Y2Ljg5OHpNMTIgMTUuMTI4bC0yLjc5NS0xLjU3di0zLjMzTDEyIDguNjU4bDIuNzk1IDEuNTd2My4zM0wxMiAxNS4xMjh6bTEuNzk2IDcuMjNjLTEgMC0xLjkyNy0uMzMyLTIuNzEyLS45MjdsNC42ODYtMi43MTJjLjI4NS0uMTY2LjQyOC0uNDA0LjQyOC0uNzM3di02Ljg5OGwxLjk3NCAxLjE0MmMuMTY3LjA5NS4yMzguMjM4LjIzOC40Mjh2NS4yMzNjMCAyLjU0NS0xLjk3NCA0LjQ3Mi00LjYxNCA0LjQ3MnptLTUuNjM3LTUuMzAzbC00LjU0NC0yLjYxN2MtMS4zMDgtLjc2MS0yLjE4OC0yLjM3OC0yLjE4OC0zLjk0OEE0LjQ4MiA0LjQ4MiAwIDAxNC4yMSA2LjMyN3Y1LjQyM2MwIC4zMzMuMTQzLjU3MS40MjguNzM4bDUuOTQ3IDMuNDQ5LTEuOTUgMS4xMThhLjQzMi40MzIgMCAwMS0uNDc2IDB6bS0uMjYyIDMuOWMtMi42ODggMC00LjY2Mi0yLjAyMS00LjY2Mi00LjUxOSAwLS4xOS4wMjQtLjM4LjA0Ny0uNTdsNC42ODYgMi43MWMuMjg2LjE2Ny41NzEuMTY3Ljg1NiAwbDUuOTctMy40NDh2Mi4yNmMwIC4xOS0uMDcuMzMzLS4yMzcuNDI4bC00LjU0MyAyLjYxNmMtLjYxOS4zNTctMS4zNTYuNTIzLTIuMTE3LjUyM3ptNS44OTkgMi44M2E1Ljk0NyA1Ljk0NyAwIDAwNS44MjctNC43NTZDMjIuMjg3IDE4LjMzOSAyNCAxNS44NCAyNCAxMy4yOTZjMC0xLjY2NS0uNzEzLTMuMjgyLTEuOTk4LTQuNDQ4LjExOS0uNS4xOS0uOTk5LjE5LTEuNDk4IDAtMy40MDEtMi43NTktNS45NDctNS45NDYtNS45NDctLjY0MiAwLTEuMjYuMDk1LTEuODguMzFBNS45NjIgNS45NjIgMCAwMDEwLjIwNSAwYTUuOTQ3IDUuOTQ3IDAgMDAtNS44MjcgNC43NTdDMS43MTMgNS40NDcgMCA3Ljk0NSAwIDEwLjQ5YzAgMS42NjYuNzEzIDMuMjgzIDEuOTk4IDQuNDQ4LS4xMTkuNS0uMTkgMS0uMTkgMS40OTkgMCAzLjQwMSAyLjc1OSA1Ljk0NiA1Ljk0NiA1Ljk0Ni42NDIgMCAxLjI2LS4wOTUgMS44OC0uMzA5YTUuOTYgNS45NiAwIDAwNC4xNjIgMS43MTN6Ij48L3BhdGg+PC9zdmc+", "claude": "data:image/svg+xml;base64,PHN2ZyBjb2xvcj0iI2VmOTM1NCIgZmlsbD0iI2VmOTM1NCIgZmlsbC1ydWxlPSJldmVub2RkIiBoZWlnaHQ9IjFlbSIgc3R5bGU9ImZsZXg6bm9uZTtsaW5lLWhlaWdodDoxIiB2aWV3Qm94PSIwIDAgMjQgMjQiIHdpZHRoPSIxZW0iIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHRpdGxlPkNsYXVkZTwvdGl0bGU+PHBhdGggZD0iTTQuNzA5IDE1Ljk1NWw0LjcyLTIuNjQ3LjA4LS4yMy0uMDgtLjEyOEg5LjJsLS43OS0uMDQ4LTIuNjk4LS4wNzMtMi4zMzktLjA5Ny0yLjI2Ni0uMTIyLS41NzEtLjEyMUwwIDExLjc4NGwuMDU1LS4zNTIuNDgtLjMyMS42ODYuMDYgMS41Mi4xMDMgMi4yNzguMTU4IDEuNjUyLjA5NyAyLjQ0OS4yNTVoLjM4OWwuMDU1LS4xNTctLjEzNC0uMDk4LS4xMDMtLjA5Ny0yLjM1OC0xLjU5Ni0yLjU1Mi0xLjY4OC0xLjMzNi0uOTcyLS43MjQtLjQ5MS0uMzY0LS40NjItLjE1OC0xLjAwOC42NTYtLjcyMi44ODEuMDYuMjI1LjA2MS44OTMuNjg2IDEuOTA4IDEuNDc2IDIuNDkxIDEuODMzLjM2NS4zMDQuMTQ1LS4xMDMuMDE5LS4wNzMtLjE2NC0uMjc0LTEuMzU1LTIuNDQ2LTEuNDQ2LTIuNDktLjY0NC0xLjAzMi0uMTctLjYxOWEyLjk3IDIuOTcgMCAwMS0uMTA0LS43MjlMNi4yODMuMTM0IDYuNjk2IDBsLjk5Ni4xMzQuNDIuMzY0LjYyIDEuNDE0IDEuMDAyIDIuMjI5IDEuNTU1IDMuMDMuNDU2Ljg5OC4yNDMuODMyLjA5MS4yNTVoLjE1OFY5LjAxbC4xMjgtMS43MDYuMjM3LTIuMDk1LjIzLTIuNjk1LjA4LS43Ni4zNzYtLjkxLjc0Ny0uNDkyLjU4NC4yOC40OC42ODUtLjA2Ny40NDQtLjI4NiAxLjg1MS0uNTU5IDIuOTAzLS4zNjQgMS45NDJoLjIxMmwuMjQzLS4yNDIuOTg1LTEuMzA2IDEuNjUyLTIuMDY0LjczLS44Mi44NS0uOTA0LjU0Ny0uNDMxaDEuMDMzbC43NiAxLjEyOS0uMzQgMS4xNjYtMS4wNjQgMS4zNDctLjg4MSAxLjE0Mi0xLjI2NCAxLjctLjc5IDEuMzYuMDczLjExLjE4OC0uMDIgMi44NTYtLjYwNiAxLjU0My0uMjggMS44NDEtLjMxNS44MzMuMzg4LjA5MS4zOTUtLjMyOC44MDctMS45NjkuNDg2LTIuMzA5LjQ2Mi0zLjQzOS44MTMtLjA0Mi4wMy4wNDkuMDYxIDEuNTQ5LjE0Ni42NjIuMDM2aDEuNjIybDMuMDIuMjI1Ljc5LjUyMi40NzQuNjM4LS4wNzkuNDg1LTEuMjE1LjYyLTEuNjQtLjM4OS0zLjgyOS0uOTEtMS4zMTItLjMyOWgtLjE4MnYuMTFsMS4wOTMgMS4wNjggMi4wMDYgMS44MSAyLjUwOSAyLjMzLjEyNy41NzgtLjMyMi40NTUtLjM0LS4wNDktMi4yMDUtMS42NTctLjg1MS0uNzQ3LTEuOTI2LTEuNjJoLS4xMjh2LjE3bC40NDQuNjQ5IDIuMzQ1IDMuNTIxLjEyMiAxLjA4LS4xNy4zNTMtLjYwOC4yMTMtLjY2OC0uMTIyLTEuMzc0LTEuOTI1LTEuNDE1LTIuMTY3LTEuMTQzLTEuOTQzLS4xNC4wOC0uNjc0IDcuMjU0LS4zMTYuMzctLjcyOS4yOC0uNjA3LS40NjEtLjMyMi0uNzQ3LjMyMi0xLjQ3Ni4zODktMS45MjQuMzE1LTEuNTMuMjg2LTEuOS4xNy0uNjMyLS4wMTItLjA0Mi0uMTQuMDE4LTEuNDM0IDEuOTY3LTIuMTggMi45NDUtMS43MjYgMS44NDUtLjQxNC4xNjQtLjcxNy0uMzcuMDY3LS42NjIuNDAxLS41ODkgMi4zODgtMy4wMzYgMS40NC0xLjg4Mi45My0xLjA4Ni0uMDA2LS4xNThoLS4wNTVMNC4xMzIgMTguNTZsLTEuMTMuMTQ2LS40ODctLjQ1Ni4wNjEtLjc0Ni4yMzEtLjI0MyAxLjkwOC0xLjMxMi0uMDA2LjAwNnoiPjwvcGF0aD48L3N2Zz4=", "grok": "data:image/svg+xml;base64,PHN2ZyBjb2xvcj0iI2ZmZmZmZiIgZmlsbD0iI2ZmZmZmZiIgZmlsbC1ydWxlPSJldmVub2RkIiBoZWlnaHQ9IjFlbSIgc3R5bGU9ImZsZXg6bm9uZTtsaW5lLWhlaWdodDoxIiB2aWV3Qm94PSIwIDAgMjQgMjQiIHdpZHRoPSIxZW0iIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHRpdGxlPkdyb2s8L3RpdGxlPjxwYXRoIGQ9Ik05LjI3IDE1LjI5bDcuOTc4LTUuODk3Yy4zOTEtLjI5Ljk1LS4xNzcgMS4xMzcuMjcyLjk4IDIuMzY5LjU0MiA1LjIxNS0xLjQxIDcuMTY5LTEuOTUxIDEuOTU0LTQuNjY3IDIuMzgyLTcuMTQ5IDEuNDA2bC0yLjcxMSAxLjI1N2MzLjg4OSAyLjY2MSA4LjYxMSAyLjAwMyAxMS41NjItLjk1MyAyLjM0MS0yLjM0NCAzLjA2Ni01LjUzOSAyLjM4OC04LjQybC4wMDYuMDA3Yy0uOTgzLTQuMjMyLjI0Mi01LjkyNCAyLjc1LTkuMzgzLjA2LS4wODIuMTItLjE2NC4xNzktLjI0OGwtMy4zMDEgMy4zMDV2LS4wMUw5LjI2NyAxNS4yOTJNNy42MjMgMTYuNzIzYy0yLjc5Mi0yLjY3LTIuMzEtNi44MDEuMDcxLTkuMTg0IDEuNzYxLTEuNzYzIDQuNjQ3LTIuNDgzIDcuMTY2LTEuNDI1bDIuNzA1LTEuMjVhNy44MDggNy44MDggMCAwMC0xLjgyOS0xQTguOTc1IDguOTc1IDAgMDA1Ljk4NCA1LjgzYy0yLjUzMyAyLjUzNi0zLjMzIDYuNDM2LTEuOTYyIDkuNzY0IDEuMDIyIDIuNDg3LS42NTMgNC4yNDYtMi4zNCA2LjAyMi0uNTk5LjYzLTEuMTk5IDEuMjU5LTEuNjgyIDEuOTI1bDcuNjItNi44MTUiPjwvcGF0aD48L3N2Zz4=", "antigravity": "data:image/svg+xml;base64,PHN2ZyBjb2xvcj0iIzZhYWVmZiIgZmlsbD0iIzZhYWVmZiIgZmlsbC1ydWxlPSJldmVub2RkIiBoZWlnaHQ9IjFlbSIgc3R5bGU9ImZsZXg6bm9uZTtsaW5lLWhlaWdodDoxIiB2aWV3Qm94PSIwIDAgMjQgMjQiIHdpZHRoPSIxZW0iIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHRpdGxlPkFudGlncmF2aXR5PC90aXRsZT48cGF0aCBkPSJNMjEuNzUxIDIyLjYwN2MxLjM0IDEuMDA1IDMuMzUuMzM1IDEuNTA4LTEuNTA4QzE3LjczIDE1Ljc0IDE4LjkwNCAxIDEyLjAzNyAxIDUuMTcgMSA2LjM0MiAxNS43NC44MTUgMjEuMWMtMi4wMSAyLjAwOS4xNjcgMi41MTEgMS41MDcgMS41MDYgNS4xOTItMy41MTcgNC44NTctOS43MTQgOS43MTUtOS43MTQgNC44NTcgMCA0LjUyMiA2LjE5NyA5LjcxNCA5LjcxNXoiPjwvcGF0aD48L3N2Zz4="};
const $ = s => document.querySelector(s);
const chatSearch=createChatSearch({view:$('#conversation'),panel:$('#chat-search'),input:$('#chat-search-input'),count:$('#chat-search-count')});
// One toolbar moves between the sidebar and the persistent phone header.
const agentToolbar=$('.sidebar-actions'),mobileHeader=$('#mobile-agent-header'),mobileLayout=matchMedia('(max-width:650px)');
function placeAgentToolbar(){if(mobileLayout.matches)mobileHeader.append(agentToolbar,$('#model-library'));else{const sidebar=$('.sidebar');sidebar.prepend(agentToolbar);agentToolbar.after($('#model-library'));}}
mobileLayout.addEventListener('change',placeAgentToolbar);placeAgentToolbar();

// Tastatura na telefonu smanjuje vidljivi deo. Aplikacija staje u taj prozor, a čet se podiže da tekst ne ostane ispod nje.
let lastViewportHeight=window.visualViewport?.height || window.innerHeight;
function revealAboveComposer(extra=0){const view=$('#conversation');if(!view || !matchMedia('(max-width:650px)').matches)return;const nearBottom=view.scrollHeight-view.scrollTop-view.clientHeight<90;requestAnimationFrame(()=>{if(nearBottom)view.scrollTop=view.scrollHeight;else if(extra>0)view.scrollTop+=extra;});}
const fitViewport=()=>{const vv=window.visualViewport;if(!vv)return;const covered=lastViewportHeight-vv.height;lastViewportHeight=vv.height;document.documentElement.style.setProperty('--app-height',vv.height+'px');document.documentElement.style.setProperty('--vv-top',vv.offsetTop+'px');if(covered>40)revealAboveComposer(covered);};
window.visualViewport?.addEventListener('resize',fitViewport);window.visualViewport?.addEventListener('scroll',fitViewport);fitViewport();
let events, defaults = {}, models = {}, meta, chats = [], active = localStorage.getItem('agent-desk-active'), selectedAgent = 'codex', menuChat = null, menuFolder = null, lastMessages = '', connected = true, appReady = false, sawEvents = false;
const phoneRemote=!['127.0.0.1','localhost'].includes(location.hostname);
createAndroidPrompt($('#prompt'));
startNotificationPresence({phoneRemote});
let speechClip=null,speechAbort=null,speechSeeking=false,speechSelection=null;
const speechAudio=new Audio();
speechAudio.id='speech-audio';
speechAudio.preload='auto';
document.body.append(speechAudio);
let titleSettings={};
let mobileAutofocus=localStorage.getItem('agent-desk-mobile-autofocus')==='1';
const linkedFiles=new Map();
// Prikaz toka je lokalna postavka po četu; ne menja sačuvane poruke.
const progressVisible=new Set();
try{const saved=JSON.parse(localStorage.getItem('agent-desk-progress-visible')||'[]');if(Array.isArray(saved))for(const id of saved)if(typeof id==='string')progressVisible.add(id);}catch{}

const pendingMessages=new Map(),historyCounts=new Map();
let promptFocusHold=0;
function focusPrompt({force=false}={}){
 const input=$('#prompt');
 if(!force && promptFocusHold>Date.now())return;
 if(!appReady || !current() || document.hidden || !$('#defaults').hidden || input.closest('[inert]') || document.querySelector('dialog[open]') || chatSearch.isOpen() || menuChat || menuFolder || folderRename || messageSelectionMode)return;
 if(mobileNavigation() && (!document.body.classList.contains('chat-view') || (!force && !mobileAutofocus)))return;
 if(!force && ((document.activeElement?.matches('input,textarea,select,[contenteditable="true"]') && document.activeElement.getClientRects().length) || !window.getSelection()?.isCollapsed))return;
 input.focus({preventScroll:true});
}
let rename = null, creating = false, submitting = false, uploading = false, clickTimer, holdTimer, holdStart, held = false, suppressClickUntil=0;
const selectedMessages=new Set();
let messageSelectionMode=false,selectionAnchor=null;
const drafts = new Map(), generatingTitles = new Set(), generatingFolderIcons = new Set();
const draftDirty=new Map(),draftServer=new Map(),draftSaving=new Set();let draftTimer,draftSaveWarningShown=false;
try{for(const [id,value] of JSON.parse(localStorage.getItem('agent-desk-drafts')||'[]')){draftDirty.set(id,value);drafts.set(id,value.text);}}catch{}
function persistDrafts(){try{localStorage.setItem('agent-desk-drafts',JSON.stringify([...draftDirty]));}catch{}}
function recordDraft(id,text){
 if(!id){drafts.set(id,text);return;}
 const before=draftDirty.get(id),base=draftServer.get(id) || chats.find(c=>c.id===id)?.draft || {text:'',revision:0};
 drafts.set(id,text);draftDirty.set(id,{text,revision:before?.revision??base.revision,base:before?.base??base.text});persistDrafts();
 clearTimeout(draftTimer);draftTimer=setTimeout(flushDrafts,500);if(meta)renderSidebar();
}
// Tekst koji je u polje stigao bez input događaja (Pristupačnost, vraćanje strane) je nacrt, ne sme da ga pregazi server.
let promptReady=false;
function adoptPrompt(){if(!promptReady || !active || $('#prompt').value===(drafts.get(active)||''))return;recordDraft(active,$('#prompt').value);}
function receiveDrafts(){
 adoptPrompt();
 for(const chat of chats){const received=chat.draft || {text:'',revision:0},known=draftServer.get(chat.id),remote=known?.revision>received.revision?known:received;draftServer.set(chat.id,remote);if(draftDirty.has(chat.id))continue;drafts.set(chat.id,remote.text);if(active===chat.id && $('#prompt').value!==remote.text){$('#prompt').value=remote.text;resizePrompt();}}
}
async function flushDrafts(){adoptPrompt();for(const id of draftDirty.keys())void saveDraft(id);}
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
window.addEventListener('pagehide',()=>{adoptPrompt();keepDraftOnExit();if(active)void discardEmptyChat(active,{closing:true});});
document.addEventListener('visibilitychange',()=>{if(document.hidden)keepDraftOnExit();else void flushDrafts();});

const escape = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const current = () => chats.find(c => c.id === active);
const agentName = id => meta.agents.find(a => a.id === id)?.name || id;
// Potvrde radnji su tihe; greške ostaju u toku stranice, bez popupa.
function toast(message,tone='info') { const status=$('#action-status'); if(!status)return; status.textContent=tone==='error'?message:''; status.hidden=!status.textContent; }
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
async function guard(fn) {try {await fn();} catch(e) {toast(e.message,'error');}}
function localFileHref(value){try{const u=new URL(value,location.href);if(u.protocol==='file:')return decodeURIComponent(u.pathname);if(/^\/(Users|Volumes)\//.test(u.pathname) && (u.origin===location.origin||['127.0.0.1','localhost'].includes(u.hostname)))return decodeURIComponent(u.pathname);}catch{}return null;}
function visibleMessage(text){const mark='Povezane putanje na računaru (pročitaj po potrebi):';const i=String(text||'').indexOf(mark);return i<0?text||'':text.slice(0,i).trim();}
function messageHtml(message,chat){return markdown(visibleMessage(answerText(message,{includeProgress:progressVisible.has(chat?.id)})));}
function markdown(text) {
  text=(text||'').replace(/\]\((file:\/\/[^)]+)\)/g,(match,p)=>{try{return '](/files'+new URL(p).pathname+')';}catch{return match;}});
  const html=DOMPurify.sanitize(marked.parse(text || '',{gfm:true,breaks:true}),{ALLOWED_TAGS:['span','p','br','strong','em','del','code','pre','blockquote','ul','ol','li','h1','h2','h3','h4','h5','h6','hr','a','table','thead','tbody','tr','th','td'],ALLOWED_ATTR:['href','title','align','start','class'],ALLOW_DATA_ATTR:false});
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
const shareIcon=actionIcon('<path d="M10 13a5 5 0 0 0 7.5.5l2-2a5 5 0 0 0-7-7l-1.2 1.2"/><path d="M14 11a5 5 0 0 0-7.5-.5l-2 2a5 5 0 0 0 7 7l1.2-1.2"/>');
const recordIcon=actionIcon('<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6M8 13h8M8 17h8"/>');
let seen={};try {seen=JSON.parse(localStorage.getItem('agent-desk-seen') || '{}');} catch {}
const syncedReads=new Map(),readRequests=new Set();
let folders=[],openFolders=new Set(),folderRename=null,place=null;
try{
 const saved=localStorage.getItem('agent-desk-open-folders');
 const ids=saved===null?[localStorage.getItem('agent-desk-folder')]:JSON.parse(saved);
 if(Array.isArray(ids))openFolders=new Set(ids.filter(id=>typeof id==='string' && id));
}catch{}
createCliUpdatesPanel({api});
function completion(chat) {const m=chat.latestReply || [...chat.messages].reverse().find(m=>m.role==='assistant');return m && ['done','stopped','error','interrupted'].includes(m.status) ? {token:`${m.id}:${m.status}`,messageId:m.id,status:m.status} : null;}
async function sendNotificationRead(data){
 try{
  const worker=navigator.serviceWorker?.controller || (await navigator.serviceWorker?.getRegistration())?.active;
  worker?.postMessage({type:'read',...data});
 }catch{}
}
function clearReadNotifications(chat) {
 if(!chat.readMessageId && !chat.notificationReadAt)return;
 const message=chat.messages?.find(m=>m.id===chat.readMessageId) || (chat.latestReply?.id===chat.readMessageId ? chat.latestReply : null);
 void sendNotificationRead({chatId:chat.id,messageId:chat.readMessageId,readBefore:message?.createdAt,notificationsBefore:chat.notificationReadAt});
}
function recordChatAccess(chat){
 if(!chat)return;
 document.querySelectorAll(`#completion-notices [data-notice-chat="${CSS.escape(chat.id)}"]`).forEach(el=>el.remove());
 syncNoticeLayer();
 void sendNotificationRead({chatId:chat.id,all:true});
 api(`/api/chats/${chat.id}/access`,'POST',{requestId:crypto.randomUUID()}).then(data=>{const currentChat=chats.find(c=>c.id===chat.id);if(currentChat){currentChat.notificationReadAt=Math.max(currentChat.notificationReadAt || 0,data.notificationReadAt || 0);clearReadNotifications(currentChat);}}).catch(()=>{});
}
navigator.serviceWorker?.addEventListener('controllerchange',()=>{for(const chat of chats)clearReadNotifications(chat);});
function markRead(chat,sync=true) {const c=chat && completion(chat);if(!c)return;if(seen[chat.id]!==c.token){seen[chat.id]=c.token;localStorage.setItem('agent-desk-seen',JSON.stringify(seen));}if(!sync || chat.readMessageId===c.messageId || syncedReads.get(chat.id)===c.messageId || readRequests.has(chat.id))return;readRequests.add(chat.id);api(`/api/chats/${chat.id}/read`,'PUT',{messageId:c.messageId}).then(data=>{syncedReads.set(chat.id,data.messageId);chat.readMessageId=data.messageId;clearReadNotifications(chat);}).catch(()=>{}).finally(()=>readRequests.delete(chat.id));}
function notification(chat) {const c=completion(chat);if(chat.running || !c || (seen[chat.id]===c.token || chat.readMessageId===c.messageId || syncedReads.get(chat.id)===c.messageId))return '';return c.status==='done'?'completed':'unread';}
function promptTextHeight(input) {
  // Skupljanje na 0 pa čitanje scrollHeight na polju van fokusa vraća visinu jednog reda.
  // Glasovni unos upisuje tekst baš tada, pa se polje ne proširi.
  const width=input.clientWidth;
  if(!width)return input.scrollHeight || 0;
  const style=getComputedStyle(input),mirror=document.createElement('div');
  mirror.setAttribute('aria-hidden','true');
  mirror.style.cssText=`position:fixed;left:0;top:0;visibility:hidden;pointer-events:none;box-sizing:border-box;width:${width}px;height:auto;min-height:0;max-height:none;padding:${style.paddingTop} ${style.paddingRight} ${style.paddingBottom} ${style.paddingLeft};border:0;font:${style.font};line-height:${style.lineHeight};letter-spacing:${style.letterSpacing};white-space:pre-wrap;overflow-wrap:anywhere;word-break:break-word`;
  const value=input.value || '';
  mirror.textContent=value?(value.endsWith('\n')?value+'\u200b':value):'\u200b';
  document.body.append(mirror);
  const height=mirror.offsetHeight;
  mirror.remove();
  return height;
}
function resizePrompt() {
  const input=$('#prompt'),view=$('#conversation'),wrap=input.closest('.prompt-wrap');
  const before=view?view.scrollHeight-view.scrollTop-view.clientHeight:0;
  const saved=view?view.scrollTop:0,prevClient=view?view.clientHeight:0;
  const stickHeight=44;
  const wrapStyle=wrap?getComputedStyle(wrap):null;
  const chrome=wrap && wrapStyle?wrap.offsetHeight-wrap.clientHeight+parseFloat(wrapStyle.paddingTop)+parseFloat(wrapStyle.paddingBottom):0;
  const floor=Math.max(22,stickHeight-chrome);
  const viewport=window.visualViewport?.height || window.innerHeight;
  const phoneLines=22*7+20;
  const limit=matchMedia('(max-width:650px)').matches?phoneLines:Math.max(floor,Math.round(viewport-96));
  input.style.overflowY='hidden';
  const needed=Math.max(promptTextHeight(input),floor),next=Math.min(needed,limit);
  input.style.height=next+'px';input.style.overflowY=needed>next+1?'auto':'hidden';
  if(!view)return;
  if(matchMedia('(max-width:650px)').matches){if(before<90)view.scrollTop=view.scrollHeight;else view.scrollTop=saved+Math.max(0,prevClient-view.clientHeight);}
  else view.scrollTop=before<8?view.scrollHeight:saved;
}

// Keep the actual route taken, including opening a child directly from the list.
const chatNavigation=[];
function rememberChatView(){
  chatNavigation.push({chatId:document.body.classList.contains('chat-view')?active:null,folders:[...openFolders],scroll:$('#chats').scrollTop});
  if(chatNavigation.length>50)chatNavigation.shift();
}
async function discardEmptyChat(id,{closing=false}={}) {
 const chat=chats.find(c=>c.id===id);
 if(!chat?.discardOnLeave || chat.keepEmpty || chat.running || chat.messageCount || chat.messages?.length || chat.parentChatId || chat.titleManual || chat.queue?.length || chats.some(c=>c.parentChatId===id) || pendingMessages.has(id) || uploading || submitting || (drafts.get(id)||'').trim() || (draftDirty.get(id)?.text||'').trim() || chat.draft?.text?.trim() || (linkedFiles.get(id)||[]).length || (active===id && $('#prompt').value.trim()))return;
 try{
  const response=await fetch(`/api/chats/${id}/discard-empty`,{method:'POST',headers:{'Content-Type':'application/json'},body:'{}',keepalive:closing});
  if(!response.ok || !(await response.json()).deleted)return;
  chats=chats.filter(c=>c.id!==id);drafts.delete(id);draftDirty.delete(id);draftServer.delete(id);persistDrafts();
  if(active===id){active=null;localStorage.removeItem('agent-desk-active');document.body.classList.remove('chat-view');}
  render();
 }catch{} // Bez mreže čet ostaje sačuvan; ne briše se lokalno naslepo.
}
function choose(id,{replaceHistory=false}={}) {
  const leaving=active!==id?active:null;
  if(!replaceHistory && (active!==id || (!!id!==document.body.classList.contains('chat-view'))))rememberChatView();
  if(active && draftDirty.has(active))void saveDraft(active);
  receiveDrafts();
  const changed=active!==id;
  if(active!==id){selectedMessages.clear();messageSelectionMode=false;selectionAnchor=null;renderMessageSelection();}
  showDefaults(false);document.body.classList.toggle('chat-view',!!id);
  speechSelection=null;clearTimeout(clickTimer);drafts.set(active,$('#prompt').value);active=id;$('#prompt').value=drafts.get(id)||'';resizePrompt();draftHistory.refresh();
  const url=new URL(location.href);if(id)url.hash='chat='+encodeURIComponent(id);else url.hash='';if(mobileNavigation() && changed && id && !replaceHistory)history.pushState({agentDesk:true,agentDeskGuard:true,chatId:id},'',url);else history.replaceState(history.state,'',url);
  closePanels();
  if(speechClip && speechClip.chatId!==id)speechAudio.pause();
  if(id)localStorage.setItem('agent-desk-active',id);else localStorage.removeItem('agent-desk-active');
  if(id)document.querySelector(`#completion-notices [data-notice-chat="${CSS.escape(id)}"]`)?.remove();
  syncNoticeLayer();
  if(current()){selectedAgent=current().settings.agent;markRead(current());recordChatAccess(current());}
  chatSearch.close();menuChat=null;rename=null;lastMessages='';forceBottom=!!id;render();renderSpeechBar();renderLinkedFiles();if(id)focusPrompt({force:true});if(id)guard(()=>loadChatHistory(id));if(appReady)connectEvents();if(leaving)void discardEmptyChat(leaving);
}
function mergeChatList(list){return list.map(chat=>{const old=chats.find(c=>c.id===chat.id);return chat.summary?{...old,...chat,messages:old?.messages || []}:chat;});}
function putChat(chat){
 const old=chats.find(c=>c.id===chat.id);
 if(chat.summary)chat={...old,...chat,messages:old?.messages || []};
 else if(chat.historyPage)chat=mergeChatPage(old,chat);
 else chat={...chat,_loaded:true,_historyPage:{hasMore:false,total:chat.messages.length}};
 if(old)chats=chats.map(c=>c.id===chat.id?chat:c);else chats.unshift(chat);
}
const loadingHistories=new Map();
async function loadChatHistory(id,{older=false,full=false}={}){
 if(!id)return;
 if(loadingHistories.has(id)){await loadingHistories.get(id);if(!full)return;}
 const before=older?chats.find(c=>c.id===id)?.messages[0]?.id:null;
 const url=`/api/chats/${id}`+(full?'':`?limit=50${before?'&before='+encodeURIComponent(before):''}`);
 const work=(async()=>{
  const page=await api(url);putChat(page);const chat=chats.find(c=>c.id===id);if(chat)chat._needsHistory=false;
  if(appReady && active===id){lastMessages='';if(!older && !full && !chatSearch.isOpen())forceBottom=true;render();}
 })();loadingHistories.set(id,work);
 try{await work;}finally{loadingHistories.delete(id);}
}
async function loadFullChat(id){await loadChatHistory(id,{full:true});return chats.find(c=>c.id===id);}
async function openChatSearch(){if(!current())return;cancelStick();await loadFullChat(active);chatSearch.open();}

async function create(agent=selectedAgent,model,effort='') {
  if(creating)return;creating=true;
  try {
    const settings={agent,...(model!==undefined?{model,effort}:{})};const chat=await api('/api/chats','POST',{settings});
    putChat(chat);setOpenFolder(null);choose(chat.id);return chat;
  } finally {creating=false;}
}
function modelLabel(chat) {
  const last=chat.sessions[chat.settings.agent] && (chat.latestReply?.agent===chat.settings.agent?chat.latestReply:[...chat.messages].reverse().find(m=>m.agent===chat.settings.agent));
  const id=chat.settings.model || (last?.configuredModel===chat.settings.model ? last.model : '');
  return id ? modelName(chat.settings.agent,id) : 'Podrazumevani CLI model';
}
const agentOrder=['codex','claude','antigravity','grok'];
let limits={},lastNewAgents='';
function renderNewAgents() {const settings=$('#defaults-open');const html=agentOrder.map(id=>meta.agents.find(a=>a.id===id)).filter(Boolean).map(a=>{const s=limits[a.id],depleted=s?.windows?.length?s.windows.some(w=>Math.round(w.remaining)<=0):false,unavailable=!a.available||depleted;return `<button class="new-agent ${newMenuAgent===a.id?'expanded':''} ${unavailable?'unavailable':''}" data-new-agent="${a.id}" title="Modeli · ${escape(a.name)}" aria-label="Modeli · ${escape(a.name)}" aria-expanded="${newMenuAgent===a.id}" ${!a.available?'disabled':''}><small class="agent-limits ${s?.stale?'limits-stale':''}" title="${escape(limitDescription(a.id))}">${limitDisplay(a.id)}</small></button>`;}).join('');if(html!==lastNewAgents){$('#new-agents').innerHTML=html;$('#new-agents').append(settings);lastNewAgents=html;}}
let lastSidebar='', paintingSidebar=false,lastSavedOpenFolders;
function saveOpenFolders(){const saved=JSON.stringify([...openFolders]);if(saved===lastSavedOpenFolders)return;try{localStorage.setItem('agent-desk-open-folders',saved);localStorage.removeItem('agent-desk-folder');lastSavedOpenFolders=saved;}catch{}}
function pruneOpenFolders(){for(const id of openFolders)if(id!==adaptiveFolderId && !folders.some(folder=>folder.id===id))openFolders.delete(id);saveOpenFolders();}
function setOpenFolder(id){if(id===adaptiveFolderId || folders.some(folder=>folder.id===id)){openFolders.delete(id);openFolders.add(id);saveOpenFolders();}folderRename=null;renderSidebar();}
let unassignedClosed=localStorage.getItem('agent-desk-unassigned-closed')==='1';
function toggleOpenFolder(id){if(id==='unassigned'){unassignedClosed=!unassignedClosed;try{localStorage.setItem('agent-desk-unassigned-closed',unassignedClosed?'1':'0');}catch{}folderRename=null;renderSidebar();return;}if(openFolders.has(id)){openFolders.delete(id);saveOpenFolders();folderRename=null;renderSidebar();}else setOpenFolder(id);}
function openLinkedFolder(id){if(id!==adaptiveFolderId && !folders.some(folder=>folder.id===id))return false;showChatList({replaceHistory:true});setOpenFolder(id);const url=new URL(location.href);url.hash='folder='+encodeURIComponent(id);history.replaceState(history.state,'',url);return true;}
function closeLastFolder(){const id=[...openFolders].at(-1);if(id)toggleOpenFolder(id);}
const expandedParents=new Map();
// Podčetovi se vide dok je izabran roditelj ili neki od njegovih podčetova; izborom drugog četa se sklanjaju.
function showChildren(parentId){if(active===parentId)return true;const selected=active && chats.find(c=>c.id===active);return !!selected && (selected.parentChatId===parentId || selected.continuedTo===parentId);}
function toggleChildren(parentId){expandedParents.set(parentId,!showChildren(parentId));renderSidebar();}
function visibleSidebarChats(){
 const ids=folders.map(folder=>folder.id);
 const groups=[...folders.filter(folder=>openFolders.has(folder.id)).flatMap(folder=>placedChats(chats,ids,folder.id)),...(unassignedClosed?[]:placedChats(chats,ids))];
 const visible=[...(openFolders.has(adaptiveFolderId)?adaptiveChatGroups(chats).flatMap(group=>[group.chat,...(showChildren(group.chat.id)?[...group.parts,...group.children]:[])]):[]),...groups.flatMap(group=>[group.chat,...(showChildren(group.chat.id)?[...group.parts,...group.children]:[])])];
 return [...new Map(visible.map(chat=>[chat.id,chat])).values()];
}
function renderSidebar() {
  const freshMark=c=>!chatBlocked(c) && unreadMark(notification(c));
  const row=(c,index,hasChildren=false)=>{const shortcut=index>=0 && index<9?` · ⌘${index+1}`:'';const mark=freshMark(c);const compact=(drafts.has(c.id)?drafts.get(c.id):c.draft?.text||'').trim()?`<small class="compact-status draft">Draft</small>`:'';return `<div class="chat-swipe"><div role="button" tabindex="0" aria-label="${escape(c.title)}${mark?`, ${mark.label}`:''}${shortcut}" class="chat-row ${c.parentChatId?'subagent-card':''} ${c.continuedTo?'archived-part':''} ${(drafts.has(c.id)?drafts.get(c.id):c.draft?.text||'').trim()?'has-draft':''} ${c.id===active?'active':''} ${c.running?'working':chatBlocked(c)?'blocked':notification(c)} ${generatingTitles.has(c.id)?'generating-title':''} ${place?.kind==='move' && place.id===c.id?'place-source':''}" data-row="${c.id}" ${hasChildren?`data-expand-parent="${c.id}"`:""} data-agent="${c.settings.agent}" ${c.settings?.model?`data-model="${escape(c.settings.model)}"`:''} ${typeof getAgentColor==='function'?`style="--card-color:${getAgentColor(c.settings.agent,c.settings.model)}"`:''} title="${escape(c.title)} · ${escape(agentName(c.settings.agent))} · ${escape(modelLabel(c))}${shortcut}">
    <span class="chat-item"${c.project?.name?` title="Projekat: ${escape(c.project.name)}"`:''}><span>${lockedPart(c)?'<span class="part-lock" aria-label="zaključan deo" title="Zaključan prethodni deo">🔒</span> ':''}${escape(c.title)}</span>${compact}${mark?`<i class="unread-dot ${mark.kind}" aria-hidden="true"></i>`:""}</span>
  </div></div>`;};
  const groups=sidebarGroups(chats),ids=folders.map(folder=>folder.id);
  pruneOpenFolders();
  const folderRow=(folder,own)=>{const open=folder.system?!unassignedClosed:openFolders.has(folder.id);const inside=own||groups.filter(group=>group.chat.folderId===folder.id),count=inside.length,members=inside.flatMap(group=>[group.chat,...group.children]);const state=members.some(c=>c.running)?'working':members.some(c=>notification(c)==='completed')?'completed':members.some(c=>notification(c)==='unread')?'unread':'';const fresh=members.filter(freshMark).length;const editing=folderRename?.id===folder.id;const folderCard=`<div class="folder-row ${open?'open':''} ${state}" ${folder.adaptive?'data-adaptive-toggle':`data-folder="${folder.id}"`}${folder.system?' data-folder-out':''} role="button" tabindex="0" aria-expanded="${open}" aria-label="${escape(folder.name || 'Naziv foldera')}, ${count} četova${fresh?`, ${fresh} novih`:''}${folder.shared?', deljeni kontekst':''}" title="${folder.adaptive?'Četovi prilagodljivih agenata i predloga. Otvori folder.':`${folder.shared?'Deljeni kontekst. ':''}Otvori folder. Drži za radnje.`}"><span class="folder-mark ${folder.shared?'shared':''}" aria-hidden="true">${folder.shared?actionIcon('<circle cx="7" cy="12" r="3"/><circle cx="17" cy="12" r="3"/><path d="M10 12h4"/>'):''}</span>${editing?`<input data-folder-name aria-label="Naziv foldera" placeholder="Naziv foldera" value="${escape(folderRename.value)}" maxlength="40">`:`<span class="folder-name">${escape(folder.name)}</span>`}${fresh?`<i class="unread-count">${fresh}</i>`:''}</div>`;return editing?folderCard:`<div class="chat-swipe swipe-folder">${folderCard}</div>`;};
  const unassigned=placedChats(chats,ids);
  const shortcutOrder=visibleSidebarChats().map(c=>c.id);
  const userFolders=folders.filter(folder=>!folder.system),unassignedFolder=folders.find(folder=>folder.system)||{id:'unassigned',name:'Neraspoređeni',system:true};
  const folderItems=folderRename?.draft?[...userFolders,{id:folderRename.id,name:''}]:userFolders;
  const chatRows=list=>list.map(group=>{const nested=[...group.parts,...group.children],open=showChildren(group.chat.id),label=[group.parts.length?`Prethodni delovi: ${group.parts.length}`:'',group.children.length?`Podagenti: ${group.children.length}`:''].filter(Boolean).join(' · ');return `<div class="chat-group ${nested.length?'has-children':''} ${nested.some(c=>c.id===active)?'has-active-child':''}"><div class="chat-root">${row(group.chat,shortcutOrder.indexOf(group.chat.id),!!nested.length)}</div>${nested.length && open?`${group.parts.length?`<div class="part-chats">${group.parts.map(part=>row(part,shortcutOrder.indexOf(part.id))).join('')}</div>`:''}${group.children.length?`<div class="subagent-chats">${group.children.map(child=>row(child,shortcutOrder.indexOf(child.id))).join('')}</div>`:''}`:''}</div>`;}).join('');
  const folderBody=(list,key,empty)=>`${chatRows(list)}${!list.length?`<p class="folder-empty">${empty}</p>`:''}`;
  const adaptiveGroups=adaptiveChatGroups(chats);
  const adaptiveTools=`<div class="adaptive-folder-tools"><button type="button" class="folder-more" data-adaptive-panel>Agenti i odobrenja</button><button type="button" class="folder-more" data-adaptive-new>+ Predlog za projekat</button></div>`;
  const adaptiveContent=`<section class="sidebar-folder" data-adaptive-folder>${folderRow(adaptiveFolder,adaptiveGroups)}${openFolders.has(adaptiveFolderId)?`<div class="folder-chats">${adaptiveTools}${folderBody(adaptiveGroups,adaptiveFolderId,'Nema četova prilagođavanja')}</div>`:''}</section>`;
  const content=adaptiveContent+folderItems.map(folder=>{const visible=placedChats(chats,ids,folder.id);return `<section class="sidebar-folder">${folderRow(folder)}${openFolders.has(folder.id)?`<div class="folder-chats" data-folder-target="${folder.id}">${folderBody(visible,folder.id,'Prazan folder')}</div>`:''}</section>`;}).join('')+`<section class="sidebar-folder">${folderRow(unassignedFolder,unassigned)}${unassignedClosed?'':`<div class="folder-chats" id="chat-list-items" data-folder-out>${folderBody(unassigned,'unassigned','Nema neraspoređenih četova')}</div>`}</section>`;

  if(content!==lastSidebar){const input=$('[data-folder-name]'), editing=input && document.activeElement===input, start=input?.selectionStart,end=input?.selectionEnd;paintingSidebar=true;$('#chats').innerHTML=content;lastSidebar=content;if(editing && folderRename){const replacement=$('[data-folder-name]');replacement.focus();replacement.setSelectionRange(start,end);}paintingSidebar=false;}
  renderPopover();renderNewAgents();
}
async function moveToFolder(id,folderId){const child=chats.find(c=>c.id===id)?.parentChatId;const chat=await api(`/api/chats/${id}${child?'/unlink':''}`,child?'POST':'PATCH',{folderId});putChat(chat);render();if(child)toast('Podagent je izdvojen u samostalan čet.');}
async function saveFolderRename(){if(!folderRename || paintingSidebar)return;const edit=folderRename;const name=edit.value.trim();folderRename=null;if(edit.draft){if(!name && !edit.chatId){lastSidebar='';renderSidebar();return;}try{const saved=edit.createdId?folders.find(folder=>folder.id===edit.createdId):await api('/api/folders','POST',{name});edit.createdId=saved.id;if(!folders.some(folder=>folder.id===saved.id))folders.push(saved);if(edit.chatId)await moveToFolder(edit.chatId,saved.id);}catch(error){folderRename=edit;lastSidebar='';renderSidebar();const input=$('[data-folder-name]');input?.focus();throw error;}lastSidebar='';renderSidebar();return;}const currentName=folders.find(folder=>folder.id===edit.id)?.name;if(name && name!==currentName){const saved=await api(`/api/folders/${edit.id}`,'PATCH',{name});folders=folders.map(folder=>folder.id===saved.id?saved:folder);}lastSidebar='';renderSidebar();}
function addFolder(chatId=null){if(folderRename?.draft){$('[data-folder-name]')?.focus();return;}folderRename={id:'draft',value:'',draft:true,chatId};menuFolder=null;lastSidebar='';renderSidebar();$('[data-folder-name]')?.focus();}
function openFolderMenu(id){if(!folders.some(folder=>folder.id===id))return;menuFolder=id;menuChat=null;rename=null;if(folderRename){folderRename=null;lastSidebar='';renderSidebar();}renderPopover();}
async function removeFolder(id){await api(`/api/folders/${id}`,'DELETE');folders=folders.filter(folder=>folder.id!==id);chats=chats.map(chat=>chat.folderId===id?{...chat,folderId:undefined}:chat);pruneOpenFolders();menuFolder=null;folderRename=null;pendingFolderDelete=null;lastSidebar='';closeDeleteDialog();render();}
function closeDeleteDialog(){pendingFolderDelete=null;pendingReset=null;$('#delete-only').textContent='Arhiviraj ovaj čet';$('#delete-family').hidden=false;$('#delete-dialog').close();}
function restoreQueued(text){const input=$('#prompt'),draft=input.value,next=draft.trim()?`${text}\n\n${draft}`:text;input.value=next;recordDraft(active,next);resizePrompt();input.focus();const cursor=draft.trim()?text.length:next.length;try{input.setSelectionRange(cursor,cursor);}catch{}}
function renderChatNavigation() {
  const chat=current();
  $('#chat-parent').hidden=!chats.some(c=>c.id===chat?.parentChatId);
  document.body.classList.toggle('locked-part',lockedPart(chat));
  $('#chat-title').textContent=chat?.title || '';$('#chat-title').title=chat?.project?.name?`Projekat: ${chat.project.name}\n${chat.project.dir}`:'';$('#chat-title').classList.toggle('generating-title',!!chat && generatingTitles.has(chat.id));
  $('#chat-options').hidden=!chat;
  if(chat)$('#chat-options').dataset.options=chat.id;
  if(chat)$('#chat-options').innerHTML=`<img src="${agentLogos[chat.settings.agent]}" alt="" width="20" height="20">`;
}
function showChatList({replaceHistory=false}={}){if(messageSelectionMode){clearMessageSelection();return;}const inChat=document.body.classList.contains('chat-view');if(inChat && current()?.discardOnLeave){adoptPrompt();void discardEmptyChat(active);}if(inChat && !replaceHistory)rememberChatView();document.body.classList.remove('chat-view');renderSidebar();showDefaults(false);closePanels();menuChat=null;renderPopover();const url=new URL(location.href);url.hash='';history.replaceState(history.state,'',url);if(appReady)connectEvents();}
function showHomeScreen(){
 if(messageSelectionMode)clearMessageSelection();
 // Vrati listu kakva je bila pre ulaska u čet: isti otvoreni folderi i isti položaj.
 const list=chatNavigation.findLast(entry=>!entry.chatId);
 chatNavigation.length=0;
 showChatList({replaceHistory:true});
 if(list){openFolders=new Set(list.folders);pruneOpenFolders();renderSidebar();$('#chats').scrollTop=list.scroll;}
}
function backFromChat(){
 if(!$('#defaults').hidden){showDefaults(false);return;}
 if(messageSelectionMode){clearMessageSelection();return;}
 let previous;
 while(chatNavigation.length){previous=chatNavigation.pop();if(!previous.chatId || chats.some(c=>c.id===previous.chatId))break;previous=null;}
 if(previous){
  openFolders=new Set(previous.folders);pruneOpenFolders();
  if(previous.chatId)choose(previous.chatId,{replaceHistory:true});
  else showChatList({replaceHistory:true});
  // Vrati prethodnu listu sa istim ručno otvorenim folderima.
  openFolders=new Set(previous.folders);pruneOpenFolders();renderSidebar();$('#chats').scrollTop=previous.scroll;
  // Sa liste Nazad više ne vraća u ranije četove, nego samo zatvara foldere.
  if(!previous.chatId)chatNavigation.length=0;
 }else showChatList({replaceHistory:true});
}
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
 if(!$('#defaults').hidden || document.body.classList.contains('chat-view')){backFromChat();}
 else if(openFolders.size)closeLastFolder();
},{passive:false});
const mobileNavigation=()=>matchMedia('(max-width:650px)').matches;
let mobileHistoryActivated=false;
function activateMobileHistory(e){if(!e.isTrusted || !mobileNavigation() || mobileHistoryActivated)return;mobileHistoryActivated=true;history.pushState({agentDesk:true,agentDeskGuard:true},'',location.href);}
// Chrome may skip entries created before user activation, including restored PWA entries.
// After every Back the next tap adds a fresh guard, so Back on the chat list never leaves the app.
document.addEventListener('click',activateMobileHistory,{capture:true});document.addEventListener('keydown',activateMobileHistory,{capture:true});

function keepMobileHistory(){if(mobileNavigation())history.pushState({agentDesk:true,agentDeskGuard:true},'',location.href);}
window.addEventListener('popstate',()=>{if(!$('#defaults').hidden){showDefaults(false);const url=new URL(location.href);url.hash=document.body.classList.contains('chat-view') && active?'chat='+encodeURIComponent(active):'';history.replaceState(history.state,'',url);keepMobileHistory();return;}if($('#attachment-view').open){$('#attachment-view').close();attachmentHistory=false;keepMobileHistory();return;}if($('#files-dialog').open){guard(async()=>{if(!filePickerClosing && fileListing.path!==fileListing.home && fileListing.parent){history.pushState({agentDesk:true,filePicker:true},'',location.href);await browseFolder(fileListing.parent);}else{filePickerClosing=false;$('#files-dialog').close();keepMobileHistory();}});return;}if(mobileNavigation()){if(document.body.classList.contains('chat-view')){if($('#files-dialog').open)$('#files-dialog').close();if($('#delete-dialog').open)$('#delete-dialog').close();showHomeScreen();}else if(openFolders.size)closeLastFolder();else showChatList({replaceHistory:true});keepMobileHistory();mobileHistoryActivated=false;}});

$('#chat-parent').onclick=()=>{if(current()?.parentChatId)choose(current().parentChatId);};
$('#chat-options').onclick=()=>{if(Date.now()<headerLogoBlock)return;if(current()){menuChat=menuChat===active?null:active;renderPopover();}};
const headerMenu=$('#header-swipe-menu'),headerLogo=$('#chat-options'),headerActions=$('#header-actions');
let headerLogoDrag=null,headerLogoBlock=0;
function headerButtons(){return [...headerMenu.querySelectorAll('button')];}
function headerActionAt(x){const menu=headerMenu.getBoundingClientRect();for(const b of headerButtons()){const r=b.getBoundingClientRect();const left=Math.max(r.left,menu.left),right=Math.min(r.right,menu.right);if(right-left>8 && x>=left && x<=right)return b.dataset.headerAction;}return null;}
function showHeaderMenu(reveal,action){const open=reveal>0;headerMenu.hidden=!open;headerActions.style.setProperty('--reveal',(open?reveal:0)+'px');if(open)headerMenu.classList.add('clickable');else headerMenu.classList.remove('clickable');for(const b of headerButtons())b.classList.toggle('active',open && b.dataset.headerAction===action);}
function resetHeaderLogo(blockClick){if(blockClick)headerLogoBlock=Date.now()+500;headerLogoDrag=null;clearTimeout(headerLogoHoldTimer);headerLogoHoldTimer=null;headerMenu.classList.remove('dragging');showHeaderMenu(0,null);headerLogo.style.removeProperty('--logo-x');}
function closeSitePreview(){const pane=$('#site-preview');if(!pane || pane.hidden)return;pane.hidden=true;document.body.classList.remove('site-preview-open');}
async function showProjectsPanel(){
  closePanels();
  $('#projects-panel').hidden=false;
  for(const el of [$('#conversation'),$('.composer-area'),$('#usage-details'),$('#change-column')].filter(Boolean))el.inert=true;
  const target=$('#projects-panel-content');
  target.innerHTML='<p class="change-empty">Učitavam spisak projekata…</p>';
  try{
    const res=await api('/api/projects');
    const list=res.projects || [];
    if(!list.length){target.innerHTML='<p class="change-empty">Nema pronađenih projekata.</p>';return;}
    target.innerHTML=`<div class="panel-project-list">${list.map(p=>`<div class="panel-project-item"><strong>${escape(p.name)}</strong><span>${escape(p.state || 'nema zabeleženog stanja')}</span><small>${escape(p.path)} · ${escape(p.date || '')}</small></div>`).join('')}</div>`;
  }catch(e){
    target.innerHTML=`<p class="change-empty">${escape(e.message || 'Greška pri učitavanju projekata.')}</p>`;
  }
}
async function showCapabilitiesPanel(){
  closePanels();
  $('#capabilities-panel').hidden=false;
  for(const el of [$('#conversation'),$('.composer-area'),$('#usage-details'),$('#change-column')].filter(Boolean))el.inert=true;
  const target=$('#capabilities-panel-content');
  target.innerHTML='<p class="change-empty">Učitavam mogućnosti…</p>';
  try{
    const res=await api('/api/capabilities');
    const md=res.text || '';
    target.innerHTML=DOMPurify.sanitize(marked.parse(md));
  }catch(e){
    target.innerHTML=`<p class="change-empty">${escape(e.message || 'Dokument sa mogućnostima nije pronađen.')}</p>`;
  }
}
async function triggerServerRestart(){
  try{
    const res=await api('/api/restart','POST',{whenIdle:true,chatId:null});
    if(res.restarting)toast('Restart servera je pokrenut.');
    else if(res.scheduled)toast('Restart servera je zakazan čim agenti završe rad.');
    else toast('Zahtev za restart je poslat.');
    void restartStatus.refresh();
  }catch(e){
    toast(e.message || 'Restart nije uspeo.','error');
  }
}
function runHeaderAction(action){
  if(action==='dispatcher'){dispatcherPanel.open();return;}
  if(action==='warmup'){guard(sendWarmupNow);return;}
  if(action==='adaptive'){adaptivePanel.open();return;}
  if(action==='settings'){toggleSettings();return;}
  if(action==='refresh'){if(active)recordDraft(active,$('#prompt').value);keepDraftOnExit();location.reload();return;}
  if(action==='usage'){
    const box=$('#usage-details');
    if(box){box.hidden=false;box.open=true;box.scrollIntoView({behavior:'smooth',block:'center'});}
    return;
  }
  if(action==='projects'){guard(showProjectsPanel);return;}
  if(action==='restart'){guard(triggerServerRestart);return;}
  if(action==='capabilities'){guard(showCapabilitiesPanel);return;}
}
function headerReveal(dx){const maxReveal=Math.min(Math.max(0,window.innerWidth-56),headerButtons().length*38);return Math.max(0,Math.min(maxReveal,-dx));}
let headerLogoHoldTimer=null;
headerLogo.addEventListener('pointerdown',e=>{
  if(e.button!==0 || !e.isPrimary || !current())return;
  headerLogoDrag={id:e.pointerId,x:e.clientX,y:e.clientY,moved:false};
  clearTimeout(headerLogoHoldTimer);
  headerLogoHoldTimer=setTimeout(()=>{
    if(headerLogoDrag && !headerLogoDrag.moved){
      const maxReveal=Math.min(Math.max(0,window.innerWidth-56),headerButtons().length*38);
      showHeaderMenu(maxReveal,null);
      headerMenu.classList.add('clickable');
    }
  },450);
  try{headerLogo.setPointerCapture(e.pointerId);}catch{}
});
function moveHeaderLogo(e){
  const d=headerLogoDrag;if(!d || d.id!==e.pointerId)return;
  const dx=e.clientX-d.x,dy=e.clientY-d.y;
  if(!d.moved){
    if(Math.hypot(dx,dy)<8)return;
    clearTimeout(headerLogoHoldTimer);
    headerLogoHoldTimer=null;
    if(dx>-6 || Math.abs(dy)>Math.abs(dx)*1.25){
      if(Math.hypot(dx,dy)>18)resetHeaderLogo(true);
      return;
    }
    d.moved=true;
    headerMenu.classList.add('dragging');
  }
  if(Math.abs(dy)>Math.abs(dx)*1.25 && dx>-6){resetHeaderLogo(true);return;}
  e.preventDefault();
  const reveal=headerReveal(dx);
  const buttons=headerButtons();
  const slots=Math.min(buttons.length,Math.max(1,Math.ceil(reveal/38)));
  const reached=buttons[buttons.length-slots]?.dataset.headerAction || null;
  showHeaderMenu(reveal,headerActionAt(e.clientX) || reached);
  headerLogo.style.setProperty('--logo-x',Math.max(-18,Math.min(0,dx/3))+'px');
}
function endHeaderLogo(e){
  const d=headerLogoDrag;
  clearTimeout(headerLogoHoldTimer);
  headerLogoHoldTimer=null;
  if(!d || (e && d.id!==e.pointerId))return;
  const dx=e?e.clientX-d.x:0;
  const reveal=headerReveal(dx);
  let action=null;
  if(d.moved && reveal>=24){
    action=headerActionAt(e.clientX);
    if(!action){
      const buttons=headerButtons(),menu=headerMenu.getBoundingClientRect();
      action=(e.clientX<menu.left?buttons[0]:buttons.at(-1))?.dataset.headerAction || null;
    }
  }
  const wasMoved=d.moved;
  resetHeaderLogo(wasMoved);
  if(action)runHeaderAction(action);
}
window.addEventListener('pointermove',moveHeaderLogo);
window.addEventListener('pointerup',endHeaderLogo);
window.addEventListener('pointercancel',e=>{if(headerLogoDrag?.id===e.pointerId)resetHeaderLogo(true);});
headerLogo.addEventListener('click',e=>{
  if(Date.now()<headerLogoBlock){e.preventDefault();e.stopImmediatePropagation();return;}
  if(headerMenu.hidden){
    e.preventDefault();
    e.stopImmediatePropagation();
    const maxReveal=Math.min(Math.max(0,window.innerWidth-56),headerButtons().length*38);
    showHeaderMenu(maxReveal,null);
    headerMenu.classList.add('clickable');
  }
},true);
headerMenu.addEventListener('click',e=>{
  const b=e.target.closest('button');
  if(b && !headerLogoDrag?.moved){
    const action=b.dataset.headerAction;
    resetHeaderLogo(false);
    if(action)runHeaderAction(action);
  }
});
document.addEventListener('pointerdown',e=>{
  if(!headerMenu.hidden && !e.target.closest('#header-actions')){
    resetHeaderLogo(false);
  }
});
let headerPull=null,headerSuppressUntil=0;
agentToolbar.addEventListener('pointerdown',e=>{if(!current() || !document.body.classList.contains('chat-view') || e.button!==0 || !e.isPrimary)return;headerPull={id:e.pointerId,x:e.clientX,y:e.clientY,chatId:active};});
agentToolbar.addEventListener('pointermove',e=>{const p=headerPull;if(!p || p.id!==e.pointerId)return;const dx=e.clientX-p.x,dy=e.clientY-p.y;if(Math.abs(dx)>20 || dy<-12){headerPull=null;return;}if(dy>10){e.preventDefault();agentToolbar.setPointerCapture(e.pointerId);}});
agentToolbar.addEventListener('pointerup',e=>{const p=headerPull;headerPull=null;if(!p || p.id!==e.pointerId || p.chatId!==active)return;if(e.clientY-p.y>=45 && Math.abs(e.clientX-p.x)<20){e.preventDefault();headerSuppressUntil=Date.now()+500;closeNewModels();menuFolder=null;menuChat=active;rename=null;renderPopover();}});
agentToolbar.addEventListener('pointercancel',()=>headerPull=null);
agentToolbar.addEventListener('click',e=>{if(Date.now()<headerSuppressUntil){e.preventDefault();e.stopImmediatePropagation();}},{capture:true});

const usageCount=compactCount;
function usageRange(a,b){return a===b?usageCount(a):`${usageCount(a)}–${usageCount(b)}`;}
function apiMoney(s){if(!s?.priced)return 'Cena nije poznata';const low=money(s.costMin),high=money(s.costMax);return `≈ ${low===high?low:`${low.replace(' $','')}–${high}`}${s.unpriced || s.missing || s.sessionUnknown?' · delimično':''}`;}
function splitUsage(s){return `novo ${usageRange(Math.max(0,s.total-s.cacheRead),Math.max(0,s.totalMax-s.cacheRead))} · keš ${usageCount(s.cacheRead)}`;}

function usageTable(s){if(!s)return '';const rows=s.models || [];return `<div class="usage-table-wrap"><table class="usage-table"><thead><tr><th>Model</th><th>Novi ulaz¹</th><th>Izlaz</th><th>Keš</th><th>Upis keša</th><th>$</th></tr></thead><tbody>${rows.map(r=>`<tr><td>${escape(r.model ? modelName(r.agent,r.model) : agentName(r.agent)+' · nepoznat model')}${r.kind==='title'?' · naslov':r.kind==='handoff'?' · predaja':''}</td><td>${r.records?usageRange(Math.max(0,r.input-r.cacheRead),Math.max(0,r.inputMax-r.cacheRead)):'n/p'}</td><td>${r.records?usageCount(r.output):'n/p'}</td><td>${r.records?usageCount(r.cacheRead):'n/p'}</td><td>${r.records?usageCount(r.cacheWrite):'n/p'}</td><td>${escape(apiMoney(r))}</td></tr>`).join('') || '<tr><td colspan="6">Potrošnja još nije prijavljena.</td></tr>'}</tbody></table></div>${s.sessionUnknown?`<p class="usage-note">${s.sessionUnknown} starih kumulativnih zapisa nije sabrano bez pouzdane osnove.</p>`:''}${s.missing?`<p class="usage-note">Za ${s.missing} odgovora tokeni nisu prijavljeni.</p>`:''}${s.uncertain?'<p class="usage-note">Deo zapisa nema potpuno razdvojene ulazne i keširane tokene.</p>':''}`;}
function renderCacheTimer(){const c=current(),heading=$('#usage-heading');if(!heading)return;let el=$('#cache-timer');const text=c&&!c.parentChatId?cacheStatus(c.lastContext,Date.now(),c.running):'';if(!text){el?.remove();return;}if(!el){el=document.createElement('span');el.id='cache-timer';el.title='Posle isteka keša sledeća poruka plaća ceo kontekst ponovo';}if(!heading.contains(el))heading.append(el);el.textContent=` · ${text}`;}
setInterval(renderCacheTimer,1000);
function renderUsage(){const c=current(),box=$('#usage-details');if(!box)return;box.hidden=!c || !box.open;if(!c)return;const u=c.usageSummary;if(!u){$('#usage-heading').textContent='Potrošnja';$('#usage-breakdown').innerHTML='';return;}
 const s=u.childCount?u.family:u.own;if(!c.messages.length&&!s.records){box.hidden=true;return;}const limitUse=chatShare(c.limitShares);$('#usage-heading').textContent=`${s.records?splitUsage(s):'Tokeni nisu prijavljeni'} · ${apiMoney(s)}${limitUse?` · ${limitUse}`:''}`;renderCacheTimer();
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
function tokenRange(estimate) {return estimate ? `${compactCount(estimate.minTokens)}–${compactCount(estimate.maxTokens)}` : 'nepoznato';}
function showCardPopover(pop,key){
  const opening=pop.hidden || pop.dataset.cardKey!==key;
  pop.dataset.cardKey=key;pop.hidden=false;positionPopover();
  if(opening && !mobileNavigation()){
    const input=pop.querySelector('[data-menu-rename],[data-menu-folder-name]');
    input?.focus({preventScroll:true});input?.select();
  }
}
let folderCopyCache=null;
function renderPopover() {
  const pop=$('#chat-popover');
  const folder=folders.find(item=>item.id===menuFolder);
  pop.classList.toggle('folder-popover',Boolean(folder));
  if(folder){
    const copyKey=JSON.stringify([folder.id,folder.name,chats.map(c=>[c.id,c.folderId,c.parentChatId,c.title,c.settings.agent,c.settings.model,c.settings.cwd,c.messages.length,c.messages.at(-1)?.text?.length,c.running])]);if(folderCopyCache?.key!==copyKey)folderCopyCache={key:copyKey,...folderContext(folder,chats,{modelName})};const copied={...folderCopyCache};const peers=chats.filter(c=>c.folderId===folder.id || chats.some(parent=>parent.id===c.parentChatId && parent.folderId===folder.id));if(peers.some(c=>!c._loaded || c._historyPage?.hasMore)){const chars=peers.reduce((n,c)=>n+(c.historyChars || 0),0)+copied.reference.length;copied.fullTokens={minTokens:Math.ceil(chars/6),maxTokens:Math.ceil(chars/2)};}
    const iconBusy=generatingFolderIcons.has(folder.id),hasChats=chats.some(c=>c.folderId===folder.id && !c.parentChatId),iconDisabled=iconBusy || !meta.titleSettings?.configured || !hasChats;
    const iconLabel=iconBusy?'Gemini bira emotikon…':!meta.titleSettings?.configured?'Podesi Google ključ da bi Gemini birao emotikon':!hasChats?'Dodaj čet u grupu da bi Gemini imao kontekst':'Gemini bira emotikon i boju';
    const geminiIcon=actionIcon('<path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5Z"/>');
    const colorNames=['Zelena','Tirkizna','Plava','Ljubičasta','Roze','Narandžasta','Zlatna','Siva'];
    const swatch=Number.isInteger(folder.color)?folderPalette[folder.color]:'#2a2a2a';
    const colors=folderPalette.map((hex,i)=>`<button type="button" class="folder-color" data-action="folder-color" data-id="${folder.id}" data-color="${i}" aria-label="${colorNames[i]}" aria-pressed="${folder.color===i}" style="background:${hex}"></button>`).join('');
    const content=`<div class="folder-menu"><input data-menu-folder-name data-folder-id="${folder.id}" aria-label="Naziv foldera" value="${escape(folder.name)}" maxlength="40">${folder.system?'':`<button class="icon-action folder-shared" data-action="shared-folder" data-id="${folder.id}" aria-pressed="${folder.shared===true}" title="Zajednički kontekst agenata" aria-label="Zajednički kontekst agenata">${actionIcon('<circle cx="7" cy="12" r="3"/><circle cx="17" cy="12" r="3"/><path d="M10 12h4"/>')}</button><button class="icon-action delete-chat" data-action="delete-folder" data-id="${folder.id}" aria-label="Obriši folder" title="Obriši folder. Četovi ostaju u listi.">${actionIcon('<path d="M4 7h16M9 7V5h6v2M6 7l1 14h10l1-14"/>')}</button>`}</div>${folder.system?'':`<div class="folder-copy-actions"><button data-action="copy-folder-link" data-id="${folder.id}">${shareIcon}<span>Link grupe</span></button><button data-action="copy-folder-reference" data-id="${folder.id}">${copyIcon}<span>Referenca<small data-folder-reference-tokens>≈ ${tokenRange(copied.referenceTokens)} tokena</small></span></button><button data-action="copy-folder-full" data-id="${folder.id}">${copyIcon}<span>Kontekst<small data-folder-full-tokens>≈ ${tokenRange(copied.fullTokens)} tokena</small></span></button></div>`}`;
    const input=pop.querySelector('[data-menu-folder-name]');
    const emojiInput=pop.querySelector('[data-folder-emoji]');
    if(input?.dataset.folderId!==folder.id)pop.innerHTML=content;
    else {if(document.activeElement!==input)input.value=folder.name;if(emojiInput){if(document.activeElement!==emojiInput)emojiInput.value=folder.emoji||'';emojiInput.style.background=swatch;}pop.querySelectorAll('[data-action="folder-color"]').forEach(button=>button.setAttribute('aria-pressed',String(Number(button.dataset.color)===folder.color)));const generate=pop.querySelector('[data-action="generate-folder-icon"]');if(generate){generate.disabled=iconDisabled;generate.title=iconLabel;generate.setAttribute('aria-label',iconLabel);generate.classList.toggle('generating-title',iconBusy);}}
    pop.querySelector('[data-action="shared-folder"]')?.setAttribute('aria-pressed',String(folder.shared===true));
    pop.querySelector('[data-folder-reference-tokens]').textContent=`≈ ${tokenRange(copied.referenceTokens)} tokena`;pop.querySelector('[data-folder-full-tokens]').textContent=`≈ ${tokenRange(copied.fullTokens)} tokena`;
    showCardPopover(pop,'folder:'+folder.id);return;
  }
  const c=chats.find(c=>c.id===menuChat);if(!c){pop.hidden=true;return;}
  const busy=c.running;
  const tool=(action,label,icon,disabled=false)=>`<button class="icon-action ${action==='delete'?'delete-chat':action==='stop'?'stop-chat':''}" data-action="${action}" data-id="${c.id}" aria-label="${escape(label)}" title="${escape(label)}" ${disabled?'disabled':''}>${icon}</button>`;
  const titleBusy=generatingTitles.has(c.id);
  const titleDisabled=titleBusy || !(c.messageCount || c.messages.some(m=>m.text && ['user','assistant'].includes(m.role)));
  const titleLabel=titleBusy?'Gemini generiše naslov…':titleDisabled?'Pošalji prvu poruku da bi Gemini imao kontekst za naslov':'Generiši naslov iz konteksta pomoću Geminija';
  const geminiIcon=actionIcon('<path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5Z"/>');
  const content=`<div class="chat-title-row ${titleBusy?'generating-title':''}"><input data-menu-rename data-rename-chat="${c.id}" aria-label="Naziv četa" value="${escape(rename?.id===c.id?rename.value:c.title)}" maxlength="100"><button class="icon-action title-generate-btn" data-action="generate-title" data-id="${c.id}" aria-label="${escape(titleLabel)}" title="${escape(titleLabel)}" ${titleDisabled?'disabled':''}>${geminiIcon}</button></div><div class="chat-tools" role="group" aria-label="Radnje četa">${tool('link','Kopiraj link četa',shareIcon)}${tool('move','Premesti čet',actionIcon('<path d="M3 7V5h6l2 3h10v12H3zM8 14h8m-3-3 3 3-3 3"/>'))}${tool('copy-md','Kopiraj čet kao Markdown','MD')}${c.parentChatId?tool('unlink','Izdvoji podagenta u samostalan čet',actionIcon('<path d="M10 5H5v14h14v-5M12 12 21 3M15 3h6v6"/>'),busy):''}${tool('reveal','Prikaži u Finderu',folderIcon)}${busy?tool('stop','Zaustavi',stopIcon):''}${tool('delete','Arhiviraj čet',actionIcon('<rect x="3" y="3" width="18" height="4" rx="1"/><path d="M5 7v13h14V7m-10 5h6"/>'),busy)}</div><div class="progress-tools"><button data-action="toggle-progress" data-id="${c.id}" aria-pressed="${progressVisible.has(c.id)}">${progressVisible.has(c.id)?'Sakrij tok rada':'Prikaži tok rada'}</button><button data-action="copy-md-full" data-id="${c.id}">Kopiraj čet sa tokom rada</button><button data-action="adaptive-propose" data-id="${c.id}">Predloži prilagodljive agente za ovaj projekat</button></div>`;
  const titleInput=pop.querySelector('[data-menu-rename]');if(!(document.activeElement===titleInput && titleInput?.dataset.renameChat===c.id) && pop.innerHTML!==content)pop.innerHTML=content;
  showCardPopover(pop,'chat:'+c.id);
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
  const count=compactCount;
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
function durationLabel(ms){const seconds=Math.max(0,Math.round(ms/1000));return seconds<60?seconds+'s':Math.floor(seconds/60)+'m '+seconds%60+'s';}
function workDuration(m){if(m.role!=='assistant' || !Number.isFinite(m.createdAt) || !Number.isFinite(m.completedAt))return '';return `<span class="work-duration" title="Ukupno trajanje rada agenta, uključujući alate">${durationLabel(m.completedAt-m.createdAt)}</span>`;}
function writeDuration(m){if(m.role!=='assistant' || !m.paragraphTimings?.length || !Number.isFinite(m.completedAt))return '';const elapsed=m.paragraphTimings.reduce((sum,t)=>sum+Math.max(0,(t.endedAt||0)-(t.startedAt||0)),0);return `<span class="paragraph-duration" title="Vreme ispisivanja celog odgovora, bez pauza dok agent radi alatima">Ispis ${elapsed<1000?'<1s':durationLabel(elapsed)}</span>`;}
function messageTime(m) {if(!Number.isFinite(m.createdAt))return '';const date=new Date(m.createdAt);return `<time datetime="${date.toISOString()}" title="${escape(date.toLocaleString('sr-Latn-RS'))}${m.origin==='queue'?' · iz reda čekanja':m.origin==='coordination'?' · koordinacija':m.origin==='delegate'?' · podzadatak':''}">${escape(date.toLocaleTimeString('sr-Latn-RS',{hour:'2-digit',minute:'2-digit'}))}</time>`;}
let renderedChatId=null,stickToken=0,forceBottom=false;
function cancelStick(){stickToken++;}
function conversationAtBottom(view){return view.scrollHeight-view.scrollTop-view.clientHeight<=2;}
$('#conversation').addEventListener('scroll',()=>{if(!conversationAtBottom($('#conversation')))cancelStick();},{passive:true});
$('#conversation').addEventListener('scroll',()=>{
 const view=$('#conversation'),chat=current();
 if(view.scrollTop>60 || !chat?._historyPage?.hasMore || loadingHistories.has(active))return;
 const id=active,height=view.scrollHeight,top=view.scrollTop;
 guard(async()=>{await loadChatHistory(id,{older:true});if(active===id)view.scrollTop=top+view.scrollHeight-height;});
},{passive:true});
$('#conversation').addEventListener('wheel',e=>{if(e.deltaY<0)cancelStick();},{passive:true});
$('#conversation').addEventListener('touchstart',cancelStick,{passive:true});
function stickToBottom(view){const token=++stickToken;const go=()=>{if(token!==stickToken)return;view.scrollTop=view.scrollHeight;};go();requestAnimationFrame(()=>{go();requestAnimationFrame(go);});}
let replayIndex=0,replayKey='',lastColumnHtml='';
let treeChat='',treeCwd='',treeProject='',treeTop='',treeParent='',treeQuery='',treeError='',treeGit=null,treeHidden=false,treeSizes=false,treeGeneration=0,lastTreeHtml='';
const treeCache=new Map(),treeOpen=new Set();
function columnMessage(chat){const message=lastTouchedMessage(chat);if(chat?.running && message?.status!=='running')return {role:'assistant',status:'running',actions:[],agent:chat.settings?.agent};return message;}
function renderChangeColumn(){const column=$('#change-column');if(column)column.hidden=true;}
async function loadTree(dir,options={},generation=treeGeneration){const chat=current();if(!chat)return;const id=chat.id;const params=new URLSearchParams({view:'tree',hidden:treeHidden?'1':'0',path:dir || chat.settings?.cwd || ''});if(options.git)params.set('git','1');let data;try{data=await api(`/api/chats/${id}/files?${params}`);}catch(error){if(generation!==treeGeneration || current()?.id!==id)return;treeError=error.message || 'Spisak fajlova nije učitan.';lastTreeHtml='';renderTree();return;}if(generation!==treeGeneration || current()?.id!==id)return;treeError='';treeCache.set(data.path,data);if(options.asTop){treeTop=data.path;treeParent=data.parent || '';}if(options.project)treeProject=data.path;if(options.git)treeGit=data.git?.repo?data.git:{repo:false};lastColumnHtml='';lastTreeHtml='';renderChangeColumn();}
function treeChanged(dir){const root=treeProject || treeTop || '';const paths=[];for(const file of treeGit?.files || [])paths.push(file);for(const file of touchedFiles(columnMessage(current()))){const abs=file.path.startsWith('/')?file.path:(root.replace(/\/$/,'')+'/'+file.path.replace(/^\.\//,''));paths.push(abs);}return paths.filter(file=>file===dir || file.startsWith(dir+'/')).length;}
function renderTree(){const host=$('#files-tree');if(!host)return;const chat=current();const root=treeTop;if(!chat || !root){if(lastTreeHtml){lastTreeHtml='';host.innerHTML='';}return;}const project=(treeProject || root).split(/[/\\]/).filter(Boolean).pop() || 'projekat';const message=columnMessage(chat);const running=message?.status==='running';const html=`<header class="tree-head"><h3>Svi fajlovi</h3><span>${escape(project)}</span></header>${treeError?`<p class="change-empty">${escape(treeError)}</p>`:''}<div class="tree-list">${renderTreeDir(root,0,message,running)}</div>`;if(html===lastTreeHtml)return;lastTreeHtml=html;host.innerHTML=html;}
function renderTreeDir(dir,depth,message,running){const data=treeCache.get(dir);if(!data)return depth?'' : '<p class="change-empty">Učitavam fajlove…</p>';const query=treeQuery.trim().toLowerCase();const cwd=treeProject || dir;return data.entries.map(entry=>{const children=entry.directory && treeOpen.has(entry.path)?renderTreeDir(entry.path,depth+1,message,running):'';const visible=!query || entry.name.toLowerCase().includes(query) || children.includes('tree-row');if(!visible)return '';const state=fileState(entry.path,touchedFiles(message),treeGit?.files || [],{running,cwd,cleanKnown:treeGit?.repo===true});const parts=fileParts(entry.name);const count=entry.directory?treeChanged(entry.path):0;const selected=sameFile(touchedFiles(message)[replayIndex]?.path || '',entry.path,cwd);const meta=entry.directory?(count?`<span class="tree-count">${escape(changesLabel(count))}</span>`:''):(state==='reading'||state==='editing'||state==='committed'||state==='uncommitted'||state==='opened'||state==='edited'||state==='delete'?`<span class="tree-pill">${state==='reading'?'čita':state==='editing'?'menja':state==='committed'?'sačuvano':state==='uncommitted'?'nije komitovano':state==='delete'?'brisanje':state==='opened'?'otvoreno':'izmenjeno'}</span>`:`<span class="tree-time">${escape(treeSizes && Number.isFinite(entry.size)?fileSize(entry.size):fileStamp(entry.mtime))}</span>`);const mark=entry.directory?`<button type="button" class="tree-row folder ${treeOpen.has(entry.path)?'open':''} ${state}" data-tree-toggle="${escape(entry.path)}" style="--depth:${depth}"><span class="caret" aria-hidden="true">▸</span><span class="tree-name">${escape(entry.name)}</span>${meta}</button>${children}`:`<button type="button" class="tree-row file ${state}${selected?' selected':''}" data-tree-file="${escape(entry.path)}" style="--depth:${depth}"><span class="ext">${escape(parts.ext)}</span><span class="tree-name">${escape(entry.name)}</span>${meta}</button>`;return mark;}).join('');}
let previewPath='',previewToken=0,openChatFile=null,focusOpenFile=false,fileWide=false,previewFullLines=false;
const chatDiffCache=new Map();
function touchAbsolute(filePath){const value=String(filePath||'');if(value.startsWith('/'))return value;const base=(treeProject || current()?.settings?.cwd || '').replace(/\/$/,'');return base?`${base}/${value.replace(/^\.\//,'')}`:value;}
function applyDiffLines(pre){if(!pre || pre.classList.contains('github-diff'))return;const changed=pre.classList.contains('full-lines')!==previewFullLines;pre.classList.toggle('full-lines',previewFullLines);pre.title=previewFullLines?'Klikni ponovo da se linije prelome na širinu prikaza':'Klikni da linije idu cele, kao u kodu';if(changed)pre.scrollLeft=0;}
function applyPreviewLines(){applyDiffLines($('#files-preview')?.querySelector('.change-diff'));for(const pre of document.querySelectorAll('.chat-diff-body:not([hidden]) .change-diff'))applyDiffLines(pre);}
function renderFilePreview(title,body){const box=$('#files-preview');if(!box)return;box.hidden=false;box.innerHTML=`<div class="preview-head"><p class="preview-title">${escape(title)}</p><button type="button" data-close-file>Zatvori</button></div>${body}`;applyPreviewLines();}
function closeOpenFile(){openChatFile=null;focusOpenFile=false;fileWide=false;previewFullLines=false;previewPath='';previewToken++;const box=$('#files-preview');if(box){box.hidden=true;box.innerHTML='';}document.body.classList.remove('file-preview-open');}
function changedPreview(diff){return changedLinesHtml(diff,escape)||'<p class="change-missing">Nema + ili − linija.</p>';}
async function fillChatDiffs(chat){
 if(!chat)return;
 const nodes=[...document.querySelectorAll('#conversation [data-diff-pending]')];
 await Promise.all(nodes.map(async node=>{
  const filePath=node.dataset.diffPending;
  node.removeAttribute('data-diff-pending');
  try{
   const data=await api(`/api/chats/${chat.id}/files?${new URLSearchParams({view:'diff',path:filePath})}`);
   if(!node.isConnected)return;
   if(data?.tooBig){node.textContent='Fajl je prevelik za pregled.';return;}
   if(data?.diff){node.outerHTML='<p class="change-missing">Aktuelni diff radnog stabla, nije sačuvani diff ove poruke.</p>'+diffPreviewHtml(data.diff,escape)||'<p class="change-missing">Nema sačuvane izmene.</p>';return;}
   node.textContent='Nema sačuvane izmene.';
  }catch(error){if(node.isConnected)node.textContent=error?.message==='Izaberi folder.'?'Zeleni i crveni pregled iz gita kreće posle ponovnog pokretanja.':(error?.message||'Izmena još nije učitana.');}
 }));
}
async function showFileChange(filePath){const chat=current();const abs=touchAbsolute(filePath);if(!chat || !abs)return;const box=$('#files-preview');if(previewPath===abs && box && !box.hidden && box.querySelector('.change-diff,.change-missing,.change-empty,.file-preview-image'))return;const token=++previewToken;previewPath=abs;const name=displayPathSafe(abs);renderFilePreview(name,'<p class="change-empty">Učitavam izmenu…</p>');const cwd=treeProject || chat.settings?.cwd || '';const owned=openChatFile?.messageId?chat.messages?.find(item=>item.id===openChatFile.messageId):null;const stored=[owned,columnMessage(chat)].filter(Boolean).flatMap(item=>touchedFiles(item)).find(file=>file.diff && sameFile(file.path,abs,cwd));if(stored?.diff){if(token===previewToken)renderFilePreview(name,changedPreview(stored.diff));return;}try{const data=await api(`/api/chats/${chat.id}/files?${new URLSearchParams({view:'diff',path:abs})}`);if(token!==previewToken)return;if(data?.tooBig){renderFilePreview(name,'<p class="change-missing">Fajl je prevelik za pregled.</p>');return;}if(data?.diff){renderFilePreview(name,`${data.truncated?'<p class="change-missing">Prikazan je samo početak izmene.</p>':''}${changedPreview(data.diff)}`);return;}}catch{}try{const response=await fetch('/files'+abs.split('/').map(encodeURIComponent).join('/'));if(!response.ok)throw Error('Fajl nije otvoren.');if(token!==previewToken)return;const type=response.headers.get('content-type') || '';if(type.startsWith('image/')){renderFilePreview(name,`<img class="file-preview-image" alt="${escape(name)}" src="${escape(response.url)}">`);return;}const text=(await response.text()).slice(0,8000);renderFilePreview(name,`<p class="change-missing">Nema sačuvane izmene. Ovo je trenutni fajl.</p><pre class="change-diff">${escape(text)}</pre>`);}catch(error){if(token===previewToken)renderFilePreview(name,`<p class="change-missing">${escape(error.message || 'Fajl nije otvoren.')}</p>`);}}
function displayPathSafe(filePath){const cwd=treeProject || current()?.settings?.cwd || '';const shown=filePath.startsWith(cwd)?filePath.slice(cwd.length).replace(/^\//,''):filePath.split('/').slice(-3).join('/');return shown || filePath;}
function reloadOpenTree(git){const generation=++treeGeneration;const open=[...treeOpen];const top=treeTop || current()?.settings?.cwd || '';treeCache.clear();lastTreeHtml='';void loadTree(top,{git,asTop:true},generation);for(const dir of open)if(dir && dir!==top)void loadTree(dir,{},generation);}
$('#change-column').onclick=e=>{promptFocusHold=Date.now()+600;if(e.target.closest('[data-close-file]')){closeOpenFile();lastMessages='';render();return;}const diff=e.target.closest('#files-preview .change-diff');if(diff && !window.getSelection()?.toString()){previewFullLines=!previewFullLines;applyPreviewLines();return;}const replay=e.target.closest('[data-replay]');if(replay){fileWide=true;document.body.classList.add('file-preview-open');const index=Number(replay.dataset.replay);const files=touchedFiles(columnMessage(current()));if(Number.isInteger(index) && files[index]){replayIndex=index;lastColumnHtml='';lastTreeHtml='';renderChangeColumn();void showFileChange(files[index].path);}return;}const toggle=e.target.closest('[data-tree-toggle]');if(toggle){const dir=toggle.dataset.treeToggle;if(treeOpen.has(dir))treeOpen.delete(dir);else{treeOpen.add(dir);if(!treeCache.has(dir))void loadTree(dir,{});}lastTreeHtml='';renderTree();return;}const file=e.target.closest('[data-tree-file]');if(file){fileWide=true;document.body.classList.add('file-preview-open');const files=touchedFiles(columnMessage(current()));const index=files.findIndex(item=>sameFile(item.path,file.dataset.treeFile,treeProject || current()?.settings?.cwd || ''));if(index>=0){replayIndex=index;lastColumnHtml='';lastTreeHtml='';renderChangeColumn();}void showFileChange(file.dataset.treeFile);return;}};
function askCacheTax(){const dialog=$('#cache-tax-dialog');if(!dialog)return Promise.resolve(true);if(dialog.open)return Promise.resolve(false);return new Promise(resolve=>{let settled=false;const finish=ok=>{if(settled)return;settled=true;if(dialog.open)dialog.close();resolve(ok);};$('#cache-tax-send').onclick=()=>finish(true);$('#cache-tax-cancel').onclick=()=>finish(false);dialog.addEventListener('cancel',event=>{event.preventDefault();finish(false);},{once:true});dialog.addEventListener('close',()=>finish(false),{once:true});dialog.showModal();});}

function render() {
  receiveDrafts();
  renderChangeColumn();
  renderQueue();renderHandoff();renderTransfer();renderChatNavigation();renderUsage();renderChatQuota();
  const chat=current();if(document.body.classList.contains('chat-view') && document.visibilityState==='visible' && document.hasFocus())markRead(chat);renderSidebar();
  $('#prompt').disabled=!connected || !meta.agents.find(a=>a.id===(chat?.settings.agent || selectedAgent))?.available;
  renderComposerControls();
  $('#connection').hidden=connected;$('#stop-run').hidden=!chat?.running;const inputWrap=$('#prompt').closest('.prompt-wrap');inputWrap.classList.toggle('working',!!chat?.running);inputWrap.dataset.agent=chat?.messages.findLast(m=>m.role==='assistant' && m.status==='running')?.agent || chat?.settings.agent || '';$('#prompt').setAttribute('aria-busy',chat?.running?'true':'false');
  const messages=[...(chat?.messages || []),...(pendingMessages.has(active) && !chat?.messages.some(m=>m.requestId===pendingMessages.get(active).requestId)?[pendingMessages.get(active)]:[])];
  const quotaMessage=quotaTarget(chat);
  const view=$('#conversation'),switched=chat?.id!==renderedChatId;if(switched){openChatFile=null;fileWide=false;}const key=JSON.stringify({id:chat?.id,messages,selectionMode:messageSelectionMode,selected:[...selectedMessages],speech:speakingId(),openFile:openChatFile,includeProgress:progressVisible.has(chat?.id)});if(key===lastMessages)return;lastMessages=key;
  const jump=forceBottom,savedScroll=view.scrollTop,wasAtBottom=conversationAtBottom(view);renderedChatId=chat?.id || null;forceBottom=false;
  const content=document.createElement('div');content.innerHTML=chat && !messages.length?(chat.messageCount && !chat._loaded?'<div class="empty-chat" role="status">Učitavam poruke…</div>':'<div class="empty-chat" role="status">Čet je prazan. Pošalji prvu poruku.</div>'):messages.map(m=>`${sessionMarkText(m)?`<div class="session-mark ${m.handoffFrom?'handoff':'renew'}" role="note"><span class="session-mark-icon" aria-hidden="true">${m.handoffFrom?'↪':'↻'}</span>${escape(sessionMarkText(m))}</div>`:''}<article data-message="${m.id}" class="message ${selectedMessages.has(m.id)?'message-selected':''} ${m.role} ${m.status==='running'?'writing':''} ${Object.hasOwn(agentLogos,m.agent)?m.agent:''}" aria-label="${m.role==='user'?'Tvoja poruka':'Odgovor agenta'}"><div class="message-body">${messageHtml(m,chat)}</div>${m.handoffFrom?`<button class="resume-queue" type="button" data-previous-chat="${escape(m.handoffFrom)}">Prikaži prethodni čet</button>`:''}${attachmentThumbs(m.text)}${m.role==='assistant'?messageChangeHtml(m,escape,{cwd:chat?.settings?.cwd||'',openPath:openChatFile?.chatId===chat?.id && openChatFile?.messageId===m.id?openChatFile.path:'',statsFor:path=>chatDiffCache.get(`${chat.id}\n${m.id}\n${path}`)?.diff}):''}${m.status==='sending'?'<div class="activity">Šalje se…</div>':''}${m.status==='stopped'?'<div class="activity">Zaustavljeno.</div>':''}${m.error?`<div class="error">${escape(m.error)}</div>`:''}${m===messages.at(-1) && m.role==='assistant' && ['stopped','interrupted','error'].includes(m.status) && !current()?.running?'<button class="resume-queue" type="button" data-continue-reply>Nastavi odgovor</button>':''}<div class="message-footer"><span class="message-meta"><span class="response-model">${escape(m.role==='user'?'Korisnik':responseModel(m))}</span>${m.role==='assistant' && m.id===quotaMessage?.id?quotaInline():m.role==='assistant' && m.quota?.length?savedQuota(m):''}${m.role==='assistant'?limitShareTag(m):''}${messageTime(m)}${workDuration(m)}${writeDuration(m)}${m.text?`<span class="message-actions"><button class="speak-message${speakingId()===m.id?' speaking':''}" data-speak="${m.id}" aria-label="${speakingId()===m.id?'Zaustavi čitanje':'Pročitaj poruku'}" title="${speakingId()===m.id?'Zaustavi čitanje':'Pročitaj'}">${speakingId()===m.id?speakStopIcon:speakIcon}</button><button class="copy-message" data-copy-message="${m.id}" aria-label="Kopiraj poruku" title="Kopiraj">${copyIcon}</button>${m.role==='assistant'?`<button class="copy-message copy-with-progress" data-copy-message-full="${m.id}" aria-label="Kopiraj odgovor sa tokom rada" title="Kopiraj odgovor sa tokom rada">Sve</button>`:''}<button class="select-message" data-select-message="${m.id}" aria-label="Izaberi poruku" aria-pressed="${selectedMessages.has(m.id)}" title="Izaberi poruku">${selectedMessages.has(m.id)?selectMark:selectBox}</button></span>`:''}</span>${m.role==='assistant'?tokenInfo(m):''}</div></article>`).join('')+(chat?.continuedTo?`<div class="session-mark handoff" role="note"><span class="session-mark-icon" aria-hidden="true">↪</span>${lockedPart(chat)?'Zaključan prethodni deo, piše se u nastavku.':'Nastavljeno u novom četu.'} <button class="resume-queue" type="button" data-next-chat="${escape(chat.continuedTo)}">Otvori nastavak</button>${lockedPart(chat)?' <button class="resume-queue" type="button" data-unlock-chat>Otključaj</button>':''}</div>`:'');
  for(const a of content.querySelectorAll('a')){const href=a.getAttribute('href');let p=null;if(href?.startsWith('/files/')){try{p=decodeURIComponent(href.slice(6));}catch{p=href.slice(6);}}else p=localFileHref(href);if(p){a.dataset.localFile=p;a.href='/files'+p.split('/').map(encodeURIComponent).join('/');}}
  for(const quote of content.querySelectorAll('.message-body > blockquote, .result-full-text > blockquote')){
    const button=document.createElement('button');button.className='copy-excerpt';button.type='button';button.dataset.copyText='';button.setAttribute('aria-label','Kopiraj izdvojeni tekst');button.title='Kopiraj izdvojeni tekst';button.innerHTML=copyIcon;
    const subject=quote.previousElementSibling,heading=subject?.tagName==='P' && /^(Naslov|Subject|Predmet):/i.test(subject.textContent.trim())?subject.textContent.trim()+'\n\n':'';
    button.copyText=heading+excerptText(quote).replace(/\n{3,}/g,'\n\n').trim();quote.append(button);
  }
  for(const pre of content.querySelectorAll('pre')){if(!pre.querySelector('code'))continue;const button=document.createElement('button');button.className='copy-code';button.dataset.copyCode='';button.setAttribute('aria-label','Kopiraj blok koda');button.title='Kopiraj blok koda';button.innerHTML=copyIcon;pre.append(button);}
  patchMessages(view,content);
  chatSearch.refresh();
  void fillChatDiffs(chat);
  restoreOpenChatFile();

  if(!messageSelectionMode && !chatSearch.isOpen() && !openChatFile && (jump || switched || wasAtBottom)){
    stickToBottom(view);
    const openingToken=stickToken;
    for(const img of view.querySelectorAll('img'))if(!img.complete)img.addEventListener('load',()=>{if(openingToken===stickToken)view.scrollTop=view.scrollHeight;},{once:true});
  }else{cancelStick();view.scrollTop=savedScroll;}
  if(focusOpenFile){focusOpenFile=false;view.querySelector('.chat-file.selected')?.scrollIntoView({block:'nearest'});}

}
function beginRename(id){const c=chats.find(c=>c.id===id);if(!c)return;rename={id,value:c.title};menuChat=id;renderPopover();const input=$('[data-menu-rename]');input.focus();input.select();}
async function saveRename(){if(!rename)return;const edit=rename;if(edit.value.trim() && edit.value.trim()!==chats.find(c=>c.id===edit.id)?.title)putChat(await api(`/api/chats/${edit.id}`,'PATCH',{title:edit.value}));rename=null;renderSidebar();renderChatNavigation();}
let newMenuAgent=null;
let modelDismissUntil=0;
function closeNewModels(){if(place?.kind==='model')clearPlace();newMenuAgent=null;$('#new-models').hidden=true;lastNewAgents='';if(meta)renderNewAgents();}
function showNewModels(agent){newMenuAgent=agent;const popup=$('#new-models'),anchor=$(`[data-new-agent="${agent}"]`);if(!anchor || anchor.disabled)return closeNewModels();const options=models[agent]?.models||[];popup.dataset.agent=agent;popup.innerHTML=options.map(m=>`<button type="button" class="model-card" data-new-model="${escape(m.id)}" data-new-default="${!!m.isDefault}" title="Novi čet u Neraspoređenim"><span>${escape(m.name)}</span></button>`).join('');popup.hidden=false;lastNewAgents='';renderNewAgents();}
$('#new-agents').onclick=e=>{const b=e.target.closest('[data-new-agent]');if(b){if(newMenuAgent===b.dataset.newAgent)closeNewModels();else showNewModels(b.dataset.newAgent);}};
function modelChoice(button){const agent=newMenuAgent,model=button.dataset.newModel;return {agent,model,effort:!model?'':button.dataset.newDefault==='true'?defaults[agent]?.effort||preferredEffort(models,agent,model):preferredEffort(models,agent,model)};}
async function createDroppedModel(choice,target){
 const parentId=target.dataset.row || target.dataset.agentChat;
 const parent=chats.find(c=>c.id===parentId);
 if(parentId && (!parent || parent.parentChatId))throw Error('Izaberi glavni čet, ne podagenta.');
 if(parent?.running)throw Error('Sačekaj da glavni agent završi pre dodavanja podagenta.');
 const folderId=target.hasAttribute('data-folder-out') || target.id==='chats'?null:target.dataset.folder || target.dataset.folderTarget;
 if(folderId==='draft')return;
 const chat=await api('/api/chats','POST',{settings:choice,...(parent?{parentChatId:parent.id}:folderId?{folderId}:{})});
 putChat(chat);closeNewModels();if(folderId)setOpenFolder(folderId);else if(parent?.folderId)setOpenFolder(parent.folderId);choose(chat.id);toast(parent?'Novi podagent je spreman.':'Novi čet je spreman.');
}
// Klik na model odmah pravi čet u Neraspoređenim, bez biranja foldera.
$('#new-models').onclick=e=>{const b=e.target.closest('[data-new-model]');if(!b)return;const choice=modelChoice(b);clearPlace();guard(()=>createDroppedModel(choice,$('#chats')));};
document.addEventListener('keydown',e=>{if(e.key==='Escape'){clearPlace();closeNewModels();}});

function chooseAgentCard(id){const chat=chats.find(c=>c.id===id);choose(id===active && chats.some(c=>c.id===chat?.parentChatId)?chat.parentChatId:id);}
function cardId(e){return e.target.closest('[data-row]')?.dataset.row || e.target.closest('[data-agent-chat]')?.dataset.agentChat;}
function placeLocation(node,kind){
 if(!node || node.closest('input,textarea,select,[data-children-toggle]'))return null;
 const selector=kind==='move'?'[data-row],[data-agent-chat],[data-folder],[data-folder-new],[data-child-out],[data-folder-target],[data-folder-out]':'[data-row],[data-agent-chat],[data-folder],[data-folder-target],[data-folder-out]';
 const target=node.closest(selector);
 if(!target || target.dataset.folder==='draft')return null;
 return target;
}
function clearPlace(){place=null;document.body.classList.remove('placing-move','placing-model','placing-subagent');document.querySelectorAll('.drop-hover,.place-source,.model-selected').forEach(el=>el.classList.remove('drop-hover','place-source','model-selected'));}
function finishPlace(target){
 const mode=place;if(!mode || !target)return false;
 if(mode.kind==='model'){clearPlace();guard(()=>createDroppedModel(mode.choice,target));return true;}
 const id=mode.id,parentId=target.dataset.row || target.dataset.agentChat;
 if(parentId===id){clearPlace();return true;}
 clearPlace();
 const folderId=target.hasAttribute('data-folder-out') || target.id==='chats'?null:target.dataset.folder ?? target.dataset.folderTarget;
 const chat=chats.find(c=>c.id===id);if(!chat)return true;
 if(parentId)guard(async()=>{const linked=await api(`/api/chats/${id}/link`,'POST',{parentChatId:parentId});putChat(linked);renderSidebar();render();toast('Čet je povezan kao podagent.');});
 else if(target.hasAttribute('data-folder-new'))guard(()=>addFolder(id));
 else if(chat.parentChatId || (chat.folderId||null)!==(folderId||null)){if(folderId)setOpenFolder(folderId);guard(()=>moveToFolder(id,folderId));}
 else toast('Čet je već na tom mestu.');
 return true;
}
function armMove(id){
 const chat=chats.find(c=>c.id===id);if(!chat)return;
 if(place?.kind==='model')closeNewModels();
 place={kind:'move',id};
 document.body.classList.add('placing-move');
 document.body.classList.toggle('placing-subagent',!!chat.parentChatId);
 menuChat=null;menuFolder=null;renderPopover();
 document.querySelectorAll('.place-source').forEach(el=>el.classList.remove('place-source'));
 document.querySelector(`[data-row="${CSS.escape(id)}"]`)?.classList.add('place-source');
 toast('Klikni folder ili čet.');
}
function markPlaceHover(node){
 if(!place)return;
 const target=placeLocation(node,place.kind);
 const self=place.kind==='move' && (target?.dataset.row || target?.dataset.agentChat)===place.id;
 document.querySelectorAll('.drop-hover').forEach(el=>{if(el!==target || self)el.classList.remove('drop-hover');});
 if(target && !self)target.classList.add('drop-hover');
}
async function copyMenuLink(text){
 try{if(navigator.clipboard?.writeText){await navigator.clipboard.writeText(text);return;}}catch{}
 const input=document.createElement('textarea');input.value=text;input.style.cssText='position:fixed;opacity:0';document.body.append(input);input.select();
 try{if(!document.execCommand('copy'))throw Error('Kopiranje nije uspelo.');}finally{input.remove();}
}
async function copyChatLink(id){await copyMenuLink(`${location.origin}/#chat=${encodeURIComponent(id)}`);toast('Adresa četa je kopirana.');}
async function copyFolderLink(id){await copyMenuLink(`${location.origin}/#folder=${encodeURIComponent(id)}`);toast('Link grupe je kopiran.');}
document.addEventListener('pointermove',e=>{if(place)markPlaceHover(e.target);});
$('#chat-drop-targets').onclick=e=>{if(place?.kind!=='move')return;const target=placeLocation(e.target,'move');if(target)finishPlace(target);};
 for(const list of [$('#chats')]){
  list.onclick=e=>{if(e.target.closest('[data-adaptive-toggle]')){toggleOpenFolder(adaptiveFolderId);return;}if(e.target.closest('[data-adaptive-panel]')){adaptivePanel.open();return;}if(e.target.closest('[data-adaptive-new]')){void proposeAdaptive();return;}const children=e.target.closest('[data-children-toggle]');if(children){toggleChildren(children.dataset.childrenToggle);return;}if(held && Date.now()<suppressClickUntil){held=false;if(place){const target=placeLocation(e.target,place.kind);const source=place.kind==='move' && (target?.dataset.row||target?.dataset.agentChat)===place.id;if(target && !source){finishPlace(target);return;}}return;}if(place){const target=placeLocation(e.target,place.kind);if(target){finishPlace(target);return;}}if(Date.now()<modelDismissUntil)return;if(list.id==='chats'){if(e.target.closest('[data-unassigned]'))return;if(e.target.closest('[data-folder-add]')){guard(addFolder);return;}if(e.target.closest('[data-folder-back]')){closeLastFolder();return;}if(e.target.closest('[data-folder-name]'))return;const folder=e.target.closest('[data-folder]');if(folder){if(folder.dataset.folder==='draft')return;if(menuFolder===folder.dataset.folder){menuFolder=null;renderPopover();}toggleOpenFolder(folder.dataset.folder);return;}}const id=cardId(e);if(!id)return;held=false;menuFolder=null;chooseAgentCard(id);};
  list.onpointerdown=e=>{if(e.target.closest('[data-children-toggle]'))return;const id=cardId(e);if(e.button!==0)return;if(newMenuAgent && place?.kind!=='model' && !e.target.closest('#new-models,[data-new-agent]')){closeNewModels();modelDismissUntil=Date.now()+500;return;}const folder=list.id==='chats'?e.target.closest('[data-folder]'):null;if(!id && !folder)return;held=false;holdStart={x:e.clientX,y:e.clientY,id,folderId:folder?.dataset.folder};const card=e.target.closest('[data-row],[data-agent-chat],[data-folder]');card?.classList.add('pressed');if(place)return;holdTimer=setTimeout(()=>{if(e.target.closest('[data-folder-name]'))return;held=true;card?.classList.remove('pressed');if(folder){openFolderMenu(folder.dataset.folder);return;}menuFolder=null;menuChat=id;rename=null;renderPopover();},450);};
 list.onpointermove=e=>{if(holdStart&&Math.hypot(e.clientX-holdStart.x,e.clientY-holdStart.y)>10){clearTimeout(holdTimer);list.querySelectorAll('.pressed').forEach(c=>c.classList.remove('pressed'));}};
 list.addEventListener('pointerleave',e=>{clearTimeout(holdTimer);holdStart=null;list.querySelectorAll('.pressed').forEach(c=>c.classList.remove('pressed'));});
 for(const name of ['pointerup','pointercancel'])list.addEventListener(name,e=>{const heldMenu=name==='pointerup' && held?holdStart:null;clearTimeout(holdTimer);if(held)suppressClickUntil=Date.now()+400;holdStart=null;list.querySelectorAll('.pressed').forEach(c=>c.classList.remove('pressed'));if(heldMenu){if(heldMenu.folderId)openFolderMenu(heldMenu.folderId);else if(heldMenu.id){menuFolder=null;menuChat=heldMenu.id;rename=null;renderPopover();}}});
 list.oncontextmenu=e=>{if(holdStart && e.pointerType!=='mouse'){e.preventDefault();return;}const folder=list.id==='chats' && !e.target.closest('[data-folder-name]')?e.target.closest('[data-folder]'):null;if(folder){e.preventDefault();held=true;suppressClickUntil=Date.now()+400;openFolderMenu(folder.dataset.folder);return;}if(cardId(e)){e.preventDefault();held=true;suppressClickUntil=Date.now()+400;menuFolder=null;menuChat=cardId(e);renderPopover();}};
 list.onkeydown=e=>{if(e.target.closest('[data-adaptive-toggle]') && (e.key==='Enter'||e.key===' ')){e.preventDefault();toggleOpenFolder(adaptiveFolderId);return;}if(e.target.matches('[data-folder-name]') && e.key==='Escape' && folderRename?.draft){e.preventDefault();e.stopPropagation();folderRename=null;lastSidebar='';renderSidebar();return;}if(e.target.matches('[data-folder-name]') && e.key==='Enter'){e.preventDefault();guard(saveFolderRename);return;}if(place && (e.key==='Enter'||e.key===' ') && !e.target.closest('[data-folder-name]')){const target=placeLocation(e.target,place.kind);if(target){e.preventDefault();finishPlace(target);return;}}const folder=e.target.closest('[data-folder]');if(folder && !e.target.closest('[data-folder-name]') && (e.key==='Enter'||e.key===' ')){e.preventDefault();toggleOpenFolder(folder.dataset.folder);return;}const id=cardId(e);if(id&&(e.key==='Enter'||e.key===' ')){e.preventDefault();chooseAgentCard(id);}};
}

$('#chats').addEventListener('focusout',e=>{if(e.target.matches('[data-folder-name]'))guard(saveFolderRename);});
$('#chats').addEventListener('input',e=>{if(e.target.matches('[data-folder-name]') && folderRename)folderRename.value=e.target.value;});
$('#chat-popover').oninput=e=>{if(e.target.matches('[data-menu-rename]'))rename={id:e.target.dataset.renameChat,value:e.target.value};};
$('#chat-popover').onkeydown=e=>{if(e.target.matches('[data-menu-folder-name],[data-folder-emoji]') && e.key==='Enter'){e.preventDefault();e.target.blur();return;}if(e.target.matches('[data-menu-rename]')&&e.key==='Enter'){e.preventDefault();e.target.blur();}};
$('#chats').onscroll=positionPopover;
$('#chat-popover').onclick=e=>guard(async()=>{
  const action=e.target.closest('[data-action]');if(!action)return;const id=action.dataset.id;
  if(action.dataset.action==='copy-folder-link'){await copyFolderLink(id);return;}
  if(['copy-folder-reference','copy-folder-full'].includes(action.dataset.action)){const folder=folders.find(f=>f.id===id);if(!folder)return;if(action.dataset.action==='copy-folder-full'){const members=JSON.parse(folderContext(folder,chats,{modelName}).reference.split('Agenti: ')[1].split('\n')[0]);await Promise.all(members.map(c=>loadFullChat(c.id)));}const snapshot=folderContext(folder,chats,{modelName});await navigator.clipboard.writeText(action.dataset.action==='copy-folder-reference'?snapshot.reference:snapshot.full);toast(action.dataset.action==='copy-folder-reference'?'Referenca foldera je kopirana.':'Kontekst foldera je kopiran.');return;}
  if(action.dataset.action==='shared-folder'){const folder=folders.find(f=>f.id===id);if(!folder)return;const saved=await api(`/api/folders/${id}`,'PATCH',{shared:!folder.shared});folders=folders.map(f=>f.id===id?saved:f);lastSidebar='';renderSidebar();toast(saved.shared?'Agenti u folderu dele kontekst.':'Deljenje konteksta je isključeno.');return;}
  if(action.dataset.action==='folder-color'){const saved=await api(`/api/folders/${id}`,'PATCH',{color:Number(action.dataset.color)});folders=folders.map(f=>f.id===id?saved:f);lastSidebar='';renderSidebar();renderPopover();return;}
  if(action.dataset.action==='generate-folder-icon'){if(generatingFolderIcons.has(id))return;generatingFolderIcons.add(id);renderPopover();try{const saved=await api(`/api/folders/${id}/icon`,'POST',{});folders=folders.map(f=>f.id===id?saved:f);lastSidebar='';renderSidebar();toast('Emotikon i boja su izabrani.','success');}finally{generatingFolderIcons.delete(id);renderPopover();}return;}
  if(action.dataset.action==='rename-folder'){menuFolder=null;folderRename={id,value:folders.find(folder=>folder.id===id)?.name||''};lastSidebar='';renderSidebar();renderPopover();const input=$('[data-folder-name]');input?.focus();input?.select();return;}
  if(action.dataset.action==='delete-folder'){const name=folders.find(folder=>folder.id===id)?.name||'folder';menuFolder=null;renderPopover();const inside=chats.some(chat=>chat.folderId===id && !chat.parentChatId);if(!inside){await removeFolder(id);return;}pendingFolderDelete=id;$('#delete-title').textContent=`Obriši folder „${name}“? Četovi ostaju u listi.`;$('#delete-only').textContent='Obriši folder';$('#delete-family').hidden=true;$('#delete-dialog').showModal();return;}
  const c=chats.find(c=>c.id===id);if(!c)return;
  if(action.dataset.action==='generate-title'){if(generatingTitles.has(id))return;generatingTitles.add(id);action.disabled=true;menuChat=null;renderPopover();renderSidebar();renderChatNavigation();try{if(rename?.id===id)await saveRename();const saved=await api(`/api/chats/${id}/generate-title`,'POST',{});putChat(saved);rename=null;toast('Naslov je ažuriran.','success');}catch(error){toast(error.message,'error');}finally{generatingTitles.delete(id);renderSidebar();renderChatNavigation();renderPopover();}return;}
  if(action.dataset.action==='unlink'){const saved=await api(`/api/chats/${id}/unlink`,'POST',{});putChat(saved);menuChat=null;render();toast('Podagent je izdvojen u samostalan čet.');return;}
  if(action.dataset.action==='toggle-progress'){if(progressVisible.has(id))progressVisible.delete(id);else progressVisible.add(id);try{localStorage.setItem('agent-desk-progress-visible',JSON.stringify([...progressVisible]));}catch{}lastMessages='';render();renderPopover();return;}
  if(action.dataset.action==='copy-md-full'){await loadFullChat(id);await navigator.clipboard.writeText(exportMessages(chats,id,chats.find(chat=>chat.id===id).messages.map(m=>m.id),{modelName,includeProgress:true}));toast('Čet sa tokom rada je kopiran.');return;}
  if(action.dataset.action==='copy-md'){await loadFullChat(id);await navigator.clipboard.writeText(exportMessages(chats,id,chats.find(chat=>chat.id===id).messages.map(m=>m.id),{modelName,includeProgress:false}));toast('Čet je kopiran kao Markdown.');return;}
  if(action.dataset.action==='rename'){beginRename(id);return;}
  if(action.dataset.action==='adaptive-propose'){menuChat=null;renderPopover();await proposeAdaptive(c.settings.cwd);return;}
  if(action.dataset.action==='link'){await copyChatLink(id);return;}
  if(action.dataset.action==='move'){armMove(id);return;}
  if(action.dataset.action==='reveal'){await api(`/api/chats/${id}/reveal`,'POST',{});return;}
  if(action.dataset.action==='record'){const record=await api(`/api/chats/${id}/record`,'POST',{});closePanels();$('#record-text').value=record.text;$('#record-panel').hidden=false;for(const el of [$('#conversation'),$('.composer-area'),$('#usage-details'),$('#change-column')].filter(Boolean))el.inert=true;menuChat=null;renderSidebar();$('#record-text').focus();return;}
  if(action.dataset.action==='fork'){const copy=await api(`/api/chats/${id}/fork`,'POST',{});putChat(copy);choose(copy.id);}
  if(action.dataset.action==='stop'){await api(`/api/chats/${id}/stop`,'POST');menuChat=null;renderSidebar();}
  if(action.dataset.action==='delete'){pendingFolderDelete=null;pendingReset=null;$('#delete-only').textContent='Arhiviraj ovaj čet';deleteTarget=id;$('#delete-title').textContent=`Arhiviraj čet „${c.title}“ na 30 dana?`;if(chats.some(x=>x.parentChatId===id)){$('#delete-family').hidden=false;$('#delete-dialog').showModal();}else await removeChat(false);}
});
$('#chat-popover').onchange=e=>guard(async()=>{
  if(e.target.matches('[data-menu-rename]')){rename={id:e.target.dataset.renameChat,value:e.target.value};await saveRename();return;}
  if(e.target.matches('[data-menu-folder-name]')){const input=e.target,name=input.value.trim(),id=input.dataset.folderId;const folder=folders.find(f=>f.id===id);if(!folder)return;if(name!==folder.name){const saved=await api(`/api/folders/${id}`,'PATCH',{name});folders=folders.map(f=>f.id===id?saved:f);lastSidebar='';renderSidebar();}return;}
  if(e.target.matches('[data-folder-emoji]')){const input=e.target,id=input.dataset.folderId;try{const saved=await api(`/api/folders/${id}`,'PATCH',{emoji:input.value});folders=folders.map(f=>f.id===id?saved:f);input.value=saved.emoji||'';lastSidebar='';renderSidebar();renderPopover();}catch(error){input.value=folders.find(f=>f.id===id)?.emoji||'';throw error;}return;}

});

document.addEventListener('pointerdown',e=>{const inModels=e.target.closest('#new-models,[data-new-agent]');const loc=place && placeLocation(e.target,place.kind);if(newMenuAgent && !inModels){if(!(place?.kind==='model' && loc)){closeNewModels();modelDismissUntil=Date.now()+500;}}else if(place?.kind==='move' && !loc && !e.target.closest('#chat-drop-targets')){clearPlace();}if(menuFolder && !e.target.closest(`#chat-popover,[data-folder="${menuFolder}"]`)){menuFolder=null;renderPopover();}if(menuChat && !e.target.closest('#chat-popover,#chat-options,[data-row],[data-options],[data-chat],[data-agent-chat]')){menuChat=null;renderPopover();}});
let warmupSettings=null,warmupPoll,warmupExpiry,warmupSending=false;
const scheduleDayNames=['Ponedeljak','Utorak','Sreda','Četvrtak','Petak','Subota','Nedelja'];
function excerptText(node){
 if(node.nodeType===3)return node.textContent;
 if(node.nodeType!==1)return '';
 if(node.tagName==='BR')return '\n';
 if(node.tagName==='BUTTON' || node.classList.contains('paragraph-duration'))return '';
 const text=[...node.childNodes].map(excerptText).join('');
 if(node.tagName==='LI'){const list=node.parentElement,number=Number(list.getAttribute('start') || 1)+[...list.children].indexOf(node);return (list.tagName==='OL'?number+'. ':'- ')+text.trim()+'\n';}
 return text+(['P','H1','H2','H3','H4','H5','H6','UL','OL','BLOCKQUOTE','PRE'].includes(node.tagName)?'\n\n':'');
}
function renderWarmupDays(){const days=warmupSettings?.days ?? (warmupSettings?.enabled===false?[]:[1,2,3,4,5,6,7]);$('#warmup-days').innerHTML=scheduleDayNames.map((name,index)=>`<button type="button" data-warmup-day="${index+1}" aria-label="${name}" title="${name}" aria-pressed="${days.includes(index+1)}">${name.slice(0,2)}</button>`).join('');}
const warmupMarkLifetime=60*60*1000;
function warmupMark(agent){
 const state=warmupSettings,last=state?.runs?.[0];
 if(!last)return null;
 if(state.running && agent===state.currentAgent)return {status:'running',label:'Slanje u toku'};
 const result=last.results?.find(r=>r.agent===agent);
 if(!result)return null;
 const at=Date.parse(result.finishedAt || last.completedAt || '');
 if(Number.isFinite(at) && Date.now()-at>=warmupMarkLifetime)return null;
 return result.status==='done'?{status:'done',label:'Poruka poslata'}:{status:'error',label:result.error || 'Slanje nije uspelo'};
}
function renderWarmupStatus(){
 const state=warmupSettings,progress=$('#warmup-progress');
 $('#warmup-run').disabled=!state || state.running || warmupSending;
 for(const button of document.querySelectorAll('[data-header-action="warmup"],[data-logo-action="warmup"]'))button.disabled=warmupSending || !!state?.running;
 $('#warmup-status').textContent=!state?'Za ovu opciju potrebno je ponovno pokretanje servera.':'';
 progress.hidden=true;progress.replaceChildren();
 for(const row of $('#warmup-agents').children){
  const mark=row.querySelector('.warmup-send-mark'),info=warmupMark(row.dataset.warmupAgent);
  if(!mark)continue;
  mark.hidden=!info;mark.className='warmup-send-mark'+(info?' '+info.status:'');mark.textContent=info?.status==='done'?'✓':info?.status==='error'?'!':'';
  mark.title=info?.label || '';if(info)mark.setAttribute('aria-label',info.label);else mark.removeAttribute('aria-label');
 }
 clearTimeout(warmupPoll);clearTimeout(warmupExpiry);
 if(state?.running)warmupPoll=setTimeout(()=>guard(async()=>{warmupSettings=await api('/api/warmup');renderWarmupStatus();}),1500);
 const last=state?.runs?.[0];
 const due=(last?.results||[]).map(r=>Date.parse(r.finishedAt || last.completedAt || '')).filter(t=>Number.isFinite(t)).map(t=>t+warmupMarkLifetime).filter(t=>t>Date.now());
 if(due.length)warmupExpiry=setTimeout(()=>{if(!$('#defaults').hidden)renderWarmupStatus();},Math.min(...due)-Date.now()+200);
}
function renderWarmup(){
 renderWarmupDays();
 $('#warmup-time').value=warmupSettings?.time || '08:00';$('#warmup-auto').checked=warmupSettings?.auto!==false;
 $('#warmup-agents').innerHTML=meta.agents.map(a=>`<label class="warmup-agent" data-warmup-agent="${a.id}"><span><input type="checkbox" ${a.available && (warmupSettings?.agents || []).includes(a.id)?'checked':''} ${a.available?'':'disabled'}> ${escape(a.name)}</span><span class="warmup-agent-choice"><span class="warmup-send-mark" hidden></span><select aria-label="Model za kratku poruku ${escape(a.name)}" ${a.available?'':'disabled'}><option value="">Automatski: lakši model</option>${modelOptions({agent:a.id,model:warmupSettings?.models?.[a.id] || ''}).replace(/^<option[^>]*>Podrazumevani<\/option>/,'')}</select></span></label>`).join('');
 for(const row of $('#warmup-agents').children)row.querySelector('select').value=warmupSettings?.models?.[row.dataset.warmupAgent] || '';
 renderWarmupStatus();
}
async function saveWarmup(){
 const rows=[...$('#warmup-agents').children].filter(row=>row.querySelector('input').checked);
 const days=[...$('#warmup-days').querySelectorAll('[aria-pressed="true"]')].map(button=>Number(button.dataset.warmupDay));
 warmupSettings=await api('/api/warmup','PUT',{enabled:days.length>0,days,auto:$('#warmup-auto').checked,time:$('#warmup-time').value,agents:rows.map(row=>row.dataset.warmupAgent),models:Object.fromEntries(rows.map(row=>[row.dataset.warmupAgent,row.querySelector('select').value]))});
 renderWarmupStatus();
}
let settingsSaveQueue=Promise.resolve();
function queueSettingsSave(work){const pending=settingsSaveQueue.catch(()=>{}).then(work);settingsSaveQueue=pending;return pending;}
$('#warmup-days').onclick=e=>{const button=e.target.closest('[data-warmup-day]');if(!button)return;button.setAttribute('aria-pressed',String(button.getAttribute('aria-pressed')!=='true'));guard(()=>queueSettingsSave(saveWarmup));};
$('#warmup-settings').onchange=e=>{if(e.target.id==='warmup-time' && !e.target.validity.valid)return;guard(()=>queueSettingsSave(saveWarmup));};
$('#warmup-time').oninput=e=>{const input=e.target;if(/^\d{4}$/.test(input.value))input.value=input.value.slice(0,2)+':'+input.value.slice(2);if(input.validity.valid && input.value.length===5)guard(()=>queueSettingsSave(saveWarmup));};
async function sendWarmupNow(){
 if(warmupSending || warmupSettings?.running)return;
 warmupSending=true;renderWarmupStatus();
 try{await settingsSaveQueue;warmupSettings=await api('/api/warmup/run','POST',{});toast('Pokrenuto je slanje poruke izabranim agentima.');}
 finally{warmupSending=false;renderWarmupStatus();}
}
$('#warmup-run').onclick=()=>guard(async()=>{await queueSettingsSave(saveWarmup);await sendWarmupNow();});
function renderDefaults() {$('#default-agents').innerHTML=meta.agents.map(a=>{const s={agent:a.id,...defaults[a.id]};return `<div class="default-agent" data-default-agent="${a.id}"><img src="${agentLogos[a.id]}" alt="${escape(a.name)}" title="${escape(a.name)}" width="22" height="22"><select data-default-model aria-label="Podrazumevani model ${escape(a.name)}">${modelOptions(s)}</select><select data-default-effort aria-label="Podrazumevano razmišljanje ${escape(a.name)}" ${effortsFor(a.id,s.model).length?'':'disabled'}>${effortOptions(s)}</select></div>`;}).join('');}
const gmailSettings=createGmailSettings({root:$('#gmail-settings'),api,phoneRemote});
function showDefaults(open) {document.body.classList.toggle('settings-view',open);if(open)refreshPhone();$('#defaults').hidden=!open;if(open)void gmailSettings.refresh();else gmailSettings.pause();for(const el of [$('#conversation'),$('.composer-area'),$('#usage-details'),$('#change-column')].filter(Boolean))el.inert=open;if(open){closePanels();if(!mobileNavigation() && !matchMedia('(pointer:coarse)').matches)$('#default-agents select')?.focus();}else focusPrompt();}
function paintSettings(){renderDefaults();renderWarmup();$('#statistics-open').hidden=phoneRemote;$('#statistics-download').hidden=!phoneRemote;fillTitleSettings();renderKeyboardToggle();menuChat=null;renderPopover();}
let settingsDirty=false,settingsGeneration=0;
$('#defaults').addEventListener('change',()=>{settingsDirty=true;});
const toggleSettings=()=>guard(async()=>{const form=$('#defaults');if(!form.hidden){showDefaults(false);return;}const generation=++settingsGeneration;settingsDirty=false;paintSettings();showDefaults(true);const [nextDefaults,nextTitles,nextWarmup]=await Promise.all([api('/api/defaults'),phoneRemote?Promise.resolve(titleSettings):api('/api/title-settings'),api('/api/warmup').catch(()=>null)]);if(form.hidden || settingsDirty || generation!==settingsGeneration)return;defaults=nextDefaults;if(!phoneRemote)titleSettings=nextTitles;warmupSettings=nextWarmup;paintSettings();showDefaults(true);api('/api/models').then(value=>{const same=JSON.stringify(models)===JSON.stringify(value);models=value;if(same || form.hidden || settingsDirty || generation!==settingsGeneration)return;renderDefaults();}).catch(()=>{});});
$('#default-agents').onchange=e=>{
 const row=e.target.closest('[data-default-agent]');if(!row)return;
 if(e.target.matches('[data-default-model]')){const s={agent:row.dataset.defaultAgent,model:e.target.value,effort:preferredEffort(models,row.dataset.defaultAgent,e.target.value)},select=row.querySelector('[data-default-effort]');select.innerHTML=effortOptions(s);select.disabled=!effortsFor(s.agent,s.model).length;}
 const next=Object.fromEntries([...$('#default-agents').querySelectorAll('[data-default-agent]')].map(row=>[row.dataset.defaultAgent,{model:row.querySelector('[data-default-model]').value,effort:row.querySelector('[data-default-effort]').value}]));
 guard(()=>queueSettingsSave(async()=>{defaults=await api('/api/defaults','PUT',next);}));
};
$('#google-title-key').onchange=()=>{if(!phoneRemote)guard(()=>queueSettingsSave(saveTitleSettings));};
$('#defaults-form').onsubmit=e=>{e.preventDefault();e.target.querySelector(':focus')?.blur();};
async function loadChatFileDiff(body,filePath){
 const chat=current();if(!chat || !body)return;
 const key=`${chat.id}\n${body.closest('[data-message]')?.dataset.message || ''}\n${filePath}`;
 const cached=chatDiffCache.get(key);
 const updateStats=diff=>{const row=body.closest('.chat-file-block')?.querySelector('.chat-file-stats');if(row)row.outerHTML=fileDiffStatsHtml(diff,escape,{known:true});};
 if(cached){body.innerHTML=cached.html;updateStats(cached.diff);applyPreviewLines();return;}
 if(body.querySelector('.change-diff')){applyPreviewLines();return;}
 const abs=touchAbsolute(filePath);
 if(abs && /\.(png|jpe?g|webp|gif|avif)$/i.test(abs)){
  const src='/files'+abs.split('/').map(encodeURIComponent).join('/');
  body.innerHTML='<p class="change-missing">Učitavam sliku…</p>';
  try{
   const response=await fetch(src);if(!response.ok)throw Error();
   const blob=await response.blob();if(!body.isConnected || body.hidden)return;
   const url=URL.createObjectURL(blob),image=document.createElement('img');
   image.className='chat-file-image';image.alt=filePath;
   image.onload=()=>URL.revokeObjectURL(url);
   image.onerror=()=>{URL.revokeObjectURL(url);if(body.isConnected)body.innerHTML='<p class="change-missing">Pregled slike nije dostupan.</p>';};
   body.replaceChildren(image);image.src=url;
  }catch{if(body.isConnected && !body.hidden)body.innerHTML='<p class="change-missing">Slika više nije dostupna na toj putanji.</p>';}
  return;
 }
 body.innerHTML='<p class="change-missing">Učitavam izmenu…</p>';
 try{
  const data=await api(`/api/chats/${chat.id}/files?${new URLSearchParams({view:'diff',path:filePath})}`);
  if(!body.isConnected || body.hidden)return;
  let html='<p class="change-missing">Nema sačuvanog diff-a ove poruke ni trenutnih tekstualnih izmena u Gitu.</p>';
  if(data?.tooBig)html='<p class="change-missing">Fajl je prevelik za pregled.</p>';
  else if(data?.diff)html=`<p class="change-missing">Trenutne izmene u Gitu; diff ovog odgovora nije sačuvan.</p>${data.truncated?'<p class="change-missing">Prikazan je samo početak izmene; broj važi za prikazane redove.</p>':''}${githubDiffHtml(data.diff,escape)}`;
  if(data?.diff){chatDiffCache.set(key,{html,diff:data.diff});updateStats(data.diff);}
  if(!data?.tooBig && !data?.truncated && !data?.diff)updateStats('');
  body.innerHTML=html;applyPreviewLines();
 }catch(error){if(body.isConnected && !body.hidden)body.innerHTML=`<p class="change-missing">${escape(error?.message||'Izmena još nije učitana.')}</p>`;}
}
function restoreOpenChatFile(){document.body.classList.toggle('file-preview-open',fileWide);const open=openChatFile?.chatId===active;if(!open){if(!fileWide && (previewPath||!$('#files-preview')?.hidden)){previewPath='';previewToken++;const box=$('#files-preview');if(box){box.hidden=true;box.innerHTML='';}}return;}const article=document.querySelector(`[data-message="${CSS.escape(openChatFile.messageId)}"]`);const body=article?.querySelector('.chat-file.selected')?.closest('.chat-file-block')?.querySelector('.chat-diff-body');if(body && !body.hidden){applyPreviewLines();void loadChatFileDiff(body,openChatFile.path);}}
$('#conversation').onclick=e=>{const pathLink=e.target.closest('[data-file-path]');if(pathLink && (e.metaKey || e.ctrlKey) && !phoneRemote){e.preventDefault();e.stopPropagation();promptFocusHold=Date.now()+600;guard(()=>api('/api/open-file','POST',{path:pathLink.dataset.filePath,reveal:true}));return;}const inlineDiff=e.target.closest('.chat-diff-body .change-diff:not(.github-diff)');if(inlineDiff && !window.getSelection()?.toString()){e.preventDefault();promptFocusHold=Date.now()+600;previewFullLines=!previewFullLines;applyPreviewLines();return;}const revealButton=e.target.closest('[data-reveal-file]');if(revealButton){e.preventDefault();promptFocusHold=Date.now()+600;const filePath=revealButton.dataset.revealFile;guard(async()=>{if(phoneRemote){throw Error('Finder je dostupan samo na računaru.');}await api('/api/open-file','POST',{path:filePath,reveal:true});});return;}const fileButton=e.target.closest('[data-chat-file]');if(fileButton){e.preventDefault();promptFocusHold=Date.now()+600;const messageId=fileButton.closest('[data-message]')?.dataset.message;const path=fileButton.dataset.chatFile;const same=openChatFile?.chatId===active && openChatFile?.messageId===messageId && openChatFile?.path===path;if(same)closeOpenFile();else{openChatFile={chatId:active,messageId,path};focusOpenFile=true;fileWide=true;}lastMessages='';render();return;}const preview=e.target.closest('.attachment-thumbs a');if(preview && (phoneRemote || mobileNavigation())){e.preventDefault();const image=preview.querySelector('img');if(image){openAttachmentPreview(preview.href,image.alt);return;}if(/\.pdf$/i.test(preview.getAttribute('title')||'')){openPdfPreview(preview.href);return;}guard(async()=>{const response=await fetch(preview.href);if(!response.ok){const data=await response.json().catch(()=>({}));throw Error(data.error || 'Prilog nije otvoren.');}const url=URL.createObjectURL(await response.blob());const link=document.createElement('a');link.href=url;link.download=preview.getAttribute('title') || 'prilog';link.click();setTimeout(()=>URL.revokeObjectURL(url),60000);});return;}const selection=e.target.closest('[data-select-message]'),article=e.target.closest('[data-message]');const speakButton=e.target.closest('[data-speak]');if(speakButton){e.preventDefault();guard(()=>speakMessage(speakButton.dataset.speak));return;}if(selection || (messageSelectionMode && article && !e.target.closest('[data-copy-code],[data-copy-text],[data-copy-message],[data-copy-message-full],[data-speak],.attachment-thumbs a'))){e.preventDefault();const id=selection?.dataset.selectMessage || article.dataset.message;if(!current()?.messages.some(m=>m.id===id && m.text))return;messageSelectionMode=true;const all=current().messages.filter(m=>m.text).map(m=>m.id);if(e.shiftKey && selectionAnchor && all.includes(selectionAnchor)){const a=all.indexOf(selectionAnchor),b=all.indexOf(id);for(const selected of all.slice(Math.min(a,b),Math.max(a,b)+1))selectedMessages.add(selected);}else{if(selectedMessages.has(id))selectedMessages.delete(id);else selectedMessages.add(id);selectionAnchor=id;}refreshMessageSelection();$('#conversation').focus({preventScroll:true});return;}const link=e.target.closest('[data-local-file]');if(link){e.preventDefault();guard(async()=>{if(phoneRemote){$('#local-file-frame').src=link.href;$('#local-file-dialog').showModal();}else await api('/api/open-file','POST',{path:link.dataset.localFile});});return;}guard(async()=>{const button=e.target.closest('[data-copy-code],[data-copy-text],[data-copy-message],[data-copy-message-full]');if(!button)return;const text=button.hasAttribute('data-copy-text')?button.copyText:button.hasAttribute('data-copy-code')?button.closest('pre').querySelector('code').textContent:(()=>{const message=current()?.messages.find(m=>m.id===(button.dataset.copyMessageFull||button.dataset.copyMessage));return message?copiedMessage(message,{modelName,shares:current()?.limitShares,includeProgress:button.hasAttribute('data-copy-message-full')}):undefined;})();if(text===undefined)return;const originalHtml=button.innerHTML,originalTitle=button.title;await navigator.clipboard.writeText(text);button.textContent='✓';button.title='Kopirano';setTimeout(()=>{if(button.isConnected){button.innerHTML=originalHtml;button.title=originalTitle;}},1500);});};
// Prekinut odgovor se nastavlja novom porukom u istoj sesiji; tekst iz unosa ima prednost.
$('#conversation').addEventListener('click',e=>{const prev=e.target.closest('[data-previous-chat]');if(prev)return guard(()=>openPreviousChat(prev.dataset.previousChat));const next=e.target.closest('[data-next-chat]');if(next){if(!chats.some(c=>c.id===next.dataset.nextChat))return toast('Nastavak više ne postoji.','error');return choose(next.dataset.nextChat);}if(e.target.closest('[data-unlock-chat]'))return guard(async()=>{putChat(await api(`/api/chats/${active}/unlock`,'POST',{}));render();toast('Deo je otključan, možeš da pišeš i ovde.','success');});if(!e.target.closest('[data-continue-reply]'))return;const input=$('#prompt');if(!input.value.trim())input.value='Nastavi gde si stao.';$('#composer').requestSubmit();});
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
  speechSelection=selectedSpeechText();
});
async function readSelectedAnswer(){
  const chosen=speechSelection?.chatId===active?speechSelection:selectedSpeechText();
  if(chosen){await speakMessage(chosen.messageId,chosen.text);return;}
  const message=current()?.messages.findLast(m=>m.role==='assistant' && m.text?.trim());
  if(message)await speakMessage(message.id);
  else toast('Označi tekst poruke za čitanje.');
}
function speakingId(){const chat=current();return speechClip && speechClip.chatId===chat?.id && (speechClip.loading || !speechAudio.paused) ? speechClip.messageId : '';}
function speechClock(seconds){const value=Number.isFinite(seconds)&&seconds>0?Math.floor(seconds):0;return `${Math.floor(value/60)}:${String(value%60).padStart(2,'0')}`;}
function renderSpeechBar(){const bar=$('#speech-bar');if(!bar)return;if(!speechClip || speechClip.chatId!==active){bar.hidden=true;return;}bar.hidden=false;$('#speech-label').textContent=speechClip.label || '';const playing=!speechAudio.paused && !speechClip.loading;$('#speech-toggle').innerHTML=playing?speakStopIcon:speakIcon;$('#speech-toggle').setAttribute('aria-label',playing?'Pauziraj':'Pusti');const duration=speechAudio.duration,time=speechAudio.currentTime||0;if(!speechSeeking && Number.isFinite(duration) && duration>0)$('#speech-seek').value=String(Math.round(time/duration*1000));$('#speech-time').textContent=`${speechClock(time)} / ${speechClock(duration)}`;}
speechAudio.ontimeupdate=()=>renderSpeechBar();
speechAudio.onloadedmetadata=()=>renderSpeechBar();
speechAudio.onplay=()=>{lastMessages='';if(appReady)render();renderSpeechBar();};
speechAudio.onpause=()=>{lastMessages='';if(appReady)render();renderSpeechBar();};
speechAudio.onended=()=>renderSpeechBar();
speechAudio.onerror=()=>{if(speechClip && !speechClip.loading)toast('Snimak se ne može pustiti u pregledaču.','error');};
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
function finishMessageInput(id){
 if(active!==id)return;
 const input=$('#prompt');
 if(mobileNavigation() && localStorage.getItem('leaveAfterSend')!=='0'){
  input.blur();
  clearMessageSelection();showChatList();
 }else if(mobileNavigation())input.blur();else input.focus();
}
$('#composer').onsubmit=e=>{e.preventDefault();guard(async()=>{
  const input=$('#prompt'),text=input.value.trim() || ((linkedFiles.get(active)||[]).length?'Pogledaj priložene fajlove.':'');if(!text || current()?.running || submitting || uploading || !connected)return;if(needsCacheConfirm(current())){const ok=await askCacheTax();if(!ok || current()?.running || submitting || uploading || !connected)return;}submitting=true;
  const files=[...(linkedFiles.get(active)||[])],requestId=crypto.randomUUID();input.value='';recordDraft(active,'');linkedFiles.delete(active);renderLinkedFiles();resizePrompt();if(!mobileNavigation())input.focus();
  let id=active;pendingMessages.set(id,{id:requestId,requestId,role:'user',text,status:'sending',createdAt:Date.now()});lastMessages='';render();
  try{if(!current()){const created=await create();if(!created)return;pendingMessages.delete(id);id=created.id;pendingMessages.set(id,{id:requestId,requestId,role:'user',text,status:'sending',createdAt:Date.now()});render();}const sent=await api(`/api/chats/${id}/send`,'POST',{text,files,requestId});pendingMessages.delete(id);if(sent?.chat)id=followContinuation(id,sent.chat);finishMessageInput(id);}
  catch(error){let accepted=false;try{if(id){const chat=await api(`/api/chats/${id}`);putChat(chat);accepted=chat.messages.some(m=>m.requestId===requestId);}}catch{}pendingMessages.delete(id);if(!accepted){const old=drafts.get(id)||'';recordDraft(id,text+(old?'\n'+old:''));linkedFiles.set(id,files);if(active===id){input.value=text+(input.value?'\n'+input.value:'');renderLinkedFiles();resizePrompt();}throw error;}else finishMessageInput(id);}
  finally{submitting=false;lastMessages='';render();}
});};
let handoffBusy=false;
// Server je sam nastavio čet u novom: stari ide sa liste, a otvoren ostaje nastavak.
function followContinuation(id,next){chats=chats.filter(c=>c.id!==id);putChat(next);if(active===id)choose(next.id,{replaceHistory:true});return next.id;}
// Pregled prethodnog četa ne vraća arhivirani razgovor u aktivnu listu.
async function openPreviousChat(id){
 const archiveId=current()?.continuedFromArchive;
 let previous;
 if(chats.some(c=>c.id===id))previous=await api(`/api/chats/${id}`);
 else {
  if(!archiveId)throw new Error('Prethodni čet više nije u arhivi.');
  previous=(await api(`/api/archive/${archiveId}/chats/${id}`)).chat;
 }
 $('#archive-preview-title').textContent=previous.title || 'Prethodni čet';
 $('#archive-preview-content').innerHTML=previous.messages.filter(m=>m.text).map(m=>`<article class="message ${m.role==='user'?'user':'assistant'}"><small>${m.role==='user'?'Korisnik':'Agent'}</small><div class="message-body">${markdown(visibleMessage(answerText(m)))}</div></article>`).join('') || '<p>Čet nema poruka.</p>';
 const dialog=$('#archive-preview');if(!dialog.open)dialog.showModal();
 $('#archive-preview-content').scrollTop=0;
}
$('#archive-preview-close').onclick=()=>$('#archive-preview').close();
function renderHandoff(){
  const chat=current(),bar=$('#handoff-bar'),offer=handoffOffer(chat),view=$('#conversation');
  // Traka iznad polja za unos smanjuje prostor poruka: ako je čet bio na dnu, vrati ga na dno, inače pomeri tekst za visinu trake.
  const before=view?{client:view.clientHeight,nearBottom:view.scrollHeight-view.scrollTop-view.clientHeight<90}:null;
  if(offer){
    bar.hidden=false;bar.innerHTML=`<span>${escape(offer.text.replace('Možeš da nastaviš u novom četu sa sažetkom.','Sledeća poruka sama prelazi u nov čet sa sažetkom i poslednjim porukama.'))}</span>`;
  }else bar.hidden=true;
  if(before)requestAnimationFrame(()=>{const lost=before.client-view.clientHeight;if(before.nearBottom)view.scrollTop=view.scrollHeight;else if(lost>0)view.scrollTop+=lost;});
}
$('#handoff-bar').onclick=e=>guard(async()=>{
  if(!e.target.closest('[data-handoff]') || handoffBusy || current()?.running || !active)return;
  handoffBusy=true;renderHandoff();
  try{const {chat,stateFile,archived}=await api(`/api/chats/${active}/handoff`,'POST',{});if(archived)chats=chats.filter(c=>c.id!==chat.continuedFrom);else{const old=chats.find(c=>c.id===chat.continuedFrom);if(old){old.continuedTo=chat.id;delete old.continuedUnlocked;}}putChat(chat);choose(chat.id);toast(`Nov čet je otvoren sa sažetkom${stateFile?', STANJE.md je ažuriran':''}${archived?'. Stari je u arhivi 30 dana':'. Stari je zaključan ispod njega'}.`,'success');}
  finally{handoffBusy=false;renderHandoff();}
});
let modelDialogChatId=null,modelDialogAgent=null,modelDialogSaving=false;
function renderModelDialogEffort(settings){
 const supported=effortsFor(settings.agent,settings.model).length>0;
 $('#model-dialog-effort-label').hidden=!supported;$('#model-dialog-effort').hidden=!supported;
 $('#model-dialog-effort').innerHTML=effortOptions(settings);
}
function renderModelDialogAgents(){
 $('#model-dialog-agents').innerHTML=agentOrder.map(id=>meta.agents.find(a=>a.id===id)).filter(Boolean).map(a=>`<button type="button" data-dialog-agent="${escape(a.id)}" aria-pressed="${a.id===modelDialogAgent}" ${!a.available?'disabled':''} title="${escape(a.name)}${a.available?'':' nije povezan'}"><img src="${agentLogos[a.id]}" alt="" width="24" height="24"><span>${escape(a.name)}</span></button>`).join('');
}
$('#model-dialog-agents').onclick=e=>{
 const button=e.target.closest('[data-dialog-agent]'),chat=chats.find(c=>c.id===modelDialogChatId);
 if(!button || button.disabled || !chat || modelDialogSaving)return;
 modelDialogAgent=button.dataset.dialogAgent;
 const settings=modelDialogAgent===chat.settings.agent?chat.settings:{agent:modelDialogAgent,...defaults[modelDialogAgent]};
 renderModelDialogAgents();$('#model-dialog-model').innerHTML=modelOptions(settings);renderModelDialogEffort(settings);
};
function openModelDialog(){
 const chat=current();if(!chat || chat.running || !connected || modelDialogSaving)return;
 modelDialogChatId=chat.id;modelDialogAgent=chat.settings.agent;renderModelDialogAgents();
 $('#model-dialog-chat').textContent=`${chat.title} · ${agentName(chat.settings.agent)}`;
 $('#model-dialog-model').innerHTML=modelOptions(chat.settings);
 renderModelDialogEffort(chat.settings);$('#model-dialog').showModal();
}
$('#model-open').onclick=openModelDialog;
$('#model-dialog-cancel').onclick=()=>$('#model-dialog').close();
$('#model-dialog').addEventListener('close',()=>{modelDialogChatId=null;modelDialogAgent=null;});
$('#model-dialog-model').onchange=()=>{
 const chat=chats.find(c=>c.id===modelDialogChatId);if(!chat)return;
 const model=$('#model-dialog-model').value;
 renderModelDialogEffort({agent:modelDialogAgent,model,effort:preferredEffort(models,modelDialogAgent,model)});
};
$('#model-form').onsubmit=e=>{e.preventDefault();guard(async()=>{
 if(modelDialogSaving)return;
 const id=modelDialogChatId,chat=chats.find(c=>c.id===id);
 if(!chat || chat.running || !connected)throw Error('Model možeš da promeniš kada agent miruje i veza je dostupna.');
 const agent=modelDialogAgent;
 if(!meta.agents.find(a=>a.id===agent)?.available)throw Error('Izabrani agent nije povezan.');
 const model=$('#model-dialog-model').value,effort=effortsFor(agent,model).length?$('#model-dialog-effort').value:'';
 modelDialogSaving=true;$('#model-dialog-save').disabled=true;
 try{putChat(await api(`/api/chats/${id}`,'PATCH',{settings:{agent,model,effort}}));if(active===id)selectedAgent=agent;$('#model-dialog').close();render();toast('Agent i model su podešeni. Sledeća poruka koristi novi izbor.','success');}
 finally{modelDialogSaving=false;$('#model-dialog-save').disabled=false;}
});};
function renderComposerControls() {
  const running=!!current()?.running,send=$('#send'),now=$('#send-now');
  const blocked=submitting || uploading || !connected || $('#prompt').disabled;
  send.textContent=running?'Dodaj u red':'Pošalji';
  send.setAttribute('aria-label',send.textContent);
  send.title=running?'Dodaj poruku u red, bez prekidanja odgovora':'Pošalji poruku';
  send.disabled=blocked;
  if(now){now.hidden=!running;now.disabled=blocked;}
  $('#stop-run').disabled=!connected;
  const reset=$('#context-reset'),chat=current();
  reset.disabled=blocked || running || !chat?.sessions?.[chat.settings?.agent];
  reset.title=running?'Osveži kontekst kada agent završi':'Osveži kontekst četa (uz potvrdu)';
  $('#model-open').disabled=blocked || running || !chat;
}
function renderQueue() {
  const chat=current();
  $('#queue').innerHTML=(chat?.queue || []).map(m=>`<div class="queued-message"><span title="${escape(m.text)}">${escape(m.text)}</span><button type="button" data-unqueue="${m.id}" aria-label="Ukloni iz reda čekanja">×</button></div>`).join('')+((chat?.queuePaused || chat?.queueError) && chat?.queue?.length?`<button class="resume-queue" type="button" data-resume-queue>Nastavi red čekanja</button>${chat.queueError?`<div class="error">${escape(chat.queueError)}</div>`:''}`:'');
}
async function enqueueMessage({interrupt=false}={}) {
  const input=$('#prompt'),draft=input.value.trim(),text=draft || ((linkedFiles.get(active)||[]).length?'Pogledaj priložene fajlove.':'');if(!text || submitting || uploading || !connected)return;
  if(needsCacheConfirm(current())){const ok=await askCacheTax();if(!ok || submitting || uploading || !connected)return;}
  submitting=true;renderComposerControls();try {
    if(!current()){const created=await create();if(!created)return;}
    const id=active,chat=await api(`/api/chats/${id}/queue`,'POST',{text,files:linkedFiles.get(id)||[]});putChat(chat);
    if(active===id && input.value.trim()===draft){input.value='';recordDraft(id,'');linkedFiles.delete(id);renderLinkedFiles();resizePrompt();}
    render();
    if(interrupt){
      try{putChat(await api(`/api/chats/${id}/queue/now`,'POST',{}));}
      catch(error){throw new Error(`Poruka je sačuvana u redu, ali trenutno slanje nije uspelo: ${error.message}`);}
    }
    finishMessageInput(id);
  } finally {submitting=false;render();}
}
$('#queue').onclick=e=>guard(async()=>{
  if(!current())return;const remove=e.target.closest('[data-unqueue]');
  if(remove){const item=current().queue?.find(m=>m.id===remove.dataset.unqueue);const chat=await api(`/api/chats/${active}/queue/${remove.dataset.unqueue}`,'DELETE');putChat(chat);if(item?.text)restoreQueued(item.text);renderQueue();}
  if(e.target.closest('[data-send-queue-now]')){const chat=await api(`/api/chats/${active}/queue/now`,'POST',{});putChat(chat);render();}
  if(e.target.closest('[data-resume-queue]')){const chat=await api(`/api/chats/${active}/queue/resume`,'POST',{});putChat(chat);render();}
});
// Na telefonu Enter dodaje novi red. Na računaru Enter šalje, a dok agent radi tekst ide u istu poruku u redu.
$('#send').onclick=e=>{if(current()?.running){e.preventDefault();guard(enqueueMessage);}};
$('#send-now').onclick=()=>guard(()=>enqueueMessage({interrupt:true}));
$('#stop-run').onclick=()=>{const id=active;if(!current()?.running)return;guard(()=>api(`/api/chats/${id}/stop`,'POST'));};
$('#usage-details').addEventListener('toggle',()=>{const box=$('#usage-details');box.hidden=!box.open;$('#usage-open').setAttribute('aria-expanded',String(box.open));});
const composerTools=$('#composer-tools');
function runComposerAction(action){if(action==='knowledge'){contextInspector.open();}else if(action==='usage'){const box=$('#usage-details');box.open=!box.open;box.hidden=!box.open;$('#usage-open').setAttribute('aria-expanded',String(box.open));}else if(action==='read')guard(readSelectedAnswer);else if(action==='computer' && !uploading)openComputerFiles();else if(action==='search' && current()){guard(openChatSearch);}else if(action==='bottom' && current()){chatSearch.close();stickToBottom($('#conversation'));}}
composerTools.addEventListener('pointerdown',()=>{speechSelection=selectedSpeechText() || speechSelection;});
composerTools.addEventListener('click',e=>{const b=e.target.closest('button');if(b && b.id!=='files-open' && !b.disabled)runComposerAction(b.dataset.action);});
// Čiste funkcije za stare provere gestova; interfejs ih više ne koristi.
function joystickDirection(dx,dy){if(dx<=-22 && Math.abs(dy)<=Math.abs(dx)*1.25)return 'menu';if(Math.max(Math.abs(dx),Math.abs(dy))<22)return null;if(Math.abs(dy)>Math.abs(dx)*1.25)return dy<0?'send':'stop';return null;}
function joystickAction(e,drag){const dir=joystickDirection(e.clientX-drag.x,e.clientY-drag.y);return {action:dir==='send' || dir==='stop'?dir:null};}

$('#prompt').onkeydown=e=>{if(e.key!=='Enter' || e.isComposing || e.shiftKey || matchMedia('(max-width:650px)').matches)return;e.preventDefault();if(current()?.running || e.metaKey || e.ctrlKey)guard(enqueueMessage);else $('#composer').requestSubmit();};
$('#prompt').addEventListener('beforeinput',()=>requestAnimationFrame(resizePrompt));
const draftHistory=createDraftHistory($('#prompt'),{chatId:()=>active,known:()=>drafts.get(active)||'',changed:()=>{resizePrompt();recordDraft(active,$('#prompt').value);}});
$('#prompt').oninput=()=>{resizePrompt();recordDraft(active,$('#prompt').value);};
$('#prompt').addEventListener('change',()=>adoptPrompt());
// Placeholder nije atribut: aplikacije za diktat ga preko Pristupačnosti čitaju kao tekst i lepe „Poruka“ ispred diktata.
function markPromptEmpty(){const input=$('#prompt');input.closest('.prompt-wrap')?.classList.toggle('prompt-empty',!input.value);}
observePromptChanges($('#prompt'),()=>{markPromptEmpty();resizePrompt();adoptPrompt();});markPromptEmpty();
$('#prompt').addEventListener('blur',flushDrafts);
$('#prompt').addEventListener('focus',()=>{if(!matchMedia('(max-width:650px)').matches)return;setTimeout(fitViewport,50);setTimeout(()=>revealAboveComposer(0),80);setTimeout(fitViewport,320);});
window.addEventListener('resize',()=>{resizePrompt();positionPopover();});
window.addEventListener('focus',()=>{if(meta){render();if(document.body.classList.contains('chat-view'))recordChatAccess(current());}focusPrompt();});document.addEventListener('visibilitychange',()=>{if(meta)render();if(!document.hidden)focusPrompt();});
// Čet je spreman za kucanje i kada je fokus ostao na kartici ili praznom delu razgovora.
document.addEventListener('click',e=>{if(e.target.closest('button,a,input,textarea,select,[contenteditable="true"]'))return;focusPrompt();});
document.addEventListener('focusout',()=>{requestAnimationFrame(()=>{if(document.activeElement===document.body)focusPrompt();});});
document.addEventListener('keydown',e=>{if(e.key==='Escape')requestAnimationFrame(()=>focusPrompt());if(e.defaultPrevented || e.isComposing || e.metaKey || e.ctrlKey || e.altKey || e.key.length!==1 || (e.key===' ' && e.target.closest('button,a')) || e.target.closest('input,textarea,select,[contenteditable="true"]'))return;focusPrompt({force:!mobileNavigation()});},{capture:true});
document.addEventListener('copy',e=>{if(!messageSelectionMode || e.target.closest('input,textarea,select,[contenteditable="true"]') || !$('#defaults').hidden || document.querySelector('dialog[open]'))return;const text=selectedMessagesMarkdown();if(!text)return;e.preventDefault();e.clipboardData.setData('text/plain',text);toast('Markdown je kopiran.');});
document.onkeydown=e=>{if((e.metaKey || e.ctrlKey) && e.shiftKey && !e.altKey && !e.isComposing && e.key.toLowerCase()==='r'){e.preventDefault();if(!e.repeat)guard(triggerServerRestart);return;}if((e.metaKey || e.ctrlKey) && !e.altKey && e.key.toLowerCase()==='f' && current() && $('#defaults').hidden && !document.querySelector('dialog[open]')){e.preventDefault();cancelStick();guard(openChatSearch);return;}if(e.key==='Escape' && chatSearch.isOpen()){e.preventDefault();chatSearch.close();return;}if(e.metaKey && !e.shiftKey && !e.altKey && e.key===','){e.preventDefault();if(!e.repeat && !document.querySelector('dialog[open]'))toggleSettings();return;}const editable=e.target.closest('input,textarea,select,[contenteditable="true"]');if(messageSelectionMode && !editable && $('#defaults').hidden && !document.querySelector('dialog[open]')){if((e.metaKey || e.ctrlKey) && e.key.toLowerCase()==='a'){e.preventDefault();selectAllMessages();return;}if((e.metaKey || e.ctrlKey) && e.key.toLowerCase()==='c'){e.preventDefault();guard(copySelectedMessages);return;}if(e.key==='Escape'){e.preventDefault();clearMessageSelection();return;}}const digit=(e.metaKey || e.ctrlKey) && !e.shiftKey && !e.altKey && /^Digit([1-9])$/.exec(e.code);if(digit && $('#defaults').hidden && !document.querySelector('dialog[open]') && !e.target.closest('[data-folder-name]')){const chat=visibleSidebarChats()[Number(digit[1])-1];if(chat){e.preventDefault();if(!e.repeat && chat.id!==active)choose(chat.id);return;}}if($('#defaults').hidden && (e.metaKey || e.ctrlKey) && e.key.toLowerCase()==='k'){e.preventDefault();guard(()=>create());}if(e.key==='Escape'){closePanels();menuChat=null;menuFolder=null;if(!$('#defaults').hidden)showDefaults(false);renderPopover();}};
const isImage=name=>/\.(png|jpe?g|gif|webp)$/i.test(name);
let pendingNotificationChat=null;
window.openNotificationChat=id=>{
 if(!id)return;
 if(!appReady){pendingNotificationChat=id;return;}
 guard(async()=>{
  if(!chats.some(c=>c.id===id))putChat(await api(`/api/chats/${encodeURIComponent(id)}?limit=50`));
  choose(id);
 });
};
navigator.serviceWorker?.addEventListener('message',event=>window.openNotificationChat(event.data?.chatId));
try {
  // Prva SSE poruka već nosi sve četove. Ako veza ne javi ništa, posle 8 s ostaje običan zahtev, da ekran ne ostane prazan.
  const initialChats=new Promise(resolve=>{let first=true;const finish=value=>{if(!first)return;first=false;clearTimeout(timer);resolve(value);};const timer=setTimeout(()=>{bootProgress('Veza za poruke','spora veza · pokušavam direktno preuzimanje');finish(api('/api/chats?summary=1'));},8000);connectEvents(list=>{sawEvents=true;finish(list);return true;},()=>finish(api('/api/chats?summary=1')));});
  const [metaValue,listed,defaultsValue,folderValue]=await Promise.all([api('/api/meta'),initialChats,api('/api/defaults'),api('/api/folders').catch(()=>[])]);meta=metaValue;defaults=defaultsValue;folders=Array.isArray(folderValue)?folderValue:[];pruneOpenFolders();if(!sawEvents)chats=mergeChatList(listed);receiveDrafts();appReady=true;
  const linked=pendingNotificationChat || new URLSearchParams(location.hash.slice(1)).get('chat');pendingNotificationChat=null;if(linked && chats.some(c=>c.id===linked))active=linked;if(!current())active=null;else selectedAgent=current().settings.agent;
  if(active && (!mobileNavigation() || linked))await loadChatHistory(active);
  $('#prompt').value=drafts.get(active)||'';promptReady=true;
  document.body.classList.toggle('chat-view',!!linked && !!current());for(const c of chats)if(c.readMessageId===completion(c)?.messageId)markRead(c,false);
  if(mobileNavigation()){const entry=new URL(location.href);if(!(linked && current()) && !new URLSearchParams(entry.hash.slice(1)).has('folder'))entry.hash='';history.replaceState({agentDesk:true,agentDeskGuard:true},'',entry);}
  render();const linkedFolder=new URLSearchParams(location.hash.slice(1)).get('folder');if(linkedFolder)openLinkedFolder(linkedFolder);resizePrompt();refreshLimits();import('/battery.mjs').then(({startBatteryStatus})=>startBatteryStatus()).catch(()=>{});document.body.classList.add('ready');if(new URLSearchParams(location.hash.slice(1)).has('dispatcher'))dispatcherPanel.open();focusPrompt();if(document.body.classList.contains('chat-view') && current())recordChatAccess(current());api('/api/models').then(value=>{models=value;lastMessages='';render();if(newMenuAgent)showNewModels(newMenuAgent);}).catch(()=>{});enablePush(false);connectEvents();
  // Telefon u pozadini često prekine vezu bez greške; povratak u aplikaciju otvara novu i dobija punu listu.
  document.addEventListener('visibilitychange',()=>{if(!document.hidden){connectEvents();if(document.body.classList.contains('chat-view'))recordChatAccess(current());}});
} catch(e){const boot=$('#boot-stage');if(boot)boot.textContent=`Aplikacija nije dostupna: ${e.message}`;}
let pullRefreshLock=false,pullRefreshOn=localStorage.getItem('agent-desk-pull-refresh')!=='0';
async function refreshChatList(){
  if(pullRefreshLock)return;
  pullRefreshLock=true;
  const bar=$('#pull-refresh');
  bar.classList.add('show');bar.textContent='Osvežavam…';
  try{
    const [listed,folderValue]=await Promise.all([api('/api/chats?summary=1'),api('/api/folders').catch(()=>folders)]);
    chats=mergeChatList(listed);folders=Array.isArray(folderValue)?folderValue:folders;
    pruneOpenFolders();
    lastSidebar='';connectEvents();
    if(active && !current()){const next=chats.find(c=>c.continuedFrom===active);if(next && document.body.classList.contains('chat-view'))choose(next.id,{replaceHistory:true});else choose(null);}else render();
    try{const response=await api('/api/limits');limits=response.agents || {};renderNewAgents();renderChatQuota();}catch{}
  }finally{pullRefreshLock=false;bar.textContent='';bar.classList.remove('show');}
}
function bindPullToRefresh(){
  const logo=$('#defaults-open'),bar=$('#pull-refresh');
  if(!logo || !bar)return;
  let startY=0,tracking=false,ready=false,pulled=false,suppressClick=false;
  logo.addEventListener('touchstart',e=>{
    tracking=pullRefreshOn && matchMedia('(max-width:650px)').matches && $('#defaults').hidden && e.touches.length===1;
    startY=e.touches[0]?.clientY || 0;ready=false;pulled=false;
  },{passive:true});
  logo.addEventListener('touchmove',e=>{
    if(!tracking || pullRefreshLock)return;
    if(logoSwipe?.open){tracking=false;bar.classList.remove('show');return;}
    const dy=e.touches[0].clientY-startY;
    if(dy<12){ready=false;if(dy<=0)bar.classList.remove('show');return;}
    pulled=true;ready=dy>70;bar.classList.add('show');bar.textContent=ready?'Pusti za osvežavanje':'Povuci za osvežavanje';
    e.preventDefault();
  },{passive:false});
  const end=refresh=>{if(tracking && ready && refresh)guard(refreshChatList);if(pulled)suppressClick=true;tracking=false;ready=false;pulled=false;if(!pullRefreshLock){bar.textContent='';bar.classList.remove('show');}};
  logo.addEventListener('touchend',()=>end(true));
  logo.addEventListener('touchcancel',()=>end(false));
  logo.addEventListener('click',e=>{if(!suppressClick)return;suppressClick=false;e.preventDefault();e.stopPropagation();},true);
}
bindPullToRefresh();
// Apple logo: klik prikazuje red ikonica, a povlačenje ulevo i puštanje pokreće ikonicu ispod prsta, kao kod džojstika.
const logoMenu=$('#logo-swipe-menu'),logoButton=$('#defaults-open');let logoSwipe=null,logoClickBlock=0;
function logoMenuAction(x){for(const b of logoMenu.querySelectorAll('button')){const r=b.getBoundingClientRect();if(x>=r.left && x<=r.right)return b.dataset.logoAction;}return null;}
function showLogoMenu(show,action=null){if(show && logoMenu.hidden){const row=logoMenu.parentElement.getBoundingClientRect(),logo=logoButton.getBoundingClientRect();logoMenu.style.right=Math.max(0,row.right-logo.left)+'px';}logoMenu.hidden=!show;logoMenu.classList.toggle('dragging',!!logoSwipe?.open);for(const b of logoMenu.querySelectorAll('button'))b.classList.toggle('active',show && b.dataset.logoAction===action);}
function runLogoAction(action){if(action)runHeaderAction(action);}
logoButton.onclick=()=>{if(Date.now()<logoClickBlock)return;if(!$('#defaults').hidden){toggleSettings();return;}showLogoMenu(logoMenu.hidden);};
logoButton.addEventListener('pointerdown',e=>{if(e.button!==0 || !e.isPrimary)return;logoSwipe={id:e.pointerId,x:e.clientX,y:e.clientY,open:false};try{logoButton.setPointerCapture(e.pointerId);}catch{}});
logoButton.addEventListener('pointermove',e=>{const d=logoSwipe;if(!d || d.id!==e.pointerId)return;const dx=e.clientX-d.x,dy=e.clientY-d.y;if(!d.open){if(dx>-18 || Math.abs(dy)>=Math.abs(dx))return;d.open=true;}e.preventDefault();showLogoMenu(true,logoMenuAction(e.clientX));});
logoButton.addEventListener('pointerup',e=>{const d=logoSwipe;if(!d || d.id!==e.pointerId)return;logoSwipe=null;if(!d.open)return;logoClickBlock=Date.now()+600;const action=logoMenuAction(e.clientX);showLogoMenu(false);runLogoAction(action);});
logoButton.addEventListener('pointercancel',e=>{if(logoSwipe?.id!==e.pointerId)return;if(logoSwipe.open){logoClickBlock=Date.now()+600;showLogoMenu(false);}logoSwipe=null;});
logoMenu.addEventListener('click',e=>{const action=e.target.closest('[data-logo-action]')?.dataset.logoAction;if(!action || logoSwipe)return;showLogoMenu(false);runLogoAction(action);});
document.addEventListener('pointerdown',e=>{if(!logoMenu.hidden && !e.target.closest('#logo-swipe-menu,#defaults-open'))showLogoMenu(false);});
document.addEventListener('keydown',e=>{if(e.key==='Escape' && !logoMenu.hidden)showLogoMenu(false);});
function noticeFolderName(chat){
 let owner=chat;const seen=new Set();
 while(owner?.parentChatId && !seen.has(owner.id)){seen.add(owner.id);const parent=chats.find(c=>c.id===owner.parentChatId);if(!parent)break;owner=parent;}
 return folders.find(f=>f.id===(owner?.folderId||chat?.folderId))?.name || '';
}
let noticeAudio,noticeIdle,noticeSound='default';
function syncNoticeLayer(){const host=$('#completion-notices');if(host)host.style.pointerEvents=host.children.length?'auto':'none';}
// A running AudioContext keeps the speakers open and the Mac awake, so it runs only while a sound plays.
function noticeContext(){const ctx=noticeAudio ||= new AudioContext();clearTimeout(noticeIdle);if(ctx.state==='suspended')void ctx.resume();return ctx;}
function idleNoticeAudio(ms){clearTimeout(noticeIdle);noticeIdle=setTimeout(()=>{if(noticeAudio?.state==='running')void noticeAudio.suspend();},ms);}
function playNoticeSound(name=noticeSound){
 if(noticeSound==='none')return;
 const soundName=name && name!=='default' ? (noticeSound!=='default'?noticeSound:name) : noticeSound;
 const steps=noticeTone(soundName);if(!steps.length)return;
 const ctx=noticeContext();
 let t=ctx.currentTime+0.02;
 for(const [freq,dur] of steps){
  const osc=ctx.createOscillator(),gain=ctx.createGain();
  osc.type='sine';osc.frequency.value=freq;osc.connect(gain);gain.connect(ctx.destination);
  gain.gain.setValueAtTime(0.0001,t);gain.gain.exponentialRampToValueAtTime(0.16,t+0.012);gain.gain.exponentialRampToValueAtTime(0.0001,t+dur);
  osc.start(t);osc.stop(t+dur+0.02);t+=dur*0.72;
 }
 idleNoticeAudio((t-ctx.currentTime)*1000+600);
}
// The first click unlocks audio for later notices; then it sleeps again.
window.addEventListener('pointerdown',()=>{if(noticeAudio)return;noticeContext();idleNoticeAudio(500);});
function showReplyNotice(chat){
 const noticeReply=chat.latestReply || [...(chat.messages||[])].reverse().find(m=>m.role==='assistant');
 const noticeOrigin=noticeReply?.notificationOrigin || [...(chat.messages||[])].reverse().find(m=>m.role==='user')?.origin;
 // Aktivnost podagenta ostaje u listi četova i razgovoru, bez plutajuće kartice.
 if(chat.parentChatId || (!chat.running && noticeOrigin==='dispatcher-watch')){
  document.querySelector(`#completion-notices [data-notice-chat="${CSS.escape(chat.id)}"]`)?.remove();
  syncNoticeLayer();
  return;
 }
 if(chat.id===active && document.body.classList.contains('chat-view') && !document.hidden && document.hasFocus())return;
 if(chat.running)return;
 const reply=chat.latestReply || [...(chat.messages||[])].reverse().find(m=>m.role==='assistant');
 const soundKind=chooseNoticeSound(reply);
 playNoticeSound(soundKind);
}
function announceReplies(previous){
 if(!previous)return;
 for(const chat of chats){
  if(chat.parentChatId){showReplyNotice(chat);continue;}
  const prev=previous.find(c=>c.id===chat.id);
  const token=completion(chat)?.token;
  const prevToken=prev ? completion(prev)?.token : null;
  if((prev?.running && !chat.running) || (prevToken && token && prevToken!==token)){
   showReplyNotice(chat);
  }
 }
}
$('#completion-notices').onclick=e=>{const button=e.target.closest('[data-notice-chat]');if(!button)return;const id=button.dataset.noticeChat;button.remove();syncNoticeLayer();if(chats.some(c=>c.id===id))choose(id);};
function connectEvents(initial,failed){
  events?.close();events=new EventSource('/api/events?summary=1'+(active && (document.body.classList.contains('chat-view') || !mobileNavigation())?'&chat='+encodeURIComponent(active):''));if(!appReady)bootProgress('Veza za poruke','povezujem se');events.onopen=()=>{if(!appReady)bootProgress('Veza za poruke','otvorena · čekam istoriju četova');};
  events.onmessage=e=>{const data=JSON.parse(e.data),next=Array.isArray(data)?mergeChatList(data):data.lite?mergeBrowserChats(chats,data):mergeChats(data);connected=true;if(!appReady){bootProgress('Istorija četova',`učitano · ${bootSize(new TextEncoder().encode(e.data).length)} · ${next.length} četova`);bootProgress('Veza za poruke','povezana');chats=next;initial?.(next);return;}const previous=chats;chats=next;announceReplies(previous);for(const chat of chats)clearReadNotifications(chat);void flushDrafts();if(active && !current()){const next=chats.find(c=>c.continuedFrom===active);if(next && document.body.classList.contains('chat-view'))choose(next.id,{replaceHistory:true});else choose(null);}else{render();if(current()?._needsHistory)guard(()=>loadChatHistory(active));}};
  events.addEventListener('folders',e=>{folders=JSON.parse(e.data);pruneOpenFolders();lastSidebar='';if(appReady)renderSidebar();});
  events.addEventListener('reload',()=>{if(!$('#prompt').value.trim() && !document.querySelector('dialog[open]'))location.reload();else toast('Interfejs je izmenjen. Osveži stranicu kad završiš unos.');});
  events.addEventListener('boot',e=>{try{bootTracker.handleBoot(JSON.parse(e.data));void restartStatus.refresh();}catch{}});
  events.onerror=()=>{if(!appReady)bootProgress('Veza za poruke','veza prekinuta · pokušavam ponovo');failed?.();connected=false;if(appReady)render();};
}
// Izmena sadrži ceo opis izmenjenog četa, redosled poruka i samo nove ili promenjene poruke.
function mergeChats(delta){const byId=new Map(chats.map(c=>[c.id,c]));for(const x of delta.changed){const old=new Map((byId.get(x.chat.id)?.messages || []).map(m=>[m.id,m])),fresh=new Map(x.messages.map(m=>[m.id,m]));byId.set(x.chat.id,{...x.chat,messages:x.order.map(id=>fresh.get(id) || old.get(id)).filter(Boolean)});}return delta.order.map(id=>byId.get(id)).filter(Boolean);}

function transferLabel(stats) {return `Prenos ≈ ${tokenRange(stats?.transfer)} tokena sa skraćivanjem · ${tokenRange(stats?.withoutShortening)} bez`;}
function renderTransfer(){const el=$('#transfer-preview');if(!el)return;el.hidden=true;}

const restartStatus=createRestartStatus({element:$('#restart-status'),api});
void restartStatus.refresh();
setInterval(()=>void restartStatus.refresh(),5000);
try{localStorage.removeItem('agent-desk-result-cards');}catch{}
const contextInspector=createContextInspector({dialog:$('#context-dialog'),api,currentId:()=>active});
$('#context-open').onclick=()=>contextInspector.open();
const dispatcherPanel=createDispatcherPanel({dialog:$('#dispatcher-dialog'),api,openChat:(id,chat)=>{if(chat)putChat(chat);choose(id);},onError:error=>toast(error.message,'error')});
$('#dispatcher-open').onclick=()=>dispatcherPanel.open();
$('#sidebar-dispatcher').onclick=()=>dispatcherPanel.open();
const adaptivePanel=createAdaptivePanel({dialog:$('#adaptive-dialog'),api,openChat:(id,chat)=>{if(chat)putChat(chat);choose(id);},getChats:()=>chats});
// Predlog prilagodljivih agenata: projekat dolazi iz četa (desni klik) ili se bira iz spiska projekata.
async function proposeAdaptive(project){
 try{
  if(!project){const {projects:list=[]}=await api('/api/adaptive');const answer=window.prompt('Za koji projekat? Upiši broj ili punu putanju.\n'+list.map((p,i)=>`${i+1}. ${p.name}`).join('\n'));if(!answer?.trim())return;const n=Number(answer.trim());project=Number.isInteger(n) && list[n-1]?list[n-1].path:answer.trim();}
  const chat=await api('/api/adaptive/propose','POST',{project});putChat(chat);setOpenFolder(adaptiveFolderId);choose(chat.id);
 }catch(error){toast(error.message,'error');}
}
createThoughtsPanel({input:$('#sidebar-thoughts input'),api,onError:error=>toast(error.message,'error')});
function closePanels(){chatSearch.close();$('#record-panel').hidden=true;$('#projects-panel').hidden=true;$('#capabilities-panel').hidden=true;for(const el of [$('#conversation'),$('.composer-area'),$('#usage-details'),$('#change-column')].filter(Boolean))el.inert=!$('#defaults').hidden;}
for(const button of document.querySelectorAll('[data-close-panel]'))button.onclick=closePanels;
window.addEventListener('hashchange',()=>{const params=new URLSearchParams(location.hash.slice(1));if(params.has('dispatcher')){dispatcherPanel.open();return;}if(params.has('folder')){openLinkedFolder(params.get('folder'));return;}const id=params.get('chat');if(chats.some(c=>c.id===id))choose(id);});

let phoneTimer;
async function refreshPhone(){
 clearTimeout(phoneTimer);
 $('.phone-settings').hidden=phoneRemote;$('#token-count-settings').hidden=phoneRemote;if(phoneRemote)return;
 try {const info=await api('/api/phone');$('#phone-status').textContent=info.origin?'Link važi još\n'+Math.max(0,Math.ceil((info.expiresAt-Date.now())/1000))+' s\nPrijava traje '+info.sessionDays+' dana.':'Tailscale nije povezan.';
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

function limitCountdown(resetAt,now=Date.now()){if(!Number.isFinite(resetAt))return null;const seconds=Math.ceil((resetAt-now)/1000);if(seconds<=0)return null;const unit=seconds>=86400?'d':seconds>=3600?'h':'min',divisor=unit==='d'?86400:unit==='h'?3600:60;return (seconds/divisor).toFixed(1).replace('.',',')+unit;}
function limitDisplay(id){const s=limits[id],group=id==='antigravity' && s?.windows?.[0]?.quotaGroup==='claudeGpt'?'Claude/GPT · ':'';const slot=key=>{const w=s?.windows?.find(w=>w.period===key);if(!w)return '<span class="limit-slot limit-unknown"><span>?</span></span>';const left=Math.max(0,Math.min(100,Math.round(w.remaining))),countdown=limitCountdown(w.resetAt),label=left===100?'++':left===0?'':String(left);return `<span class="limit-slot ${left>65?'limit-good':left>=35?'limit-mid':'limit-low'}" title="${escape(group+(key==='fiveHour'?'5 sati':'7 dana'))} · Preostalo ${left}%">${label?`<span class="limit-value">${label}</span>`:''}${countdown?`<span class="limit-reset" title="${escape(key==='fiveHour'?'5 sati':'7 dana')} · ${escape('Obnova za '+countdown)}">${countdown}</span>`:''}</span>`;};return (id==='antigravity' && s?.windows?.[0]?.quotaGroup==='claudeGpt'?'<span class="limit-group">Claude/GPT</span>':'')+(id==='grok'?slot('weekly'):slot('fiveHour')+slot('weekly'));}

setInterval(()=>{if(meta && !document.hidden)renderNewAgents();},30000);
async function refreshLimits(){let wait=120000;try{const response=await api('/api/limits');limits=response.agents || {};renderNewAgents();renderChatQuota();}catch{}setTimeout(refreshLimits,wait);}
function quotaFamily(agent,modelId,label){const hay=`${modelId} ${label}`.toLowerCase();if(agent==='claude' && hay.includes('opus'))return 'weeklyOpus';if(agent==='claude' && hay.includes('sonnet'))return 'weeklySonnet';return null;}
function quotaReset(ts){if(!Number.isFinite(ts))return '';const d=new Date(ts),same=d.toDateString()===new Date().toDateString();return same?d.toLocaleTimeString('sr-Latn-RS',{hour:'2-digit',minute:'2-digit'}):d.toLocaleString('sr-Latn-RS',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'});}
function quotaTarget(chat){const list=chat?.messages || [];return [...list].reverse().find(m=>m.role==='assistant' && m.status==='running') || [...list].reverse().find(m=>m.role==='assistant' && m.agent) || null;}
function quotaView(agent,modelId,label,saved){const s=saved?{windows:saved}:limits[agent],allWindows=s?.windows || [],hay=(`${modelId} ${label}`).toLowerCase(),expected=hay.includes('gemini')?'gemini':/claude|gpt/.test(hay)?'claudeGpt':null,windows=agent==='antigravity' && expected?allWindows.filter(w=>(w.quotaGroup || 'gemini')===expected):allWindows;
 const family=quotaFamily(agent,modelId,label),week=family && windows.some(w=>w.period===family)?family:'weekly',keys=agent==='grok'?['weekly']:['fiveHour',week];
 const slot=key=>{const w=windows.find(x=>x.period===key);if(!w)return '<span class="limit-unknown">?</span>';const left=Math.max(0,Math.min(100,Math.round(w.remaining)));return `<span class="${left>65?'limit-good':left>=35?'limit-mid':'limit-low'}">${left}</span>`;};
 const shared=agent==='codex'?'Isti limit za sve Codex modele.':agent==='grok'?'Nedeljni limit, zajednički za Grok Build i chat.':agent==='antigravity'?(windows.length?((windows[0].quotaGroup || 'gemini')==='claudeGpt'?'Claude/GPT kvota na Antigravity nalogu.':'Gemini kvota na Antigravity nalogu.'):'Kvota za ovaj model trenutno nije dostupna.'):week==='weeklyOpus'?'5 sati je zajednički Claude limit. 7 dana je poseban Opus limit.':week==='weeklySonnet'?'5 sati je zajednički Claude limit. 7 dana je poseban Sonnet limit.':'5 sati i 7 dana su zajednički za sve Claude modele.';
 const accountWeek=windows.find(w=>w.period==='weekly'),modelWeek=family?windows.find(w=>w.period===family):null;
 const extra=modelWeek && accountWeek && week!=='weekly'?` Zajednička nedelja naloga: ${Math.round(accountWeek.remaining)}.`:'';
 const resets=keys.map(key=>{const w=windows.find(x=>x.period===key);return w?.resetAt?`${key==='fiveHour'?'5h':'7d'} se obnavlja ${quotaReset(w.resetAt)}`:''}).filter(Boolean).join('. ');
 const state=saved?'Limit zapisan posle ovog odgovora. ':!s?'Kvota se učitava. ':s.stale?'Poslednje uspešno očitavanje. ':'';
 const legend=keys.length===1?'Cifra je nedeljni limit. ':'Prva cifra je 5 sati, druga je 7 dana. ';
 return {stale:!!s?.stale,html:s?keys.map(slot).join(' '):'<span class="limit-unknown">…</span>',title:`${label}. ${state}${legend}${shared}${extra}${resets?` ${resets}.`:''}${s?.error?` ${s.error}`:''}`.replace(/\s+/g,' ').trim()};
}
function savedQuota(m){const view=quotaView(m.agent,m.model || '',responseModel(m),m.quota);return `<span class="message-quota-saved" title="${escape(view.title)}">${view.html}</span>`;}
function limitShareTag(m){const spent=shareLabel(current()?.limitShares?.[m.id]);return spent?`<span class="message-limit-share" title="Procena: koliko je ovaj odgovor potrošio od 5h limita. Kad radi više agenata, pad se deli po ceni odgovora.">${spent}</span>`:'';}
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
  const items=[...found].filter(([,u])=>u).map(([p,u])=>{const name=p.split('/').pop();return isImage(name)?`<div class="attachment-item"><a href="${escape(u)}" data-file-path="${escape(p)}" ${phoneRemote?'':'target="_blank" rel="noopener"'} title="${escape(name)}"><img src="${escape(u)}" alt="${escape(name)}" loading="lazy"></a></div>`:`<div class="attachment-item"><a class="attachment-file" href="${escape(u)}" ${phoneRemote?'':`data-local-file="${escape(p)}" `}data-file-path="${escape(p)}" title="${escape(name)}"><span>${escape(name)}</span></a></div>`;});
  return items.length?`<div class="attachment-thumbs">${items.join('')}</div>`:'';
}
function renderLinkedFiles(){const paths=linkedFiles.get(active)||[];$('#linked-files').innerHTML=paths.map((p,i)=>{const url=attachmentUrl(p);return `<button type="button" data-remove-file="${i}" title="${escape(p)} (klik uklanja prilog)" aria-label="Ukloni prilog ${escape(p.split('/').pop())}">${url?`<img src="${escape(url)}" alt="">`:''}${escape(p.split('/').pop())}</button>`;}).join('');}
$('#linked-files').onclick=e=>{const b=e.target.closest('[data-remove-file]');if(!b)return;const paths=linkedFiles.get(active)||[];paths.splice(Number(b.dataset.removeFile),1);linkedFiles.set(active,paths);renderLinkedFiles();};
function linkFile(p){const paths=linkedFiles.get(active)||[];if(!paths.includes(p)){if(paths.length>=20)throw Error('Najviše 20 putanja.');paths.push(p);}linkedFiles.set(active,paths);renderLinkedFiles();}
let filePickerClosing=false,folderRequest=0,folderColumns=[];
async function browseFolder(p){const id=active,request=++folderRequest;const listing=await api(`/api/chats/${id}/files${p?'?path='+encodeURIComponent(p):'?place=home'}`);if(active!==id || request!==folderRequest)return;fileListing=listing;
 $('#folder-breadcrumbs').innerHTML=listing.crumbs.map((e,i)=>`<button type="button" data-folder-crumb="${i}" ${e.path===listing.path?'aria-current="location"':''}>${escape(e.name)}</button>`).join('<span aria-hidden="true">/</span>');
 folderColumns=advanceColumns(folderColumns,listing);renderFileColumns();}
function renderFileColumns(){const desktop=!mobileNavigation(),columns=desktop?folderColumns:[fileListing];$('#file-entries').classList.toggle('columns',desktop);$('#file-entries').innerHTML=columns.map(listing=>{const column=folderColumns.indexOf(listing),next=folderColumns[column+1]?.path;return `<section class="file-column" aria-label="${escape(listing.path)}">${desktop?`<small class="column-title">${escape(listing.crumbs.at(-1)?.name||'Home')}</small>`:''}${listing.entries.map((e,i)=>`<button type="button" class="file-card ${e.directory?'directory':'file'} ${next===e.path?'selected':''}" data-file-column="${column}" data-file-entry="${i}" aria-label="${e.directory?'Folder':'Fajl'}: ${escape(e.name)}">${escape(e.name)}</button>`).join('')}${listing.truncated?'<small>Prvih 500 stavki. Otvori uži folder.</small>':''}</section>`;}).join('');if(desktop)$('#file-entries').lastElementChild?.scrollIntoView({block:'nearest',inline:'end'});}

function closeFilePicker(){if(!$('#files-dialog').open || filePickerClosing)return;filePickerClosing=true;history.back();}
$('#files-open').onclick=()=>{if(!uploading)$('#device-files').click();};
$('#device-files').onchange=e=>{const files=[...e.target.files];e.target.value='';guard(()=>uploadFiles(files));};
function clipboardImages(data){const files=[...(data?.files || [])];if(files.length)return files;return [...(data?.items || [])].filter(item=>item.kind==='file').map(item=>item.getAsFile()).filter(file=>file && (!file.type || file.type.startsWith('image/') || isImage(file.name || '')));}
document.addEventListener('paste',e=>{if((e.target.closest('input,textarea,select') && e.target.id!=='prompt') || !$('#defaults').hidden || document.querySelector('dialog[open]'))return;const files=clipboardImages(e.clipboardData);if(!files.length)return;e.preventDefault();guard(()=>uploadFiles(files));});
// Fajl sa uređaja se kopira na računar, pa ga agent čita kao i svaku drugu povezanu putanju.
async function uploadFiles(files){
  if(!files.length || uploading)return;
  if(files.some(file=>file.size>25*1024*1024))throw Error('Svaki prilog može imati najviše 25 MB.');
  if((linkedFiles.get(active)||[]).length+files.length>20)throw Error('Najviše 20 priloga u jednoj poruci.');
  uploading=true;const button=$('#files-open');button.disabled=true;button.textContent='Dodajem…';button.setAttribute('aria-label','Dodavanje priloga…');renderComposerControls();
  try{
    if(!current() && !await create())return;const id=active;
    for(const file of files){
      const r=await fetch(`/api/chats/${id}/upload`,{method:'POST',headers:{'Content-Type':'application/octet-stream','X-File-Name':encodeURIComponent(file.name || 'slika.png')},body:file});
      const data=await r.json().catch(()=>({}));
      if(!r.ok || !data.path)throw Error(data.error || 'Prilog nije sačuvan. Pokušaj ponovo.');
      linkedFiles.set(id,[...(linkedFiles.get(id) || []),data.path]);
      if(active===id)renderLinkedFiles();
    }
  }finally{uploading=false;button.disabled=false;button.textContent='Dodaj fajl';button.setAttribute('aria-label','Dodaj prilog');renderLinkedFiles();renderComposerControls();}
}
const openComputerFiles=()=>guard(async()=>{if(!current())await create();folderColumns=[];await browseFolder();filePickerClosing=false;$('#files-dialog').showModal();history.pushState({agentDesk:true,filePicker:true},'',location.href);});
$('#files-dialog').addEventListener('cancel',e=>{e.preventDefault();closeFilePicker();});
$('#folder-breadcrumbs').onclick=e=>guard(()=>{const b=e.target.closest('[data-folder-crumb]');if(b)return browseFolder(fileListing.crumbs[Number(b.dataset.folderCrumb)].path);});
$('#folder-select').onclick=()=>guard(()=>{linkFile(fileListing.path);closeFilePicker();});
$('#file-entries').onclick=e=>guard(async()=>{const b=e.target.closest('[data-file-entry]');if(!b || filePickerClosing)return;const entry=folderColumns[Number(b.dataset.fileColumn)].entries[Number(b.dataset.fileEntry)];if(entry.directory)await browseFolder(entry.path);else{linkFile(entry.path);closeFilePicker();}});
let pendingFolderDelete=null,pendingReset=null;
$('#delete-cancel').onclick=closeDeleteDialog;
function confirmContextReset(){
 const chat=current();if(!chat || chat.running || !connected || !chat.sessions?.[chat.settings.agent])return;
 pendingFolderDelete=null;deleteTarget=null;pendingReset=chat.id;
 $('#delete-title').textContent=`Osveži kontekst četa „${chat.title}“? Poruke ostaju. Sledeća poruka pokreće novu sesiju sa tekstom razgovora, bez prethodnog konteksta alata i keša.`;
 $('#delete-only').textContent='Osveži kontekst';$('#delete-family').hidden=true;$('#delete-dialog').showModal();
}
$('#context-reset').onclick=confirmContextReset;
async function resetSession(id){const chat=await api(`/api/chats/${id}/reset-session`,'POST',{});putChat(chat);closeDeleteDialog();toast('Sledeća poruka ide kao nova sesija, bez starog keša.');render();}
async function removeChat(children){const id=deleteTarget;const result=await api(`/api/chats/${id}${children?'?children=1':''}`,'DELETE');closeDeleteDialog();chats=mergeChatList(await api('/api/chats?summary=1'));menuChat=null;if(result.deleted.includes(active)){if(mobileNavigation()){choose(null);showChatList();}else choose(chats[0]?.id||null);}else render();}
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
$('#attachment-view-image').addEventListener('error',()=>{if($('#attachment-view').open && $('#attachment-view-image').getAttribute('src'))toast('Slika nije učitana.','error');});

async function renderArchive(){const records=await api('/api/archive');$('#archive-list').innerHTML=records.map(r=>`<div class="archive-row"><span>${r.chats.map(c=>escape(c.title)).join(' · ')}<small>Još ${Math.max(1,Math.ceil((r.expiresAt-Date.now())/86400000))} dana</small></span><button type="button" data-archive-restore="${r.id}" aria-label="Vrati iz arhive">${actionIcon('<path d="M9 10 4 15l5 5M4 15h12a4 4 0 0 0 4-4V4"/>')}</button></div>`).join('') || '<small>Arhiva je prazna.</small>';}
$('#archive-open').onclick=()=>guard(async()=>{const box=$('#archive-list');box.hidden=!box.hidden;if(!box.hidden)await renderArchive();});
$('#archive-list').onclick=e=>guard(async()=>{const b=e.target.closest('[data-archive-restore]');if(!b)return;await api(`/api/archive/${b.dataset.archiveRestore}/restore`,'POST',{});chats=mergeChatList(await api('/api/chats?summary=1'));render();await renderArchive();});
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


function quotaRows(events){return events.map(e=>`<div class="quota-change"><time>${new Date(e.from).toLocaleTimeString('sr-Latn-RS')} - ${new Date(e.to).toLocaleTimeString('sr-Latn-RS')}</time><div>${escape(agentName(e.agent))} · ${e.windows.map(w=>({fiveHour:'5h',weekly:'7d',weeklyOpus:'7d Opus',weeklySonnet:'7d Sonnet'}[w.period] || w.period)+' '+w.before+' → '+w.after).join(' · ')}</div><small>${e.turns.length?e.turns.map(t=>escape(t.title)+' · '+escape(modelName(t.agent,t.model))).join(' / '):'Bez prepoznatog odgovora u Agent Desku'}</small></div>`).join('');}

function renderMessageSelection(){$('#message-selection').hidden=!messageSelectionMode;$('#copy-selected-messages').disabled=!selectedMessages.size;$('#conversation').classList.toggle('selection-mode',messageSelectionMode);}
function refreshMessageSelection(){const view=$('#conversation'),scroll=view.scrollTop;renderMessageSelection();lastMessages='';render();cancelStick();view.scrollTop=scroll;}
function selectAllMessages(){const id=active;guard(async()=>{await loadFullChat(id);if(active!==id)return;for(const m of current()?.messages||[])if(m.text)selectedMessages.add(m.id);refreshMessageSelection();});}
function clearMessageSelection(){selectedMessages.clear();messageSelectionMode=false;selectionAnchor=null;refreshMessageSelection();}
function selectedMessagesMarkdown(){return exportMessages(chats,active,[...selectedMessages],{includeContext:true,modelName,includeProgress:false});}
async function copySelectedMessages(){const text=selectedMessagesMarkdown();if(!text)return;await navigator.clipboard.writeText(text);toast('Markdown je kopiran.');}
$('#select-all-messages').onclick=selectAllMessages;
$('#copy-selected-messages').onclick=()=>guard(copySelectedMessages);

$('#statistics-open').onclick=()=>guard(()=>api('/api/statistics/reveal','POST',{}));

function renderKeyboardToggle(){const button=$('#mobile-autofocus');button.setAttribute('aria-pressed',String(mobileAutofocus));button.title=`Tastatura pri otvaranju četa: ${mobileAutofocus?'uključena':'isključena'}`;}
$('#mobile-autofocus').onclick=()=>{mobileAutofocus=!mobileAutofocus;localStorage.setItem('agent-desk-mobile-autofocus',mobileAutofocus?'1':'0');renderKeyboardToggle();};
renderKeyboardToggle();


async function refreshNotificationSounds(){try{const settings=await api('/api/notifications/settings');const labels={default:'Podrazumevani',none:'Bez zvuka'};$('#notification-sound').innerHTML=settings.sounds.map(sound=>`<option value="${sound}">${labels[sound] || sound}</option>`).join('');noticeSound=settings.sound;$('#notification-sound').value=settings.sound;$('#auto-open-work').checked=settings.autoOpen!==false;$('#auto-open-work').disabled=settings.autoOpen===undefined;$('#auto-archive-children').checked=settings.autoArchive!==false;$('#auto-archive-children').disabled=settings.autoArchive===undefined;$('#notification-sound-preview').hidden=phoneRemote;}catch{$('#notification-sound').innerHTML='<option>Potrebno je ponovno pokretanje servera</option>';$('#notification-sound').disabled=true;$('#notification-sound-preview').hidden=true;}}
$('#notification-sound').onchange=()=>guard(async()=>{noticeSound=$('#notification-sound').value;await api('/api/notifications/settings','PUT',{sound:noticeSound});});
$('#leave-after-send').checked=localStorage.getItem('leaveAfterSend')!=='0';
$('#leave-after-send').onchange=()=>{const on=$('#leave-after-send').checked;localStorage.setItem('leaveAfterSend',on?'1':'0');toast(on?'Posle slanja se vraćaš na listu četova.':'Posle slanja ostaješ u četu.','success');};
$('#auto-archive-children').onchange=()=>guard(async()=>{const on=$('#auto-archive-children').checked;await api('/api/notifications/settings','PUT',{autoArchive:on});toast(on?'Agent arhivira nepotrebne podagente.':'Podagenti ostaju dok ih sam ne obrišeš.','success');});
$('#auto-open-work').onchange=()=>guard(async()=>{const on=$('#auto-open-work').checked;await api('/api/notifications/settings','PUT',{autoOpen:on});toast(on?'Rezultat se otvara kad agent završi.':'Automatsko otvaranje je isključeno.','success');});
$('#notification-sound-preview').onclick=()=>{if(noticeSound==='none'){toast('Zvuk je isključen.');return;}playNoticeSound();};
void refreshNotificationSounds();
