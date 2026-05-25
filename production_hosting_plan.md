# OmniTask Production Hosting & Deployment Plan

This document outlines the hosting strategy, free-tier quotas/limits, database-capacity management, and a step-by-step production deployment guide for **OmniTask**. 

---

## 📊 Free-Tier Lifetime Limits & Resource Budgets

To keep running costs at **$0 / month** while ensuring optimal performance and lifetime durability, we utilize modern developer-focused platforms. Below is the exact breakdown of the free storage quotas and lifetime limits, along with cleanup guidelines.

### 1. Database: Neon PostgreSQL
* **Lifetime Free Plan Quota**: **0.5 GB (500 MB)** of storage space.
* **Resources**: 1 active project, up to 10 database branches, with automatic autoscaling (autosuspends database compute to 0 vCPUs when idle to conserve compute).
* **Database Capacity Guidelines**:
  * On average, a standard transactional record in PostgreSQL takes about **0.5 to 1.5 KB** of storage space (including indexes).
  * **500 MB** can comfortably hold **300,000 to 500,000 database rows** (e.g., tasks, messages, checklists, comments, activity logs).
* **How & When to Clean the Database**:
  * **Threshold for Action**: Initiate cleanup once database storage reaches **80% capacity (400 MB)**. You can monitor this directly in the Neon Console Dashboard.
  * **Cleanup Strategy**:
    * **Activity Logs (Pruning)**: The `TaskActivity` table tends to grow exponentially. You can schedule a regular backend query to prune activity logs older than 90 days:
      ```sql
      DELETE FROM "TaskActivity" WHERE "created_at" < NOW() - INTERVAL '90 days';
      ```
    * **Direct & Channel Messages (Archiving)**: Truncate/prune older messages from chat rooms.
    * **Soft-Deleted Tasks**: Ensure you hard-delete old soft-deleted tasks:
      ```sql
      DELETE FROM "Task" WHERE "deleted_at" IS NOT NULL AND "deleted_at" < NOW() - INTERVAL '30 days';
      ```

---

### 2. File Attachments: Cloudinary
* **Lifetime Free Plan Quota**: **25 Monthly Credits**.
  * **1 Credit** = 1 GB of storage **OR** 1 GB of bandwidth **OR** 1,000 image/video transformations.
  * You get a total budget of **25 GB** (if used strictly for file/image storage and simple downloads without transformations).
* **Storage Capacity Guidelines**:
  * Average user avatar image: **50 KB to 200 KB** (optimized).
  * Average task attachment file: **1 MB to 5 MB**.
  * At an average of 1 MB per file, the free tier supports **25,000 files/images**.
* **How & When to Clean Cloudinary**:
  * **Threshold for Action**: Clean up when storage usage reaches **20 GB** (visible on the Cloudinary Admin Console).
  * **Cleanup Strategy**:
    * When a user deletes a message attachment or an assignee avatar, trigger a hook to call `cloudinary.uploader.destroy(public_id)` to physically purge the file from Cloudinary rather than just clearing its database reference.
    * Run a periodic orphan script to identify attachment database records that were deleted but whose physical files still reside on Cloudinary.

---

### 3. Backend Server: Fly.io
* **Lifetime Free Plan Quota (Hobby Plan Credit Allowance)**:
  * Up to **3 Shared-CPU-1x VMs** (with 256MB RAM).
  * Up to **3 GB total persistent volume storage** (not needed if we store files on Cloudinary).
  * **160 GB** of outbound network data transfer per month.
* **Server Lifecycle Guidelines**:
  * Automatically puts instances to sleep when there is no incoming HTTP request traffic, waking up in under **2 seconds** on the next request.
  * Supports long-running **WebSocket / Socket.IO** connections seamlessly.

---

### 4. Frontend Application: Vercel
* **Lifetime Free Plan Quota (Hobby)**:
  * **100 GB** of bandwidth per month.
  * Infinite lifetime deployments (automated from GitHub pushes).
  * **1,000 optimized source images** per month.
  * SSL certs generated and auto-renewed automatically.

---

## 🛠️ Step-by-Step Production Deployment Guide

Follow these sequential steps tomorrow to launch the backend, frontend, database, and attachments on the live web.

```mermaid
graph TD
    A[1. Set up GitHub Repo] --> B[2. Provision Neon PostgreSQL]
    B --> C[3. Create Cloudinary Account]
    C --> D[4. Launch Backend on Fly.io]
    D --> E[5. Deploy Frontend on Vercel]
    E --> F[6. Run Database Migrations]
    F --> G[7. Verify Live System]
```

### Step 1: Push Source Code to GitHub
Ensure you have a git repository set up for OmniTask:
1. Initialize a clean Git repository in the workspaces:
   ```bash
   git init
   git add .
   git commit -m "chore: initial commit for production deploy"
   ```
2. Create a repository on GitHub (private or public) and push:
   ```bash
   git remote add origin <your-github-repo-url>
   git branch -M main
   git push -u origin main
   ```

---

### Step 2: Provision Neon PostgreSQL
1. Create a free account at [Neon.tech](https://neon.com).
2. Create a new project called `omnitask-db` and select the nearest region (e.g., US East, Europe West, or Asia Pacific).
3. Copy the generated **Connection String** (which includes the PostgreSQL password):
   ```txt
   postgresql://neondb_owner:xxxxxxxx@ep-cool-butterfly-123456.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```

---

### Step 3: Configure Cloudinary file storage
1. Sign up for a free account at [Cloudinary.com](https://cloudinary.com).
2. Go to your Dashboard and copy your credentials:
   * **Cloud Name**
   * **API Key**
   * **API Secret**

---

### Step 4: Deploy the Backend Server on Fly.io
Fly.io utilizes a Dockerfile to package the Fastify server.
1. Install the Fly CLI on your machine:
   ```powershell
   pwsh -Command "iwr https://fly.io/install.ps1 -useb | iex"
   ```
2. Authenticate the CLI:
   ```bash
   fly auth login
   ```
3. Run the launch command from the `backend/` workspace directory:
   ```bash
   fly launch --no-deploy
   ```
   * Choose an app name (e.g., `omnitask-backend`).
   * Select a region closest to your Neon database region.
   * This will generate a `fly.toml` configuration file.
4. Set your production secrets on Fly.io:
   ```bash
   fly secrets set DATABASE_URL="postgresql://..." JWT_SECRET="your-super-secure-production-key" CLOUDINARY_CLOUD_NAME="..." CLOUDINARY_API_KEY="..." CLOUDINARY_API_SECRET="..." CLIENT_URL="https://omnitask.vercel.app"
   ```
5. Deploy the backend:
   ```bash
   fly deploy
   ```
   * Write down the deployed live backend URL (e.g., `https://omnitask-backend.fly.dev`).

---

### Step 5: Deploy the Frontend on Vercel
1. Go to [Vercel.com](https://vercel.com) and link your GitHub account.
2. Click **Add New > Project** and import the OmniTask GitHub repository.
3. Configure the build parameters:
   * **Root Directory**: Select `frontend/` (if it's a monorepo setup).
   * **Framework Preset**: Select **Next.js**.
4. Configure the **Environment Variables**:
   * `VITE_API_URL`: Set to your live backend URL (e.g., `https://omnitask-backend.fly.dev`).
   * `VITE_SOCKET_URL`: Set to your live backend WebSocket URL (e.g., `wss://omnitask-backend.fly.dev`).
5. Click **Deploy**. Your app will compile and launch on a `.vercel.app` subdomain!

---

### Step 6: Initialize the Database Schemas
To ensure all tables, indexes, constraints, and relationships are set up on the Neon database:
1. In your local backend workspace, temporarily direct your local environment to point to the live Neon database:
   ```bash
   # Set the temporary connection
   $env:DATABASE_URL="postgresql://neondb_owner:..."
   ```
2. Run the Prisma migration deploy command to initialize all schemas live:
   ```bash
   pnpm prisma db push
   ```
   * This executes the prisma schema changes and instantly applies all tables (`User`, `Task`, `Channel`, `ChannelMessage`, `DirectConversation`, etc.) securely on Neon!

---

### Step 7: Final Verification & Real-time WebSockets
1. Open your live Vercel URL.
2. Sign up with a new user (the first user is automatically registered with organization ownership capabilities).
3. Launch chat threads, assign tasks, upload avatars, and create boards.
4. Open the site in two separate browser tabs to verify that **real-time WebSocket updates** sync chat items, sidebar DM unread badges, and Kanban boards with sub-second latency!
