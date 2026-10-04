#!/bin/bash
# ==============================================================================
# COMMUNITY ANIMATION HUB: Termux Runner Script
# File: automation/run_notifier.sh
# Description: Prevents CPU sleep via termux-wake-lock and runs notifier.py
# ==============================================================================

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)"
cd "$DIR"

echo "========================================================="
echo "  Memulai Community Animation Hub Bot di Termux...      "
echo "========================================================="

# 1. Acquire Wake Lock so Android doesn't kill the script when screen turns off
if command -v termux-wake-lock >/dev/null 2>&1; then
    echo "[+] Mengaktifkan termux-wake-lock..."
    termux-wake-lock
fi

# 2. Check Python & Dependencies
if ! command -v python3 >/dev/null 2>&1; then
    echo "[!] Python3 tidak ditemukan. Jalankan: pkg install python"
    exit 1
fi

# 3. Run Notifier with auto-restart on unexpected crashes
while true; do
    echo "[+] Menjalankan notifier.py..."
    python3 notifier.py
    echo "[!] Notifier terhenti. Restart otomatis dalam 10 detik..."
    sleep 10
done
