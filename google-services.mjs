import {randomBytes} from 'node:crypto';
const fileFields='id,name,mimeType,size,modifiedTime,description,webViewLink,parents,shortcutDetails';
function id(value){if(typeof value!=='string' || !/^[a-zA-Z0-9_@-]{1,250}$/.test(value))throw Error('Neispravan Google ID.');return encodeURIComponent(value);}
function page({maxResults=20,pageToken=''}={},limit=100){if(!Number.isInteger(maxResults) || maxResults<1 || maxResults>limit || typeof pageToken!=='string' || pageToken.length>2000)throw Error('Neispravni parametri strane.');return {maxResults,pageToken};}
function calendarId(value){if(typeof value!=='string' || !/^[a-zA-Z0-9_@.#-]{1,250}$/.test(value) || value==='.' || value==='..')throw Error('Neispravan Calendar ID.');return encodeURIComponent(value);}
function timestamp(value){if(typeof value!=='string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(value) || !Number.isFinite(Date.parse(value)))throw Error('Calendar vreme mora biti RFC3339 sa vremenskom zonom.');return value;}
function eventData(value,partial=false){
  if(!value || typeof value!=='object' || Array.isArray(value))throw Error('Unesi Calendar događaj kao JSON objekat.');
  const allowed=['summary','description','location','start','end','id'];
  if(Object.keys(value).some(key=>!allowed.includes(key)) || partial && 'id' in value)throw Error('Dozvoljeni su summary, description, location, start i end; id samo pri kreiranju.');
  const data={...value};
  if(!partial && (!data.summary || !data.start || !data.end))throw Error('Novi događaj zahteva summary, start i end.');
  for(const key of ['summary','description','location'])if(key in data && (typeof data[key]!=='string' || data[key].length>(key==='description'?20000:2000)))throw Error('Neispravan tekst događaja.');
  if('id' in data && (typeof data.id!=='string' || !/^[0-9a-v]{5,100}$/.test(data.id)))throw Error('ID novog događaja mora imati 5 do 100 base32hex znakova.');
  if(('start' in data)!==('end' in data))throw Error('Za promenu termina pošalji i start i end.');
  if(data.start){
    const values=[];
    for(const key of ['start','end']){
      const point=data[key];if(!point || typeof point!=='object' || Array.isArray(point) || Object.keys(point).some(k=>!['date','dateTime','timeZone'].includes(k)) || !!point.date===!!point.dateTime)throw Error('Termin mora sadržati date ili dateTime.');
      if(point.date){if(typeof point.date!=='string' || !/^\d{4}-\d{2}-\d{2}$/.test(point.date) || !Number.isFinite(Date.parse(point.date)) || new Date(point.date).toISOString().slice(0,10)!==point.date)throw Error('Neispravan datum događaja.');values.push(Date.parse(point.date));}
      else values.push(Date.parse(timestamp(point.dateTime)));
      if(point.timeZone!==undefined){try{new Intl.DateTimeFormat('en',{timeZone:point.timeZone});}catch{throw Error('Neispravna vremenska zona događaja.');}}
    }
    if(!!data.start.date!==!!data.end.date || values[1]<=values[0])throw Error('Početak i kraj moraju imati isti format, a kraj mora biti posle početka.');
  }
  if(partial && !Object.keys(data).length)throw Error('Nema izmena događaja.');
  return data;
}
export function createGoogleServices(auth,{now=Date.now}={}){
  const request=(service,path,params,content)=>auth.serviceRequest(service,path,params,content);
  return {
    status(service){const shared=auth.status();return {...shared,readOnly:shared.services[service]?.readOnly!==false,canWrite:!!shared.services[service]?.canWrite,connected:!!shared.services[service]?.connected,state:shared.state==='connected' && !shared.services[service]?.connected?'reconnect_required':shared.state};},
    async files({q='',...paging}={}){
      if(typeof q!=='string' || q.length>2000)throw Error('Drive upit može imati do 2000 znakova.');
      const {maxResults,pageToken}=page(paging);
      const result=await request('drive','/files',{q:q?`trashed = false and (${q})`:'trashed = false',pageSize:maxResults,pageToken,fields:`nextPageToken,incompleteSearch,files(${fileFields})`,supportsAllDrives:true,includeItemsFromAllDrives:true});
      return {files:result.files || [],nextPageToken:result.nextPageToken || null,incompleteSearch:!!result.incompleteSearch};
    },
    async file(fileId){return request('drive','/files/'+id(fileId),{fields:fileFields,supportsAllDrives:true});},
    async content(fileId){
      const file=await this.file(fileId);
      const exports={'application/vnd.google-apps.document':'text/plain','application/vnd.google-apps.spreadsheet':'text/csv','application/vnd.google-apps.presentation':'text/plain','application/vnd.google-apps.drawing':'application/pdf'};
      if(file.mimeType==='application/vnd.google-apps.folder')throw Error('Folder nema sadržaj. Pretraži fajlove upitom sa parents.');
      if(file.mimeType==='application/vnd.google-apps.shortcut')throw Error('Ovo je prečica. Koristi shortcutDetails.targetId za čitanje ciljnog fajla.');
      const mimeType=exports[file.mimeType] || file.mimeType || 'application/octet-stream';
      if(file.mimeType?.startsWith('application/vnd.google-apps.') && !exports[file.mimeType])throw Error('Ovaj Google format nema podržan izvoz. Otvori webViewLink.');
      if(Number(file.size)>10*1024*1024)throw Error('Fajl je veći od ograničenja od 10 MB.');
      const data=await request('drive','/files/'+id(fileId)+(exports[file.mimeType]?'/export':''),exports[file.mimeType]?{mimeType}:{alt:'media',supportsAllDrives:true},true);
      return {file,mimeType,data};
    },
    async text(fileId){const {file,mimeType,data}=await this.content(fileId);if(!mimeType.startsWith('text/') && !['application/json','application/xml','application/javascript'].includes(mimeType))throw Error('Ovaj fajl je binaran. Preuzmi ga kroz /content i koristi alat za taj format.');const text=data.toString('utf8');return {file,text:text.slice(0,100000),truncated:text.length>100000,note:file.mimeType==='application/vnd.google-apps.spreadsheet'?'CSV izvoz obuhvata samo prvi list.':''};},
    async lists(paging={}){const result=await request('tasks','/users/@me/lists',page(paging));return {lists:result.items || [],nextPageToken:result.nextPageToken || null};},
    async tasks(listId,{showCompleted=false,...paging}={}){if(typeof showCompleted!=='boolean')throw Error('showCompleted mora biti boolean.');const result=await request('tasks','/lists/'+id(listId)+'/tasks',{...page(paging),showCompleted,showHidden:showCompleted});return {tasks:result.items || [],nextPageToken:result.nextPageToken || null};},
    async calendars(paging={}){const result=await request('calendar','/users/me/calendarList',page(paging));return {calendars:result.items || [],nextPageToken:result.nextPageToken || null};},
    async events(calendar='primary',{q='',timeMin=new Date(now()).toISOString(),timeMax='',...paging}={}){
      if(typeof q!=='string' || q.length>2000)throw Error('Calendar upit može imati do 2000 znakova.');
      timestamp(timeMin);if(timeMax==='')timeMax=new Date(Date.parse(timeMin)+7*86400000).toISOString();timestamp(timeMax);
      if(Date.parse(timeMax)<=Date.parse(timeMin))throw Error('timeMax mora biti posle timeMin.');
      const result=await request('calendar','/calendars/'+calendarId(calendar)+'/events',{...page(paging),q,timeMin,timeMax,singleEvents:true,orderBy:'startTime',showDeleted:false});
      return {events:result.items || [],nextPageToken:result.nextPageToken || null,timeZone:result.timeZone || '',timeMin,timeMax};
    },
    async createEvent(calendar,value){const data=eventData(value);data.id ||= randomBytes(16).toString('hex');return auth.calendarWrite('/calendars/'+calendarId(calendar)+'/events',data);},
    async updateEvent(calendar,eventId,value){const data=eventData(value,true),existing=await this.event(calendar,eventId);if(!existing.etag)throw Error('Google nije vratio verziju događaja. Ponovo pročitaj događaj.');if(existing.attendees?.length)throw Error('Izmena događaja sa učesnicima radi se u Google Calendaru. Ovde su podržani lični događaji.');return auth.calendarWrite('/calendars/'+calendarId(calendar)+'/events/'+id(eventId),data,{method:'PATCH',etag:existing.etag});},
    async event(calendar,eventId){return request('calendar','/calendars/'+calendarId(calendar)+'/events/'+id(eventId));},
    async task(listId,taskId){return request('tasks','/lists/'+id(listId)+'/tasks/'+id(taskId));}
  };
}
