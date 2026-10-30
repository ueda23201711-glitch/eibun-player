/* 字幕プレイヤー：ドライブの動画を「この端末からの動画」として中継するサービスワーカー
   iPhone の <video> はドライブ API の URL を直接読めない（コード 4）が、ページからの fetch は通る。
   そこで <video> には同じサイトの ./__drive__?... を渡し、ここで fetch してそのまま流す。
   範囲指定（Range）を引き継ぎ、206 と Content-Range を自前で正しく付けて返す。動画は端末に保存しない。 */
self.addEventListener('install', function () { self.skipWaiting(); });
self.addEventListener('activate', function (e) { e.waitUntil(self.clients.claim()); });

self.addEventListener('fetch', function (e) {
  var u = new URL(e.request.url);
  if (u.origin !== self.location.origin || !/\/__drive__$/.test(u.pathname)) return;
  e.respondWith(relay(e.request, u));
});

function relay(req, u) {
  var fid = u.searchParams.get('id') || '', key = u.searchParams.get('key') || '';
  var total = Number(u.searchParams.get('size')) || 0, type = u.searchParams.get('type') || 'video/mp4';
  var api = 'https://www.googleapis.com/drive/v3/files/' + encodeURIComponent(fid) + '?alt=media&key=' + encodeURIComponent(key);
  var range = req.headers.get('range') || '', m = /^bytes=(\d+)-(\d*)$/.exec(range.trim());
  var start = m ? Number(m[1]) : 0, end = m && m[2] !== '' ? Number(m[2]) : -1;
  if (total && end >= total) end = total - 1;
  if (total && start >= total) {
    return Promise.resolve(new Response('', { status: 416, headers: { 'Content-Range': 'bytes */' + total } }));
  }
  var h = {};
  if (m) h.Range = 'bytes=' + start + '-' + (end >= 0 ? end : '');
  var opt = { headers: h, cache: 'no-store' };
  try { if (req.signal) opt.signal = req.signal; } catch (x) {}
  return fetch(api, opt).then(function (res) {
    if (res.status >= 400) {
      return res.text().then(function (t) { return new Response(t, { status: res.status, headers: { 'Content-Type': 'text/plain; charset=utf-8' } }); });
    }
    var out = new Headers();
    out.set('Content-Type', type);
    out.set('Accept-Ranges', 'bytes');
    out.set('Cache-Control', 'no-store');
    // Content-Range はドライブ側の値が見えれば使い、見えなければ（CORS で隠れる）自前で作る
    var cr = res.headers.get('content-range'), len = Number(res.headers.get('content-length')) || 0;
    var whole = (cr && /\/(\d+)$/.exec(cr)) ? Number(/\/(\d+)$/.exec(cr)[1]) : total;
    if (res.status === 206 || m) {
      var last = end >= 0 ? end : (whole ? whole - 1 : (len ? start + len - 1 : -1));
      if (len) last = start + len - 1;
      if (!cr && last >= 0) cr = 'bytes ' + start + '-' + last + '/' + (whole || '*');
      if (cr) out.set('Content-Range', cr);
      if (last >= 0) out.set('Content-Length', String(last - start + 1));
      return new Response(res.body, { status: 206, statusText: 'Partial Content', headers: out });
    }
    if (len || whole) out.set('Content-Length', String(len || whole));
    return new Response(res.body, { status: 200, statusText: 'OK', headers: out });
  }, function (err) {
    return new Response(String(err && err.message || err), { status: 502, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
  });
}
