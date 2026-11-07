// Više Google naloga: glavni nalog ostaje u gmail/tokens.json, dodatni u gmail/accounts/ID.json.
// Svaki nalog ima svoj createGmail, Drive/Tasks/Calendar servis i upis; rute biraju nalog preko ?account=.
import fs from 'node:fs';
import path from 'node:path';
import {randomBytes} from 'node:crypto';

export function createGoogleAccounts({configDir,makeGmail,makeServices,makeWrite}){
  const dir=path.join(configDir,'gmail','accounts');
  const accounts=new Map();
  function attach(id,gmail){const services=makeServices(gmail);accounts.set(id,{id,gmail,services,write:makeWrite(gmail,services)});return accounts.get(id);}
  const primary=attach('primary',makeGmail({}));
  try{for(const name of fs.readdirSync(dir).sort()){const m=/^([a-z0-9]{8,32})\.json$/.exec(name);if(m)attach(m[1],makeGmail({tokenFile:path.join(dir,name)}));}}catch{}
  // Nalog čija prijava nije završena (otkazana ili istekla) ne ostaje u spisku.
  function prune(){for(const [id,a] of accounts)if(id!=='primary' && !a.gmail.status().email && a.gmail.status().state!=='connecting'){a.gmail.close();accounts.delete(id);}}
  // Isti nalog dvaput: dodatni se uklanja samo lokalno, bez opoziva, jer bi opoziv prekinuo i drugu vezu istog naloga.
  function dedupe(){
    const seen=new Set();
    for(const a of [...accounts.values()]){const email=a.gmail.status().email.toLowerCase();if(!email)continue;
      if(seen.has(email) && a.id!=='primary'){a.gmail.close();fs.rmSync(path.join(dir,a.id+'.json'),{force:true});accounts.delete(a.id);continue;}
      seen.add(email);}
  }
  function view(a){const s=a.gmail.status();return {id:a.id,primary:a.id==='primary',email:s.email,name:s.name,avatar:s.avatar,state:s.state,connected:s.connected,error:s.error,services:s.services,upgradeRequired:s.upgradeRequired};}
  return {
    primary,
    list(){prune();dedupe();return [...accounts.values()].filter(a=>a.id==='primary' || a.gmail.status().email || a.gmail.status().state==='connecting').map(view);},
    // Bez naloga ili sa adresom glavnog naloga vraća glavni; nepoznat nalog je greška, ne tihi prelazak na glavni.
    pick(account){
      if(!account)return primary;
      const want=String(account).toLowerCase();
      for(const a of accounts.values())if(a.id===want || a.gmail.status().email.toLowerCase()===want){if(!a.gmail.status().connected)throw Object.assign(Error('Google nalog '+account+' nije povezan. Ponovo ga poveži u podešavanjima.'),{status:409});return a;}
      throw Object.assign(Error('Google nalog '+account+' nije povezan u Agent Desku. Dodaj ga u podešavanjima.'),{status:404});
    },
    get(id){const a=accounts.get(String(id));if(!a)throw Object.assign(Error('Google nalog nije pronađen.'),{status:404});return a;},
    async add(){
      prune();
      if([...accounts.values()].some(a=>a.gmail.status().state==='connecting'))throw Error('Google prijava je već otvorena. Završi je ili je otkaži.');
      const id=randomBytes(8).toString('hex'),a=attach(id,makeGmail({tokenFile:path.join(dir,id+'.json')}));
      try{await a.gmail.connect();}catch(error){a.gmail.close();accounts.delete(id);throw error;}
      return view(a);
    },
    async remove(id){
      if(id==='primary')throw Error('Glavni nalog prekidaš dugmetom Prekini vezu.');
      const a=this.get(id);await a.gmail.disconnect();a.gmail.close();accounts.delete(id);return this.list();
    },
    close(){for(const a of accounts.values())a.gmail.close();}
  };
}
