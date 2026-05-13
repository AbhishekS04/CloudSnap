<div align="center">
  <img src="https://cloud-snapp.vercel.app/api/cdn/screenshot-from-2026-04-30-14-15-20.png?fmt=avif" alt="CloudSnap Banner" width="100%" style="border-radius: 16px;" />

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
- **LQIP — Low Quality Image Placeholder**:
    - At upload time, `sharp` generates a **16px-wide, quality-20 JPEG blur** (~300–600 bytes) and encodes it to base64.
    - The placeholder is stored directly in Supabase alongside asset metadata.
    - On the gallery, the LQIP renders as a CSS `background-image` **instantly on paint** (zero network round-trip).
    - The real CDN image fades in over `500ms` via an `onLoad` opacity transition — eliminating all jarring blank-space flashes.
- **CDN Accept-Header Auto Format Negotiation**:
    - The `/api/cdn/[id]` route now reads the browser's `Accept` header automatically.
    - **Chrome/Edge** (AVIF support) → receives AVIF (~50% smaller than WebP).
    - **Safari/Firefox** (WebP support) → receives WebP (~30% smaller than JPEG).
    - **Legacy browsers** → receive the original format untouched.
    - No `?fmt=` URL param required. Format selection is completely transparent to the user.
    - Each negotiated variant has its own cache key — `cs:{id}:{w}:{format}:{quality}` — so warm cache hits are instant.
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

## ⚡ CloudSnap vs Cloudinary

CloudSnap was built to match — and in several areas exceed — the capabilities of Cloudinary, while running at **$0 infrastructure cost** with **zero vendor lock-in**.

| Capability | Cloudinary | CloudSnap |
|---|---|---|
| **Image Format Auto-Negotiation** | `f_auto` URL param (counted as a transformation) | ✅ Accept-header driven — zero params, zero per-request charge |
| **LQIP / Blur Placeholder** | `e_blur` + `q_1` transformation (billed per request) | ✅ Generated once at upload time with Sharp, stored as base64 in DB — served free forever |
| **On-the-fly Resize** | `w_800,h_600,c_fill` URL params | ✅ `?w=800` with aspect-ratio-safe `fit: inside`, never upscales |
| **Format Conversion** | `f_webp`, `f_avif` URL params | ✅ `?fmt=webp\|avif\|jpeg\|png` with per-codec quality tuning |
| **Two-Tier CDN Cache** | Cloudinary's proprietary CDN | ✅ Upstash Redis L2 + in-process Map L1, 7-day transform TTL |
| **AI Metadata** | Add-on ($$$) | ✅ Gemini-powered description + tags at upload, stored free |
| **Programmatic API** | Yes (pay per usage) | ✅ API-key auth, `/api/v1/upload`, `/api/v1/assets` |
| **Storage Cost** | $0.025 / GB / month | ✅ **$0** — binaries live in Telegram's infrastructure |
| **Data Ownership** | Cloudinary owns your CDN URL | ✅ Full ownership — self-hosted, portable schema |
| **Video Delivery** | Adaptive streaming (paid) | ✅ Chunk-aware byte-range seeking, no re-encoding cost |
| **Vendor Lock-in** | High (proprietary URLs/transforms) | ✅ None — swap storage backend without changing UI |
| **Global Edge CDN** | 300+ PoPs worldwide | Vercel Edge Network (limited vs Cloudinary) |
| **Watermarking / Face Detection** | Built-in | Not implemented |

### How the two new features close the gap

**LQIP (Low Quality Image Placeholder)**
Cloudinary charges a transformation credit every time you request `e_blur,q_1,w_20` as a placeholder. In CloudSnap, Sharp runs once at upload time, producing a `~400-byte` base64 string that is stored[...]

**Accept-Header Auto Format Negotiation**
Cloudinary's `f_auto` works by appending a URL parameter — every unique URL variation (original vs AVIF vs WebP) is treated as a billable transformation. CloudSnap's CDN proxy reads the browser's `A[...]

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

### 12. LQIP — Instant Visual Feedback on Image Load
**Challenge**: Images appeared as blank grey cards until the CDN fetch completed, causing a jarring layout flash — especially noticeable on slower connections or large galleries.
**Solution**:
- At upload time, `sharp` generates a **16px-wide, quality-20 blurred JPEG** of the image (~300–600 bytes).
- The buffer is base64-encoded and stored as the `lqip` column in the `assets` Supabase table.
- In `ImageGallery.tsx`, this data URI is applied as a CSS `background-image` on the image container — it appears **synchronously with the first paint**, requiring zero extra network requests.
- An `onLoad` handler on the real `<img>` transitions opacity from `0 → 1` over `500ms` using CSS, creating a smooth blur-to-sharp reveal.
- Old assets without LQIP are handled gracefully — the `lqip` field is nullable and the gallery renders them with no regression.

### 13. CDN Accept-Header Auto Format Negotiation
**Challenge**: The CDN always served the original file format unless the client explicitly passed `?fmt=webp` or `?fmt=avif`. This meant browsers capable of rendering AVIF (Chrome, Edge) were download[...]
**Solution**:
- In `/api/cdn/[id]/route.ts`, after parsing the optional `?fmt=` parameter, the handler now reads the `Accept` request header.
- If no explicit format was requested and the header contains `image/avif`, the CDN selects AVIF automatically.
- If the header contains `image/webp` (and not AVIF), WebP is selected.
- If neither is supported, the original format is returned untouched.
- The existing transform-key scheme (`cs:{id}:{w}:{format}:{quality}`) already handles per-format caching — AVIF and WebP variants are cached independently in Upstash Redis, so the second request fo[...]
- No changes to any client URL patterns — the negotiation is entirely server-side and transparent.

---

## 🏗️ Build Your Own

This project is open-sourced for **educational and inspirational purposes**. 

Instead of simply cloning this repository, we strongly encourage you to **study the architecture, understand the solutions to the complex challenges listed above, and build your own bespoke asset mana[...]

The true value lies in the journey of solving these engineering problems yourself.

### Core Concepts to Replicate:
1.  **Hybrid Uploads**: Learn how to handle `FormData` streams with robust ID association.
2.  **Stream Processing**: Master `busboy` and `ffmpeg` for efficient media handling.
3.  **UI/UX**: Strive for the level of polish seen in our glassmorphism and terminal-style interfaces.

---

## 📄 License

Distributed under the MIT License. See [`LICENSE`](./LICENSE) for more information.

*This project is intended as a reference implementation for advanced Next.js patterns.*
