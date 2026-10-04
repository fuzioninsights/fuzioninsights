// Links antigos (artigo.html?id=art-123...) -> endereço novo (/artigo/nome-da-materia), com redirecionamento 301.
// Se o artigo não for achado agora, manda para /artigo/<id>, que a própria página resolve pelo ID (nunca dá 404).
const DB = 'https://fuzion-insights-default-rtdb.firebaseio.com';
const slugify = s => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
function slugFromTitle(t) {
  let s = slugify(t); if (s.length > 60) { s = s.slice(0, 60); const k = s.lastIndexOf('-'); if (k > 25) s = s.slice(0, k); }
  return s.replace(/-+$/, '') || 'artigo';
}

exports.handler = async (event) => {
  const qs = event.queryStringParameters || {};
  const id = String(qs.id || '').trim();
  const go = (loc, code, cache) => ({ statusCode: code, headers: { Location: loc, 'cache-control': cache }, body: '' });
  if (!id) return go('/', 302, 'no-store');

  // preserva outros parâmetros do link (utm_source, fbclid...)
  const rest = Object.keys(qs).filter(k => k !== 'id').map(k => `${encodeURIComponent(k)}=${encodeURIComponent(qs[k])}`).join('&');
  const suffix = rest ? '?' + rest : '';

  let a = null;
  try {
    const url = `${DB}/artigos.json?orderBy=${encodeURIComponent('"id"')}&equalTo=${encodeURIComponent(JSON.stringify(id))}`;
    const d = await (await fetch(url)).json();
    if (d && !d.error) a = Object.values(d)[0] || null;
  } catch (e) {}
  if (!a) {   // sem índice no Firebase: busca tudo e procura
    try {
      const d = await (await fetch(`${DB}/artigos.json`)).json();
      if (d && !d.error) a = Object.values(d).find(x => x && x.id === id) || null;
    } catch (e) {}
  }
  if (!a) return go(`/artigo/${encodeURIComponent(id)}${suffix}`, 302, 'no-store');
  return go(`/artigo/${encodeURIComponent(a.slug || slugFromTitle(a.title))}${suffix}`, 301, 'public, max-age=3600');
};
