<div align="center">
  <img src="https://cloud-snapp.vercel.app/api/cdn/screenshot-from-2026-04-30-14-15-20.png?fmt=webp" alt="CloudSnap Banner" width="100%" style="border-radius: 10px;" />

  <br />
  
  # CloudSnap
  
  **Premium AI-Powered Asset Management System**
  
  <p align="center">
    An intelligent, aesthetic, and high-performance digital asset management platform.<br/>
    Built for speed, visual fidelity, and seamlessly fluid user experiences.
  </p>

  <p align="center">
    <a href="https://github.com/AbhishekS04" target="_blank">
      <img src="https://img.shields.io/badge/GitHub-100000?style=for-the-badge&logo=github&logoColor=white" alt="GitHub" />
    </a>
    &nbsp;&nbsp;
    <a href="https://twitter.com/_abhishek2304" target="_blank">
      <img src="https://img.shields.io/badge/Twitter-1DA1F2?style=for-the-badge&logo=twitter&logoColor=white" alt="Twitter" />
    </a>
    &nbsp;&nbsp;
    <a href="https://linkedin.com/in/Abhi3hekk" target="_blank">
      <img src="https://img.shields.io/badge/LinkedIn-0077B5?style=for-the-badge&logo=linkedin&logoColor=white" alt="LinkedIn" />
    </a>
    &nbsp;&nbsp;
    <a href="https://instagram.com/abhi3hekk" target="_blank">
      <img src="https://img.shields.io/badge/Instagram-E4405F?style=for-the-badge&logo=instagram&logoColor=white" alt="Instagram" />
    </a>
  </p>
</div>

---

## 🚀 Features

### Core Asset Management
- **Telegram-Native Storage Engine**: All binaries are stored in a private Telegram channel, with Supabase used as metadata/indexing layer.
- **Chunk-Aware Upload Pipeline**: Large uploads are split into **4MB chunks**, uploaded safely, and reassembled on demand.
- **On-Demand Media Delivery**: `/api/cdn/[id]` serves originals plus runtime transforms (`w`, `fmt`, `q`) with `sharp`-powered optimization.
- **Video-Friendly Delivery**: Supports byte-range streaming and chunk-aware seeking for smoother playback.
- **Global & Folder-Based Organization**: 
    - Full folder creation and nested navigation support.
    - **"All Assets" Global View**: See everything in one place; deleting here removes the asset everywhere.
- **Drag & Drop Upload Zone**: 
    - Supports multi-file uploads.
    - **Pinterest Integration**: Drag & drop URLs directly from Pinterest to import assets server-side.
- **Resumable Upload Sessions**:
    - Persistent upload queue via **IndexedDB**.
    - Session restore after refresh/reopen.
    - Chunk session tracking with server-side reconciliation.

### Performance, Cache & Realtime
- **Two-Tier Cache**:
    - **L1**: In-process memory cache.
    - **L2**: **Upstash Redis** cache for edge/serverless resilience.
- **Realtime Dashboard Sync**: Supabase Realtime subscription updates asset state (insert/update/delete) without manual refresh.
- **Storage Telemetry**: Live storage usage cards with role-aware quota display (Admin vs Demo).

### Intelligence, Sharing & API
- **AI Image Intelligence**: Gemini-powered description + tags generation for uploaded images (stored as metadata).
- **Smart Share Links**:
    - Share page supports UUID and vanity-style name lookup.
    - Share UI includes direct download and CDN link copy actions.
- **Developer Hub + API Keys**:
    - Create/revoke scoped API keys.
    - Programmatic uploads via `/api/v1/upload`.
    - API asset listing/detail endpoints (`/api/v1/assets`, `/api/v1/assets/[id]`).
- **Synchronized Deletion**: Asset deletion removes Telegram messages (including chunked uploads) plus DB records.

### Premium User Experience (UX)
- **Glassmorphism UI**: Built with **Tailwind CSS v4**, featuring real-time blur effects, subtle borders, and deep zinc color palettes.
- **Smooth Animations**: Powered by **Framer Motion**, all interactions (hover, enter, exit, layout shifts) use professional `ease-in-out` curves—no bouncy spring physics.
- **Responsive Sidebar**: Collapsible navigation with mobile drawer support.
- **Masonry Layout**: Adaptive grid for varying aspect ratios.

---

## 🛠 Tech Stack

### Frontend
- **Framework**: Next.js 16 (App Router + Turbopack)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4, `lucide-react` (Icons)
- **Animation**: Framer Motion
- **Auth**: Clerk (Custom Client-Side wrapper for hydration safety)

### Backend & Infrastructure
- **Database**: Supabase (PostgreSQL)
- **Primary Binary Storage**: Telegram Bot API + private storage channel
- **Metadata/Indexing**: Supabase `assets` / `folders` / `upload_sessions` tables
- **CDN Caching**: Upstash Redis (`@upstash/redis`) + in-memory L1 cache
- **Image Processing**: `sharp` (Node.js)
- **Video Processing/Compatibility**: `fluent-ffmpeg`, `ffmpeg-static`, `@ffprobe-installer/ffprobe`
- **Multipart Parsing**: `busboy` (Stream-based parsing for memory efficiency)
- **AI Metadata**: Google Gemini (`@google/generative-ai`)
- **Realtime Data Sync**: Supabase Realtime with Clerk-authenticated client
- **Service Worker**: Manual SW registration for PWA groundwork

---

## 🔧 Technical Implementation & Challenges Tackled

### 1. Robust Folder Persistence & Race Conditions
**Challenge**: When uploading files to a specific folder, the `folderId` was often lost or nullified due to `FormData` parsing race conditions (fields overlapping with file streams).
**Solution**: 
- We implemented a **Hybrid Upload Strategy**. The `folderId` is sent as a **URL Query Parameter** (`?folderId=xyz`) to the API. 
- This ensures the ID is available *immediately* upon request receipt, before the potentially large file body is even parsed by `busboy`.
- The database insertion logic was hardened to strictly enforce foreign key relationships.

### 2. High-Performance Video Uploads
**Challenge**: Next.js Body Parser limits and memory issues with large video files.
**Solution**: 
- Raised Next.js proxy/server action body limits and enforced route-level size guards.
- Implemented robust multipart parsing using `busboy`.
- Large payloads are chunked and transferred to Telegram-backed storage safely.
- **FFmpeg** tooling is used for media probing/compatibility workflows where needed.

### 3. Hydration Mismatch Resolution
**Challenge**: Integrating third-party auth components (`<UserButton />`) caused "Hydration failed" errors due to server/client attribute mismatches.
**Solution**: 
- Created a custom `<ClientUserButton />` wrapper.
- This component specifically defers rendering of the auth widget until the client mounting phase is complete (`useEffect` mount check).
- A bespoke generic loading placeholder prevents layout shift during this split-second initialization.

### 4. Global Deletion Consistency
**Challenge**: Deleting an image from the "All Assets" view didn't always reflect in the folder views immediately.
**Solution**: 
- The "All Assets" view was refactored from a "Uncategorized Only" filter to a true **Global Query**.
- The Delete API (`DELETE /api/images`) was updated to perform a cascade delete:
    1.  Deletes related Telegram message objects (single or chunked asset).
    2.  Deletes the database record.
    3.  Triggers frontend state/realtime refresh to instantly update the UI.

---

### 5. Access Control & Security
**Challenge**: Limiting full dashboard access to authorized administrators only, while letting guests see documentation.
**Solution**: 
- Implemented a Server-Side Admin Check (`isUserAdmin`) using `ADMIN_EMAIL` environment variable.
- Non-admin users are automatically routed to a **MDX-rendered Documentation View** (Guest Mode).
- This ensures sensitive operations (Upload/Delete) are physically inaccessible to unauthorized users.

### 6. Redis-Backed CDN Caching
**Challenge**: Serving transformed assets quickly under serverless cold starts while avoiding repeated Telegram fetch + transform costs.
**Solution**:
- Implemented a two-layer cache strategy:
  - L1 in-process `Map` for immediate hot hits.
  - L2 Upstash Redis for cross-instance cache persistence.
- Added transform-aware cache keys (`id + w + fmt + q`) and cache source headers for observability.

### 7. Resumable Upload Queue Persistence
**Challenge**: Upload progress was lost on refresh/navigation for large chunked uploads.
**Solution**:
- Added IndexedDB persistence (`cloudsnap-upload-queue`) for upload state.
- Added `/api/upload/session` lifecycle endpoints (`POST`, `GET`, `PATCH`) and chunk confirmation tracking.
- Queue auto-restores pending jobs and resumes from confirmed chunk index.

### 8. Telegram Physical Deletion Sync
**Challenge**: Deleting an asset from DB left orphaned Telegram files/messages.
**Solution**:
- Stored Telegram `message_id` references per asset/chunk.
- On asset deletion, the API performs Telegram deletion (bulk + fallback) before DB cleanup.
- Keeps metadata and binary layer lifecycle in sync.

### 9. AI Metadata Enrichment (Gemini)
**Challenge**: Asset discovery and semantic context were weak with filename-only indexing.
**Solution**:
- Added Gemini image analysis at upload time for eligible images.
- Stored `ai_description` + `ai_tags` with each asset.
- Exposed AI metadata in share experience for richer context.

### 10. Programmatic MaaS Access
**Challenge**: Third-party systems needed secure server-to-server media upload/access.
**Solution**:
- Added API-key authentication (`x-api-key` / `Authorization: Bearer`).
- Implemented scoped API keys with optional folder restrictions.
- Added `/api/v1/upload`, `/api/v1/assets`, and key introspection endpoints.

### 11. Realtime Dashboard Synchronization
**Challenge**: Asset list and storage UI required manual refresh after remote mutations.
**Solution**:
- Added Supabase Realtime channel subscription on `assets`.
- Insert/update/delete events mutate client state instantly.
- Storage cards and gallery state auto-refresh with minimal polling fallback.

---

## 🏗️ Build Your Own

This project is open-sourced for **educational and inspirational purposes**. 

Instead of simply cloning this repository, we strongly encourage you to **study the architecture, understand the solutions to the complex challenges listed above, and build your own bespoke asset management system.**

The true value lies in the journey of solving these engineering problems yourself.

### Core Concepts to Replicate:
1.  **Hybrid Uploads**: Learn how to handle `FormData` streams with robust ID association.
2.  **Stream Processing**: Master `busboy` and `ffmpeg` for efficient media handling.
3.  **UI/UX**: Strive for the level of polish seen in our glassmorphism and terminal-style interfaces.

---

## 📄 License

Distributed under the MIT License. See [`LICENSE`](./LICENSE) for more information.

*This project is intended as a reference implementation for advanced Next.js patterns.*
