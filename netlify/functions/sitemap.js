// Gera o sitemap.xml automaticamente com todos os artigos publicados no Firebase.
// Acessível em /sitemap.xml (veja o redirecionamento no netlify.toml).
const DB = 'https://fuzion-insights-default-rtdb.firebaseio.com';
const xml = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
const day = d => (d && !isNaN(d) ? d.toISOString().slice(0, 10) : '');

async function get(path) {
  const r = await fetch(`${DB}/${path}.json`);
  return r.ok ? r.json() : null;
}

exports.handler = async () => {
  const site = (process.env.URL || 'https://fuzioninsights.netlify.app').replace(/\/$/, '');
  const arts = [];
  try {
    // "shallow" devolve só as chaves (leve); depois busca apenas 3 campos pequenos de cada artigo
    const keys = Object.keys((await get('artigos?shallow=true')) || {});
    for (let i = 0; i < keys.length; i += 25) {
      const part = await Promise.all(keys.slice(i, i + 25).map(async k => {
        const [id, date, upd] = await Promise.all([get(`artigos/${k}/id`), get(`artigos/${k}/date`), get(`artigos/${k}/updatedAt`)]);
        if (!id) return null;
        let d = date ? new Date(date) : null;
        if (!d || isNaN(d)) { const m = /^art-(\d{10,})$/.exec(id); d = m ? new Date(+m[1]) : null; }
        const u = upd ? new Date(upd) : null;
        return { id, last: day(u && !isNaN(u) ? u : d), ts: (u && !isNaN(u) ? u : d) || 0 };
      }));
      arts.push(...part.filter(Boolean));
    }
  } catch (e) { /* se o Firebase falhar, entrega só as páginas fixas */ }

  arts.sort((a, b) => b.ts - a.ts);
  const newest = arts[0] ? arts[0].last : '';
  const url = (loc, last, freq, prio) => `  <url>\n    <loc>${xml(loc)}</loc>\n${last ? `    <lastmod>${last}</lastmod>\n` : ''}    <changefreq>${freq}</changefreq>\n    <priority>${prio}</priority>\n  </url>\n`;

  let body = url(`${site}/`, newest, 'daily', '1.0');
  arts.forEach(a => { body += url(`${site}/artigo.html?id=${encodeURIComponent(a.id)}`, a.last, 'monthly', '0.8'); });
  ['sobre.html', 'contato.html', 'privacidade.html', 'termos.html'].forEach(p => { body += url(`${site}/${p}`, '', 'yearly', '0.3'); });

  return {
    statusCode: 200,
    headers: { 'content-type': 'application/xml; charset=utf-8', 'cache-control': 'public, max-age=0, s-maxage=600' },
    body: `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}</urlset>\n`
  };
};
