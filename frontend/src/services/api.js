import axios from 'axios';

// Uses VITE_API_URL from environment (set in Vercel dashboard), falls back to Railway URL
const RAILWAY_URL = import.meta.env.VITE_API_URL || "https://languagetool-production313.up.railway.app";

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

export default api;
