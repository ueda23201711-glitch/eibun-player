#!/bin/sh
# 英文リーダー・手書きメモの中に置く字幕プレイヤー（player.html）を、この index.html から作る
# 使い方:
#   sh build-reader-copy.sh ../eibun-reader          … 英文リーダー（eibun-reader/player.html）
#   sh build-reader-copy.sh ../tegaki-memo memo      … 手書きメモの英文リーダー（tegaki-memo/player.html）
set -e
DIR="${1:?アプリのフォルダを指定してください}"
OUT="$DIR/player.html"
if [ "$2" = "memo" ]; then
  # 手書きメモ：合言葉・保存場所の名前が別（memo_key / memo-video など）。暗証番号ロックは無い
  python3 - "$OUT" <<'PY'
import sys, re
s = open('index.html', encoding='utf-8').read()
cfg = "var EP_CFG = { dkey: 'memo_dkey', key: 'memo_key', gas: 'memo_gas', cache: 'memo_reader', idb: 'memo-video', jump: 'memo_jump', reader: 'https://ueda23201711-glitch.github.io/tegaki-memo/', inApp: /\\/tegaki-memo\\//, name: '手書きメモ' };"
s, n = re.subn(r"^var EP_CFG = \{.*\};$", lambda m: cfg, s, count=1, flags=re.M); assert n == 1
s = s.replace('<link rel="manifest" href="app.webmanifest">', '<link rel="manifest" href="manifest.webmanifest">')
s = s.replace('href="icons/apple-touch-icon-180.png"', 'href="icons/apple-touch-icon-v2-180.png"')
s = s.replace('href="icons/favicon-32.png"', 'href="icons/favicon-v2-32.png"')
s = s.replace('<script src="https://ueda23201711-glitch.github.io/eibun-reader/lock.js"></script>\n', '')
s = s.replace("英文リーダーで「🎞 手元の動画と字幕で読む」", "手書きメモの英文リーダーで「🎞 手元の動画と字幕で読む」")
open(sys.argv[1], 'w', encoding='utf-8').write(s)
PY
else
  sed -e 's#<link rel="manifest" href="app.webmanifest">#<link rel="manifest" href="app-v2.webmanifest">#' index.html > "$OUT"
fi
echo "wrote $OUT"
