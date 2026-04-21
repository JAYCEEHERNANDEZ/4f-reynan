# 4J LAUNDRY - Management System

A full-featured laundry shop management system built with React + Supabase.

## Features

- **Dashboard** — Overview of today's orders, revenue, active orders, stock alerts, and charts
- **Orders** — Create, track, and manage laundry orders with real-time countdown timers
- **Customers** — Customer database with search and CRUD operations
- **Inventory** — Track stock levels (soap, detergent, powder, etc.) with low-stock alerts
- **Stock Predictions** — AI-powered prediction of how many days until stock runs out based on historical usage
- **SMS Notifications** — Send SMS to customers (pickup ready, reminders, promos) with templates
- **Analytics** — Revenue trends, expenses, profit tracking, service breakdown, payment method stats

## Tech Stack

- **Frontend:** React 19 + Vite
- **Database:** Supabase (PostgreSQL)
- **Charts:** Recharts
- **Icons:** Lucide React
- **Notifications:** React Hot Toast

## Setup

### 1. Supabase Setup

1. Create a project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** and run the contents of `supabase_schema.sql`
3. Go to **Authentication > Settings** and enable Email auth
4. Create your admin user in **Authentication > Users**

### 2. Environment Variables

Copy `.env.example` to `.env` and fill in your Supabase credentials:

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

You can find these in Supabase: **Settings > API**

### 3. Install & Run

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) and sign in with the user you created.

## SMS Integration

SMS is ready for integration. Messages are currently logged and queued in the database. Once your sender name is verified with your SMS provider, connect the API in the SMS module.

## Currency

The system uses Philippine Peso (₱). Prices are configurable per service type.
"# 4f-reynan" 
