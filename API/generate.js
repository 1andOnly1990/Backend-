// api/generate.js - Netlify Function Syntax

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
    // For Netlify, you will set this in your Netlify site settings.
    const apiKey = process.env.GEMINI_API_KEY; 
    if (!apiKey) {
        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'API key not configured on server' })
        };
    }

    // Use gemini-2.0-flash for text generation as per instructions
    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

    // 4. Construct the payload
    const payload = {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.9,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 1024,
      },
      safetySettings: [
        {
          category: "HARM_CATEGORY_HARASSMENT",
          threshold: "BLOCK_MEDIUM_AND_ABOVE"
        },
        {
          category: "HARM_CATEGORY_HATE_SPEECH",
          threshold: "BLOCK_MEDIUM_AND_ABOVE"
        },
        {
          category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
          threshold: "BLOCK_MEDIUM_AND_ABOVE"
        },
        {
          category: "HARM_CATEGORY_DANGEROUS_CONTENT",
          threshold: "BLOCK_MEDIUM_AND_ABOVE"
        },
      ],
    };

    // 5. Make the request to the Gemini API
    const geminiResponse = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!geminiResponse.ok) {
        const errorData = await geminiResponse.json();
        console.error('Gemini API Error:', errorData);
        return {
            statusCode: geminiResponse.status,
            body: JSON.stringify({ message: 'Error from Gemini API', details: errorData })
        };
    }

    const geminiData = await geminiResponse.json();
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
