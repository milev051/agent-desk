import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {spawnSync} from 'node:child_process';import {fileURLToPath} from 'node:url';
const source=fs.readFileSync(new URL('../launcher/main.swift',import.meta.url),'utf8');
test('druga kopija pokretača predaje čet prvoj i gasi se, bez novog prozora',()=>{
 const willFinish=source.slice(source.indexOf('func applicationWillFinishLaunching'),source.indexOf('func applicationDidFinishLaunching'));
 assert.match(willFinish,/runningApplications\(withBundleIdentifier:/);
 assert.match(willFinish,/processIdentifier != me\.processIdentifier/);
 const didFinish=source.slice(source.indexOf('func applicationDidFinishLaunching'));
 assert.ok(didFinish.indexOf('if primary != nil')<didFinish.indexOf('NSWindow('),'provera mora biti pre pravljenja prozora');
 const openUrls=source.slice(source.indexOf('open urls:[URL]'),source.indexOf('func showChat'));
 assert.match(openUrls,/if primary != nil \{handOver\(id\);return\}/);
 assert.match(source,/addObserver\(self,selector:#selector\(remoteOpenChat/);
 assert.match(source,/hasVisibleWindows flag:Bool\)->Bool \{window\?\./);
});
test('pokretač se prevodi',{skip:process.platform!=='darwin' || !fs.existsSync('/usr/bin/swiftc')},()=>{
 const result=spawnSync('/usr/bin/swiftc',['-typecheck',fileURLToPath(new URL('../launcher/main.swift',import.meta.url))],{encoding:'utf8',timeout:120000});
 assert.equal(result.status,0,result.stderr);
});
