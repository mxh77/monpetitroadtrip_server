import OpenAI from 'openai';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

export const genererSyntheseAvis = async (avisArray) => {
    const avisText = avisArray.map((avis, i) =>
        `Avis ${i + 1} (${avis.rating}/5) : ${avis.comment}`
    ).join('\n');

    const prompt = `Voici une liste d'avis d'utilisateurs sur un lieu touristique. Fais une synthèse concise, claire, et neutre de ces avis en français :
  
  ${avisText}
  
  Synthèse :`;

    try {
        const response = await openai.chat.completions.create({
            model: 'gpt-3.5-turbo',
            messages: [
              { role: 'user', content: prompt }
            ],
            temperature: 0.7,
          });

        return response.choices[0].message.content;

    } catch (error) {
        console.error('Error in OpenAI API call:', error.response?.data || error.message);
        throw new Error('Failed to generate summary from OpenAI');
    }
};