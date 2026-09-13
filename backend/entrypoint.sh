#!/bin/sh
# Start the API.
#
# Migrations run before the server binds, so a deploy never serves against a
# schema it does not match.
#
# The seed is optional and off by default. It exists because a hosted free tier
# has no shell: Render only offers one on paid instances, so `python -m
# seed.demo_seed` cannot be run by hand, and a fresh Postgres otherwise stays
# empty forever — every screen renders its empty state and "add stock" honestly
# reports that no products exist.
#
# Running it on every boot is safe: demo_seed refuses to touch a database that
# already has categories in it, so this is a no-op from the second start
# onwards. It is still gated, because seeding demo data into a real deployment
# should be a decision somebody made on purpose.
set -e

alembic upgrade head

if [ "$SEED_DEMO_DATA" = "true" ]; then
  echo "SEED_DEMO_DATA=true — seeding if the database is empty"
  python -m seed.demo_seed
fi

exec uvicorn app.main:app --host 0.0.0.0 --port "${PORT:-8000}"
