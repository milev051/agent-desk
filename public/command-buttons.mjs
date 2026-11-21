// Dugme „▶ Pokreni u Terminalu“ dobija samo blok koji je agent označio rečju „terminal“
// u info stringu bloka: ```sh terminal ili ```terminal. Ostali blokovi imaju samo kopiranje.
const shellLanguage=/^(?:bash|sh|zsh|shell|console|shellscript|terminal)$/i;
export const terminalGuide='Komande koje možeš sam pokreni sam. Korisniku daješ komandu da je sam pokrene samo kad traži lozinku (sudo, sistemska potvrda) ili je interaktivna ili van tvog dometa; tada je stavi u blok ```sh terminal, koji dobija dugme „▶ Pokreni u Terminalu“, a ostale blokove ne označavaj.';
// Info string bloka nosi oznaku: prva reč je shell jezik ili „terminal“, a jedna od reči je „terminal“.
export function isTerminalInfo(info){
 const words=String(info || '').trim().split(/\s+/).filter(Boolean);
 return words.length>0 && shellLanguage.test(words[0]) && words.some(word=>word.toLowerCase()==='terminal');
}
export function isRunnableBlock(text,info){
 const value=String(text || '').trim();
 return Boolean(value) && value.length<=20000 && !/\0/.test(value) && isTerminalInfo(info);
}
// marked u HTML upisuje samo prvu reč info stringa, zato označen blok dobija klasu language-terminal.
export const terminalCodeExtension={walkTokens(token){if(token.type==='code' && isTerminalInfo(token.lang))token.lang='terminal';}};
// phone: na telefonu dugme se ne prikazuje, jer se Terminal otvara samo na Macu.
export function addCommandButtons(content,{phone=false}={}) {
 if(phone)return;
 for(const code of content.querySelectorAll('.message.assistant .message-body pre > code.language-terminal')){
  const command=code.textContent.trim();
  if(!isRunnableBlock(command,'terminal') || code.closest('blockquote'))continue;
  const button=document.createElement('button');button.type='button';button.className='run-command';
  button.dataset.runCommand=command;button.textContent='▶ Pokreni u Terminalu';
  button.title='Otvori Terminal na Macu i pokreni ove komande (pre pokretanja traži potvrdu)';button.setAttribute('aria-label',button.title);
  code.parentElement.append(button);
 }
}
