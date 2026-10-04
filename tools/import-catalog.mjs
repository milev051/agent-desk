import fs from 'node:fs';
import { normalizeAionCatalog } from '../models.mjs';
let input = ''; for await (const chunk of process.stdin) input += chunk;
const envelope = JSON.parse(input);
if (!envelope.success || !Array.isArray(envelope.data)) throw new Error('Katalog nije dostupan.');
fs.writeFileSync(new URL('../model-catalog.snapshot.json', import.meta.url), JSON.stringify(normalizeAionCatalog(envelope.data), null, 2));
console.log('Katalog modela je osvežen.');
