const shellLanguage=/^(?:bash|sh|zsh|shell|console|shellscript|terminal)$/i;
const knownCommand=/^(?:\$\s+)?(?:sudo\s+(?:-\S+\s+)*)?(?:mkdir|pbpaste|pbcopy|chmod|chown|cd|ls|pwd|cat|printf|echo|curl|wget|python3?|node|npm|npx|git|gh|brew|open|test|export|source|bash|zsh|sh|cp|mv|rm|ln|touch|rclone|ssh|scp|timeout|kill|killall|find|rg|grep|sed|awk|date|du|df|uname|sw_vers|defaults|launchctl|caffeinate|pip3?|uv|ffmpeg|docker|make|tar|unzip|zip|ditto|xattr|codesign|spctl|osascript|diskutil|softwareupdate|plutil|xcode-select|tccutil|lsof|ps|tail|head|which|mdfind|security|networksetup|pmset|\.\/[^\s]+)(?:\s|$)/;
// Jezik bloka iz markdowna („bash title=x“ → „bash“).
export const codeLanguage=value=>String(value || '').trim().split(/\s+/)[0];
export function isShellCommand(text, language='') {
 const value=String(text || '').trim();
 if(!value || value.length>20000 || /\0/.test(value))return false;
 language=codeLanguage(language);
 if(language)return shellLanguage.test(language);
 // Bez jezika: svaki red (osim komentara i nastavka posle „\“) mora da počne poznatom komandom.
 let continued=false,commands=0;
 for(const raw of value.split('\n')){
  const line=raw.trim();
  if(continued){continued=/\\$/.test(line);continue;}
  if(!line || line.startsWith('#'))continue;
  if(!knownCommand.test(line))return false;
  commands++;continued=/\\$/.test(line);
 }
 return commands>0;
}
// phone: na telefonu dugme se ne prikazuje, jer se Terminal otvara samo na Macu.
export function addCommandButtons(content,{phone=false}={}) {
 if(phone)return;
 for(const code of content.querySelectorAll('.message.assistant .message-body code')){
  const language=(code.className.match(/language-([\w-]+)/)||[])[1] || '';
  const command=code.textContent.trim();
  if(!isShellCommand(command,language) || code.closest('blockquote'))continue;
  const button=document.createElement('button');button.type='button';button.className='run-command';
  button.dataset.runCommand=command;button.textContent='▶ Pokreni u Terminalu';
  button.title='Otvori Terminal na Macu i pokreni ove komande (pre pokretanja traži potvrdu)';button.setAttribute('aria-label',button.title);
  if(code.parentElement.tagName==='PRE')code.parentElement.append(button);else code.after(button);
 }
}
