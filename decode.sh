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

count=0
while IFS= read -r -d '' b64; do
  target="${b64%.b64}"
  base64 -d "$b64" > "$target"
  rm -f "$b64"
  count=$((count + 1))
done < <(find . -type f -name '*.b64' -print0)

echo "decode.sh: decoded ${count} file(s)"
