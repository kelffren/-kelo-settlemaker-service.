#!/bin/sh
set -eu

UPSTREAM_REPO="https://github.com/barrulus/settlemaker.git"
UPSTREAM_SHA="aa841a49a096bedbd9f98ffd21ffe2106bfd809d"
TARGET_DIR="vendor/settlemaker"
BUNDLE="$TARGET_DIR/dist/settlemaker.browser.mjs"

if [ -f "$BUNDLE" ]; then
  exit 0
fi

rm -rf "$TARGET_DIR"
mkdir -p vendor

git clone --no-checkout --filter=blob:none "$UPSTREAM_REPO" "$TARGET_DIR"
git -C "$TARGET_DIR" fetch --depth 1 origin "$UPSTREAM_SHA"
git -C "$TARGET_DIR" checkout --detach "$UPSTREAM_SHA"

npm install --prefix "$TARGET_DIR" --no-audit --no-fund
npm run build:lib --prefix "$TARGET_DIR"
mv "$TARGET_DIR/dist/settlemaker.browser.js" "$BUNDLE"

printf '%s\n' "$UPSTREAM_SHA" > "$TARGET_DIR/KELO_UPSTREAM_SHA"
