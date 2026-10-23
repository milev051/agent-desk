import {sidebarGroups} from './sidebar-groups.mjs';
// Folder „Prilagođavanje“: četovi prilagodljivih agenata i predloga, najnoviji prvi.
export const adaptiveFolderId='adaptive-chats';
export const adaptiveFolder={id:adaptiveFolderId,name:'Prilagođavanje',adaptive:true};
export function adaptiveChatGroups(chats){return sidebarGroups(chats,()=>true,{adaptive:true});}
