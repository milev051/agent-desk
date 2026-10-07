import test from 'node:test';
import assert from 'node:assert/strict';
import {decide, watchdogPlist} from '../watchdog.mjs';

const base={now:1000000,pid:10,loaded:true,responds:true,labels:['local.agent-desk.server','local.agent-desk.watchdog','application.local.agent-desk.launcher.1.2']};

test('čuvar uklanja samo zaostale local.agent-desk poslove', () => {
  const result=decide({},{...base,labels:[...base.labels,'local.agent-desk.priorities-restart','com.apple.other']});
  assert.deepEqual(result.rogue,['local.agent-desk.priorities-restart']);
});

test('pet novih PID-ova servera za 15 minuta znači petlju restarta', () => {
  let state={};
  for(let i=1;i<=4;i++){const result=decide(state,{...base,now:base.now+i*60000,pid:i});assert.equal(result.loop,false);state=result.state;}
  const result=decide(state,{...base,now:base.now+5*60000,pid:5});
  assert.equal(result.loop,true);assert.deepEqual(result.state.starts,[]);
  assert.equal(decide({pid:5,starts:[base.now-20*60000]},{...base,pid:5}).state.starts.length,0);
});

test('restart tek posle dve neuspele provere, a neučitan server se pokreće', () => {
  const first=decide({},{...base,responds:false});
  assert.equal(first.restartServer,false);
  const second=decide(first.state,{...base,responds:false});
  assert.equal(second.restartServer,true);assert.equal(second.state.failures,0);
  const unloaded=decide({failures:1},{...base,loaded:false,pid:null,responds:false});
  assert.equal(unloaded.startServer,true);assert.equal(unloaded.restartServer,false);
});

test('plist čuvara pokreće skriptu iz projekta svakog minuta', () => {
  const plist=watchdogPlist({node:'/opt/homebrew/bin/node',script:'/Users/a/Agent Desk/watchdog.mjs',log:'/Users/a/.config/agent-desk/watchdog.log'});
  assert.match(plist,/<string>\/Users\/a\/Agent Desk\/watchdog\.mjs<\/string>/);
  assert.match(plist,/<key>StartInterval<\/key><integer>60<\/integer>/);
  assert.doesNotMatch(plist,/KeepAlive/);
});
