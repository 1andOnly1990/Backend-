// api/generate.js - Netlify Function Syntax (Final Corrected Version)
// This version removes the unnecessary 'node-fetch' requirement.

exports.handler = async (event, context) => {
  // 1. We only accept POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ message: 'Method Not Allowed' })
    };
  }

  try {
    // 2. Get the prompt from the request body
    const { prompt } = JSON.parse(event.body);
    if (!prompt) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: 'Prompt is required' })
      };
    }

    // 3. Get the API Key from environment variables
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'API key not configured on server' })
        };
    }

    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`;

    // 4. Construct the FULL payload for the Gemini API
    const payload = {
      contents: [{ parts: [{ text: prompt }] }],
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

    // 5. Make the request to the Gemini API
    const geminiResponse = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const geminiData = await geminiResponse.json();

    if (!geminiResponse.ok) {
        console.error('Gemini API Error:', geminiData);
        return {
            statusCode: geminiResponse.status,
            body: JSON.stringify({ message: 'Error from Gemini API', details: geminiData })
        };
    }
    
    // Check if candidates exist and have the expected structure
    if (!geminiData.candidates || !geminiData.candidates[0] || !geminiData.candidates[0].content || !geminiData.candidates[0].content.parts) {
        console.error('Unexpected response structure from Gemini API:', geminiData);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'Unexpected response structure from Gemini API' })
        };
    }
    
    const responseText = geminiData.candidates[0].content.parts[0].text;

    // 6. Send the response back to your front-end
    return {
      statusCode: 200,
      body: JSON.stringify({ text: responseText })
    };

  } catch (error) {
    console.error('Internal Server Error:', error);
    return {
        statusCode: 500,
        body: JSON.stringify({ message: 'Internal Server Error', details: error.message })
    };
  }
};

