// Últimos vídeos do canal do YouTube, sem chave de API: lê o feed público do canal e guarda em cache.
//  /api/videos?h=@fuzioninsights   (ou ?c=UCxxxxxxxxxxxxxxxxxxxxxx se você já souber o ID do canal)
const H = { 'user-agent': 'Mozilla/5.0 (compatible; FuzionInsights/1.0)', 'accept-language': 'pt-BR,pt;q=0.9', cookie: 'CONSENT=YES+1; SOCS=CAI' };
const dec = s => String(s).replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
const memo = {};

exports.handler = async (event) => {
  const q = event.queryStringParameters || {};
  let ch = (q.c || '').trim();
  const handle = (q.h || '@fuzioninsights').replace(/[^@\w.-]/g, '');
  const out = (body, cache) => ({ statusCode: 200, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': cache || 'public, max-age=300, s-maxage=900, stale-while-revalidate=86400' }, body: JSON.stringify(body) });
  // ?ids=ID1,ID2 -> título de cada vídeo escolhido no painel (oEmbed público do YouTube, sem chave)
  if (q.ids) {
    const ids = String(q.ids).split(',').map(x => x.trim()).filter(x => /^[\w-]{11}$/.test(x)).slice(0, 12);
    const videos = await Promise.all(ids.map(async id => {
      try { const d = await (await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent('https://www.youtube.com/watch?v=' + id)}&format=json`, { headers: H })).json(); return { id, title: d.title || '' }; }
      catch (e) { return { id, title: '' }; }
    }));
    return out({ videos }, 'public, max-age=600, s-maxage=3600, stale-while-revalidate=86400');
  }
  try {
    if (!/^UC[\w-]{22}$/.test(ch)) {
      ch = memo[handle] || '';
      if (!ch) {
        const html = await (await fetch(`https://www.youtube.com/${handle}`, { headers: H })).text();
        const m = /"(?:channelId|externalId)":"(UC[\w-]{22})"/.exec(html) || /channel\/(UC[\w-]{22})/.exec(html);
        if (m) { ch = m[1]; memo[handle] = ch; }
      }
    }
    if (!ch) return out({ videos: [] }, 'public, max-age=60');
    const xml = await (await fetch(`https://www.youtube.com/feeds/videos.xml?channel_id=${ch}`, { headers: H })).text();
    const videos = [...xml.matchAll(/<entry>[\s\S]*?<\/entry>/g)].slice(0, 8).map(m => {
      const e = m[0], id = (/<yt:videoId>([\w-]{11})<\/yt:videoId>/.exec(e) || [])[1];
      return id ? { id, title: dec((/<title>([\s\S]*?)<\/title>/.exec(e) || [])[1] || ''), date: (/<published>(.*?)<\/published>/.exec(e) || [])[1] || '' } : null;
    }).filter(Boolean);
    return out({ channel: ch, videos });
  } catch (e) {
    return out({ videos: [] }, 'public, max-age=60');
  }
};
