#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

read -r -d '' GA <<'EOF' || true
  <!-- Google tag (gtag.js) -->
  <script async src="https://www.googletagmanager.com/gtag/js?id=G-7SJ575P9PM"></script>
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', 'G-7SJ575P9PM');
  </script>
EOF

count=0
while IFS= read -r f; do
  # skip if already has GA
  if grep -q "G-7SJ575P9PM" "$f"; then continue; fi
  # insert GA block right after the first <head> line
  awk -v ga="$GA" '
    !done && /<head>/ { print; print ga; done=1; next }
    { print }
  ' "$f" > "$f.tmp" && mv "$f.tmp" "$f"
  count=$((count+1))
done < <(find . -name '*.html' ! -name 'google43f464f3f94d2388.html')

echo "GA inserted into $count files"
