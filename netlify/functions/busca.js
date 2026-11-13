// Busca no texto COMPLETO das matérias (o índice leve da home guarda só o começo do texto).
//  /api/busca?q=juros+altos  ->  { ids: ["art-...", ...] }  (todas as palavras precisam aparecer na matéria)
// O texto fica em cache na memória por alguns minutos para não consultar o Firebase a cada busca.
const DB = 'https://fuzion-insights-default-rtdb.firebaseio.com';
const TTL = 5 * 60 * 1000;
const nrm = s => String(s || '').replace(/<[^>]*>/g, ' ').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ');
let CACHE = { t: 0, items: [] }, LOADING = null;

async function get(path, qs) {
  const r = await fetch(`${DB}/${path}.json${qs || ''}`);
  return r.ok ? r.json() : null;
}

async function load() {
  const keys = Object.keys((await get('artigos', '?shallow=true')) || {});
  const items = [];
  for (let i = 0; i < keys.length; i += 20) {
    const part = await Promise.all(keys.slice(i, i + 20).map(async k => {
      const [id, content] = await Promise.all([get(`artigos/${encodeURIComponent(k)}/id`), get(`artigos/${encodeURIComponent(k)}/content`)]);
      return id ? { id, text: nrm(content) } : null;
    }));
    part.forEach(p => { if (p) items.push(p); });
  }
  CACHE = { t: Date.now(), items };
  return items;
}

exports.handler = async (event) => {
  const out = (body, cache) => ({ statusCode: 200, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': cache || 'public, max-age=60' }, body: JSON.stringify(body) });
  const q = nrm((event.queryStringParameters || {}).q || '').trim();
  if (q.length < 2) return out({ ids: [] });
  const toks = q.split(' ').filter(Boolean).slice(0, 8);
  try {
    let items = CACHE.items;
    if (!items.length || Date.now() - CACHE.t > TTL) { LOADING = LOADING || load().finally(() => { LOADING = null; }); items = await LOADING; }
    return out({ ids: items.filter(a => toks.every(t => a.text.includes(t))).map(a => a.id).slice(0, 100) });
  } catch (e) {
    return { statusCode: 502, headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ids: [] }) };
  }
};
