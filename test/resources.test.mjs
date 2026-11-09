import test from 'node:test';
import assert from 'node:assert/strict';
import {parsePs,parseSwap,parseVmStat,attribute,overloaded,createResourceMonitor,nextResourceWaiting} from '../resources.mjs';
import {detailRows,level,summaryText} from '../public/resource-monitor.mjs';

const ps=[
 '  100     1   501   1.0  51200 /usr/local/bin/node server.mjs',            // Agent Desk
 '  200   100   501  50.0 204800 /Users/m/.local/bin/claude -p x',           // čet A
 '  201   200   501  10.0 102400 /bin/zsh -c npm test',
 '  202   200   501  30.0 409600 node node_modules/.bin/nuxt dev --port 3000', // deljeno, pokrenuo A
 '  203   202   501   5.0 102400 node .nuxt/dev/index.mjs',
 '  300   100   501  20.0 102400 /Users/m/.local/bin/codex exec',           // čet B
 '  400   100   501   8.0 307200 /Applications/Google Chrome.app/Contents/MacOS/Google Chrome --headless=new --remote-debugging-port=9222', // snimak Agent Deska
 '  500     1   501  12.0 204800 node /Users/m/site/node_modules/.bin/vite dev', // ničiji dev server
 '  600     1   501  40.0 204800 /Applications/Spotify.app/Contents/MacOS/Spotify', // aplikacija, ne računa se
 '  700     1     0  90.0 204800 /usr/libexec/sysd',
].join('\n');

test('resursi: stablo procesa po četu, deljeni dev server i Chrome odvojeno',()=>{
 const rows=parsePs(ps);
 assert.equal(rows.get(202).rss,409600*1024);
 const g=attribute(rows,[{chatId:'A',title:'FON',pid:200},{chatId:'B',title:'Pireus',pid:300}],{selfPid:100,uid:501});
 const a=g.chats.find(c=>c.chatId==='A'),b=g.chats.find(c=>c.chatId==='B');
 assert.equal(a.cpu,60);assert.equal(a.processes,2);
 assert.equal(b.cpu,20);
 assert.equal(g.desk.cpu,1);// server bez agenata i bez deljenog Chrome-a
 const labels=g.shared.map(s=>s.label+'|'+s.startedBy);
 assert.ok(labels.some(l=>l.startsWith('node')&&l.endsWith('|FON')),labels.join());
 assert.ok(g.shared.find(s=>s.startedBy==='FON').cpu===35);
 assert.ok(labels.includes('Chrome (headless)|Agent Desk'),labels.join());
 assert.ok(labels.some(l=>/vite/.test(l)&&l.endsWith('|null')),labels.join());
 assert.ok(!labels.some(l=>/Spotify|sysd/.test(l)));
});

test('resursi: swap, vm_stat i pragovi preopterećenja',()=>{
 const s=parseSwap('total = 6144.00M  used = 5212.88M  free = 931.12M  (encrypted)');
 assert.equal(Math.round(s.total/1048576),6144);
 assert.equal(parseVmStat('Mach Virtual Memory Statistics: (page size of 16384 bytes)\nPages free: 10.\nPages inactive: 20.\nPages speculative: 5.\nPages purgeable: 5.'),40*16384);
 const base={load1:4,cores:8,pressure:1,swapTotal:6e9,swapUsed:5.9e9};
 assert.deepEqual(overloaded(base),[],'pun swap bez pritiska ne blokira');
 assert.equal(overloaded({...base,load1:20}).length,1);
 assert.equal(overloaded({...base,pressure:2}).length,1);
 assert.equal(overloaded({...base,pressure:4}).length,2);
});

test('resursi: red podčetova čeka preopterećenje i pušta jedan po jedan',async()=>{
 let t=0,load='40.00';
 const exec=async file=>file==='/bin/ps'?ps:file==='/usr/bin/vm_stat'?'':file.includes('sysctl')?'total = 6144.00M  used = 100.00M':'';
 const m=createResourceMonitor({roots:()=>[{chatId:'A',title:'FON',pid:200}],selfPid:100,uid:501,exec,now:()=>t});
 const snap=await m.sample();
 assert.equal(snap.top.chatId,'A');
 assert.equal(m.shouldWait({activeCount:0}),false,'bez aktivnih agenata nema čekanja');
 assert.equal(m.shouldWait({activeCount:2,queued:1}),true,'red ostaje po redu');
 assert.equal(m.canRelease({activeCount:0}),true);
 m.released();t=1000;
 assert.equal(m.canRelease({activeCount:1}),false,'pauza između puštanja');
 assert.equal(nextResourceWaiting([{id:'x',resourceWaiting:{at:5}},{id:'y',resourceWaiting:{at:2}},{id:'z'}]).id,'y');
 void load;
});

test('resursi: prikaz u bočnoj traci',()=>{
 const data={system:{load1:20,cores:8,pressure:1,memAvailable:1073741824,swapUsed:5e9,swapTotal:6e9},overload:['opterećenje 20.0 (prag 16)'],chats:[{chatId:'A',title:'FON',cpu:60,rss:2e9},{chatId:'B',title:'Pireus',cpu:5,rss:1e8}],desk:{cpu:1,rss:5e7},shared:[{label:'nuxt dev',startedBy:'FON',cpu:35,rss:5e8}],top:{chatId:'A'}};
 assert.equal(level(data.system,data.overload),'high');
 assert.match(summaryText(data),/Opterećenje 20 · RAM 1,0 GB slobodno · swap/);
 const rows=detailRows(data);
 assert.deepEqual(rows.map(r=>r.kind),['chat','chat','desk','shared']);
 assert.ok(rows[0].top);assert.match(rows[3].label,/pokrenuo „FON“/);
});
