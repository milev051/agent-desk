// Ograničena Markdown oznaka: boju određuje aplikacija, bez stilova u odgovoru.
export const colorGuide='U završnom odgovoru oboji jednu kratku rečenicu: [g]glavni rezultat[/g], [b]šta korisnik treba da uradi[/b] ili [r]problem[/r]. Najviše 2 isticanja, bez ponavljanja i van koda; prefiksi Urađeno:/Proveri:/Pitanje: ostaju obični.';
export function stripColorMarkup(text){return String(text||'').replace(/\[\/?[rbg]\]/g,'');}
export const colorExtension={
 name:'deskColor',level:'inline',
 start(source){return source.search(/\[[rbg]\]/);},
 tokenizer(source){
  const match=/^\[([rbg])\]([^\n]*?)\[\/\1\]/.exec(source);
  if(match)return {type:'deskColor',raw:match[0],color:match[1],tokens:this.lexer.inlineTokens(match[2])};
 },
 renderer(token){return `<span class="desk-color-${token.color}">${this.parser.parseInline(token.tokens)}</span>`;}
};
