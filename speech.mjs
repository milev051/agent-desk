import {stripColorMarkup} from './public/color-markup.mjs';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {repairWav as repairWavBytes, joinWavs as joinWavBytes} from './public/wav.mjs';

export const speechModel='gpt-4o-mini-tts';
export const speechChunk=900;

export function spokenText(text){
  let value=stripColorMarkup(text).split('Povezane putanje na računaru (pročitaj po potrebi):')[0];
  value=value.replace(/```[\s\S]*?```/g,' ');
  value=value.replace(/`([^`]+)`/g,'$1');
  value=value.replace(/!\[[^\]]*]\([^)]*\)/g,' ');
  value=value.replace(/\[([^\]]+)]\([^)]*\)/g,'$1');
  value=value.replace(/<[^>\n]{0,120}>/g,' ');
  value=value.replace(/^#{1,6}\s+/gm,'');
  value=value.replace(/https?:\/\/\S+/g,' ');
  value=value.replace(/[*_~>]+/g,' ');
  return value.replace(/\s+/g,' ').trim();
}

export function speechInput(messageText, selectedText){
  if(!messageText)throw new Error('Poruka nema tekst za čitanje.');
  if(selectedText!==undefined){
    if(typeof selectedText!=='string' || !selectedText.trim() || selectedText.length>30000)throw new Error('Izbor za čitanje je prazan ili predugačak.');
    // Izbor je već običan tekst koji je pregledač izvukao iz prikazane poruke.
    return selectedText.replace(/\s+/g,' ').trim();
  }
  return spokenText(messageText);
}

export function speechSlice(text, offset=0){
  const source=String(text||'');
  const start=Number.isInteger(offset)&&offset>0?offset:0;
  if(start>=source.length)return {text:'',next:0};
  const rest=source.slice(start);
  if(rest.length<=speechChunk)return {text:rest,next:0};
  let cut=rest.lastIndexOf('. ',speechChunk);
  if(cut<speechChunk*0.45)cut=rest.lastIndexOf(' ',speechChunk);
  if(cut<120)cut=speechChunk;
  const next=start+cut+1;
  return {text:rest.slice(0,cut+1).trim(),next:next>=source.length?0:next};
}

const providerError=status=>status===429?'OpenAI kvota je trenutno iscrpljena.':status===401||status===403?'OpenAI nije prihvatio ključ.':status===400?'OpenAI nije prihvatio tekst za čitanje.':`OpenAI trenutno nije dostupan (HTTP ${status}).`;

export function createSpeech({keyFile,fetchFn=fetch,model=speechModel}={}){
  const key=()=>keyFile && fs.existsSync(keyFile)?fs.readFileSync(keyFile,'utf8').trim():'';
  return {
    configured:()=>!!key(),
    async speak(text,signal){
      const secret=key();
      if(!secret)throw new Error('OpenAI API ključ nije podešen.');
      const spoken=String(text||'').trim();
      if(!spoken || spoken.length>speechChunk+40)throw new Error('Deo za čitanje je prazan ili predugačak.');
      const response=await fetchFn('https://api.openai.com/v1/audio/speech',{
        method:'POST',
        headers:{Authorization:`Bearer ${secret}`,'Content-Type':'application/json'},
        body:JSON.stringify({model,voice:'coral',input:spoken,instructions:'Čitaj na srpskom, smireno i razgovetno.',response_format:'wav'}),
        signal:signal?AbortSignal.any([signal, AbortSignal.timeout(45000)]):AbortSignal.timeout(45000),
      });
      if(!response.ok)throw new Error(providerError(response.status));
      const audio=Buffer.from(await response.arrayBuffer());
      try{return repairWav(audio);}catch{throw new Error('OpenAI nije vratio ispravan zvuk.');}
    },
  };
}

export function speechHash(text, model=speechModel){
  return createHash('sha256').update(`${model}\0${text}`).digest('hex').slice(0, 16);
}

export function speechLabel(title, at, model){
  const time=new Date(at).toISOString().replace(/\.\d{3}Z$/, 'Z').replace(/:/g, '-');
  const chat=String(title || 'Čet').replace(/[\\/:*?"<>|]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 60) || 'Čet';
  return `${chat} ${time} ${model}`;
}

export function repairWav(buffer){return Buffer.from(repairWavBytes(buffer));}
export function joinWavs(parts){return Buffer.from(joinWavBytes(parts));}
