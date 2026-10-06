// Offsets refer to the stored Markdown, not rendered HTML.
export function recordTextTiming(reply,previous,now=Date.now()) {
  if(reply.text===previous)return;
  if(!reply.text.startsWith(previous)){delete reply.paragraphTimings;previous='';}
  reply.paragraphTimings ||= [];
  let current=reply.paragraphTimings.at(-1);
  for(let i=previous.length;i<reply.text.length;i++){
    const char=reply.text[i];
    if(char==='\n' && reply.text[i-1]==='\n')current=null;
    if(!/\S/.test(char))continue;
    // A boundary may have arrived in an earlier event.
    if(current && /\n\s*\n/.test(reply.text.slice(current.end,i)))current=null;
    if(!current){current={start:i,end:i+1,startedAt:now,endedAt:now};reply.paragraphTimings.push(current);}
    else {current.end=i+1;current.endedAt=now;}
  }
}
