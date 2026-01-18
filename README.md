# Private Image Hosting & Optimization Platform

A personal high-performance image hosting solution built with Next.js, Supabase, and Sharp. Designed to replace Cloudinary for personal portfolios with zero-compromise quality.

## Features

- **Crystal Clear Optimization**: WebP conversion with high quality settings (90+), ensuring no visual loss.
- **Auto-Resizing**: Automatically generates `thumb` (200w), `sm` (600w), `md` (1200w), and `lg` (2000w) sizes.
- **Smart Logic**: Never upscales smaller images. Maintains aspect ratio. Strips EXIF metadata.
- **Supabase Storage**: Secure and scalable storage for assets.
- **Simple Dashboard**: Drag & drop upload, auto-copy URLs, and gallery management.

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: TailwindCSS
- **Database & Storage**: Supabase
- **Image Processing**: Sharp (Server-side)

## Setup Instructions

### 1. Environment Variables

Create a `.env.local` file in the root directory:

```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_for_admin_only
```

> **Warning**: Never expose `SUPABASE_SERVICE_ROLE_KEY` to the client. It is used only in server-side API routes.

### 2. Database Setup

Run the SQL found in [`supabase/schema.sql`](./supabase/schema.sql) in your Supabase SQL Editor. This will:
- Create the `assets` storage bucket (public).
- Create the `images` table.
- Set up security policies.

### 3. Install & Run

```bash
npm install
npm run dev
```

Visit `http://localhost:3000/dashboard` to start uploading.

## Deployment to Vercel

1. Push this repo to GitHub.
2. Import project in Vercel.
3. Add the Environment Variables from step 1 in Vercel Project Settings.
4. Deploy.

> **Note on Limits**: Vercel Serverless Functions have a request body limit (4.5MB for Hobby). For larger uploads (up to 10MB), ensure you are on a Pro plan or handling uploads via client-side signed URLs (though this project currently uses server-side processing for Sharp optimization).

## Portfolio Usage Guide

In your portfolio Next.js project, use the optimized images to ensure fast loading and perfect quality.

### Code Snippet

Use the standard `<img>` tag or Next.js `<Image>` (with unoptimized prop if you want to bypass Next's optimization and use these pre-optimized assets).

**Recommended HTML:**

```jsx
<img
  src="MD_URL" // Fallback (1200w)
  srcSet="SM_URL 600w, MD_URL 1200w, LG_URL 2000w"
  sizes="(max-width: 640px) 600px, (max-width: 1200px) 1200px, 2000px"
  alt="Project Screenshot"
  loading="lazy"
  width={1200} // Aspect ratio width
  height={800} // Aspect ratio height
  className="rounded-lg shadow-lg"
/>
```

### Choosing Sizes

| Size Name | Width | Usage |
|-----------|-------|-------|
| **Thumb** | 200px | Placeholders, tiny avatars, or blur-up base |
| **SM**    | 600px | Mobile screens, grid cards |
| **MD**    | 1200px| Standard desktop cards, blog post images |
| **LG**    | 2000px| Hero headers, full-screen galleries |

### Quality Guarantee

The platform is tuned to `quality: 90` with `smartSubsample` enabled. This ensures that text, UI elements, and faces remain sharp, unlike standard 80% compression.
