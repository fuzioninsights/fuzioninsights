// Serve a imagem de capa do artigo (guardada em base64 no Firebase) como imagem normal.
//  /img/ID       -> versão 1200x630 recortada (og:image, cartões de compartilhamento)
//  /img/ID?c=1   -> capa INTEIRA, sem recorte (cards e slider do site)
const DB = 'https://fuzion-insights-default-rtdb.firebaseio.com';

exports.handler = async (event) => {
  let id = ((event.queryStringParameters || {}).id || '').trim();
  if (!id) { const m = /\/img\/([^/?#]+)/.exec(event.rawUrl || event.path || ''); try { id = m ? decodeURIComponent(m[1]) : ''; } catch (e) {} }
  id = id.replace(/\.jpg$/i, '').trim();
  let card = false;
  try { const c = new URL(event.rawUrl).searchParams.get('c'); card = c === '1' || c === 'true'; } catch (e) { const c = (event.queryStringParameters || {}).c; card = c === '1' || c === 'true'; }
  if (!id) return { statusCode: 404, body: 'Not found' };
  try {
    const url = `${DB}/artigos.json?orderBy=${encodeURIComponent('"id"')}&equalTo=${encodeURIComponent(JSON.stringify(id))}`;
    const d = await (await fetch(url)).json();
    const a = d && !d.error ? Object.values(d)[0] : null;
    const src = a && (card ? (a.image || a.og) : (a.og || a.image));
    const m = src && /^data:(image\/[\w+.-]+);base64,(.+)$/s.exec(src);
    if (!m) return { statusCode: 404, body: 'Not found' };
    // a capa do site leva ?v=<versão> na URL, então pode ficar em cache por bastante tempo
    const cache = card ? 'public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400' : 'public, max-age=0, s-maxage=86400';
    return { statusCode: 200, isBase64Encoded: true, headers: { 'content-type': m[1], 'cache-control': cache }, body: m[2] };
  } catch (e) {
    return { statusCode: 500, body: 'Error' };
  }
};
