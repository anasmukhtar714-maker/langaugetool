import axios from 'axios';

// Uses VITE_API_URL from environment (set in Vercel dashboard), falls back to Railway URL
const RAILWAY_URL = import.meta.env.VITE_API_URL || "https://web-production-c92ac.up.railway.app";

const api = axios.create({
    baseURL: RAILWAY_URL,
    headers: {
        'Content-Type': 'application/json'
    }
});

export const translateText = async (text, source, target) => {
    try {
        const response = await api.post('/translate', { text, source, target });
        return response.data;
    } catch (error) {
        console.error('Translation error:', error);
        return { translation: "(Error)" };
    }
};

export const translateAudio = async (audioBase64, mimeType, source, target) => {
    try {
        const response = await api.post('/audio-translate', { 
            audio_base64: audioBase64, 
            mime_type: mimeType,
            source, 
            target 
        });
        return response.data;
    } catch (error) {
        console.error('Audio Translation error:', error);
        return { translation: "(Error processing audio)", original: "(Error)" };
    }
};

export const analyzeHistory = async (history) => {
    try {
        const response = await api.post('/analyze-history', { history });
        return response.data;
    } catch (error) {
        console.error('Analysis error:', error);
        return { summary: "Error loading analysis." };
    }
};

export const speakText = async (text, lang) => {
    try {
        const response = await api.post('/speak', { text, lang });
        return response.data;
    } catch (error) {
        console.error('TTS error:', error);
        return { audio: "" };
    }
};

export const analyzeVision = async (image_base64, target_lang) => {
    try {
        const response = await api.post('/vision', { 
            image_base64, 
            target_lang: target_lang === 'ar' ? 'Arabic' : 'Chinese' 
        });
        return response.data;
    } catch (error) {
        console.error('Vision error:', error);
        return { analysis: "Error processing document." };
    }
};

export default api;
