import {randomBytes} from 'node:crypto';
const maxBytes=10*1024*1024,maxImportBytes=50*1024*1024;
function object(value,keys){if(!value || typeof value!=='object' || Array.isArray(value) || Object.keys(value).some(k=>!keys.includes(k)))throw Error('Neispravna polja zahteva.');return {...value};}
function text(value,max=2000){if(typeof value!=='string' || value.length>max)throw Error('Neispravan tekst ili predugačak sadržaj.');return value;}
function id(value){if(typeof value!=='string' || !/^[a-zA-Z0-9_@-]{1,250}$/.test(value))throw Error('Neispravan Google ID.');return encodeURIComponent(value);}
function mailId(value){if(typeof value!=='string' || !/^[a-f0-9]{1,100}$/i.test(value))throw Error('Neispravan Gmail ID.');return value;}
function requiredConfirmation(value){if(value?.confirmed!==true)throw Error('Ova operacija zahteva confirmed: true i izričit zahtev korisnika.');}
function base64(value){if(typeof value!=='string' || value.length>Math.ceil(maxBytes/3)*4 || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(value))throw Error('Neispravan base64 sadržaj ili fajl veći od 10 MB.');const data=Buffer.from(value,'base64');if(data.length>maxBytes)throw Error('Fajl je veći od 10 MB.');return data;}
function mime(value){if(typeof value!=='string' || !/^[a-zA-Z0-9.+-]+\/[a-zA-Z0-9.+-]+$/.test(value))throw Error('Neispravan MIME tip.');return value;}
function recipients(value){const list=typeof value==='string'?[value]:value;if(!Array.isArray(list) || list.length>100 || list.some(v=>typeof v!=='string' || !/^[a-zA-Z0-9.!#$%&'*+\/=?^_`{|}~-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(v) || v.length>254))throw Error('Unesi mejl adrese kao string ili niz adresa, bez imena i novih redova.');return list;}
const encodedHeader=value=>'=?UTF-8?B?'+Buffer.from(value).toString('base64')+'?=';
const lines=data=>data.toString('base64').match(/.{1,76}/g)?.join('\r\n') || '';
function sender(from){const v=typeof from==='string'?{email:from}:from || {};const email=recipients(v.email)[0],name=typeof v.name==='string'?v.name.replace(/[\x00-\x1f\x7f]/g,' ').trim().slice(0,200):'';return name?encodedHeader(name)+' <'+email+'>':email;}
const entities={amp:'&',lt:'<',gt:'>',quot:'"',apos:"'",nbsp:' '};
export function signatureText(html){return String(html || '').replace(/<(?:br|\/p|\/div|\/li|\/tr|\/h\d)\b[^>]*>/gi,'\n').replace(/<[^>]*>/g,'').replace(/&(#x?[0-9a-f]+|[a-z]+);/gi,(m,e)=>e[0]==='#'?String.fromCodePoint(parseInt(e[1]==='x' || e[1]==='X'?e.slice(2):e.slice(1),e[1]==='x' || e[1]==='X'?16:10)):entities[e.toLowerCase()] ?? m).replace(/[ \t]+\n/g,'\n').replace(/\n{3,}/g,'\n\n').trim();}
const escapeHtml=value=>value.replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'})[c]);
function bodyPart(body,signature){
  const plain='Content-Type: text/plain; charset=UTF-8\r\nContent-Transfer-Encoding: base64\r\n\r\n';
  const sigText=signatureText(signature);if(!sigText || body.includes(sigText))return plain+lines(Buffer.from(body));
  const boundary='agentdesk_alt_'+randomBytes(16).toString('hex'),html='<div dir="ltr">'+escapeHtml(body).replace(/\r?\n/g,'<br>')+'</div><br><div class="gmail_signature">'+signature+'</div>';
  return 'Content-Type: multipart/alternative; boundary="'+boundary+'"\r\n\r\n--'+boundary+'\r\n'+plain+lines(Buffer.from(body+'\n\n'+sigText))+'\r\n--'+boundary+'\r\nContent-Type: text/html; charset=UTF-8\r\nContent-Transfer-Encoding: base64\r\n\r\n'+lines(Buffer.from(html))+'\r\n--'+boundary+'--';
}
export function composeMail(value,from){
  const v=object(value,['from','signature','to','cc','bcc','subject','text','attachments','threadId','inReplyTo','confirmed']);
  const to=recipients(v.to),cc=recipients(v.cc || []),bcc=recipients(v.bcc || []);if(!to.length || to.length+cc.length+bcc.length>100)throw Error('Poruka zahteva primaoca, najviše 100 ukupno.');
  const subject=text(v.subject),body=text(v.text,100000);if(/[\r\n]/.test(subject))throw Error('Naslov ne sme imati novi red.');
  const headers=['From: '+sender(from),'To: '+to.join(',\r\n '),...(cc.length?['Cc: '+cc.join(',\r\n ')]:[]),...(bcc.length?['Bcc: '+bcc.join(',\r\n ')]:[]),'Subject: '+(subject.match(/.{1,15}/gu) || ['']).map(encodedHeader).join('\r\n '),'MIME-Version: 1.0'];
  if(v.inReplyTo!==undefined){if(typeof v.inReplyTo!=='string' || !/^<[^<>\s\r\n]{1,500}>$/.test(v.inReplyTo))throw Error('Neispravan Message-ID odgovora.');headers.push('In-Reply-To: '+v.inReplyTo,'References: '+v.inReplyTo);}
  const attachments=v.attachments || [];if(!Array.isArray(attachments) || attachments.length>20)throw Error('Najviše 20 priloga.');let size=0;
  if(v.signature!==undefined && typeof v.signature!=='boolean')throw Error('signature mora biti true ili false.');
  const parts=[bodyPart(body,v.signature===false?'':from?.signature)];
  for(const item of attachments){const a=object(item,['filename','mimeType','contentBase64']);const filename=text(a.filename,200);if(!filename || /[\r\n\x00]/.test(filename))throw Error('Neispravan naziv priloga.');const bytes=base64(a.contentBase64);size+=bytes.length;if(size>maxBytes)throw Error('Prilozi ukupno mogu imati do 10 MB.');parts.push('Content-Type: '+mime(a.mimeType || 'application/octet-stream')+"\r\nContent-Disposition: attachment; filename*=UTF-8''"+encodeURIComponent(filename).replace(/'/g,'%27')+'\r\nContent-Transfer-Encoding: base64\r\n\r\n'+lines(bytes));}
  const boundary='agentdesk_'+randomBytes(16).toString('hex');headers.push('Content-Type: multipart/mixed; boundary="'+boundary+'"');
  const message={raw:Buffer.from(headers.join('\r\n')+'\r\n\r\n--'+boundary+'\r\n'+parts.join('\r\n--'+boundary+'\r\n')+'\r\n--'+boundary+'--\r\n').toString('base64url')};
  if(v.threadId!==undefined)message.threadId=id(v.threadId);return message;
}
function taskData(value,partial=false){const v=object(value,['title','notes','due','status']);if(!partial && !v.title)throw Error('Zadatak zahteva title.');if(!Object.keys(v).length)throw Error('Nema izmena zadatka.');if('title' in v)text(v.title,1024);if('notes' in v)text(v.notes,8192);if('due' in v && v.due!==null){if(typeof v.due!=='string' || !/^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2}))?$/.test(v.due) || !Number.isFinite(Date.parse(v.due)) || new Date(v.due.slice(0,10)).toISOString().slice(0,10)!==v.due.slice(0,10))throw Error('due mora biti datum YYYY-MM-DD ili RFC3339.');v.due=v.due.slice(0,10)+'T00:00:00.000Z';}if('status' in v && !['needsAction','completed'].includes(v.status))throw Error('status mora biti needsAction ili completed.');return v;}
function driveData(value,partial=false){const v=object(value,['name','description','mimeType','parents','trashed','contentBase64','text','addParents','removeParents']);if(!partial && !v.name)throw Error('Fajl ili folder zahteva name.');if('name' in v)text(v.name,1000);if('description' in v)text(v.description,20000);if('mimeType' in v)mime(v.mimeType);for(const key of ['parents','addParents','removeParents'])if(key in v){if(!Array.isArray(v[key]) || v[key].length>20)throw Error('parents mora biti niz ID-jeva.');v[key].forEach(id);}if(partial && 'parents' in v || !partial && ('addParents' in v || 'removeParents' in v))throw Error('Za pomeranje koristi addParents i removeParents pri PATCH zahtevu.');if('trashed' in v && typeof v.trashed!=='boolean')throw Error('trashed mora biti boolean.');if('text' in v && 'contentBase64' in v)throw Error('Pošalji text ili contentBase64.');if(!Object.keys(v).length)throw Error('Nema izmena fajla.');return v;}
export function createGoogleWrite(auth,services){
  const write=(service,route,data,options)=>auth.serviceWrite(service,route,data,options);
  async function from(v){
    const own=auth.status().email,want=v?.from===undefined?own:recipients(v.from)[0];
    const list=(await auth.gmailRequest('/settings/sendAs').catch(()=>null))?.sendAs || [];
    const entry=list.find(s=>String(s.sendAsEmail).toLowerCase()===want.toLowerCase() && (s.isPrimary || s.verificationStatus==='accepted'));
    if(!entry && want.toLowerCase()!==own.toLowerCase())throw Error('Adresa '+want+' nije potvrđena u Gmailu pod „Šalji poštu kao“.');
    return {email:entry?.sendAsEmail || want,name:entry?.displayName || (entry?.isPrimary?list.find(s=>s.displayName)?.displayName:'') || '',signature:typeof entry?.signature==='string'?entry.signature.slice(0,20000):''};
  }
  return {
    async sendMail(v){requiredConfirmation(v);return write('gmail','/messages/send',composeMail(v,await from(v)));},
    async saveDraft(v,draftId){return write('gmail','/drafts'+(draftId?'/'+id(draftId):''),{message:composeMail(v,await from(v))},draftId?{method:'PUT'}:undefined);},
    async drafts(paging={}){return auth.gmailRequest('/drafts',paging);},
    async draft(draftId){return auth.gmailRequest('/drafts/'+id(draftId),{format:'full'});},
    async sendDraft(draftId,v){requiredConfirmation(v);return write('gmail','/drafts/send',{id:id(draftId)});},
    async deleteDraft(draftId,v){requiredConfirmation(v);await write('gmail','/drafts/'+id(draftId),undefined,{method:'DELETE'});return {ok:true};},
    async modifyMail(messageId,v){const data=object(v,['addLabelIds','removeLabelIds']);for(const key of Object.keys(data)){if(!Array.isArray(data[key]) || data[key].length>100)throw Error('Oznake moraju biti niz ID-jeva.');data[key].forEach(id);}if(!Object.values(data).some(a=>a.length))throw Error('Navedi oznake za dodavanje ili uklanjanje.');return write('gmail','/messages/'+mailId(messageId)+'/modify',data);},
    async importMail(v){const data=object(v,['raw','labelIds']);if(typeof data.raw!=='string' || data.raw.length>Math.ceil(maxImportBytes/3)*4 || !/^[A-Za-z0-9_-]+$/.test(data.raw))throw Error('raw mora biti base64url RFC 822 poruka do 50 MB.');const labelIds=data.labelIds || [];if(!Array.isArray(labelIds) || labelIds.length>100)throw Error('Oznake moraju biti niz ID-jeva.');labelIds.forEach(id);if(labelIds.some(l=>['SENT','DRAFT'].includes(l)))throw Error('Oznake SENT i DRAFT ne mogu se dodati uvezenoj poruci.');const message=await write('gmail','/messages/import',undefined,{params:{internalDateSource:'dateHeader',uploadType:'media'},raw:Buffer.from(data.raw,'base64url'),contentType:'message/rfc822'});return labelIds.length?write('gmail','/messages/'+mailId(message.id)+'/modify',{addLabelIds:labelIds}):message;},
    async trashMail(messageId,undo=false){return write('gmail','/messages/'+mailId(messageId)+(undo?'/untrash':'/trash'),{});},
    async senders(){return {sendAs:((await auth.gmailRequest('/settings/sendAs')).sendAs || []).map(s=>({email:s.sendAsEmail,name:s.displayName || '',isDefault:!!s.isDefault,isPrimary:!!s.isPrimary,verificationStatus:s.verificationStatus || '',signature:signatureText(s.signature)}))};},
    async labels(){return auth.gmailRequest('/labels');},
    async label(v,labelId){const data=object(v,['name','labelListVisibility','messageListVisibility']);if(!labelId && !data.name || !Object.keys(data).length)throw Error('Oznaka zahteva name ili izmenu.');if('name' in data)text(data.name,225);if(data.labelListVisibility && !['labelShow','labelShowIfUnread','labelHide'].includes(data.labelListVisibility) || data.messageListVisibility && !['show','hide'].includes(data.messageListVisibility))throw Error('Neispravna vidljivost oznake.');return write('gmail','/labels'+(labelId?'/'+id(labelId):''),data,labelId?{method:'PATCH'}:undefined);},
    async deleteLabel(labelId,v){requiredConfirmation(v);await write('gmail','/labels/'+id(labelId),undefined,{method:'DELETE'});return {ok:true};},
    async saveFile(value,fileId){
      const v=driveData(value,!!fileId),route='/files'+(fileId?'/'+id(fileId):''),params={supportsAllDrives:true,fields:'id,name,mimeType,parents,trashed,webViewLink'};
      for(const key of ['addParents','removeParents'])if(v[key]){params[key]=v[key].map(id).join(',');delete v[key];}
      const bytes='contentBase64' in v?base64(v.contentBase64):'text' in v?Buffer.from(text(v.text,maxBytes)):null;delete v.contentBase64;delete v.text;
      if(bytes){if(bytes.length>maxBytes)throw Error('Fajl je veći od 10 MB.');if(v.mimeType==='application/vnd.google-apps.folder')throw Error('Folder nema sadržaj.');if(fileId && (await services.file(fileId)).mimeType?.startsWith('application/vnd.google-apps.'))throw Error('Sadržaj Google Docs, Sheets i Slides menja se njihovim posebnim API-jima. Ovde možeš menjati metapodatke i otpremati obične fajlove.');
        const boundary='agentdesk_'+randomBytes(16).toString('hex'),raw=Buffer.concat([Buffer.from('--'+boundary+'\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n'+JSON.stringify(v)+'\r\n--'+boundary+'\r\nContent-Type: '+(v.mimeType?.startsWith('application/vnd.google-apps.')?'text/plain':v.mimeType || 'application/octet-stream')+'\r\n\r\n'),bytes,Buffer.from('\r\n--'+boundary+'--\r\n')]);
        return write('drive',route,undefined,{method:fileId?'PATCH':'POST',params:{...params,uploadType:'multipart'},raw,contentType:'multipart/related; boundary='+boundary});
      }
      return write('drive',route,v,{method:fileId?'PATCH':'POST',params});
    },
    async copyFile(fileId,v){const data=object(v,['name','parents']);if(data.name)text(data.name,1000);if(data.parents){if(!Array.isArray(data.parents))throw Error('parents mora biti niz.');data.parents.forEach(id);}return write('drive','/files/'+id(fileId)+'/copy',data,{params:{supportsAllDrives:true}});},
    async saveList(v,listId){const data=object(v,['title']);if(!data.title)throw Error('Lista zahteva title.');text(data.title,1024);return write('tasks','/users/@me/lists'+(listId?'/'+id(listId):''),data,{method:listId?'PATCH':'POST'});},
    async saveTask(listId,v,taskId){return write('tasks','/lists/'+id(listId)+'/tasks'+(taskId?'/'+id(taskId):''),taskData(v,!!taskId),{method:taskId?'PATCH':'POST'});},
    async moveTask(listId,taskId,v){const data=object(v,['parent','previous']);for(const value of Object.values(data))id(value);return write('tasks','/lists/'+id(listId)+'/tasks/'+id(taskId)+'/move',undefined,{params:data});},
    async deleteTask(listId,taskId,v){requiredConfirmation(v);await write('tasks','/lists/'+id(listId)+'/tasks/'+id(taskId),undefined,{method:'DELETE'});return {ok:true};},
    async deleteList(listId,v){requiredConfirmation(v);await write('tasks','/users/@me/lists/'+id(listId),undefined,{method:'DELETE'});return {ok:true};},
    async deleteEvent(calendar,eventId,v){requiredConfirmation(v);const existing=await services.event(calendar,eventId);if(!existing.etag)throw Error('Ponovo pročitaj verziju događaja.');if(existing.attendees?.length && v.notifyAttendees!==true)throw Error('Brisanje događaja sa učesnicima zahteva notifyAttendees: true i odobrenje korisnika.');await write('calendar','/calendars/'+encodeURIComponent(calendar)+'/events/'+id(eventId),undefined,{method:'DELETE',etag:existing.etag,params:{sendUpdates:v.notifyAttendees===true?'all':'none'}});return {ok:true};}
  };
}
