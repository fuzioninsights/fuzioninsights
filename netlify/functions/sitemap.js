// Gera o sitemap.xml automaticamente com todos os artigos publicados no Firebase.
// Inclui o News Sitemap do Google News para artigos das últimas 48 horas.
const DB = 'https://fuzion-insights-default-rtdb.firebaseio.com';
const SITE_NAME = 'Fuzion Insights';
const HOURS_NEWS = 48;

const xml = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
const day = d => (d && !isNaN(d) ? d.toISOString().slice(0, 10) : '');
const iso = d => (d && !isNaN(d) ? d.toISOString() : '');

const slugify = s => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
function slugFromTitle(t) {
  let s = slugify(t); if (s.length > 60) { s = s.slice(0, 60); const k = s.lastIndexOf('-'); if (k > 25) s = s.slice(0, k); }
  return s.replace(/-+$/, '') || 'artigo';
}

async function get(path) {
  const r = await fetch(`${DB}/${path}.json`);
  return r.ok ? r.json() : null;
}

exports.handler = async () => {
  const site = (process.env.URL || 'https://fuzioninsights.netlify.app').replace(/\/$/, '');
  const arts = [];

  try {
    const keys = Object.keys((await get('artigos?shallow=true')) || {});
    for (let i = 0; i < keys.length; i += 25) {
      const part = await Promise.all(keys.slice(i, i + 25).map(async k => {
        const [id, date, upd, title, slug] = await Promise.all([
          get(`artigos/${k}/id`),
          get(`artigos/${k}/date`),
          get(`artigos/${k}/updatedAt`),
          get(`artigos/${k}/title`),
          get(`artigos/${k}/slug`)
        ]);
        if (!id) return null;
        let d = date ? new Date(date) : null;
        if (!d || isNaN(d)) { const m = /^art-(\d{10,})$/.exec(id); d = m ? new Date(+m[1]) : null; }
        const u = upd ? new Date(upd) : null;
        return { id, title: title || '', slug: slug || slugFromTitle(title), last: day(u && !isNaN(u) ? u : d), ts: (u && !isNaN(u) ? u : d) || 0 };
      }));
      arts.push(...part.filter(Boolean));
    }
  } catch (e) { /* se o Firebase falhar, entrega só as páginas fixas */ }

  arts.sort((a, b) => b.ts - a.ts);
  const newest = arts[0] ? arts[0].last : '';
  const limite = Date.now() - HOURS_NEWS * 60 * 60 * 1000;

  const url = (loc, last, freq, prio, news) => {
    let block = `  <url>\n    <loc>${xml(loc)}</loc>\n`;
    if (last) block += `    <lastmod>${last}</lastmod>\n`;
    block += `    <changefreq>${freq}</changefreq>\n    <priority>${prio}</priority>\n`;
    if (news) {
      block += `    <news:news>\n      <news:publication>\n        <news:name>${xml(SITE_NAME)}</news:name>\n        <news:language>pt</news:language>\n      </news:publication>\n      <news:publication_date>${news.date}</news:publication_date>\n      <news:title>${xml(news.title)}</news:title>\n    </news:news>\n`;
    }
    block += `  </url>\n`;
    return block;
  };

  let body = url(`${site}/`, newest, 'daily', '1.0');

  arts.forEach(a => {
    const loc = `${site}/artigo/${encodeURIComponent(a.slug)}`;
    const isNews = a.ts && a.ts >= limite;
    const news = isNews ? { date: iso(a.ts), title: a.title } : null;
    body += url(loc, a.last, 'monthly', '0.8', news);
  });

  ['assine.html', 'sobre.html', 'contato.html', 'privacidade.html', 'termos.html', 'correcoes.html'].forEach(p => {
    body += url(`${site}/${p}`, '', 'yearly', '0.3');
  });

  return {
    statusCode: 200,
    headers: { 'content-type': 'application/xml; charset=utf-8', 'cache-control': 'public, max-age=0, s-maxage=600' },
    body: `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">\n${body}</urlset>\n`
  };
};