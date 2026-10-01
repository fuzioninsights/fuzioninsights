// Página de compartilhamento: entrega ao WhatsApp/Facebook/X/LinkedIn as tags Open Graph do artigo
// (título, resumo e imagem) e redireciona o leitor para o artigo.
const DB = 'https://fuzion-insights-default-rtdb.firebaseio.com';
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// Lê o ID do artigo: primeiro do parâmetro ?id=, depois direto do endereço original (/s/ID)
function getId(event) {
  const q = ((event.queryStringParameters || {}).id || '').trim();
  if (q) return q;
  const src = event.rawUrl || event.path || '';
  const m = /\/s\/([^/?#]+)/.exec(src) || /\/share\/([^/?#]+)/.exec(src);
  try { return m ? decodeURIComponent(m[1]).trim() : ''; } catch (e) { return ''; }
}

exports.handler = async (event) => {
  const site = (process.env.URL || 'https://fuzioninsights.netlify.app').replace(/\/$/, '');
  const id = getId(event);
  if (id === '_ping') return { statusCode: 200, headers: { 'content-type': 'text/plain; charset=utf-8', 'x-fz-share': '1', 'cache-control': 'no-store' }, body: 'Fuzion Insights: função de compartilhamento ativa ✔' };
  if (!id) return { statusCode: 200, headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' }, body: 'Função ativa, mas nenhum ID de artigo foi informado. Use /s/ID-DO-ARTIGO' };

  const target = `${site}/artigo.html?id=${encodeURIComponent(id)}`;
  let a = null;
  try {
    const url = `${DB}/artigos.json?orderBy=${encodeURIComponent('"id"')}&equalTo=${encodeURIComponent(JSON.stringify(id))}`;
    const d = await (await fetch(url)).json();
    if (d && !d.error) a = Object.values(d)[0] || null;
  } catch (e) {}
  if (!a) return { statusCode: 302, headers: { Location: target } };

  let published = '';
  if (a.date) published = new Date(a.date).toISOString();
  else { const m = /^art-(\d{10,})$/.exec(a.id || ''); if (m) published = new Date(+m[1]).toISOString(); }

  const title = `${a.title} | Fuzion Insights`;
  const desc = String(a.excerpt || 'Análise publicada pela Fuzion Insights.').replace(/…$/, '…');
  const shareUrl = `${site}/s/${encodeURIComponent(id)}`;
  const img = a.image || a.og ? `${site}/img/${encodeURIComponent(id)}.jpg` : '';
  const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${esc(target)}">
<meta property="og:site_name" content="Fuzion Insights"><meta property="og:locale" content="pt_BR">
<meta property="og:type" content="article"><meta property="og:url" content="${esc(shareUrl)}">
<meta property="og:title" content="${esc(a.title)}"><meta property="og:description" content="${esc(desc)}">
${published ? `<meta property="article:published_time" content="${published}">` : ''}
${a.category ? `<meta property="article:section" content="${esc(a.category)}">` : ''}
${img ? `<meta property="og:image" content="${esc(img)}"><meta property="og:image:type" content="image/jpeg"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta property="og:image:alt" content="${esc(a.title)}">` : ''}
<meta name="twitter:card" content="${img ? 'summary_large_image' : 'summary'}"><meta name="twitter:title" content="${esc(a.title)}"><meta name="twitter:description" content="${esc(desc)}">${img ? `<meta name="twitter:image" content="${esc(img)}">` : ''}
<noscript><meta http-equiv="refresh" content="0;url=${esc(target)}"></noscript>
<script>location.replace(${JSON.stringify(target)});</script></head>
<body><p><a href="${esc(target)}">Ler: ${esc(a.title)}</a></p></body></html>`;

  return { statusCode: 200, headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'public, max-age=0, s-maxage=300' }, body: html };
};
