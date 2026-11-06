// Uvozi stare mejlove iz naloga u Mail aplikaciji u Gmail, pod zadatu oznaku.
// Upotreba: node tools/fon-u-gmail.mjs NALOG OZNAKA_ID [--proba]
// Već uvezene poruke pamti u data/uvoz-mejlova.json, pa se može pokrenuti ponovo.
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';

const [account,labelId,mode]=process.argv.slice(2);
if(!account || !labelId){console.error('Upotreba: node tools/fon-u-gmail.mjs NALOG OZNAKA_ID [--proba]');process.exit(1);}
const api='http://127.0.0.1:4317/api/integrations/gmail/messages/import';
const doneFile=path.join(import.meta.dirname,'..','data','uvoz-mejlova.json');
const done=fs.existsSync(doneFile)?JSON.parse(fs.readFileSync(doneFile,'utf8')):{};
const mailboxes={'Inbox':[],'Archive':[],'Sent Items':[],'Deleted Items':[]};
const quote=value=>JSON.stringify(value);
const mail=script=>execFileSync('osascript',['-e',`tell application "Mail"\n${script}\nend tell`],{encoding:'utf8',maxBuffer:64*1024*1024}).replace(/\n$/,'');

let imported=0,skipped=0,failed=0;
for(const [mailbox,extra] of Object.entries(mailboxes)){
  const box=`mailbox ${quote(mailbox)} of account ${quote(account)}`;
  const count=Number(mail(`count of messages of ${box}`));
  for(let i=1;i<=count;i++){
    const key=account+'|'+mail(`message id of message ${i} of ${box}`);
    if(done[key]){skipped++;continue;}
    let source=mail(`source of message ${i} of ${box}`).replace(/\r?\n/g,'\r\n');
    if(!/^From:/im.test(source.split('\r\n\r\n')[0]))source='From: '+account+'\r\n'+source;
    if(mode==='--proba'){console.log(mailbox,i,source.length,'bajtova');continue;}
    if(source.length>50*1024*1024){failed++;console.error(mailbox,i,'prevelika poruka',source.length);continue;}
    const response=await fetch(api,{method:'POST',headers:{'Content-Type':'application/json',Origin:'http://127.0.0.1:4317'},body:JSON.stringify({raw:Buffer.from(source).toString('base64url'),labelIds:[labelId,...extra]})});
    const result=await response.json().catch(()=>({}));
    if(!response.ok){failed++;console.error(mailbox,i,result.error || response.status);continue;}
    done[key]=result.id;imported++;fs.writeFileSync(doneFile,JSON.stringify(done,null,1));
  }
}
console.log(`Uvezeno ${imported}, preskočeno ${skipped}, neuspešno ${failed}.`);
