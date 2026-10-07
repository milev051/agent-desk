const fileFields='id,name,mimeType,size,modifiedTime,description,webViewLink,parents,shortcutDetails';
function id(value){if(typeof value!=='string' || !/^[a-zA-Z0-9_@-]{1,250}$/.test(value))throw Error('Neispravan Google ID.');return encodeURIComponent(value);}
function page({maxResults=20,pageToken=''}={},limit=100){if(!Number.isInteger(maxResults) || maxResults<1 || maxResults>limit || typeof pageToken!=='string' || pageToken.length>2000)throw Error('Neispravni parametri strane.');return {maxResults,pageToken};}
export function createGoogleServices(auth){
  const request=(service,path,params,content)=>auth.serviceRequest(service,path,params,content);
  return {
    status(service){const shared=auth.status();return {...shared,connected:!!shared.services[service]?.connected,state:shared.state==='connected' && !shared.services[service]?.connected?'reconnect_required':shared.state};},
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
    async task(listId,taskId){return request('tasks','/lists/'+id(listId)+'/tasks/'+id(taskId));}
  };
}
