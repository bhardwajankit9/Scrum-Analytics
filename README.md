# Scrum Discipline Analytics (Phase 1)

Website (React + Vite + Tailwind CSS + Recharts) + Supabase (Auth + Postgres + RLS).

## Plan
- See `docs/PLAN.md`

## Environment
- Copy `.env.example` → `.env`
- Set:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`

## Run
```
npm run dev      # start dev server at http://localhost:5173
npm run build    # production build
npm run preview  # preview production build
```

## Stack
- **React 18** + **TypeScript** + **Vite**
- **Tailwind CSS** for styling
- **Recharts** for analytics charts
- **React Router v6** for navigation
- **Supabase** for auth + database (Phase 2 integration)
