// Stare poruke nemaju odvojene faze. Završni odgovor prepoznajemo
// samo po propisanom početku, van blokova koda, posle uspešnog završetka.
export function answerText(message, {includeProgress = false} = {}) {
  const text = message?.text || '';
  if (includeProgress || message?.role !== 'assistant' || message.status !== 'done') return text;
  let fence = null, offset = 0;
  for (const line of text.split('\n')) {
    const marker = line.match(/^ {0,3}(`{3,}|~{3,})/);
    if (marker) {
      const token = marker[1];
      if (!fence) fence = token;
      else if (token[0] === fence[0] && token.length >= fence.length && !line.slice(marker[0].length).trim()) fence = null;
    } else if (!fence && /^(?:Urađeno:|\*\*Urađeno:(?:\*\*)?)/.test(line)) {
      return text.slice(offset);
    }
    offset += line.length + 1;
  }
  return text;
}
