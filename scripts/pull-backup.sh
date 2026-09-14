#!/usr/bin/env bash
#
# Unduh cadangan lengkap dari server Docker ke laptop.
#
#   bun run backup                  # ke ./backups/
#   OUT_DIR=~/Desktop bun run backup
#
# Hasil: satu .tar.gz berisi kepeser.db (snapshot konsisten) + uploads/.
set -euo pipefail

cd "$(dirname "$0")/.."

SERVICE="${SERVICE:-web}"
OUT_DIR="${OUT_DIR:-./backups}"
STAMP="$(date +%F-%H%M)"
NAMA="kepeser-backup-${STAMP}"
STAGING="${OUT_DIR}/${NAMA}"

gagal() { echo "✗ $*" >&2; exit 1; }

docker compose ps --status running --services 2>/dev/null | grep -qx "$SERVICE" \
  || gagal "Service '${SERVICE}' tidak sedang jalan. Cek: docker compose ps"

# Bersihkan staging di container apa pun hasilnya — jangan tinggalkan sampah di volume.
bersihkan() { docker compose exec -T "$SERVICE" rm -rf /app/data/_backup >/dev/null 2>&1 || true; }
trap bersihkan EXIT

echo "→ Membuat snapshot di dalam container…"
docker compose exec -T "$SERVICE" node scripts/backup.cjs

mkdir -p "$STAGING"
echo "→ Mengunduh…"
docker compose cp "${SERVICE}:/app/data/_backup/kepeser.db" "${STAGING}/kepeser.db"
docker compose cp "${SERVICE}:/app/data/uploads" "${STAGING}/uploads"

echo "→ Mengemas…"
tar czf "${STAGING}.tar.gz" -C "$OUT_DIR" "$NAMA"
rm -rf "$STAGING"

echo
echo "✓ ${STAGING}.tar.gz ($(du -h "${STAGING}.tar.gz" | cut -f1))"
echo
echo "  Buka isinya di laptop:"
echo "    tar xzf ${STAGING}.tar.gz"
echo "    DATABASE_URL=\$PWD/${NAMA}/kepeser.db UPLOAD_DIR=\$PWD/${NAMA}/uploads bun run dev"
