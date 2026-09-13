# Architecture notes

These documents were written during the build, each describing the state of the
system at the time. Several of their claims have since been overtaken - most
notably `NEXGRAM_INTELLIGENCE_DATA_AUDIT.md`, which describes intelligence
running client-side on mock fixtures. That is no longer true: the engines run on
the backend against the database, and the JavaScript versions have been deleted.

They are kept because the reasoning is useful, particularly the audit's account
of why client-side scoring was a privacy problem - it is the argument that moved
the work to the server.

For what the system does today, read [../SUBMISSION.md](../SUBMISSION.md).
For how to work on it, read [../CONTRIBUTING.md](../CONTRIBUTING.md).

| Document | Written for | Still current? |
|---|---|---|
| `NEXGRAM_ECOSYSTEM_ARCHITECTURE.md` | the target domain model | largely yes |
| `NEXGRAM_DATABASE_SCHEMA.md` | the relational schema | yes, plus later migrations |
| `NEXGRAM_ORDER_API.md` | the ordering engine | yes |
| `NEXGRAM_AUTHENTICATION.md` | the auth model | yes, and now hardened further |
| `NEXGRAM_PROFILE_ARCHITECTURE.md` | profiles on Postgres | yes |
| `NEXGRAM_PRODUCTION_INTELLIGENCE.md` | the backend pipeline | yes |
| `NEXGRAM_PRODUCTION_OPPORTUNITY_ENGINE.md` | opportunity scoring | **superseded** - the scoring model was rebuilt; see `opportunity_engine.py` |
| `NEXGRAM_INTELLIGENCE_DATA_AUDIT.md` | the mock-to-real audit | **historical** - its recommendations were carried out |
| `NEXGRAM_CONNECTIVITY_AUDIT.md` | both frontends against the live API | yes - the current state of the wiring |
| `NEXGRAM_SHOP_FEATURES.md` | loans, sourcing, shelf inventory, voice sales and chotu delivery | yes - backend and the Vite app's screens |
| `NEXGRAM_ASSISTANT.md` | the in-app Gemini chatbot, and how to switch it on | yes |
| `NEXGRAM_CLERK_AUTH.md` | Clerk sign-in, and why it does not own the session | yes - optional, off without keys |
