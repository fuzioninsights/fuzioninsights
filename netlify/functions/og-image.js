// Serve a imagem de capa do artigo (guardada em base64 no Firebase) como JPEG, para o card de compartilhamento.
const DB = 'https://fuzion-insights-default-rtdb.firebaseio.com';

exports.handler = async (event) => {
  let id = ((event.queryStringParameters || {}).id || '').trim();
  if (!id) { const m = /\/img\/([^/?#]+)/.exec(event.rawUrl || event.path || ''); try { id = m ? decodeURIComponent(m[1]) : ''; } catch (e) {} }
  id = id.replace(/\.jpg$/i, '').trim();
  if (!id) return { statusCode: 404, body: 'Not found' };
  try {
    const url = `${DB}/artigos.json?orderBy=${encodeURIComponent('"id"')}&equalTo=${encodeURIComponent(JSON.stringify(id))}`;
    const d = await (await fetch(url)).json();
    const a = d && !d.error ? Object.values(d)[0] : null;
    const src = a && (a.og || a.image);
    const m = src && /^data:(image\/[\w+.-]+);base64,(.+)$/s.exec(src);
    if (!m) return { statusCode: 404, body: 'Not found' };
    return { statusCode: 200, isBase64Encoded: true, headers: { 'content-type': m[1], 'cache-control': 'public, max-age=0, s-maxage=86400' }, body: m[2] };
  } catch (e) {
    return { statusCode: 500, body: 'Error' };
  }
};
