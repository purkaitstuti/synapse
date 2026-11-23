# SYNAPSE - Local Deployment Guide

## 1. Prerequisites

Install the following:

- Python 3.12 (64-bit)
- Node.js 24
- Git
- Visual Studio Code (optional)
- Recommended RAM: 16 GB
- Recommended free storage: 10 GB

An NVIDIA GPU is not mandatory.

## 2. Clone the repository

Open PowerShell and run:

```powershell
git clone https://github.com/purkaitstuti/synapse.git
cd synapse
```

## 3. Extract the AI artifact package

Obtain SYNAPSE_AI_ARTIFACTS.zip from your teammate.

Extract the ZIP directly into the cloned synapse folder.

For example, if the ZIP is in Downloads:

```powershell
Expand-Archive `
    -Path "$HOME\Downloads\SYNAPSE_AI_ARTIFACTS.zip" `
    -DestinationPath "."
```

Verify the following folders exist:

- backend/models
- backend/indexes
- backend/data/processed

Do not retrain the model or rebuild the indexes.

## 4. Create the Python environment

From the project root:

```powershell
py -3.12 -m venv backend/.venv-ai
```

## 5. Install backend dependencies

```powershell
.\backend\.venv-ai\Scripts\python.exe -m pip install --upgrade pip

.\backend\.venv-ai\Scripts\python.exe -m pip install `
    torch==2.14.1+cpu `
    --index-url https://download.pytorch.org/whl/cpu

.\backend\.venv-ai\Scripts\python.exe -m pip install `
    -r backend/requirements-ai.txt

.\backend\.venv-ai\Scripts\python.exe -m pip check
```

## 6. Configure Gemini

```powershell
Copy-Item backend/.env.example backend/.env
notepad backend/.env
```

Enter your own Gemini API key in GEMINI_API_KEY.

Never commit or share your private .env file.

Without an API key, supported retrieval and offline
research outline features can still be used.

Gemini generation requires access to the configured model.

## 7. Install frontend dependencies

```powershell
npm --prefix frontend ci
```

## 8. Start SYNAPSE

From the project root:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File ".\start_synapse.ps1"
```

## 9. Open the application

Frontend:
http://127.0.0.1:5173/app

Backend health:
http://127.0.0.1:8000/api/health

Backend API documentation:
http://127.0.0.1:8000/docs

## 10. Available features

- AI-powered innovation generation
- Integrated mechanism retrieval
- Experimental 65-mechanism retrieval
- Experimental 400K knowledge search
- Knowledge graph connections
- Research library using OpenAlex
- Offline research outline generation
- Saved discoveries
- Idea fusion

## 11. Important notes

- No model retraining is required.
- Keep the AI artifacts in their original folders.
- Gemini availability depends on API access and service status.
- Generated innovations require scientific validation.
- Synthetic records are not verified scientific evidence.
- Do not upload private API keys or AI artifacts to GitHub.

## 12. Restarting the application

Whenever you want to open SYNAPSE again, navigate to
the project root and run:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File ".\start_synapse.ps1"
```

