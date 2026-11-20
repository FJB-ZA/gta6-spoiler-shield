#!/bin/sh
# Builds dist/firefox, dist/chrome (load-unpacked folders) and a zip/xpi for each.
set -e
cd "$(dirname "$0")"
FILES="src popup options blocked icons fonts"
rm -rf dist && mkdir -p dist/firefox dist/chrome
cp -R $FILES dist/firefox/ && cp manifest.json dist/firefox/manifest.json
cp -R $FILES dist/chrome/  && cp manifest.chrome.json dist/chrome/manifest.json
(cd dist/firefox && zip -qr -X ../gta6-spoiler-shield-firefox.xpi .)
(cd dist/chrome && zip -qr -X ../gta6-spoiler-shield-chrome.zip .)
echo "Built:"; ls -1 dist
