import axios from 'axios';

const isProd = import.meta.env.PROD;
const API_BASE_URL = isProd 
    ? window.location.origin + "/api" 
    : "http://localhost:8000/api";

const api = axios.create({
    baseURL: API_BASE_URL,
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
