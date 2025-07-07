import OpenAI from 'openai';

// Instance OpenAI partagée par tous les modules
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

export default openai;
