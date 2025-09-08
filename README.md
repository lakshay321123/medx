# MedX — One-shot Launch Starter

This project includes:
- **Banner aggregator** (WHO, ClinicalTrials, openFDA, PubMed)
  - **Chat** powered by OpenAI models
- **/api/analyze** endpoint that sends PDFs or images to OpenAI for summarization
- Dark/Light theme, PWA manifest
- Minimal UI with Patient/Clinician toggle
- API wrappers for PubMed, openFDA, ClinicalTrials, DailyMed, RxNorm, ICD-11

## Run
 1. Copy `.env.example` → `.env.local` and fill:
     - `NCBI_API_KEY` `OPENFDA_API_KEY`
     - `ICD11_CLIENT_ID` `ICD11_CLIENT_SECRET`
     - `HF_API_TOKEN`
     - optional: `HF_CHEST_MODEL` `HF_BONE_MODEL`
     - `OPENAI_API_KEY` (and optional `MODEL_SMART`, `MODEL_BALANCED`, `MODEL_FAST`)
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
