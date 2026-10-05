# D.M — Digital Marketing SaaS (Part 1)

Part 1 is a real multi-tenant foundation: authentication, organization memberships, RBAC, teams and invitations. The stack is Next.js, Fastify, Prisma and PostgreSQL.

## Run locally

1. Copy `.env.example` to `backend/.env` and `frontend/.env.local` (adapt values as needed).
2. Start PostgreSQL: `docker compose up -d db`
3. Install each workspace: `npm install` in `backend`, then `frontend`.
4. Run `npm run prisma:migrate` and `npm run prisma:seed` from `backend`.
5. Run `npm run dev` in both workspaces.

The API is at `http://localhost:4000/api/v1`; the UI is at `http://localhost:3000`.
