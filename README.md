# MedX — One-shot Launch Starter

This project includes:
- **Banner aggregator** (WHO, ClinicalTrials, openFDA, PubMed)
- **Chat** that proxies to a **self-hosted LLM** (OpenAI-compatible endpoint like vLLM/Ollama)
- **/api/analyze** endpoint that sends PDFs or images to OpenAI for summarization
- Dark/Light theme, PWA manifest
- Minimal UI with Patient/Clinician toggle
- API wrappers for PubMed, openFDA, ClinicalTrials, DailyMed, RxNorm, ICD-11
- Nearby care search powered by OpenStreetMap's Overpass API

## Run
1. Copy `.env.example` → `.env.local` and fill:
   - `NEXT_PUBLIC_SUPABASE_URL` `NEXT_PUBLIC_SUPABASE_ANON_KEY` `SUPABASE_SERVICE_ROLE_KEY`
   - `NCBI_API_KEY` `OPENFDA_API_KEY`
   - `ICD11_CLIENT_ID` `ICD11_CLIENT_SECRET`
   - `LLM_BASE_URL` (e.g., `https://llm.your-vpc/v1` for vLLM/Ollama OpenAI-compatible API)
   - `LLM_MODEL_ID` (e.g., `llama3-8b-instruct`)
   - `HF_API_TOKEN`
   - optional: `HF_CHEST_MODEL` `HF_BONE_MODEL`
   - for OpenAI summaries: `OPENAI_API_KEY`, `OPENAI_TEXT_MODEL`, `OPENAI_VISION_MODEL`
   - optional meds micro-summary: `MEDS_SHORT_SUMMARY` (`true|false`), `MEDS_SHORT_SUMMARY_MAX_CHARS`
   - nearby care: `FEATURE_NEARBY`, `OVERPASS_API_URL`, `OVERPASS_USER_AGENT`, `NEARBY_DEFAULT_RADIUS_KM`, `NEARBY_MAX_RESULTS`, `NEARBY_CACHE_TTL_SEC`, `NEXT_PUBLIC_NEARBY_DEFAULT_RADIUS_KM`
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

### Diagnostics
- /api/health -> { ok: true }
- /api/diag   -> env presence flags
- /api/auth/signin -> Google login
