# Groq AI InBody Analysis Setup

This project can use Groq to generate an AI analysis after OCR extracts metrics from an InBody report.

## Environment

Add these values to your root `.env` or `artifacts/api-server/.env`:

```env
GROQ_API_KEY="gsk_your_key_here"
GROQ_MODEL="llama-3.1-8b-instant"

SUPABASE_URL="https://your-project-ref.supabase.co"
SUPABASE_ANON_KEY="your-anon-key"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
```

Get the Groq key from `https://console.groq.com/keys`.

## Storage Bucket

The upload endpoint stores report files in a Supabase Storage bucket named `inbody-reports`.

To create it automatically:

```bash
pnpm --filter @workspace/api-server run setup-storage
```

Or create it manually in Supabase Dashboard:

1. Open your Supabase project.
2. Go to Storage.
3. Create a public bucket named `inbody-reports`.
4. Restart the API server.

The setup script requires `SUPABASE_SERVICE_ROLE_KEY`. Do not expose that key in the mobile app.

## Run

```bash
pnpm install
pnpm --filter @workspace/api-server run dev
```

Upload a report through the mobile app or call:

```bash
curl -X POST http://localhost:5000/api/inbody/upload \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "report=@/path/to/inbody-report.jpg"
```

The response still uses the `geminiAnalysis` field for compatibility with the existing mobile UI and database column, but the backend provider is Groq.

## Troubleshooting

- `Bucket not found`: run `pnpm --filter @workspace/api-server run setup-storage`.
- `GROQ_API_KEY not set`: add the key and restart the API server.
- `No valid JSON found in Groq response`: retry with a clearer report image or a different Groq model.
- `File upload to storage failed`: confirm the service role key belongs to the same Supabase project as `SUPABASE_URL`.
