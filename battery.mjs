import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
const execute=promisify(execFile);
export function parseBattery(text){
 const match=String(text).match(/(\d+)%;\s*([^;]+);/);
 if(!match || Number(match[1])>100)return null;
 return {level:Number(match[1]),charging:/AC Power/.test(text),state:match[2].trim()};
}
export function createBatteryStatus({now=Date.now,read=async()=>process.platform==='darwin'?parseBattery((await execute('/usr/bin/pmset',['-g','batt'],{timeout:2000})).stdout):null}={}){
 let computer=null,updated=-Infinity,pending=null,phone=null;
 return {
  report(value){
   if(value?.level!==null && (!Number.isInteger(value?.level)||value.level<0||value.level>100))throw Error('Neispravno stanje baterije.');
   if(typeof value?.charging!=='boolean')throw Error('Neispravno stanje punjenja.');
   phone={level:value.level,charging:value.charging,updatedAt:now()};
  },
  async status(){
   if(now()-updated>=30000 && !pending){pending=Promise.resolve().then(read).then(value=>{computer=value;updated=now();}).catch(()=>{computer=null;updated=now();}).finally(()=>{pending=null;});}
   if(pending)await pending;
   return {computer:computer?{...computer,updatedAt:updated}:null,phone:phone?{...phone,stale:now()-phone.updatedAt>180000}:null};
  }
 };
}
