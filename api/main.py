import os
import base64
import urllib.request
import urllib.parse
import json
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
from dotenv import load_dotenv
import google.generativeai as genai

load_dotenv()

# --- AI SETUP ---
api_key = os.getenv("GOOGLE_API_KEY")
model = None
if api_key:
    try:
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel('gemini-1.5-flash')
    except:
        model = None

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class TranslateRequest(BaseModel):
    text: str
    source: str
    target: str

class AnalysisRequest(BaseModel):
    history: list

# --- LOGIC ---
def google_translate_fallback(text, source, target):
    try:
        s = 'zh-CN' if source.startswith('zh') else source
        t = 'zh-CN' if target.startswith('zh') else target
        encoded_text = urllib.parse.quote(text)
        url = f"https://translate.googleapis.com/translate_a/single?client=gtx&sl={s}&tl={t}&dt=t&q={encoded_text}"
        request_obj = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(request_obj) as response:
            data = json.loads(response.read().decode())
            return "".join([sentence[0] for sentence in data[0] if sentence[0]])
    except: return text

@app.post("/api/translate")
async def translate(req: TranslateRequest):
    if model:
        try:
            prompt = f"Translate from {req.source} to {req.target}: {req.text}"
            response = model.generate_content(prompt)
            if response and response.text:
                return {"translation": response.text.strip()}
        except: pass
    return {"translation": google_translate_fallback(req.text, req.source, req.target)}

# --- VERCEL STATIC SERVING ---
# Get the absolute path to the static directory
current_dir = os.path.dirname(os.path.abspath(__file__))
static_path = os.path.join(current_dir, "static")

@app.get("/api/health")
def health():
    return {"status": "ok", "static_path": static_path, "exists": os.path.exists(static_path)}

# Serve static files if they exist
if os.path.exists(static_path):
    app.mount("/assets", StaticFiles(directory=os.path.join(static_path, "assets")), name="assets")

    @app.get("/{rest_of_path:path}")
    async def serve_frontend(rest_of_path: str):
        if rest_of_path.startswith("api/"):
            return None
        
        file_path = os.path.join(static_path, rest_of_path)
        if os.path.isfile(file_path):
            return FileResponse(file_path)
        
        # Fallback to index.html for SPA routing
        return FileResponse(os.path.join(static_path, "index.html"))
else:
    @app.get("/")
    def no_files():
        return {"error": "Serverless function running, but UI assets not detected."}
