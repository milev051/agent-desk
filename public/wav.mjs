function ascii(bytes, offset, length){
  let text='';
  for(let i=0;i<length;i++)text+=String.fromCharCode(bytes[offset+i]);
  return text;
}

function pcmWav(rate, channels, bits, data){
  const frame=channels*(bits/8);
  const length=data.length-data.length%frame;
  const out=new Uint8Array(44+length);
  const view=new DataView(out.buffer);
  const mark=(offset, text)=>{for(let i=0;i<text.length;i++)out[offset+i]=text.charCodeAt(i);};
  mark(0,'RIFF');
  view.setUint32(4, 36+length, true);
  mark(8,'WAVE');
  mark(12,'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, channels, true);
  view.setUint32(24, rate, true);
  view.setUint32(28, rate*frame, true);
  view.setUint16(32, frame, true);
  view.setUint16(34, bits, true);
  mark(36,'data');
  view.setUint32(40, length, true);
  out.set(data.subarray(0, length), 44);
  return out;
}

export function repairWav(buffer){
  const src=buffer instanceof Uint8Array?buffer:new Uint8Array(buffer);
  const view=new DataView(src.buffer, src.byteOffset, src.byteLength);
  if(src.length<44 || ascii(src,0,4)!=='RIFF' || ascii(src,8,4)!=='WAVE')throw new Error('Zvuk nije WAV.');
  let offset=12, fmt=null, dataOffset=-1, dataSize=0;
  while(offset+8<=src.length){
    const id=ascii(src, offset, 4);
    let size=view.getUint32(offset+4, true);
    if(size===0xFFFFFFFF)size=src.length-(offset+8);
    if(offset+8+size>src.length)size=src.length-(offset+8);
    if(id==='fmt ' && size>=16)fmt={audioFormat:view.getUint16(offset+8, true), channels:view.getUint16(offset+10, true), rate:view.getUint32(offset+12, true), bits:view.getUint16(offset+22, true)};
    if(id==='data'){dataOffset=offset+8;dataSize=size;break;}
    offset+=8+size+(size%2);
  }
  if(!fmt || dataOffset<0 || fmt.audioFormat!==1 || fmt.bits!==16 || fmt.channels<1 || fmt.channels>2 || !fmt.rate)throw new Error('Zvuk nije PCM koji pregledač može da pusti.');
  return pcmWav(fmt.rate, fmt.channels, fmt.bits, src.subarray(dataOffset, dataOffset+dataSize));
}

export function joinWavs(parts){
  if(!parts?.length)throw new Error('Nema zvuka za čitanje.');
  const repaired=parts.map(repairWav);
  const view=new DataView(repaired[0].buffer, repaired[0].byteOffset, repaired[0].byteLength);
  const channels=view.getUint16(22, true), rate=view.getUint32(24, true), bits=view.getUint16(34, true);
  const chunks=[];
  for(const part of repaired){
    const partView=new DataView(part.buffer, part.byteOffset, part.byteLength);
    if(partView.getUint16(22, true)!==channels || partView.getUint32(24, true)!==rate || partView.getUint16(34, true)!==bits)throw new Error('Delovi čitanja nemaju isti oblik zvuka.');
    chunks.push(part.subarray(44));
  }
  const total=chunks.reduce((sum, chunk)=>sum+chunk.length, 0);
  const data=new Uint8Array(total);
  let cursor=0;
  for(const chunk of chunks){data.set(chunk, cursor);cursor+=chunk.length;}
  return pcmWav(rate, channels, bits, data);
}
