# OpenClaw ERP Boilerplate

A modular, multi-tenant B2B ERP system boilerplate using **Supabase** as the backend engine and **OpenClaw** as the autonomous background execution framework.

## Project Structure

- `dashboard/`: Next.js 15 application using App Router and Tailwind CSS for the tenant dashboard UI.
- `supabase/`: Database configuration, migrations, Row-Level Security policies, seed data, and Edge Functions.
- `skills/`: OpenClaw executable Markdown modules for autonomous agents.

## Prerequisites

1. **Node.js** (v18+)
2. **Docker Desktop** (Required for local Supabase environment)
3. **Supabase CLI** (`npm install -g supabase`)

## Step-by-Step Setup Guide

### 1. Start Supabase (Backend)
Open a terminal in the root directory and start the local Supabase stack:
```bash
supabase start
```
*Note: This requires Docker to be running on your machine. This will automatically run all migrations in `supabase/migrations/` and apply the seed data in `supabase/seed.sql`.*

### 2. Configure Environment Variables
You need to map your Supabase credentials. Once `supabase start` finishes, it will print out the local `API URL` and `SERVICE_ROLE_KEY`.

Create a `.env` file in the root directory for OpenClaw skills:
```env
SUPABASE_URL=http://127.0.0.1:54321
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

### 3. Run the Dashboard
Navigate into the `dashboard` folder and start the Next.js development server:
```bash
cd dashboard
npm run dev
```
Open `http://localhost:3000` in your browser. You can use the organization selector at the top right to verify multi-tenant data isolation.

### 4. Running OpenClaw Skills
The `skills/` directory contains standard OpenClaw skills. For example, to run the inventory fetch skill locally using Node:
```bash
cd skills
node -e "$(awk '/```javascript/{flag=1;next}/```/{flag=0}flag' supabase_fetch_inventory.md)" -- "SKU-A-001" "11111111-1111-1111-1111-111111111111"
```

## Security & Isolation

- **Multi-Tenancy**: Data isolation is enforced at the database level using PostgreSQL Row-Level Security (RLS). All queries must include the `organization_id` context.
- **Edge Webhooks**: A database trigger intercepts when inventory drops below `reorder_level` and dispatches a secure Edge Function to the OpenClaw Gateway.
- **Agent Sandbox**: The Next.js dashboard UI prevents Tenant A from observing Tenant B's agent execution scripts and logs.
