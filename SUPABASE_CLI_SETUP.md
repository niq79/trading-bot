# Supabase CLI Setup Guide

## Installation

The Supabase CLI is already installed via Homebrew:
```bash
brew install supabase/tap/supabase
```

## Connecting to Your Project

To push migrations directly from your local machine:

1. **Get your Supabase Project Reference ID**:
   - Go to your Supabase Dashboard
   - Settings → General → Project Settings
   - Copy the "Reference ID" (e.g., `abcdefghijklmnop`)

2. **Link your local project**:
   ```bash
   supabase link --project-ref YOUR_PROJECT_REF
   ```
   
   You'll be prompted for your database password (the one you set when creating the project).

3. **Push migrations**:
   ```bash
   supabase db push
   ```
   
   This will apply any migrations in `supabase/migrations/` that haven't been run yet.

## Alternative: Manual Migration

If you prefer not to use the CLI, you can run migrations manually:

1. Go to Supabase Dashboard → SQL Editor
2. Open and run each migration file in order:
   - `001_initial_schema.sql`
   - `002_rls_policies.sql`
   - `003_fix_strategies_schema.sql`

## Useful Commands

```bash
# Check CLI version
supabase --version

# See project status
supabase status

# Generate TypeScript types from your database
supabase gen types typescript --local > lib/supabase/database.types.ts

# Run migrations
supabase db push

# Create a new migration
supabase migration new migration_name
```

## Notes

- Migrations are stored in `supabase/migrations/`
- Always test migrations on a development database first
- The CLI requires your database password (set during project creation)
- Types can be regenerated after schema changes using `supabase gen types`
