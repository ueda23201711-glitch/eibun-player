#!/bin/sh
# 英文リーダーの中に置く字幕プレイヤー（eibun-reader/player.html）を、この index.html から作る
# 使い方: sh build-reader-copy.sh ../eibun-reader
set -e
OUT="${1:?eibun-reader のフォルダを指定してください}/player.html"
sed -e 's#<link rel="manifest" href="app.webmanifest">#<link rel="manifest" href="app-v2.webmanifest">#' index.html > "$OUT"
echo "wrote $OUT"
