export function isShellCommand(text, language='') {
 const value=String(text || '').trim();
 if(!value || value.length>20000 || /\0/.test(value))return false;
 if(language && !/^(?:bash|sh|zsh|shell|console|shellscript)$/i.test(language))return false;
 return /^(?:\$\s+)?(?:mkdir|pbpaste|chmod|cd|ls|pwd|cat|printf|echo|curl|wget|python3?|node|npm|npx|git|gh|brew|open|test|export|source|bash|zsh|sh|cp|mv|rm|touch|rclone|ssh|scp|timeout|kill|find|rg|sed|awk|date|du|df|uname|sw_vers|defaults|launchctl|caffeinate|pip3?|uv|ffmpeg|docker|make|\.\/[^\s]+)(?:\s|$)/.test(value);
}
export function addCommandButtons(content) {
 for(const code of content.querySelectorAll('.message.assistant .message-body code')){
  const language=(code.className.match(/language-([\w-]+)/)||[])[1] || '';
  const command=code.textContent.trim();
  if(!isShellCommand(command,language) || code.closest('blockquote'))continue;
  const button=document.createElement('button');button.type='button';button.className='run-command';
  button.dataset.runCommand=command;button.textContent='▶ Pokreni';
  button.title='Pokreni ovu komandu u Terminalu na Macu';button.setAttribute('aria-label',button.title);
  if(code.parentElement.tagName==='PRE')code.parentElement.append(button);else code.after(button);
 }
}
