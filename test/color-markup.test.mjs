import test from 'node:test';
import assert from 'node:assert/strict';
import {Marked} from 'marked';
import {colorExtension,stripColorMarkup,colorGuide} from '../public/color-markup.mjs';
import {spokenText} from '../speech.mjs';
import {extractNotificationLine} from '../notification-presence.mjs';
const markdown=new Marked({extensions:[colorExtension]});
test('boje rade sa Markdown formatiranjem, linkovima i više oznaka',()=>{
 const html=markdown.parse('Urađeno: [g]**testovi prolaze**[/g]. [b][Otvori](https://example.test)[/b] i [r]problem[/r].');
 assert.match(html,/<span class="desk-color-g"><strong>testovi prolaze<\/strong><\/span>/);
 assert.match(html,/<span class="desk-color-b"><a href="https:\/\/example.test">Otvori<\/a><\/span>/);
 assert.match(html,/<span class="desk-color-r">problem<\/span>/);
});
test('oznake u kodu, nepoznate i nedovršene oznake ne postaju boje',()=>{
 const html=markdown.parse('`[r]primer[/r]`\n\n```txt\n[b]primer[/b]\n```\n\n[x]tekst[/x] [r]nedovršeno');
 assert.doesNotMatch(html,/desk-color-/);
 assert.match(html,/<code>\[r\]primer\[\/r\]<\/code>/);
 assert.match(html,/\[x\]tekst\[\/x\]/);
 assert.match(markdown.parse('[r onclick=alert(1)]tekst[/r]'),/\[r onclick/);
});
test('boje ne ulaze u obaveštenja i pravilo za agente je kratko',()=>{
 assert.equal(stripColorMarkup('[r]problem[/r] [b]važno[/b] [g]uspeh[/g]'),'problem važno uspeh');
 assert.equal(extractNotificationLine('Urađeno: [g]Sačuvano[/g].\nPitanje: [b]Nastavljamo?[/b]'),'Pitanje: Nastavljamo?');
 assert.equal(spokenText('Urađeno: [g]Sačuvano[/g].'),'Urađeno: Sačuvano.');
 assert.ok(colorGuide.length<250);
 assert.match(colorGuide,/oboji jednu kratku rečenicu/);
 assert.match(colorGuide,/glavni rezultat/);
 assert.match(colorGuide,/šta korisnik treba da uradi/);
});
