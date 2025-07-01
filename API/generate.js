// api/generate.js
// This version uses the 'module.exports' syntax for maximum compatibility.

module.exports = async (request, response) => {
  // 1. We only accept POST requests
  if (request.method !== 'POST') {
    return response.status(405).json({ message: 'Method Not Allowed' });
  }

  // 2. Get the prompt from the request body
  const { prompt } = request.body;
  if (!prompt) {
    return response.status(400).json({ message: 'Prompt is required' });
  }

  // 3. Get the API Key from environment variables
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return response.status(500).json({ message: 'API key not configured on server' });
  }

  const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`;

  // 4. Construct the payload for the Gemini API
  const payload = {
    contents: [{
      parts: [{
        text: prompt
      }]
    }],
    generationConfig: {
      temperature: 0.7,
      topK: 1,
      topP: 1,
      maxOutputTokens: 2048,
    },
    safetySettings: [
        { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
        { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
        { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
        { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
    ]
  };

  try {
    // 5. Make the request to the Gemini API
    const geminiResponse = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!geminiResponse.ok) {
        const errorData = await geminiResponse.json();
        console.error('Gemini API Error:', errorData);
        return response.status(geminiResponse.status).json({ message: 'Error from Gemini API', details: errorData });
    }

    const geminiData = await geminiResponse.json();
    
    // 6. Send the response back to your front-end
    const responseText = geminiData.candidates[0].content.parts[0].text;
    return response.status(200).json({ text: responseText });

  } catch (error) {
    console.error('Internal Server Error:', error);
    return response.status(500).json({ message: 'Internal Server Error', details: error.message });
  }
};

