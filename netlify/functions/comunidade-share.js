// Link compartilhável de um item da comunidade: /c/<tipo>/<id>
// Entrega às redes (WhatsApp, Facebook, X, LinkedIn, Telegram) o título e o resumo e leva o leitor para o item.
const DB = 'https://fuzion-insights-default-rtdb.firebaseio.com';
const KEY = process.env.FB_API_KEY || 'AIzaSyCwWE9YtckCT--utTkRJAqxk1_HWu0EJlM';
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const cut = (s, n) => { s = String(s || '').replace(/\s+/g, ' ').trim(); return s.length > n ? s.slice(0, n - 1).replace(/\s+\S*$/, '') + '…' : s; };
let cache = { t: '', exp: 0 };
async function adminToken() {
  if (cache.t && Date.now() < cache.exp) return cache.t;
  const r = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${KEY}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: process.env.FB_ADMIN_EMAIL, password: process.env.FB_ADMIN_PASSWORD, returnSecureToken: true })
  });
  const d = await r.json(); if (!d.idToken) throw new Error('auth');
  cache = { t: d.idToken, exp: Date.now() + 50 * 60 * 1000 }; return d.idToken;
}
exports.handler = async (event) => {
  const site = (process.env.URL || 'https://fuzioninsights.netlify.app').replace(/\/$/, '');
  const q = event.queryStringParameters || {};
  const tipo = String(q.tipo || ''), id = String(q.id || '');
  const home = `${site}/comunidade.html`;
  if (!['peticao', 'votacao', 'post'].includes(tipo) || !/^[0-9a-z]{9,14}$/.test(id)) return { statusCode: 302, headers: { Location: home } };
  let it = null;
  try {
    const t = await adminToken();
    it = await (await fetch(`${DB}/comunidade/${tipo}/${id}.json?auth=${t}`)).json();
  } catch (e) {}
  if (!it || it.error) return { statusCode: 302, headers: { Location: home } };

  const alvo = `${home}#${tipo}/${id}`, url = `${site}/c/${tipo}/${id}`;
  const por = it.autor ? ` · por ${it.autor}` : '';
  let title, desc;
  if (tipo === 'peticao') { title = `Petição: ${it.titulo}`; desc = `${it.n || 0} assinatura${it.n === 1 ? '' : 's'} (meta ${it.meta || 100}). ${cut(it.texto, 170)}`; }
  else if (tipo === 'votacao') { title = `Votação: ${it.titulo}`; desc = `Participe e vote${it.opcoes ? ': ' + Object.values(it.opcoes).join(' · ') : ''}`; }
  else { title = `Publicação${por}`; desc = cut(it.texto, 200); }
  const full = `${title} | Fuzion Insights`;
  const img = it.img ? `${site}/ci/${id}.jpg` : `${site}/favicon-512x512.png`, grande = !!it.img;
  const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8">
<title>${esc(full)}</title><meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${esc(url)}">
<meta property="og:site_name" content="Fuzion Insights"><meta property="og:locale" content="pt_BR"><meta property="og:type" content="article">
<meta property="og:url" content="${esc(url)}"><meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}">
<meta property="og:image" content="${esc(img)}">${grande ? '' : '<meta property="og:image:width" content="512"><meta property="og:image:height" content="512">'}
<meta name="twitter:card" content="${grande ? 'summary_large_image' : 'summary'}"><meta name="twitter:title" content="${esc(title)}"><meta name="twitter:description" content="${esc(desc)}"><meta name="twitter:image" content="${esc(img)}">
<noscript><meta http-equiv="refresh" content="0;url=${esc(alvo)}"></noscript>
<script>location.replace(${JSON.stringify(alvo)});</script></head>
<body><p><a href="${esc(alvo)}">Abrir na Comunidade Fuzion Insights</a></p></body></html>`;
  return { statusCode: 200, headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'public, max-age=0, s-maxage=300' }, body: html };
};
