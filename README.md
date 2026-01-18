<div align="center">
  <img src="https://rdxqqgntmtzvqsmepmls.supabase.co/storage/v1/object/public/assets/original/dac3bbda-bf99-47a7-bc22-40dcdbd537ab.png" alt="CloudSnap Banner" width="100%" style="border-radius: 10px;" />

  <br />
  
  # CloudSnap
  
  **Premium AI-Powered Asset Management System**
  
  <p align="center">
    An intelligent, aesthetic, and high-performance digital asset management platform.<br/>
    Built for speed, visual fidelity, and seamlessly fluid user experiences.
  </p>

  <p align="center">
    <a href="https://github.com/yourusername" target="_blank">
      <img src="https://img.shields.io/badge/GitHub-100000?style=for-the-badge&logo=github&logoColor=white" alt="GitHub" />
    </a>
    &nbsp;&nbsp;
    <a href="https://twitter.com/yourusername" target="_blank">
      <img src="https://img.shields.io/badge/Twitter-1DA1F2?style=for-the-badge&logo=twitter&logoColor=white" alt="Twitter" />
    </a>
    &nbsp;&nbsp;
    <a href="https://linkedin.com/in/yourusername" target="_blank">
      <img src="https://img.shields.io/badge/LinkedIn-0077B5?style=for-the-badge&logo=linkedin&logoColor=white" alt="LinkedIn" />
    </a>
    &nbsp;&nbsp;
    <a href="https://instagram.com/yourusername" target="_blank">
      <img src="https://img.shields.io/badge/Instagram-E4405F?style=for-the-badge&logo=instagram&logoColor=white" alt="Instagram" />
    </a>
  </p>
</div>

---

## 🚀 Features

### Core Asset Management
- **Smart Image Optimization**: Automatically generates **WebP** and **AVIF** variants for every uploaded image using `sharp`.
- **Intelligent Video Processing**: Uses `ffmpeg` to generate:
    - **Original Quality** (Fast-start optimized)
    - **Compressed Preview** (For slow connections)
    - **Thumbnails** (Instant seek previews)
- **Global & Folder-Based Organization**: 
    - Full folder creation and nested navigation support.
    - **"All Assets" Global View**: See everything in one place; deleting here removes the asset everywhere.
- **Drag & Drop Upload Zone**: 
    - Supports multi-file uploads.
    - **Pinterest Integration**: Drag & drop URLs directly from Pinterest to import assets server-side.

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
- **Storage**: Supabase Storage
- **Image Processing**: `sharp` (Node.js)
- **Video Processing**: `fluent-ffmpeg`, `ffmpeg-static`
- **Multipart Parsing**: `busboy` (Stream-based parsing for memory efficiency)

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
- Disabled the default Next.js body parser (`export const config = { api: { bodyParser: false } }`).
- Implemented a raw stream handler using `busboy`.
- Videos are streamed directly to buffers for processing, then uploaded to Supabase Storage in parallel chunks.
- **FFmpeg** is used to strip metadata for privacy while preserving quality, and to generate lightweight previews.

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
    1.  Removes all storage variants (Original, WebP, AVIF, Thumbnails).
    2.  Deletes the database record.
    3.  Triggers a frontend SWR/State revalidation to instantly update the UI.

---

### 5. Access Control & Security
**Challenge**: Limiting full dashboard access to authorized administrators only, while letting guests see documentation.
**Solution**: 
- Implemented a Server-Side Admin Check (`isUserAdmin`) using `ADMIN_EMAIL` environment variable.
- Non-admin users are automatically routed to a **MDX-rendered Documentation View** (Guest Mode).
- This ensures sensitive operations (Upload/Delete) are physically inaccessible to unauthorized users.

---

## 📦 Setup & Installation

1.  **Clone the repository**:
    ```bash
    git clone https://github.com/yourusername/cloudsnap.git
    cd cloudsnap
    ```

2.  **Install dependencies**:
    ```bash
    npm install
    # or
    yarn install
    ```

3.  **Environment Setup**:
    Create a `.env.local` file in the root directory. You will need keys for:
    - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` & `CLERK_SECRET_KEY`
    - `NEXT_PUBLIC_SUPABASE_URL` & `SUPABASE_SERVICE_ROLE_KEY`
    - `ADMIN_EMAIL`: Comma-separated list of authorized emails (e.g., `admin@example.com`).
    *(Refer to `.env.example` for the variable names)*

4.  **Run Development Server**:
    ```bash
    npm run dev
    ```
    Open [http://localhost:3000](http://localhost:3000) with your browser.

## 📄 License
MIT
