import os
import base64
import urllib.request
import urllib.parse
import json
import re
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
import google.generativeai as genai

load_dotenv()

# --- CONFIGURATION & AI SETUP ---
api_key = os.getenv("GOOGLE_API_KEY")
model = None
if api_key:
    try:
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel('gemini-1.5-flash')
    except:
        model = None

app = FastAPI(title="Global AI Translation API")

# Professional CORS Policy
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

# --- HELPER LOGIC ---
def google_translate_fallback(text, source, target):
    """Reliable fallback using Google Translate Public API"""
    try:
        s = 'zh-CN' if source.startswith('zh') else source
        t = 'zh-CN' if target.startswith('zh') else target
        encoded_text = urllib.parse.quote(text)
        url = f"https://translate.googleapis.com/translate_a/single?client=gtx&sl={s}&tl={t}&dt=t&q={encoded_text}"
        request_obj = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(request_obj) as response:
            data = json.loads(response.read().decode())
            return "".join([sentence[0] for sentence in data[0] if sentence[0]])
    except Exception as e:
        print(f"Fallback Error: {e}")
        return text

# --- ENDPOINTS ---
@app.get("/")
async def root():
    return {"status": "Global AI Translation API Online", "ai_model": "Gemini 1.5 Flash"}

@app.get("/health")
def health():
    return {"status": "ok", "gemini": model is not None}

@app.post("/translate")
async def translate(req: TranslateRequest):
    if not req.text:
        return {"translation": ""}

    if model:
        try:
            prompt = f"Translate accurately from {req.source} to {req.target}. Only output the translation, no extra text: {req.text}"
            response = model.generate_content(prompt)
            if response and response.text:
                return {"translation": response.text.strip()}
        except Exception as e:
            print(f"Gemini Error: {e}")

    # Fallback to Google Translate if Gemini fails or is not configured
    return {"translation": google_translate_fallback(req.text, req.source, req.target)}

@app.post("/analyze-history")
async def analyze_history(req: AnalysisRequest):
    if not model or not req.history:
        return {"summary": "Intelligence engine ready. Start chatting for live insights."}
    try:
        chat_log = "\n".join([f"{m.get('speaker')}: {m.get('original')} -> {m.get('translated')}" for m in req.history[-10:]])
        prompt = f"Analyze this professional discussion log and provide a concise summary (Max 2 sentences). Use the most appropriate language for the context (professional English, Urdu, or Arabic): \n\n{chat_log}"
        response = model.generate_content(prompt)
        return {"summary": response.text.strip()}
    except Exception as e:
        print(f"Analysis Error: {e}")
        return {"summary": "Business briefing temporarily unavailable."}

@app.post("/speak")
async def text_to_speech(request: dict):
    try:
        text = request.get("text", "")
        lang = request.get("lang", "en").split('-')[0]
        encoded_text = urllib.parse.quote(text)
        url = f"https://translate.google.com/translate_tts?ie=UTF-8&q={encoded_text}&tl={lang}&client=tw-ob"
        request_obj = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(request_obj) as response:
            return {"audio": base64.b64encode(response.read()).decode(), "format": "mp3"}
    except:
        return {"audio": ""}

@app.post("/audio-translate")
async def audio_translate(request: dict):
    audio_b64 = request.get("audio_base64", "")
    mime_type = request.get("mime_type", "audio/webm")
    source = request.get("source", "ur")
    target = request.get("target", "zh-CN")

    if not model or not audio_b64:
        return {"translation": "Error: AI engine offline.", "original": "Audio unavailable"}

    try:
        # Strip potential data URI prefix
        if "," in audio_b64:
            audio_b64 = audio_b64.split(",")[1]
            
        audio_data = base64.b64decode(audio_b64)
        
        prompt = f"""
        You are a highly accurate professional audio interpreter.
        The user is speaking in language code: {source}.
        1. Transcribe EXACTLY what they said in their original {source} language.
        2. Translate it perfectly into {target}.
        
        You MUST output ONLY a valid RAW JSON object with NO markdown blocks and NO formatting tags. 
        The JSON must have exactly two keys: "original" and "translated".
        Example: {{"original": "hello", "translated": "hola"}}
        """
        
        response = model.generate_content([
            prompt, 
            {"mime_type": mime_type, "data": audio_data}
        ])
        
        txt = response.text.strip()
        txt = response.text.strip()
        import re
        match = re.search(r'\{.*\}', txt, re.DOTALL)
        if match:
            parsed = json.loads(match.group(0))
        else:
            parsed = {"original": "Audio recognized", "translated": txt}

        return {
            "translation": parsed.get("translated", "(Translation missing)"),
            "original": parsed.get("original", "(Transcription missing)")
        }
    except Exception as e:
        print(f"Audio translation error: {e}")
        return {"translation": "(Audio Translation Failed)", "original": "(Could not process audio)"}

@app.post("/vision")
async def vision_analyze(request: dict):
    image_b64 = request.get("image_base64", "")
    target_lang = request.get("target_lang", "ar")
    if not model or not image_b64:
        return {"analysis": "Vision analysis unavailable."}
    try:
        image_data = base64.b64decode(image_b64)
        prompt = f"Analyze this image and describe its contents for a business context. Translate any text to {target_lang}. Be concise."
        response = model.generate_content([prompt, {"mime_type": "image/jpeg", "data": image_data}])
        return {"analysis": response.text.strip()}
    except Exception as e:
        print(f"Vision Error: {e}")
        return {"analysis": "Could not analyze image."}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
