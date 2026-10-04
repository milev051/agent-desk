import {preferredEffort} from '../public/reasoning.mjs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { codexModels, grokModels, normalizeAionCatalog, claudeModels, effortsFor, validateEffort, antigravityModels } from '../models.mjs';
import { command } from '../adapters.mjs';

test('spisak modela filtrira skrivene Codex modele i čita Grok CLI format', () => {
  assert.deepEqual(codexModels({ models: [{slug:'visible',display_name:'Vidljiv',visibility:'list'},{slug:'hidden',visibility:'hide'},{}] }), [{id:'visible',name:'Vidljiv',efforts:[]}]);
  assert.deepEqual(grokModels('You are logged in.\nDefault model: grok-a\nAvailable models:\n * grok-a (default)\n - grok-b\n - grok-b\n'), [{id:'grok-a',name:'grok-a'},{id:'grok-b',name:'grok-b'}]);
});
test('izabrani model stiže u komandu sva tri agenta na novoj i nastavljenoj sesiji', () => {
  for (const agent of ['codex','claude','grok']) for (const resume of [false,true]) {
    const c = { settings:{agent,model:'selected-model',access:'full',instructions:'',effort:'',cwd:'/tmp'},sessions:resume ? {[agent]:'native-session'} : {} };
    const spec = command(c, 'Test prompt', agent);
    assert.equal(spec.args[spec.args.indexOf('--model')+1],'selected-model');
    if(resume)assert.ok(spec.args.includes('native-session'));
    if(agent==='grok')assert.equal(spec.args[spec.args.indexOf('-p')+1],'Test prompt');
    else assert.equal(spec.input,'Test prompt');
  }
});

test('reasoning zavisi od modela i native Claude metadata ima prednost', () => {
 const c=normalizeAionCatalog([{backend:'claude',available_models:{available_models:[{id:'opus',reasoning_efforts:['low','max','ultracode']},{id:'haiku'}]}},{backend:'grok',config_options:JSON.stringify({config_options:[{category:'thought_level',options:[{value:'xhigh',name:'Extra High'},{value:'low',name:'Low'}]}]}),available_models:{available_models:[{id:'grok-a'}],current_model_id:'grok-a'}}]);
 assert.deepEqual(effortsFor(c,'claude','haiku'),[]);
 assert.deepEqual(effortsFor(c,'grok','').map(e=>e.id),['xhigh','low']);
 assert.throws(()=>validateEffort(c,{agent:'claude',model:'haiku',effort:'high'}),/ne podržava/);
 assert.throws(()=>validateEffort(c,{agent:'claude',model:'custom',effort:'max'}),/ne podržava/);
 assert.equal(validateEffort(c,{agent:'claude',model:'opus',effort:'max'}).effort,'max');
 const native=claudeModels([{value:'opus',supportsEffort:true,supportedEffortLevels:['low','max']},{value:'haiku'}]);
 assert.deepEqual(native[0].efforts.map(e=>e.id),['low','max']);assert.deepEqual(native[1].efforts,[]);
 const codex=codexModels({models:[{slug:'large',supported_reasoning_levels:[{effort:'max'},{effort:'ultra'}]},{slug:'small',supported_reasoning_levels:[{effort:'max'}]}]});
 assert.deepEqual(codex[0].efforts.map(e=>e.id),['max','ultra']); assert.deepEqual(codex[1].efforts.map(e=>e.id),['max']);
});
test('reasoning vrednosti se prosleđuju native CLI bez prevođenja',()=>{
 for(const [agent,effort,flag] of [['claude','max','--effort'],['grok','xhigh','--reasoning-effort'],['codex','ultra',null]]) {
  const spec=command({settings:{agent,model:'test',access:'full',instructions:'',effort,cwd:'/tmp'},sessions:{}},'test',agent);
  if(flag)assert.equal(spec.args[spec.args.indexOf(flag)+1],effort);else assert.ok(spec.args.includes('model_reasoning_effort="ultra"'));
 }
});

test('Antigravity native NDJSON prompt i nastavak sesije',()=>{
 assert.deepEqual(antigravityModels('Fetching available models...\ngemini-low\tGemini Low\n'),[{id:'gemini-low',name:'Gemini Low',efforts:[]}]);
 for(const resume of [false,true]) {
  const spec=command({settings:{agent:'antigravity',model:'gemini-low',access:'full',instructions:'Pravila',effort:'',cwd:'/tmp'},sessions:resume?{antigravity:'session-a'}:{}},'Test','agy');
  assert.ok(spec.args.includes('--dangerously-skip-permissions'));
  assert.ok(spec.args.includes('--disable-slash-commands'));
  assert.equal(JSON.parse(spec.input).event,'user');assert.match(JSON.parse(spec.input).message.content,/Test/);
  if(resume)assert.equal(spec.args[spec.args.indexOf('--conversation')+1],'session-a');
 }
});

test('automatski reasoning bira Medium, GPT-6-Luna High, a nepodržane nivoe preskače',()=>{
 const catalog={codex:{defaultModel:'gpt-6-sol',models:['gpt-6-sol','gpt-6-luna','gpt-5.6-luna'].map(id=>({id,efforts:[{id:'medium'},{id:'high'}]}))},claude:{models:[{id:'default',efforts:[{id:'medium'}]},{id:'haiku',efforts:[]}]}};
 assert.equal(preferredEffort(catalog,'codex','gpt-6-luna'),'high');assert.equal(preferredEffort(catalog,'codex','gpt-5.6-luna'),'medium');assert.equal(preferredEffort(catalog,'codex',''),'medium');assert.equal(preferredEffort(catalog,'claude',''),'medium');assert.equal(preferredEffort(catalog,'claude','haiku'),'');
});
