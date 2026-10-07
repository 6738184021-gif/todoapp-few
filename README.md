# daymark

A small, private to-do list built with Next.js and Supabase. Users create an account, add tasks, mark them complete, and delete them. Supabase Row Level Security ensures each signed-in user can only access their own tasks.

## How the app works

1. The browser signs up or signs in with Supabase Auth using an email address and password.
2. Supabase Auth gives the browser a user session. The app uses that session for direct, authenticated requests to the Supabase `tasks` table.
3. Postgres checks the table's Row Level Security policies on every request. The policies compare `auth.uid()` with each row's `user_id`, so filtering in the UI is not relied on for privacy.
4. The browser key is a public/anon key, not a server secret. RLS is the security boundary for these requests.

## Set up Supabase

1. Create a Supabase project.
2. In the Supabase SQL Editor, run [`supabase/schema.sql`](./supabase/schema.sql). This creates the `tasks` table, index, and per-user RLS policies. **Keep Row Level Security enabled**; do not turn it off.
3. In Project Settings → API, copy the Project URL and the anon/public key (called the **publishable key** in newer Supabase dashboards).
4. In Authentication → Providers → Email, enable email/password sign-in. For demo accounts that use fake email addresses, turn off email confirmation in the Supabase Auth settings (this is separate from RLS). Do not use fake accounts or disable confirmation for a real production service.
5. If deploying, configure the Supabase Auth URL settings with your local and deployed site URLs as appropriate.

## Run locally

Use Node.js 20.9 or newer.

```bash
npm install
Copy-Item .env.example .env.local
```

Open `.env.local` and set the two public client variables:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-or-publishable-key
```

These values are found in your Supabase project settings. Never put a `service_role` key in this file or in any `NEXT_PUBLIC_` variable. `.env.local` is ignored by Git; `.env.example` contains only blank placeholders.

Start the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Create separate accounts to test user isolation.

## Verify task privacy

1. Sign up as user A and add a task.
2. Sign out; sign in as user B and confirm user A's task is not present.
3. Add a task as user B and confirm it appears only for user B.
4. Try accessing or changing user A's task while signed in as user B. Supabase RLS must deny the operation even if a request is made outside the UI.
5. Try submitting a blank task; the app should show validation feedback and should not create a row.

## Checks

```bash
npm test
npm run lint
npm run build
```

The tests cover task-title validation. The account-isolation check requires a configured Supabase project and is described above.

## Deploy to Vercel

Import this repository into Vercel and set these environment variables in the project's settings for the environments you deploy:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Then deploy using the default Next.js build settings. Configure the deployed URL in Supabase Auth URL settings. Do not add the Supabase `service_role` key; this app only needs the public client key and its RLS policies.

## Stack

- Next.js App Router, React, and TypeScript
- Supabase Auth and Postgres with Row Level Security
- CSS Modules for the responsive interface
