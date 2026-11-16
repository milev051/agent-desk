// Isključeni agenti (npr. istekla pretplata). Spisak je u data/agents.json: {"disabled":["codex","grok"]}.
// Isključen agent se ponaša kao da CLI nije instaliran: ne nudi se u interfejsu, ruteru, limitima ni podčetovima.
import fs from 'node:fs';
export function readDisabledAgents(file,known){
 try{const list=JSON.parse(fs.readFileSync(file,'utf8'))?.disabled;return new Set(Array.isArray(list)?list.filter(a=>known.includes(a)):[]);}catch{return new Set();}
}
export function withoutDisabled(binaries,disabled){
 return Object.fromEntries(Object.entries(binaries).map(([agent,path])=>[agent,disabled.has(agent)?null:path]));
}
