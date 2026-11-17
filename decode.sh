#!/usr/bin/env bash
# decode.sh — restore the site's binary files from their base64 sidecars.
#
# Binary files (images, the woff2 font, demo clips) are stored in this repo
# as "<name>.b64" text sidecars because the snapshot push flow cannot carry
# raw binaries. The Render Static Site build runs this script once, which
# decodes every sidecar back to its original path and removes the sidecar.
#
# Idempotent: running it again after a successful run is a no-op (no .b64
# files remain). Safe: it only ever writes the path a sidecar maps to
# (sidecar path minus the ".b64" suffix) and deletes that sidecar.
set -euo pipefail
cd "$(dirname "$0")"

# Assemble chunked sidecars first: a large binary is stored as
# "<name>.b64.part01", "<name>.b64.part02", ... (zero-padded, sorted order).
# Concatenate the parts back into "<name>.b64"; the decode pass below then
# handles it like any other sidecar.
while IFS= read -r -d '' first; do
  b64="${first%.part01}"
  cat "${b64}".part* > "$b64"
  rm -f "${b64}".part*
  echo "decode.sh: assembled $b64 from chunks"
done < <(find . -type f -name '*.b64.part01' -print0)

count=0
while IFS= read -r -d '' b64; do
  target="${b64%.b64}"
  base64 -d "$b64" > "$target"
  rm -f "$b64"
  count=$((count + 1))
done < <(find . -type f -name '*.b64' -print0)

echo "decode.sh: decoded ${count} file(s)"
