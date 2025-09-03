# MedX — One-shot Launch Starter

This project includes:
- **Banner aggregator** (WHO, ClinicalTrials, openFDA, PubMed)
- **Chat** that proxies to a **self-hosted LLM** (OpenAI-compatible endpoint like vLLM/Ollama)
- **/api/analyze** endpoint that sends PDFs or images to OpenAI for summarization
- Dark/Light theme, PWA manifest
- Minimal UI with Patient/Clinician toggle
- API wrappers for PubMed, openFDA, ClinicalTrials, DailyMed, RxNorm, ICD-11

## Run
1. Copy `.env.example` → `.env.local` and fill:
   - `NCBI_API_KEY` `OPENFDA_API_KEY`
   - `ICD11_CLIENT_ID` `ICD11_CLIENT_SECRET`
   - `LLM_BASE_URL` (e.g., `https://llm.your-vpc/v1` for vLLM/Ollama OpenAI-compatible API)
   - `LLM_MODEL_ID` (e.g., `llama3-8b-instruct`)
   - `HF_API_TOKEN`
   - optional: `HF_CHEST_MODEL` `HF_BONE_MODEL`
   - for OpenAI summaries: `OPENAI_API_KEY`, `OPENAI_TEXT_MODEL`, `OPENAI_VISION_MODEL`
2. `npm install`
3. `npm run dev`

## Deploy
- Push to GitHub → Import into Vercel → add same env vars → Deploy.

## Endpoints
- `GET /api/banner` — aggregated headlines
- `POST /api/chat` — body: `{question, role: "patient"|"clinician"}`
- `POST /api/analyze` — multipart form-data with `file` and optional `doctorMode`
- Plus wrappers: `/api/clinicaltrials`, `/api/pubmed`, `/api/who`, `/api/openfda`, `/api/dailymed`, `/api/rxnorm`, `/api/icd11`

## Notes
- OpenAI models power the `/api/analyze` endpoint for PDF and image summaries.
- Images for banner should follow source licenses; this demo just returns text/meta.

### Setup
1) Copy `.env.example` -> `.env` and fill values.
2) Install: `npm install`
3) Generate Prisma client: `npx prisma generate`
4) Apply schema (choose one):
   - Local dev: `npx prisma migrate dev`
   - Deploy (Vercel): `npx prisma migrate deploy`

### Diagnostics
- /api/health -> { ok: true }
- /api/diag   -> env presence flags
- /api/auth/signin -> Google login
