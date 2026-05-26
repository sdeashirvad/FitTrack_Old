# Gemini AI InBody Analysis Setup Guide

This guide explains how to set up Gemini AI for real InBody report analysis in FitTrack.

## Prerequisites

- FitTrack backend running with Express server
- PostgreSQL database (Supabase)
- Google Cloud account (for Gemini API access)
- Optionally, Google Cloud Vision API for OCR (or OCR.space as fallback)

## Step 1: Get Gemini API Key

1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Click **"Create API Key"** → Select or create a Google Cloud project
3. Copy your API key
4. Add to your `.env` file:
   ```env
   GEMINI_API_KEY="your-api-key-here"
   ```

## Step 2: Set Up OCR (Choose One)

### Option A: Google Cloud Vision API (Recommended)

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable **Vision API**:
   - Search for "Vision API" in the search bar
   - Click **Enable**
4. Create a Service Account:
   - Go to **IAM & Admin** → **Service Accounts**
   - Click **Create Service Account**
   - Fill in details, click **Create**
5. Create and download API key:
   - Click the newly created service account
   - Go to **Keys** tab → **Add Key** → **JSON**
   - Download and save the JSON file
   - Extract `private_key` and `private_key_id` if using key authentication
6. Add to `.env`:
   ```env
   GOOGLE_VISION_API_KEY="your-vision-api-key"
   ```

### Option B: OCR.Space Fallback

1. Go to [OCR.Space](https://ocr.space/ocrapi)
2. Register for a free API account
3. Get your API key from the dashboard
4. Add to `.env`:
   ```env
   OCR_SPACE_API_KEY="your-ocr-space-key"
   ```

## Step 3: Apply Database Migration

Run the migration to add `gemini_analysis` column:

```bash
# From project root
pnpm db:push
```

This will apply the migration and add the `gemini_analysis` column to the `inbody_reports` table.

## Step 4: Test the Integration

### Via Mobile App:
1. Start the mobile app in development mode
2. Log in with your account
3. Navigate to **Workouts** → **InBody Analysis**
4. Upload a sample InBody report image/PDF
5. Watch the analysis happen in real-time
6. View the AI-generated body composition analysis and personalized plans

### Via cURL (Backend Testing):
```bash
# Upload an image and trigger Gemini analysis
curl -X POST http://localhost:5000/api/inbody/upload \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "report=@/path/to/inbody-report.jpg"

# Expected response includes:
# {
#   "success": true,
#   "reportId": "uuid",
#   "extractedMetrics": { weight, bmi, bodyFat, ... },
#   "geminiAnalysis": {
#     "overallSummary": "...",
#     "fitnessLevel": "...",
#     "bodyFatAnalysis": { ... },
#     ...
#   }
# }
```

## Step 5: Logs and Debugging

Check backend logs to see Gemini integration in action:

```
📤 Starting InBody upload and analysis...
✅ Upload successful. Extracted metrics: {...}
🤖 Gemini analysis received in upload response
⏳ Progress: uploading - 50%
⏳ Progress: ocr - 70%
⏳ Progress: processing - 90%
⏳ Progress: done - 100%
```

If you see `❌ Gemini analysis failed:`, check:
1. `GEMINI_API_KEY` is set in `.env`
2. Your API quota hasn't been exceeded
3. OCR extraction found enough metrics (at least 3)

## Troubleshooting

### "GEMINI_API_KEY not set"
- Ensure `GEMINI_API_KEY` is in your `.env` file
- Restart the backend after adding the key
- Verify no typos in the environment variable name

### "No valid JSON found in Gemini response"
- Check Gemini API is returning valid responses
- Try a different InBody report image
- Ensure the image is clear and contains visible metrics

### "OCR failed"
- Ensure the uploaded image/PDF is clear and readable
- Try Google Cloud Vision API for better OCR accuracy
- Check `GOOGLE_VISION_API_KEY` or `OCR_SPACE_API_KEY` is set

### "Analysis unavailable" in app
- Check backend logs for the specific error
- Verify Gemini API key has sufficient quota
- Ensure database migration was applied successfully

## How It Works

1. **User uploads** an InBody report (image/PDF) via mobile app
2. **Backend receives** the file and creates a `processing` record
3. **OCR extraction** reads metrics from the image/PDF using Google Vision API or OCR.Space
4. **Gemini AI analysis** receives extracted metrics and generates:
   - Overall fitness assessment
   - Body composition analysis (fat, muscle, water)
   - Metabolism insights
   - Personalized workout plan (PPL, Upper/Lower, etc.)
   - Custom diet plan with macro recommendations
   - Health risks and recommendations
5. **Results persisted** to database and returned to mobile app
6. **Mobile app displays** interactive results with charts, ratings, and plan options

## Features

✅ AI-powered body composition analysis  
✅ Automatic InBody report parsing (OCR)  
✅ Personalized workout recommendations  
✅ Custom diet plans with macros  
✅ Health risk assessment  
✅ Progress tracking over time  
✅ Support for images and PDFs  

## API Documentation

### POST `/api/inbody/upload`

Upload an InBody report and get AI analysis.

**Request:**
```bash
curl -X POST http://localhost:5000/api/inbody/upload \
  -H "Authorization: Bearer JWT_TOKEN" \
  -F "report=@report.jpg"
```

**Response:**
```json
{
  "success": true,
  "reportId": "uuid-string",
  "extractedMetrics": {
    "weight": "78",
    "bmi": "24.5",
    "bodyFat": "22",
    "skeletalMuscleMass": "33",
    ...
  },
  "extractedText": "Raw OCR text from image",
  "geminiAnalysis": {
    "overallSummary": "...",
    "fitnessLevel": "Intermediate",
    "bodyFatAnalysis": {...},
    "workoutPlan": {...},
    "dietPlan": {...}
  }
}
```

### GET `/api/inbody/reports`

List all uploaded reports for the current user.

### POST `/api/inbody/analyze/:reportId`

Re-run Gemini analysis on an existing report.
