# Prisma Database Guide

This guide explains the common Prisma commands used in this project.

### 🚀 Standard Commands

| Command | Action | When to use? |
|---------|--------|--------------|
| `pnpm db:push` | Syncs schema to DB directly | **Fastest way** to fix 'table not found' or sync quick changes. |
| `pnpm db:migrate` | Create/Apply migrations | Standard way to add columns or tables with a tracked history. |
| `pnpm db:generate` | Generate Prisma Client | Run this after any schema changes so your code recognizes new fields. |
| `pnpm db:reset` | Reset entire database | Deletes **ALL** data and recreates the database from scratch. |
| `pnpm db:studio` | Open Database GUI | Opens a browser window to view and edit your data manually. |
| `pnpm db:seed` | Seed database | Fills the database with initial test or dummy data. |
| `pnpm db:format` | Format schema files | Prettifies and organizes your `.prisma` files. |

### 🛠 Troubleshooting

If you see an error like `The table public.users does not exist`, simply run:
```bash
pnpm db:push
```
