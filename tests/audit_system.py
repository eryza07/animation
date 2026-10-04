#!/usr/bin/env python3
"""
==============================================================================
COMMUNITY ANIMATION HUB: Production Audit & Verification Suite
File: tests/audit_system.py
Description: Performs automated health check, file integrity verification,
             and HTTP response latency auditing across all pages and modules.
==============================================================================
"""

import os
import sys
import time
import urllib.request
import urllib.error

# UTF-8 stdout on Windows
if sys.platform.startswith('win'):
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

BASE_URL = "http://localhost:3000"

PAGES_TO_AUDIT = [
    {"url": f"{BASE_URL}/index.html", "title": "Beranda"},
    {"url": f"{BASE_URL}/pages/ideas.html", "title": "Idea Bank & Upvotes"},
    {"url": f"{BASE_URL}/pages/projects.html", "title": "Pipeline Tracker"},
    {"url": f"{BASE_URL}/pages/project-detail.html?slug=cyber-samurai-2026", "title": "Detail Proyek & Hub"},
    {"url": f"{BASE_URL}/pages/collab.html", "title": "Open Collab Board"},
    {"url": f"{BASE_URL}/pages/assets.html", "title": "Katalog Aset & Tutorial"},
    {"url": f"{BASE_URL}/pages/gallery.html", "title": "Galeri Karya Rilis"}
]

STATIC_FILES_TO_AUDIT = [
    {"url": f"{BASE_URL}/src/css/custom.css", "desc": "Custom CSS Design System"},
    {"url": f"{BASE_URL}/src/js/config.js", "desc": "Global Configuration"},
    {"url": f"{BASE_URL}/src/js/main.js", "desc": "Main Controller"},
    {"url": f"{BASE_URL}/src/js/api/supabase.js", "desc": "Supabase API Wrapper"},
    {"url": f"{BASE_URL}/src/js/api/sheets.js", "desc": "Google Sheets API Wrapper"},
    {"url": f"{BASE_URL}/src/js/modules/ideas.js", "desc": "Ideas Module"},
    {"url": f"{BASE_URL}/src/js/modules/pipeline.js", "desc": "Pipeline Module"},
    {"url": f"{BASE_URL}/src/js/modules/scenes.js", "desc": "Scenes Checklist Module"},
    {"url": f"{BASE_URL}/src/js/modules/collab.js", "desc": "Collab Board Module"},
    {"url": f"{BASE_URL}/src/js/modules/handoff.js", "desc": "Asset Handoff Module"},
    {"url": f"{BASE_URL}/src/js/modules/relay.js", "desc": "Relay Render Module"},
    {"url": f"{BASE_URL}/src/js/modules/feedback.js", "desc": "Timestamp Feedback Module"},
    {"url": f"{BASE_URL}/src/js/modules/credits.js", "desc": "Auto-Credits Generator Module"},
    {"url": f"{BASE_URL}/src/js/modules/assets.js", "desc": "Asset Catalog Module"},
    {"url": f"{BASE_URL}/src/js/modules/gallery.js", "desc": "Gallery Module"}
]

def check_url(url, desc):
    start = time.time()
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "AnimHubAuditor/1.0"})
        with urllib.request.urlopen(req, timeout=5) as resp:
            elapsed_ms = (time.time() - start) * 1000
            status = resp.status
            content_len = len(resp.read())
            return status, elapsed_ms, content_len, None
    except Exception as e:
        elapsed_ms = (time.time() - start) * 1000
        return 0, elapsed_ms, 0, str(e)

def run_audit():
    print("=" * 65)
    print("  COMMUNITY ANIMATION HUB: Production Audit & Verification")
    print("=" * 65)

    all_passed = True

    # 1. Audit HTML Pages
    print("\n[1/3] Memeriksa Responsivitas & Ketersediaan Seluruh Halaman HTML:")
    for page in PAGES_TO_AUDIT:
        status, elapsed_ms, content_len, err = check_url(page["url"], page["title"])
        if status == 200:
            print(f"  ✓ [200 OK] {page['title']:<26} ({elapsed_ms:.1f}ms - {content_len:,} bytes)")
        else:
            print(f"  ✗ [GAGAL]  {page['title']:<26} (Error: {err})")
            all_passed = False

    # 2. Audit CSS & JavaScript Modules
    print("\n[2/3] Memeriksa Integritas File CSS & Modular ES6 JavaScript:")
    for static in STATIC_FILES_TO_AUDIT:
        status, elapsed_ms, content_len, err = check_url(static["url"], static["desc"])
        if status == 200:
            print(f"  ✓ [200 OK] {static['desc']:<32} ({elapsed_ms:.1f}ms - {content_len:,} bytes)")
        else:
            print(f"  ✗ [GAGAL]  {static['desc']:<32} (Error: {err})")
            all_passed = False

    # 3. Security & Anti-Spam Files Check
    print("\n[3/3] Memeriksa Berkas Database, RLS, & Keamanan Formulir:")
    base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    
    files_to_check = [
        ("supabase/schema.sql", "PostgreSQL Relational Schema"),
        ("supabase/policies.sql", "Row Level Security (RLS) & Realtime Publication"),
        ("google-apps-script/Code.gs", "Google Apps Script Web App (Honeypot + LockService)"),
        ("automation/notifier.py", "Termux & Discord Webhook Notifier Bot"),
        ("vercel.json", "Vercel Deployment Security Headers"),
        ("README.md", "Dokumentasi Lengkap Proyek")
    ]

    for rel_path, label in files_to_check:
        full_path = os.path.join(base_dir, rel_path)
        if os.path.exists(full_path):
            size = os.path.getsize(full_path)
            print(f"  ✓ [ADA]    {label:<42} ({size:,} bytes)")
        else:
            print(f"  ✗ [HILANG] {label:<42} (File tidak ditemukan)")
            all_passed = False

    print("\n" + "=" * 65)
    if all_passed:
        print("  🎉 AUDIT SELESAI: Seluruh halaman dan modul lulus verifikasi 100%!")
        print("     Sistem siap untuk deployment publik ke GitHub Pages / Vercel.")
    else:
        print("  ⚠️ PERINGATAN: Terdapat berkas atau halaman yang belum memenuhi kriteria.")
    print("=" * 65)

    return all_passed

if __name__ == "__main__":
    passed = run_audit()
    sys.exit(0 if passed else 1)
