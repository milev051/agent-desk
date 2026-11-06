const pathStart = String.raw`(?:~\/|\/(?:Users|Volumes)\/)`;
const segment = String.raw`(?:[\w.@+-]+|\.[\w.@+-]+)(?: +[\p{Lu}\d.@][\w.@+-]*)*`;
const localPath = new RegExp(`${pathStart}(?:${segment}\\/)*${segment}`, 'gu');
const quotedPath = new RegExp(`(["'\`“«„])\\s*(${pathStart}[^"'”»\\n<>]{1,500}?)\\s*(["'\`”»])`, 'gu');

function cleanPath(match) {
  const path = match.trim().replace(/[.,;:!?)]+$/g, '');
  const body = path.startsWith('~/') ? path.slice(2) : path.replace(/^\/(?:Users|Volumes)\//, '');
  if (!body || /[\0\r\n]/.test(path) || body.split('/').some(part => !part.trim() || part.trim() === '.' || part.trim() === '..')) return '';
  return path;
}

function pathAnchor(path, trailing = '') {
  const shown = path.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('/', '/<wbr>');
  const value = path.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;');
  return `<a href="#" data-path-link="${value}" title="Klik otvara folder. ⌘ klik otvara fajl.">${shown}</a>${trailing}`;
}

function linkUnquoted(text) {
  return text.replace(localPath, match => {
    const path = cleanPath(match);
    if (!path) return match;
    return pathAnchor(path, match.slice(path.length));
  });
}

function linkPlain(text) {
  const parts = [];
  let last = 0;
  for (const match of text.matchAll(quotedPath)) {
    const path = cleanPath(match[2]);
    parts.push(linkUnquoted(text.slice(last, match.index)));
    parts.push(path ? `${match[1]}${pathAnchor(path)}${match[3]}` : match[0]);
    last = match.index + match[0].length;
  }
  parts.push(linkUnquoted(text.slice(last)));
  return parts.join('');
}

function linkSegment(segment) {
  return segment.replace(/(<code>)([\s\S]*?)(<\/code>)|<[^>]+>|([^<]+)/g, (all, open, code, close, text) => {
    if (code != null) {
      const linked = linkPlain(code);
      return linked === code ? all : open + linked + close;
    }
    if (text != null) return linkPlain(text);
    return all;
  });
}

export function linkLocalPaths(html) {
  return String(html || '').split(/(<pre\b[\s\S]*?<\/pre>)/gi).map((part, index) => {
    if (index % 2) return part;
    return part.split(/(<a\b[\s\S]*?<\/a>)/gi).map((chunk, chunkIndex) => chunkIndex % 2 ? chunk : linkSegment(chunk)).join('');
  }).join('');
}
