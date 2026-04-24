# 🚀 CloudSnap Roadmap: The Path to 10/10

This document tracks the current status of CloudSnap and outlines the engineering requirements to achieve a perfect 10/10 score across all categories.

## 📊 Current Status (Post-Optimization)
**Overall Score: 92/100**

| Category | Score | Key Achievements |
| :--- | :--- | :--- |
| **💰 Cost** | 10/10 | $0/mo infinite storage via Telegram Bot API. |
| **📦 Capacity** | 10/10 | 200MB+ support via 19MB sequential chunking. |
| **⚡ Speed** | 9/10 | Streaming Proxy + In-Memory Cache + Regional Optimization. |
| **🎨 UX** | 9/10 | Background FAB Uploader + Speed Comparison Lab. |
| **🛠️ Architecture** | 9/10 | HTTP Range Request support for seekable video. |

---

## 🗺️ Future Roadmap (The 10/10 Plan)

### 1. Delivery Speed (9 → 10)
*Goal: Sub-50ms latency globally, regardless of server location.*
- [ ] **Cloudflare Global Proxy**: Connect the domain to Cloudflare to cache assets at 300+ edge locations worldwide.
- [ ] **Persistent Cache**: Integrate Vercel KV or a free-tier Redis to store file metadata and hot buffers across all serverless instances.
- [ ] **Pre-fetching Engine**: Implement a background worker that predicts the next asset a user will view and warms the edge cache.

### 2. User Experience (9 → 10)
*Goal: A high-utility tool that feels like a native desktop/mobile app.*
- [ ] **Drag & Drop Support**: Implement a global drop-zone for instant file uploads from the OS.
- [ ] **Folder & Tags System**: Add the ability to create, move, and organize assets into a logical directory structure.
- [ ] **Bulk Actions**: Add a "Select All" mode to delete, download, or share multiple assets at once.
- [ ] **PWA Support**: Configure manifest and service workers to make the dashboard installable on iOS/Android.

### 3. Architecture & Media (9 → 10)
*Goal: Enterprise-grade media handling with adaptive bitrates.*
- [ ] **HLS Adaptive Streaming**: Implement `ffmpeg` transcoding to serve videos in multiple bitrates (360p, 720p, 1080p) based on user network speed.
- [ ] **AI Search**: Integrate vector embeddings (via Supabase pgvector) to allow searching for images based on their content (e.g., "Show me photos of mountains").
- [ ] **Granular Permissions**: Add private links, password-protected assets, and self-destructing URLs.

---

## 🛠️ Tech Stack Reference
- **Frontend**: Next.js 15 (App Router), Tailwind CSS, Lucide Icons.
- **Backend**: Next.js API Routes, Sharp (Image Processing).
- **Storage**: Telegram Bot API (via `getFile` and `sendDocument`).
- **Database**: Supabase (PostgreSQL).
- **Hosting**: Vercel (Region: Mumbai/Singapore for lowest local latency).
