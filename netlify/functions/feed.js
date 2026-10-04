// Feed RSS (/feed.xml) com os artigos mais recentes: título, resumo e link. NUNCA inclui o texto exclusivo.
// Serve de fonte para a newsletter automática (ex.: "Campanha RSS" da Brevo) e para leitores de RSS.
const DB = 'https://fuzion-insights-default-rtdb.firebaseio.com';
const LIMITE = 20;
const xml = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
const slugify = s => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
function slugFromTitle(t) {
  let s = slugify(t); if (s.length > 60) { s = s.slice(0, 60); const k = s.lastIndexOf('-'); if (k > 25) s = s.slice(0, k); }
  return s.replace(/-+$/, '') || 'artigo';
}
async function get(path) { const r = await fetch(`${DB}/${path}.json`); return r.ok ? r.json() : null; }

exports.handler = async () => {
  const site = (process.env.URL || 'https://fuzioninsights.netlify.app').replace(/\/$/, '');
  const items = [];
  try {
    // chaves do Firebase são cronológicas: as últimas são as mais recentes (evita baixar as imagens dos artigos)
    const keys = Object.keys((await get('artigos?shallow=true')) || {}).sort().slice(-LIMITE);
    const list = await Promise.all(keys.map(async k => {
      const f = n => get(`artigos/${k}/${n}`);
      const [id, title, slug, description, excerpt, date, category, premium] = await Promise.all(['id', 'title', 'slug', 'description', 'excerpt', 'date', 'category', 'premium'].map(f));
      if (!id || !title) return null;
      let d = date ? new Date(date) : null;
      if (!d || isNaN(d)) { const m = /^art-(\d{10,})$/.exec(id); d = m ? new Date(+m[1]) : new Date(0); }
      return { id, title, slug: slug || slugFromTitle(title), desc: description || excerpt || '', d, category, premium: !!premium };
    }));
    list.filter(Boolean).sort((a, b) => b.d - a.d).forEach(a => items.push(a));
  } catch (e) {}

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
<title>Fuzion Insights</title>
<link>${site}</link>
<description>Análises sobre estratégia, liderança, negócios e mercado.</description>
<language>pt-BR</language>
<atom:link href="${site}/feed.xml" rel="self" type="application/rss+xml"/>
${items.map(a => `<item>
<title>${xml((a.premium ? '🔒 ' : '') + a.title)}</title>
<link>${site}/artigo/${encodeURIComponent(a.slug)}</link>
<guid isPermaLink="true">${site}/artigo/${encodeURIComponent(a.slug)}</guid>
<pubDate>${a.d.toUTCString()}</pubDate>
${a.category ? `<category>${xml(a.category)}</category>` : ''}${a.premium ? '<category>Exclusivo para assinantes</category>' : ''}
<description>${xml(a.desc)}</description>
</item>`).join('\n')}
</channel>
</rss>`;
  return { statusCode: 200, headers: { 'content-type': 'application/rss+xml; charset=utf-8', 'cache-control': 'public, max-age=0, s-maxage=600' }, body };
};
