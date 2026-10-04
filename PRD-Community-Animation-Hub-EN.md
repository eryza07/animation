# PRD: Community Animation Hub

**Version:** 1.0 (Draft)
**Date:** September 30, 2026
**Status:** Planning

---

## 1. Product Overview

Community Animation Hub is a web application that helps an animation community manage projects, share assets, collect ideas, and track rendering pipelines efficiently. Community members can submit ideas, upvote them, find collaborators, hand off raw assets, request rendering help, give timestamp-based revisions, and showcase released works.

Core principle: **easy for non-technical members** (data entry through Google Sheets) while **staying interactive** (dynamic data through Supabase).

## 2. Background and Problem Statement

| Problem | Impact |
|---|---|
| Ideas are scattered across group chats and easily buried | Good ideas never get built |
| Project progress is not clearly visible | Members don't know which stage a project is in |
| Raw asset handoffs happen in private chats | Files get lost, no history |
| Members with weak devices struggle to render | Projects stall at the rendering stage |
| Feedback is vague ("the middle part isn't good") | Repeated revision rounds, wasted time |
| Contributor credits are compiled manually | Names are often missed |

## 3. Goals and Success Metrics

### Goals
1. Provide a single central place for the community's ideas, projects, assets, and finished works.
2. Make each project's status visible to all members in real time.
3. Lower the barrier to collaboration (finding riggers, animators, editors, and owners of powerful render devices).
4. Offer a simple input flow via Google Sheets for non-technical members.

### Success Metrics
| Metric | Initial target |
|---|---|
| Ideas submitted per month | ≥ 10 |
| Share of ideas with at least 1 upvote | ≥ 60% |
| Active projects with status updated weekly | ≥ 80% |
| Render relay requests picked up by volunteers | ≥ 70% |
| Timestamp revisions marked as resolved | ≥ 80% |

## 4. Target Users

| Role | Main needs |
|---|---|
| **General member** | Submit ideas, upvote, browse assets, join challenges, view the gallery |
| **Project contributor** (animator, rigger, editor, etc.) | Update scenes, hand off assets, request or take render relays, give feedback |
| **Project owner / coordinator** | Monitor the pipeline, manage scene checklists, collect feedback, generate credits |
| **Community admin** | Manage content via Google Sheets (challenges, asset catalog, gallery), moderate ideas |

## 5. Tech Stack

| Layer | Technology |
|---|---|
| Frontend | HTML, Tailwind CSS, Vanilla JavaScript (no build step) |
| Interactive database | Supabase (PostgreSQL, Realtime, Row Level Security) |
| CMS / data entry | Google Sheets + Google Apps Script (Web App) |
| Automation | Python on Termux (notifications and scripts) |
| File storage | Google Drive (links only, files are not stored in the app) |

## 6. Architecture and Data Split

**Splitting rule:** Google Sheets stores content written by members and easily edited by admins. Supabase stores data that is interactive, frequently updated, or relational.

### 6.1 Split by feature

| Feature | Storage | Reason |
|---|---|---|
| Idea Drop-Box | Google Sheets | Easy to moderate and fill in |
| Idea upvotes | Supabase | Counters, deduplication, realtime |
| Challenge prompts | Google Sheets | Admin-managed content |
| Pipeline status | Supabase | Frequent updates, needs realtime |
| Scene checklist | Supabase | Realtime toggles |
| Open Collab Board | Google Sheets | Simple posts |
| Asset handoff (GDrive links) | Supabase | Needs status tracking |
| Relay Render | Supabase | Claim system needs atomic updates |
| Timestamp Feedback | Supabase | Structured, queryable per project |
| Asset catalog and tutorials | Google Sheets | CMS content, filtered client-side |
| Gallery | Google Sheets | Curated by admins |
| Auto-Credits | Computed in JS | From `project_members` and Sheets data |

### 6.2 How the two data sources connect

- **Shared keys as plain text:** `Ideas.idea_id` in Sheets matches `idea_votes.idea_id` in Supabase. `project_slug` in Sheets matches `projects.slug` in Supabase. The frontend fetches from both sources and merges by key, so no sync job is needed.
- **Reading Sheets:** tabs are published as CSV/JSON (public read, cached).
- **Writing to Sheets:** through a Google Apps Script Web App (`doPost`), so no Sheets API key with write access is exposed in the frontend.
- **Supabase security:** anon key in the frontend, protected by Row Level Security (RLS).
- **Termux notifier:** reads Sheets (and optionally Supabase) on a schedule, compares against `state.json`, then sends notifications.

## 7. Functional Requirements

Priority: **P0** = required for first release, **P1** = important, **P2** = nice to have.

### Module 1: Idea Bank and Brainstorming

| ID | Requirement | Priority |
|---|---|---|
| F1.1 | **Idea Drop-Box:** a form (title, description, category, name) that sends data to Google Sheets via Apps Script | P0 |
| F1.2 | Idea list displayed from Sheets, with search and category filter | P0 |
| F1.3 | **Idea upvotes:** one voter can give one vote per idea; vote counts stored in Supabase | P0 |
| F1.4 | Sort ideas by most votes or newest | P1 |
| F1.5 | **Challenge Board:** weekly/monthly challenge prompts from Sheets, with an active-challenge indicator and period | P1 |

### Module 2: Project Management and Collaboration

| ID | Requirement | Priority |
|---|---|---|
| F2.1 | **Pipeline Status Tracker:** project status from Idea → Storyboard → Animating → Render → Review → Done, board/kanban view, realtime updates | P0 |
| F2.2 | **Scene Checklist:** list of scenes per project with assignee and done toggle, realtime; progress percentage calculated automatically | P0 |
| F2.3 | **Open Collab Board:** posts looking for roles (rigger, animator, editor, etc.) from Sheets, role filter, "still open" indicator | P1 |
| F2.4 | **Asset Handoff System:** record handoffs (sender, receiver, GDrive link, note, sent/received status) | P1 |
| F2.5 | **Relay Render:** volunteers with powerful devices can view open render requests and claim them; status open → claimed → rendering → done | P1 |
| F2.6 | **Timestamp Feedback:** revision form with timestamp (mm:ss) and comment for draft videos; list sorted by timestamp; can be marked resolved | P1 |
| F2.7 | **Auto-Credits Generator:** JS script that extracts contributors per project and generates rolling credits text, grouped by role, copyable | P2 |

### Module 3: Assets and Templates

| ID | Requirement | Priority |
|---|---|---|
| F3.1 | **Multi-Format Asset Catalog:** asset cards from Sheets with filters by extension (.obj, .miobject, .schematic, green screen, etc.), category, and search | P0 |
| F3.2 | **Tutorial and Raw Animation Template Library:** list of tutorials and templates with tags and download/watch links | P1 |

### Module 4: Showcase and Documentation

| ID | Requirement | Priority |
|---|---|---|
| F4.1 | **Finished Works Gallery:** shows only projects that are 100% complete or released, with thumbnail, video, release date, and credits | P1 |

### Module 5: Automation

| ID | Requirement | Priority |
|---|---|---|
| F5.1 | **Python Termux Notifier:** script that periodically checks Sheets, detects status changes or new rows, then sends notifications (`termux-notification` and/or Telegram/Discord webhook) | P2 |

## 8. Data Design

### 8.1 Supabase Tables

```
projects          (id uuid PK, slug, title, description, status, cover_url, created_at)
                  status: idea | storyboard | animating | render | review | done
project_members   (id, project_id FK, member_name, role, created_at)
scenes            (id, project_id FK, scene_no, title, assignee, is_done, updated_at)
idea_votes        (id, idea_id text, voter_id text, created_at, UNIQUE(idea_id, voter_id))
handoffs          (id, project_id FK, from_member, to_member, gdrive_url, note, status, created_at)
render_requests   (id, project_id FK, scene_id FK, specs, status, claimed_by, created_at)
                  status: open | claimed | rendering | done
feedback          (id, project_id FK, timestamp_sec, comment, author, resolved, created_at)
```

### 8.2 Google Sheets Tabs

```
Ideas       (idea_id, title, description, author, category, submitted_at, status)
Challenges  (challenge_id, type, title, prompt, start_date, end_date)
Collab      (post_id, project_slug, role_needed, description, contact, is_open)
Assets      (asset_id, name, file_ext, category, gdrive_url, author, preview_url)
Tutorials   (id, title, type, url, tags)
Gallery     (id, project_slug, title, video_url, thumbnail, released_at, credits)
```

## 9. Project Folder Structure

```
community-animation-hub/
├── index.html
├── pages/
│   ├── ideas.html
│   ├── projects.html
│   ├── project-detail.html
│   ├── collab.html
│   ├── assets.html
│   └── gallery.html
├── src/
│   ├── css/custom.css
│   ├── js/
│   │   ├── config.js
│   │   ├── api/            (supabase.js, sheets.js)
│   │   ├── modules/        (ideas, challenges, pipeline, scenes, collab,
│   │   │                    handoff, relay, feedback, credits, assets, gallery)
│   │   ├── components/     (card, modal, toast, filter-bar)
│   │   └── utils/          (dom, format, debounce)
│   └── assets/
├── google-apps-script/Code.gs
├── automation/
│   ├── notifier.py
│   ├── config.example.json
│   ├── requirements.txt
│   └── state.json          (gitignored)
├── supabase/
│   ├── schema.sql
│   └── policies.sql
├── .gitignore
└── README.md
```

## 10. Non-Functional Requirements

| Aspect | Requirement |
|---|---|
| **Performance** | Home page loads in < 3 seconds on a mobile connection; Sheets data cached client-side |
| **Responsive** | Mobile-first, since most members are expected to use phones |
| **Realtime** | Pipeline and scene checklist changes appear without a page reload |
| **Security** | RLS enabled on all Supabase tables; no write-enabled Sheets key in the frontend; input validation and sanitization on both client and Apps Script |
| **Abuse prevention** | Limit idea submissions per time window; unique upvotes per `voter_id` |
| **Availability** | Uses free tiers of Supabase and Google; must remain viable within quota limits |
| **Maintainability** | No build step, separate JS module per feature, centralized configuration in `config.js` |

## 11. Assumptions and Constraints

- Asset files and videos are not uploaded to the app; only Google Drive links are used.
- Authentication in the first release is lightweight (voter identity based on device/name). Full Supabase Auth login is considered afterward.
- Edit access to Sheets content is limited to admins and trusted members.
- Free quotas of Supabase and Apps Script are sufficient for a small-to-medium community.
- The Python notifier runs on one admin's Termux device, so it depends on that device staying active.

## 12. Risks and Mitigations

| Risk | Mitigation |
|---|---|
| Upvotes can be manipulated without login | Database unique constraint, rate limiting; consider Supabase Auth in a later phase |
| Apps Script endpoint abused (spam) | Input validation, rate limiting, honeypot field, optional simple token |
| Google Sheets/Apps Script quota exceeded | Client-side caching, fewer repeated calls |
| Sheets edited incorrectly (broken columns) | Protect header row, data validation in Sheets, handle empty data in the frontend |
| Notifier stops when the Termux device sleeps | Use `termux-wake-lock` and schedule via cron/`termux-job-scheduler` |
| Private GDrive links that can't be opened | Form reminder to set access to "anyone with the link" |

## 13. Development Roadmap (Incremental)

| Phase | Scope | Output |
|---|---|---|
| **Phase 0** | Setup: Supabase project, Google Sheet, Apps Script, `config.js`, base Tailwind layout | Foundation ready |
| **Phase 1** | Module 1: Idea Drop-Box, idea list, upvotes, challenge board | Full idea flow working |
| **Phase 2** | Pipeline tracker and scene checklist (realtime) | Project monitoring working |
| **Phase 3** | Collab board, asset handoff, render relay, timestamp feedback | Complete collaboration |
| **Phase 4** | Asset catalog, tutorial/template library | Asset library |
| **Phase 5** | Works gallery and auto-credits generator | Showcase and documentation |
| **Phase 6** | Python Termux notifier, testing, documentation, deployment | Community release |

Development proceeds module by module, starting with Phase 1 because it already covers both integration paths (writing to Sheets via Apps Script and interactive data in Supabase).

## 14. Open Questions

1. Do members need to log in (Supabase Auth), or is lightweight identity enough for the first release?
2. Who is allowed to change pipeline status: only project coordinators, or all contributors?
3. Which notification platform should the notifier use: local Termux notifications, Telegram, or Discord?
4. Where will the app be hosted (GitHub Pages, Netlify, Vercel, or something else)?
5. Should ideas be moderated before appearing publicly (`pending` → `approved`)?
