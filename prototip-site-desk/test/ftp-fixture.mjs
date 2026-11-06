import net from 'node:net';
import path from 'node:path';
import {stat,readdir,readFile,writeFile,mkdir} from 'node:fs/promises';

export async function createFTPFixture(root,{denyDownload=false}={}){
 const commands=[],sockets=new Set(),passive=new Set();
 const server=net.createServer(socket=>{
  sockets.add(socket);socket.on('close',()=>sockets.delete(socket));socket.on('error',()=>{});let cwd='/',buffer='',dataSocket=null,dataWait=null,pasv=null,chain=Promise.resolve();
  const send=line=>socket.write(line+'\r\n');const resolve=value=>{const absolute=path.posix.resolve(cwd,value||'.');const file=path.resolve(root,'.'+absolute);if(!file.startsWith(root+path.sep)&&file!==root)throw Error('path');return {absolute,file};};
  async function transfer(fn){send('150 Transfer starting');const conn=dataSocket||await dataWait;try{await fn(conn);conn.end();send('226 Transfer complete')}catch{conn.destroy();send('550 Transfer failed')}finally{dataSocket=null;dataWait=null;if(pasv){pasv.close();passive.delete(pasv);pasv=null}}}
  async function command(line){const at=line.indexOf(' '),verb=(at<0?line:line.slice(0,at)).toUpperCase(),arg=at<0?'':line.slice(at+1);commands.push({verb,arg:verb==='PASS'?'[test password]':arg});
   if(verb==='USER')return send('331 Password required');if(verb==='PASS')return send('230 Logged in');if(verb==='AUTH')return send('502 TLS unavailable in plaintext fixture');
   if(verb==='PWD')return send(`257 "${cwd}"`);if(['TYPE','OPTS','NOOP'].includes(verb))return send('200 OK');if(verb==='SYST')return send('215 UNIX Type: L8');
   if(verb==='CWD'){try{const p=resolve(arg);if(!(await stat(p.file)).isDirectory())throw Error();cwd=p.absolute;send('250 Directory changed')}catch{send('550 Directory unavailable')}return;}
   if(verb==='MKD'){try{const p=resolve(arg);await mkdir(p.file);send('257 Directory created')}catch{send('550 Cannot create directory')}return;}
   if(verb==='EPSV'){
    if(pasv){pasv.close();passive.delete(pasv);}let accept;dataWait=new Promise(r=>accept=r);pasv=net.createServer(s=>{sockets.add(s);s.on('close',()=>sockets.delete(s));s.on('error',()=>{});dataSocket=s;accept(s)});passive.add(pasv);await new Promise(r=>pasv.listen(0,'127.0.0.1',r));return send(`229 Entering Extended Passive Mode (|||${pasv.address().port}|)`);
   }
   if(verb==='SIZE'){try{return send('213 '+(await stat(resolve(arg).file)).size)}catch{return send('550 File unavailable')}}
   if(verb==='NLST'||verb==='LIST'){let names;try{names=await readdir(resolve(arg||'.').file)}catch{return send('550 Listing unavailable')}return transfer(async s=>s.write(names.join('\r\n')+(names.length?'\r\n':'')));}
   if(verb==='RETR'){if(denyDownload)return send('550 Read denied');let content;try{content=await readFile(resolve(arg).file)}catch{return send('550 File unavailable')}return transfer(async s=>s.write(content));}
   if(verb==='STOR')return transfer(async s=>{const data=[];await new Promise((r,j)=>{s.on('data',c=>data.push(c));s.on('end',r);s.on('error',j)});await writeFile(resolve(arg).file,Buffer.concat(data))});
   if(verb==='QUIT'){send('221 Goodbye');socket.end();return;}send('502 Not implemented');
  }
  socket.on('data',chunk=>{buffer+=chunk.toString();let n;while((n=buffer.indexOf('\r\n'))>=0){const line=buffer.slice(0,n);buffer=buffer.slice(n+2);chain=chain.then(()=>command(line)).catch(()=>send('550 Test failure'));}});send('220 Local Site Desk FTP test');
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 return {port:server.address().port,commands,async close(){for(const s of sockets)s.destroy();for(const s of passive)s.close();await new Promise(r=>server.close(r));}};
}
