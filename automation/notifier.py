#!/usr/bin/env python3
"""
==============================================================================
COMMUNITY ANIMATION HUB: Autonomous Termux & Webhook Notifier Bot
File: automation/notifier.py
Description: Periodically polls Google Sheets & Supabase, diffs against
             state.json, and dispatches rich alerts to Discord Webhook and
             Android Termux notifications.
==============================================================================
"""

import os
import sys
import json
import time
import shutil
import argparse
import subprocess
import urllib.request
import urllib.error
from datetime import datetime

# Configure Windows console to handle UTF-8 / Emojis cleanly
if sys.platform.startswith('win'):
    try:
        sys.stdout.reconfigure(encoding='utf-8')
        sys.stderr.reconfigure(encoding='utf-8')
    except Exception:
        pass

# Optional requests support if installed
try:
    import requests
    HAS_REQUESTS = True
except ImportError:
    HAS_REQUESTS = False

CONFIG_PATH = os.path.join(os.path.dirname(__file__), "config.json")
STATE_PATH = os.path.join(os.path.dirname(__file__), "state.json")

def load_config():
    if not os.path.exists(CONFIG_PATH):
        example_path = os.path.join(os.path.dirname(__file__), "config.example.json")
        if os.path.exists(example_path):
            shutil.copy(example_path, CONFIG_PATH)
            print(f"[Notifier] Dibuat config default di {CONFIG_PATH}")

    try:
        with open(CONFIG_PATH, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        print(f"[Notifier Error] Gagal membaca config.json: {e}")
        return {"settings": {"demo_mode": True}}

def load_state():
    if not os.path.exists(STATE_PATH):
        return {
            "known_idea_ids": [],
            "known_render_req_ids": [],
            "project_statuses": {},
            "last_check_time": None
        }
    try:
        with open(STATE_PATH, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        print(f"[Notifier Warning] Gagal membaca state.json: {e}")
        return {"known_idea_ids": [], "known_render_req_ids": [], "project_statuses": {}}

def save_state(state):
    state["last_check_time"] = datetime.now().isoformat()
    try:
        with open(STATE_PATH, "w", encoding="utf-8") as f:
            json.dump(state, f, indent=2, ensure_ascii=False)
    except Exception as e:
        print(f"[Notifier Warning] Gagal menyimpan state.json: {e}")

# ==============================================================================
# NOTIFICATION DISPATCHERS
# ==============================================================================

def http_get_json(url, headers=None, timeout=12):
    if HAS_REQUESTS:
        r = requests.get(url, headers=headers, timeout=timeout)
        if r.status_code == 200:
            return r.json()
        return None
    try:
        req = urllib.request.Request(url, headers=headers or {})
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            if resp.status == 200:
                return json.loads(resp.read().decode('utf-8'))
    except Exception as e:
        print(f"[HTTP GET Error] {e}")
    return None

def http_post_json(url, payload, timeout=10):
    if HAS_REQUESTS:
        res = requests.post(url, json=payload, timeout=timeout)
        return res.status_code in (200, 204)
    try:
        data_bytes = json.dumps(payload).encode('utf-8')
        req = urllib.request.Request(
            url,
            data=data_bytes,
            headers={'Content-Type': 'application/json', 'User-Agent': 'AnimHubNotifier/1.0'}
        )
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return resp.status in (200, 204)
    except Exception as e:
        print(f"[HTTP POST Error] {e}")
        return False

def send_discord_webhook(webhook_url, title, description, color=0x6366F1, fields=None):
    if not webhook_url or not webhook_url.startswith("http"):
        return False

    embed = {
        "title": title,
        "description": description,
        "color": color,
        "footer": {
            "text": "Community Animation Hub • Termux Bot"
        },
        "timestamp": datetime.utcnow().isoformat()
    }

    if fields:
        embed["fields"] = fields

    payload = {
        "username": "AnimHub Notifier",
        "avatar_url": "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=128",
        "embeds": [embed]
    }

    return http_post_json(webhook_url, payload)

def send_termux_notification(title, content):
    termux_bin = shutil.which("termux-notification")
    if not termux_bin:
        # Not on Android / termux-api not installed
        return False

    try:
        subprocess.run([
            termux_bin,
            "--title", title,
            "--content", content,
            "--priority", "high",
            "--vibrate", "500,200,500"
        ], check=True)
        return True
    except Exception as e:
        print(f"[Termux Notification Error] {e}")
        return False

def dispatch_alert(config, title, description, color=0x6366F1, fields=None):
    print(f"\n📢 [ALERT] {title}\n   {description}")

    # 1. Discord Webhook
    discord_url = config.get("notifications", {}).get("discord_webhook_url")
    if discord_url:
        success = send_discord_webhook(discord_url, title, description, color, fields)
        if success:
            print("   ✓ Terkirim ke Discord Webhook")

    # 2. Termux Local Notification
    if config.get("notifications", {}).get("enable_termux_notification"):
        sent = send_termux_notification(title, description)
        if sent:
            print("   ✓ Terkirim ke Notifikasi Android Termux")

# ==============================================================================
# DATA FETCHER & DIFF LOGIC
# ==============================================================================

def fetch_ideas_data(config):
    # If Apps script configured
    apps_script = config.get("apps_script_url", "")
    if apps_script and not "YOUR_APPS_SCRIPT" in apps_script:
        data = http_get_json(f"{apps_script}?tab=Ideas")
        if data and data.get("status") == "success" and isinstance(data.get("data"), list):
            return data["data"]

    # Fallback to Demo Data
    return [
        {
            "idea_id": "IDEA-01",
            "title": "Animasi Pertarungan Mecha Reog Ponorogo",
            "author": "Fajar Studio",
            "category": "Short Film"
        },
        {
            "idea_id": "IDEA-02",
            "title": "Parodi Minecraft: Pedagang Keliling yang Sakti",
            "author": "Rizky Animator",
            "category": "Meme/Parody"
        },
        {
            "idea_id": "IDEA-03",
            "title": "Kamera Sinematik 3D: Tutorial & Rigging Test",
            "author": "Erik Kurniawan",
            "category": "Technical Test"
        }
    ]

def fetch_supabase_table(config, table):
    sb_url = config.get("supabase", {}).get("url", "")
    sb_key = config.get("supabase", {}).get("anon_key", "")

    if sb_url and not "YOUR_SUPABASE" in sb_url:
        headers = {
            "apikey": sb_key,
            "Authorization": f"Bearer {sb_key}"
        }
        data = http_get_json(f"{sb_url}/rest/v1/{table}?select=*", headers=headers)
        if data and isinstance(data, list):
            return data

    # Demo Fallback
    if table == "projects":
        return [
            {"id": "proj-1", "slug": "cyber-samurai-2026", "title": "Cyber Samurai 2026", "status": "animating"},
            {"id": "proj-2", "slug": "kancil-reborn-series", "title": "Kancil Reborn", "status": "storyboard"}
        ]
    if table == "render_requests":
        return [
            {"id": "rr-1", "scene_title": "Scene 3: Drone Chase Sequence", "specs": "Blender Cycles GPU (RTX 3060+)", "status": "open"}
        ]
    return []

# ==============================================================================
# POLLING CYCLE
# ==============================================================================

def run_check_cycle(config, state):
    print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] Memulai pengecekan data komunitas...")

    # 1. Check New Ideas
    ideas = fetch_ideas_data(config)
    known_ideas = set(state.get("known_idea_ids", []))
    for idea in ideas:
        idea_id = idea.get("idea_id")
        if idea_id and idea_id not in known_ideas:
            title = f"💡 Ide Animasi Baru Diajukan!"
            desc = f"**{idea.get('title')}**\nKategori: {idea.get('category')}\nPengirim: {idea.get('author')}"
            dispatch_alert(config, title, desc, color=0xF59E0B)
            known_ideas.add(idea_id)
    state["known_idea_ids"] = list(known_ideas)

    # 2. Check Open Render Requests
    render_reqs = fetch_supabase_table(config, "render_requests")
    known_reqs = set(state.get("known_render_req_ids", []))
    for req in render_reqs:
        req_id = req.get("id")
        if req_id and req.get("status") == "open" and req_id not in known_reqs:
            title = f"💻 Permintaan Render Relay Baru!"
            desc = f"Dibutuhkan volunteer render untuk scene **{req.get('scene_title')}**.\nSpesifikasi: `{req.get('specs')}`"
            dispatch_alert(config, title, desc, color=0xA855F7)
            known_reqs.add(req_id)
    state["known_render_req_ids"] = list(known_reqs)

    # 3. Check Project Status Transitions (e.g. into review or done)
    projects = fetch_supabase_table(config, "projects")
    known_statuses = state.get("project_statuses", {})
    for proj in projects:
        proj_id = proj.get("id")
        current_status = proj.get("status")
        previous_status = known_statuses.get(proj_id)

        if previous_status and previous_status != current_status:
            # Status changed!
            if current_status == "done":
                title = f"🎉 Proyek Animasi Telah Rilis!"
                desc = f"Proyek **{proj.get('title')}** telah selesai 100% dan dirilis ke galeri komunitas!"
                dispatch_alert(config, title, desc, color=0x10B981)
            elif current_status == "review":
                title = f"👀 Proyek Memasuki Tahap Review!"
                desc = f"Proyek **{proj.get('title')}** siap direview. Silakan berikan revisi timestamp."
                dispatch_alert(config, title, desc, color=0xF43F5E)

        known_statuses[proj_id] = current_status
    state["project_statuses"] = known_statuses

    save_state(state)
    print("   ✓ Pengecekan selesai, state tersimpan.")

# ==============================================================================
# MAIN ENTRY
# ==============================================================================

def main():
    parser = argparse.ArgumentParser(description="Community Animation Hub Notifier Bot")
    parser.add_argument("--once", action="store_true", help="Jalankan pengecekan 1 kali lalu keluar")
    parser.add_argument("--test", action="store_true", help="Kirim notifikasi uji coba ke webhook dan Termux")
    parser.add_argument("--interval", type=int, default=None, help="Interval polling dalam detik")
    args = parser.parse_args()

    config = load_config()
    state = load_state()

    print("=========================================================")
    print("   COMMUNITY ANIMATION HUB: Autonomous Notifier v1.0    ")
    print("=========================================================")

    if args.test:
        print("[Notifier] Mengirim notifikasi uji coba (Test Mode)...")
        dispatch_alert(
            config,
            "🧪 Uji Coba Bot AnimHub",
            "Koneksi notifikasi bot Termux & Webhook berhasil terhubung dengan sukses!",
            color=0x6366F1,
            fields=[
                {"name": "Status", "value": "Online", "inline": True},
                {"name": "Engine", "value": "Python 3.11", "inline": True}
            ]
        )
        return

    interval = args.interval or config.get("settings", {}).get("poll_interval_seconds", 600)

    if args.once:
        run_check_cycle(config, state)
        return

    print(f"[Notifier] Bot berjalan di latar belakang (Interval: {interval} detik).")
    print("Tekan Ctrl+C untuk menghentikan.\n")

    try:
        while True:
            run_check_cycle(config, state)
            time.sleep(interval)
    except KeyboardInterrupt:
        print("\n[Notifier] Bot dihentikan oleh pengguna.")

if __name__ == "__main__":
    main()
