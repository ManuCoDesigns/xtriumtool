# Groq API Setup Guide

This project uses **Groq** for LLM processing — fast, free API with a generous free tier!

## Quick Start

### 1. Sign Up for Groq
Go to https://console.groq.com and create a free account.

### 2. Create an API Key
- In the Groq console, navigate to **API Keys**
- Click **Create API Key**
- Copy the key and save it safely

### 3. Set Environment Variable
```bash
# macOS/Linux
export GROQ_API_KEY=your_key_here

# Windows (PowerShell)
$env:GROQ_API_KEY="your_key_here"

# Windows (Command Prompt)
set GROQ_API_KEY=your_key_here
```

### 4. Run the Application
```bash
# Backend (in one terminal)
cd backend
python -m venv .venv
source .venv/bin/activate  # or `source .venv/Scripts/activate` on Windows
pip install -r requirements.txt
uvicorn main:app --reload --port 8000

# Frontend (in another terminal, after setting GROQ_API_KEY)
npm install
npm run dev
```

## Deployment to Hosted Sites

When deploying to a hosted platform (Vercel, Netlify, Railway, AWS, etc.):

1. **Set GROQ_API_KEY in your platform's environment variables**
   - Vercel: Project Settings → Environment Variables
   - Netlify: Build & deploy → Environment
   - Railway: Variables section
   - AWS/Heroku: Respective environment variable settings

2. **Deploy normally** — the platform will pass the key to your app

3. **All users can now use the site** without installing anything locally

## Troubleshooting

**Error: "Missing GROQ_API_KEY environment variable"**
- Check that you've set the environment variable: `echo $GROQ_API_KEY`
- For Windows, try opening a new terminal after setting the variable

**"Authentication failed" or API errors**
- Double-check your API key is correct
- Make sure the key hasn't been revoked in the Groq console

**Rate limiting**
- Free tier has rate limits (100 requests/minute)
- If hitting limits, upgrade to a paid plan or add request throttling

## Changing the Model
Edit [ai-gateway.server.ts](src/lib/ai-gateway.server.ts) and [llm-review.functions.ts](src/lib/llm-review.functions.ts) to change from `"mixtral-8x7b-32768"` to another Groq model.

## Available Groq Models
- `mixtral-8x7b-32768` - Fast, high quality (recommended)
- `llama2-70b-4096` - Larger, more powerful
- `gemma-7b-it` - Lightweight, efficient

Full list: https://console.groq.com/docs/models
