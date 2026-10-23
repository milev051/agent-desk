// Čista pravila za desnu kolonu i potvrdu keša. Ne čitaju disk i ne pokreću shell.

export function shortDiff(value) {
  if (typeof value !== 'string') return '';
  const text = value.replace(/\r\n/g, '\n').trim();
  if (!text) return '';
  return text.length > 1200 ? text.slice(0, 1200) : text;
}

function rememberFile(files, seen, filePath, patch) {
  const path = String(filePath || '').trim().slice(0, 300);
  if (!path) return;
  let row = seen.get(path);
  if (!row) {
    row = {path, change: '', diff: ''};
    seen.set(path, row);
    files.push(row);
  }
  if (patch.change === 'open') {
    if (!row.change) row.change = 'open';
  } else if (typeof patch.change === 'string' && patch.change) row.change = patch.change.slice(0, 40);
  if (!row.diff && patch.diff) row.diff = patch.diff;
}

export function touchedFiles(message) {
  const files = [];
  const seen = new Map();
  for (const action of message?.actions || []) {
    if (action?.kind === 'file' && typeof action.text === 'string') rememberFile(files, seen, action.text, {change: action.change, diff: shortDiff(action.diff)});
    if (action?.kind === 'tool' && typeof action.path === 'string' && /^read$/i.test(action.text || '')) rememberFile(files, seen, action.path, {change: 'open'});
  }
  return files;
}

export function diffStat(diff) {
  let added = 0, removed = 0;
  if (typeof diff !== 'string' || !diff) return {added, removed};
  let inHunk = false;
  for (const line of diff.split('\n')) {
    if (line.startsWith('diff --git ') || line.startsWith('*** Begin Patch')) { inHunk = false; continue; }
    if (line.startsWith('@@')) { inHunk = true; continue; }
    if (!inHunk && (line.startsWith('+++') || line.startsWith('---'))) continue;
    if (line.startsWith('+')) added += 1;
    else if (line.startsWith('-')) removed += 1;
  }
  return {added, removed};
}

export function touchKind(file) {
  if (deleteChange.test(file?.change || '')) return 'delete';
  if (file?.change === 'open') return 'open';
  return 'edit';
}

export function fileParts(filePath) {
  const clean = String(filePath || '').replace(/\\/g, '/').replace(/\/+$/, '');
  const name = clean.split('/').pop() || clean;
  const dir = clean.slice(0, Math.max(0, clean.length - name.length)).replace(/\/$/, '');
  const ext = name.includes('.') && !name.startsWith('.') ? name.split('.').pop().slice(0, 4).toUpperCase() : 'FAJL';
  return {name, dir, ext};
}

export function displayPath(filePath, cwd = '') {
  const norm = value => String(value || '').replace(/\\/g, '/').replace(/^\.\//, '').replace(/\/+$/, '');
  let file = norm(filePath);
  const base = norm(cwd).replace(/\/$/, '');
  if (base && (file === base || file.startsWith(`${base}/`))) return file.slice(base.length + 1) || fileParts(file).name;
  if (file.startsWith('/')) return file.split('/').slice(-3).join('/');
  return file;
}

export function sameFile(a, b, cwd = '') {
  const norm = value => String(value || '').replace(/\\/g, '/').replace(/^\.\//, '').replace(/\/+$/, '');
  const left = norm(a), right = norm(b);
  if (!left || !right) return false;
  if (left === right) return true;
  const base = norm(cwd).replace(/\/$/, '');
  const abs = value => value.startsWith('/') ? value : (base ? `${base}/${value}` : value);
  return abs(left) === abs(right);
}

export function filesLabel(count) {
  const n = Math.abs(Number(count) || 0);
  const mod10 = n % 10, mod100 = n % 100;
  const word = mod10 === 1 && mod100 !== 11 ? 'fajl' : mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14) ? 'fajla' : 'fajlova';
  return `${n} ${word}`;
}

export function changesLabel(count) {
  const n = Math.abs(Number(count) || 0);
  const mod10 = n % 10, mod100 = n % 100;
  const word = mod10 === 1 && mod100 !== 11 ? 'izmena' : mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14) ? 'izmene' : 'izmena';
  return `${n} ${word}`;
}

export function fileState(filePath, files, gitFiles, options = {}) {
  const touch = (files || []).find(file => sameFile(file.path, filePath, options.cwd || ''));
  const dirty = (gitFiles || []).some(file => sameFile(file, filePath, options.cwd || ''));
  if (!touch && dirty) return 'uncommitted';
  if (!touch) return '';
  const kind = touchKind(touch);
  if (kind === 'delete') return 'delete';
  if (options.running) return kind === 'open' ? 'reading' : 'editing';
  if (options.cleanKnown && !dirty) return 'committed';
  return kind === 'open' ? 'opened' : 'edited';
}

export function fileStamp(mtime, now = Date.now()) {
  const time = Number(mtime);
  if (!Number.isFinite(time)) return '';
  const date = new Date(time);
  if (new Date(now).toDateString() === date.toDateString()) return date.toLocaleTimeString('sr-Latn-RS', {hour: '2-digit', minute: '2-digit'});
  return date.toLocaleDateString('sr-Latn-RS', {day: 'numeric', month: 'short'});
}

export function fileSize(bytes) {
  if (!Number.isFinite(bytes) || bytes < 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 102.4) / 10} KB`;
  return `${Math.round(bytes / (1024 * 102.4)) / 10} MB`;
}

const deletionVerb = /\b(?:obris\w*|bris\w*|uklon\w*|delete[ds]?|deleting|removed|unlink(?:ed)?|trash|git\s+rm|rm)\b/i;
const deleteChange = /delete|remove|unlink|trash/i;

function shellWords(value) {
  const words = [];
  const re = /"([^"]*)"|'([^']*)'|(\S+)/g;
  let match;
  while ((match = re.exec(value))) words.push(match[1] ?? match[2] ?? match[3]);
  return words;
}

function commandDeletionPaths(command) {
  const text = String(command || '');
  const hits = [];
  const re = /(?:^|&&|\|\||[;&|`(])\s*(?:sudo\s+)?(?:[\w./-]*\/)?(?:git\s+rm|rm|unlink|trash)\b([^;&|\n]*)/gi;
  let match;
  while ((match = re.exec(text))) {
    const args = shellWords(match[1] || '').filter(token => token && !token.startsWith('-'));
    if (args.length) hits.push(...args);
    else hits.push('');
  }
  return hits;
}

function pathsIn(text) {
  const found = [];
  const re = /`([^`\n]+)`|"([^"\n]+)"|'([^'\n]+)'|((?:\/|\.\/|\.\.\/|~\/)[^\s,;:)"'`]+)|(\b[\w.-]+\/[\w./-]+\.[\w.-]+\b)/g;
  let match;
  while ((match = re.exec(text))) {
    const value = (match[1] || match[2] || match[3] || match[4] || match[5] || '').trim().replace(/[),.;:]+$/g, '');
    if (!value || value.includes('://') || value.length > 240) continue;
    if (!/[./~]/.test(value)) continue;
    found.push(value.slice(0, 300));
  }
  return found;
}

export function blastWarnings(message) {
  const warnings = [];
  const seen = new Set();
  const add = (path, label) => {
    const clean = String(path || '').trim().replace(/^[`"']+|[`"':,;.]+$/g, '').slice(0, 300);
    const key = clean || label;
    if (seen.has(key)) return;
    seen.add(key);
    warnings.push({path: clean, label});
  };
  for (const action of message?.actions || []) {
    if (action?.kind === 'file' && deleteChange.test(action.change || '')) add(action.text, 'Brisanje fajla');
    if (action?.kind === 'command') {
      const parts = commandDeletionPaths(action.text);
      if (!parts.length) continue;
      const named = parts.filter(Boolean);
      if (named.length) for (const path of named) add(path, 'Komanda briše fajl');
      else add('', 'Komanda briše fajl');
    }
  }
  for (const sentence of String(message?.text || '').split(/\n+|(?<=[.!?])\s+/)) {
    if (!deletionVerb.test(sentence)) continue;
    for (const path of pathsIn(sentence)) add(path, 'Odgovor pominje brisanje fajla');
  }
  return warnings;
}

export function needsCacheConfirm(chat) {
  if (chat && !(chat.messages || []).some(message => !message.handoffFrom && !message.carriedFrom)) return false;
  const agent = chat?.settings?.agent;
  if (!agent) return true;
  if (chat.sessionReset === agent) return false;
  return !chat.sessions?.[agent];
}

export function lastTouchedMessage(chat) {
  return [...(chat?.messages || [])].reverse().find(message => message.role === 'assistant') || null;
}

function countHtml(added, removed) {
  if (!added && !removed) return '';
  return `<span class="diff-add">+${added}</span> <span class="diff-del">-${removed}</span>`;
}

function statHtml(diff) {
  const stat = diffStat(diff);
  return countHtml(stat.added, stat.removed);
}

export function changedLines(diff) {
  return String(diff || '').replace(/\r\n/g, '\n').split('\n').filter(line => (line.startsWith('+') && !line.startsWith('+++')) || (line.startsWith('-') && !line.startsWith('---')));
}

export function changedLinesHtml(diff, escape) {
  const lines = changedLines(diff).slice(0, 800);
  if (!lines.length) return '';
  return diffPreviewHtml(lines.join('\n'), escape, lines.length);
}

export function diffPreviewHtml(diff, escape, limit = 220) {
  const lines = String(diff || '').replace(/\r\n/g, '\n').split('\n').slice(0, limit);
  if (!lines.some(line => line.trim())) return '';
  return `<pre class="change-diff">${lines.map(line => {
    const kind = line.startsWith('+++') || line.startsWith('---') ? '' : line.startsWith('+') ? 'diff-add' : line.startsWith('-') ? 'diff-del' : '';
    return `<span class="${kind}">${escape(line) || ' '}</span>`;
  }).join('')}</pre>`;
}

// Unified diff sa starim i novim brojevima redova, bez nagađanja kada hunk nema brojeve.
export function githubDiffHtml(diff, escape, limit = 800) {
  const all = String(diff || '').replace(/\r\n/g, '\n').split('\n');
  if (all.at(-1) === '') all.pop();
  if (!all.some(line => line.trim())) return '';
  let before = null, after = null, inHunk = false;
  const rows = all.slice(0, limit).map(line => {
    const hunk = line.match(/^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
    let kind = 'context', old = '', fresh = '', mark = ' ', code = line;
    if (hunk) { before = Number(hunk[1]); after = Number(hunk[2]); inHunk = true; kind = 'hunk'; }
    else if (line.startsWith('diff --git ')) { inHunk = false; before = after = null; kind = 'meta'; }
    else if (line.startsWith('@@')) { before = after = null; inHunk = true; kind = 'hunk'; }
    else if (!inHunk && /^(--- |\+\+\+ |index |new file mode|deleted file mode|Binary files |GIT binary patch|\*\*\*)/.test(line)) kind = 'meta';
    else if (line.startsWith('\\')) kind = 'meta';
    else if (line.startsWith('+')) { kind = 'add'; fresh = after ?? ''; if (after !== null) after++; mark = '+'; code = line.slice(1); }
    else if (line.startsWith('-')) { kind = 'del'; old = before ?? ''; if (before !== null) before++; mark = '−'; code = line.slice(1); }
    else if (line.startsWith(' ')) { old = before ?? ''; fresh = after ?? ''; if (before !== null) before++; if (after !== null) after++; code = line.slice(1); }
    return `<div class="diff-row diff-row-${kind}${kind === 'add' ? ' diff-add' : kind === 'del' ? ' diff-del' : ''}" role="row"><span class="diff-line-number" role="cell">${old}</span><span class="diff-line-number" role="cell">${fresh}</span><span class="diff-sign" aria-hidden="true">${mark}</span><span class="diff-code" role="cell">${escape(code) || ' '}</span></div>`;
  }).join('');
  return `<div class="change-diff github-diff" role="table" aria-label="Izmene fajla, stari i novi red">${rows}</div>${all.length > limit ? '<p class="change-missing">Prikazano je prvih 800 redova diff-a.</p>' : ''}`;
}

export function fileDiffStatsHtml(diff, escape, {known = false} = {}) {
  if (!diff && !known) return '<span class="chat-file-stats" title="Broj izmena nije sačuvan; klikni za proveru">—</span>';
  const {added, removed} = diffStat(diff);
  return `<span class="chat-file-stats" title="${escape(changesLabel(added + removed))}"><span class="file-add-count">+${added}</span><span class="file-del-count">−${removed}</span><span class="file-change-total">${escape(changesLabel(added + removed))}</span></span>`;
}

export function changeColumnHtml(message, index, escape, options = {}) {
  const files = touchedFiles(message);
  const warnings = blastWarnings(message);
  const total = files.length;
  const current = total ? Math.min(Math.max(0, index || 0), total - 1) : 0;
  const agent = options.agentName || 'Agent';
  const running = options.running === true || message?.status === 'running';
  const edits = files.filter(file => touchKind(file) === 'edit');
  const opens = files.filter(file => touchKind(file) === 'open');
  const deletes = files.filter(file => touchKind(file) === 'delete');
  const focus = edits[0] || deletes[0] || files[0] || null;
  const focusName = focus ? displayPath(focus.path, options.cwd || '') : '';
  const kicker = running ? 'Sada' : '';
  let title = 'Nema izmena.';
  let sub = '';
  if (running) {
    title = `${agent} razmišlja`;
    sub = [edits.length ? `menja ${filesLabel(edits.length)}` : '', opens.length ? `otvorio ${filesLabel(opens.length)}` : '', deletes.length ? `briše ${filesLabel(deletes.length)}` : ''].filter(Boolean).join(', ');
    if (!sub) sub = 'Još nema dirnutih fajlova.';
  } else if (edits.length) {
    title = `${agent} je izmenio ${filesLabel(edits.length)}`;
    sub = [focusName, opens.length ? `otvorio ${filesLabel(opens.length)}` : '', deletes.length ? `obrisao ${filesLabel(deletes.length)}` : ''].filter(Boolean).join(', ');
  } else if (deletes.length) {
    title = `${agent} je obrisao ${filesLabel(deletes.length)}`;
    sub = focusName;
  } else if (opens.length) {
    title = `${agent} je otvorio ${filesLabel(opens.length)}`;
    sub = focusName;
  }
  const git = options.git?.repo ? options.git : null;
  const gitCounts = git ? countHtml(git.added, git.removed) : '';
  const gitLine = git ? `<p class="files-git"><span class="git-branch">${escape(git.branch || 'HEAD')}</span><span>${git.changed ? `${gitCounts ? `${gitCounts} · ` : ''}${escape(changesLabel(git.changed))} · nije komitovano` : 'komitovano, radno stablo je čisto'}</span></p>` : '';
  const legend = `<p class="files-legend"><i class="legend-open"></i>Otvoreno<i class="legend-edit"></i>Izmenjeno<i class="legend-delete"></i>Brisanje${git ? '<i class="legend-commit"></i>Sačuvano<i class="legend-git"></i>Nije komitovano' : ''}</p>`;
  const focusStat = !running && focus && touchKind(focus) !== 'open' ? statHtml(focus.diff) : '';
  const subLine = sub || focusStat ? `<p class="files-sub" title="${escape(sub)}">${sub ? escape(sub) : ''}${sub && focusStat ? ' ' : ''}${focusStat}</p>` : '';
  const mark = options.agentIcon ? `<img class="files-mark" src="${escape(options.agentIcon)}" alt="" width="32" height="32">` : `<span class="files-mark" aria-hidden="true">${running ? '✶' : '✎'}</span>`;
  const card = `<section class="files-card"><div class="files-card-main">${mark}<div>${kicker ? `<p class="files-kicker">${escape(kicker)}</p>` : ''}<p class="files-title">${escape(title)}</p>${subLine}</div></div>${gitLine}${legend}</section>`;
  const rows = files.map((file, row) => {
    const parts = fileParts(displayPath(file.path, options.cwd || ''));
    const kind = touchKind(file);
    const label = kind === 'delete' ? 'Brisanje' : kind === 'open' ? 'Otvoreno' : 'Izmenjeno';
    const danger = warnings.some(warning => warning.path && sameFile(warning.path, file.path));
    const shown = displayPath(file.path, options.cwd || '');
    return `<button type="button" class="touched-row ${kind}${row === current ? ' selected' : ''}${danger ? ' danger' : ''}" data-replay="${row}" title="${escape(shown)}"><span class="ext">${escape(parts.ext)}</span><span class="touched-path">${escape(shown)}</span>${kind === 'open' ? '' : statHtml(file.diff)}<span class="touched-pill">${label}</span></button>`;
  }).join('');
  const list = files.length ? `<section class="touched-block"><header><h3>Dotaknuti fajlovi</h3><span>${escape(filesLabel(files.length))}</span></header>${rows}</section>` : '';
  const blasts = warnings.length ? `<ul class="blast-list">${warnings.map(warning => `<li>${escape(warning.label)}${warning.path ? `<span>${escape(warning.path)}</span>` : ''}</li>`).join('')}</ul>` : '';
  return `${card}${list}${blasts}`;
}

function countWord(n, one, few, many) {
  const value = Math.abs(Number(n) || 0);
  const mod10 = value % 10, mod100 = value % 100;
  const word = mod10 === 1 && mod100 !== 11 ? one : mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14) ? few : many;
  return `${value} ${word}`;
}

function addedPhrase(n) {
  const mod10 = n % 10, mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return `dodat je ${countWord(n, 'red', 'red', 'red')}`;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return `dodata su ${countWord(n, 'reda', 'reda', 'reda')}`;
  return `dodato je ${countWord(n, 'redova', 'redova', 'redova')}`;
}

function removedPhrase(n) {
  const mod10 = n % 10, mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return `uklonjen je ${countWord(n, 'red', 'red', 'red')}`;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return `uklonjena su ${countWord(n, 'reda', 'reda', 'reda')}`;
  return `uklonjeno je ${countWord(n, 'redova', 'redova', 'redova')}`;
}

function lineBits(diff, mark) {
  return changedLines(diff)
    .filter(line => line.startsWith(mark))
    .map(line => line.slice(1).replace(/\s+/g, ' ').trim())
    .filter(line => line.length > 2 && !/^[{}();,]+$/.test(line))
    .slice(0, 2)
    .map(line => line.length > 80 ? `${line.slice(0, 79)}…` : line);
}

function fileSentence(file, cwd) {
  const name = displayPath(file.path, cwd);
  if (touchKind(file) === 'delete') return `${name} je obrisan.`;
  const stat = diffStat(file.diff);
  const added = lineBits(file.diff, '+');
  const removed = lineBits(file.diff, '-');
  if (!stat.added && !stat.removed) return `U ${name} zabeležena je izmena, bez sačuvanog prikaza redova.`;
  const parts = [];
  if (stat.added) parts.push(addedPhrase(stat.added));
  if (stat.removed) parts.push(removedPhrase(stat.removed));
  let sentence = `U ${name} ${parts.join(' i ')}.`;
  if (added.length) sentence += ` Dodato: ${added.join('; ')}.`;
  if (removed.length) sentence += ` Uklonjeno: ${removed.join('; ')}.`;
  return sentence;
}

export function changeSentences(message, cwd = '') {
  const files = touchedFiles(message).filter(file => touchKind(file) !== 'open');
  if (!files.length) return '';
  const shown = files.slice(0, 6).map(file => fileSentence(file, cwd));
  if (files.length > 6) {
    const rest = files.length - 6;
    const mod10 = rest % 10, mod100 = rest % 100;
    const tail = mod10 === 1 && mod100 !== 11 ? `${rest} fajl ima` : mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14) ? `${rest} fajla imaju` : `${rest} fajlova ima`;
    shown.push(`Još ${tail} istu belešku u listi ispod.`);
  }
  return shown.join(' ');
}

export function fileMediaKind(filePath) {
  const name = String(filePath || '').split(/[\\/]/).pop().toLowerCase();
  const ext = name.includes('.') ? name.split('.').pop() : '';
  if (/^(png|jpe?g|gif|webp|avif|svg|bmp|ico|tiff?|heic)$/.test(ext)) return 'image';
  if (/^(mp4|webm|mov|m4v|ogv|avi|mkv)$/.test(ext)) return 'video';
  if (/^(mp3|wav|m4a|aac|ogg|oga|flac|opus|aiff?)$/.test(ext)) return 'audio';
  if (/^(txt|md|mdx|rst|log|csv|tsv|json|jsonl|ya?ml|toml|ini|cfg|conf|xml|html?|css|scss|sass|less|js|mjs|cjs|jsx|ts|tsx|vue|svelte|py|rb|go|rs|c|cc|cpp|h|hpp|swift|kt|kts|java|php|sql|sh|bash|zsh|fish|r|lua|pl|ps1|bat|cmd|tex|graphql|gql|proto|lock|diff|patch)$/.test(ext) || /^(readme|license|licence|makefile|dockerfile|procfile|gemfile)$/i.test(name)) return 'text';
  return 'binary';
}

export function fileAssetUrl(filePath, cwd = '') {
  const value = String(filePath || '').replace(/\\/g, '/');
  const absolute = value.startsWith('/') ? value : `${cwd.replace(/\/$/, '')}/${value.replace(/^\.\//, '')}`;
  return '/files' + absolute.split('/').map(encodeURIComponent).join('/');
}

export function messageChangeHtml(message, escape, {cwd = '', openPath = '', statsFor = () => undefined} = {}) {
  const all = touchedFiles(message);
  const files = all.filter(file => fileMediaKind(file.path) === 'text' && touchKind(file) !== 'open');
  const media = all.filter(file => fileMediaKind(file.path) !== 'text');
  for (const file of files) {
    const patches = [...new Set((message?.actions || []).filter(action => action.kind === 'file' && sameFile(action.text, file.path, cwd) && typeof action.diff === 'string' && action.diff.trim()).map(action => action.diff))];
    if (patches.length) file.diff = patches.join('\n');
  }
  const mediaHtml = media.length ? `<section class="chat-media-list" aria-label="Slike, video, audio i drugi fajlovi">${media.map(file => {
    const type = fileMediaKind(file.path), kind = touchKind(file);
    const label = kind === 'delete' ? 'Obrisano' : kind === 'open' ? 'Otvoreno' : 'Izmenjeno';
    const shown = displayPath(file.path, cwd), url = fileAssetUrl(file.path, cwd);
    const open = openPath && sameFile(file.path, openPath, cwd);
    const icon = type === 'video' ? '▶' : type === 'audio' ? '♫' : type === 'image' ? '▧' : '▤';
    const thumb = kind === 'delete' ? '' : type === 'image' ? `<img class="media-thumbnail" src="${escape(url)}" alt="" loading="lazy">` : type === 'video' ? `<video class="media-thumbnail" src="${escape(url)}#t=0.1" muted playsinline preload="metadata" aria-hidden="true"></video>` : '';
    return `<div class="chat-file-block media-block${open ? ' media-open' : ''}"><button type="button" class="chat-file media-tile ${type}${open ? ' selected' : ''}" data-chat-file="${escape(file.path)}" data-file-path="${escape(file.path)}" aria-expanded="${open ? 'true' : 'false'}" aria-label="${escape(shown + ', ' + label)}" title="${escape(shown)}"><span class="media-placeholder" aria-hidden="true">${icon}</span>${thumb}${type === 'audio' || type === 'binary' ? `<span class="media-name">${escape(fileParts(file.path).name)}</span>` : ''}<span class="media-state">${label}</span></button><div class="chat-diff-body"${open ? '' : ' hidden'}></div></div>`;
  }).join('')}</section>` : '';
  if (!files.length) return mediaHtml;
  const expanded = openPath && files.some(file => sameFile(file.path, openPath, cwd));
  return `${mediaHtml}<details class="chat-changes"${expanded ? ' open' : ''}><summary>Izmene (${files.length})</summary><section class="chat-diff chat-file-list">${files.map((file, index) => {
    const kind = touchKind(file), label = kind === 'delete' ? 'Brisanje' : 'Izmenjeno';
    const shown = displayPath(file.path, cwd), open = openPath && sameFile(file.path, openPath, cwd);
    const body = file.diff ? githubDiffHtml(file.diff, escape) : '';
    return `<div class="chat-file-block"><div class="chat-file-row"><button type="button" class="chat-file ${kind}${open ? ' selected' : ''}" data-chat-file="${escape(file.path)}" data-chat-file-label="${escape(shown)}" aria-expanded="${open ? 'true' : 'false'}" aria-label="${escape(shown)}" data-file-path="${escape(file.path)}" title="${escape(shown)} (⌘ klik: folder u Finderu)"><span class="chat-file-index">${index + 1}</span><span class="touched-path">${escape(shown)}</span><span class="touched-pill">${label}</span>${fileDiffStatsHtml(file.diff || statsFor(file.path), escape, {known: statsFor(file.path) !== undefined})}</button></div><div class="chat-diff-body"${open ? '' : ' hidden'}>${body}</div></div>`;
  }).join('')}</section></details>`;
}
