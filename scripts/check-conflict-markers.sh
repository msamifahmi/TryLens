#!/bin/sh
# Gagal bila ada sisa tanda konflik merge di file sumber.
if git grep -nE '^(<<<<<<< |=======$|>>>>>>> )' -- . ':!*.md' ':!package-lock.json' ; then
  echo "ERROR: masih ada tanda konflik merge di atas."; exit 1
fi
echo "OK: tidak ada tanda konflik."
