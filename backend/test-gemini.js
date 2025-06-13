const axios = require('axios');
require('dotenv').config();

async function testOpenRouterAPI() {
  try {
    const response = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model: 'openai/gpt-3.5-turbo',
        messages: [
          { role: 'system', content: 'You are a helpful assistant.' },
          { role: 'user', content: 'Say hello in 3 different languages.' }
        ],
        temperature: 0.7,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'http://localhost:5000', // optional, your site or project URL
          'X-Title': 'ResumeParserTest'            // optional, a label for your project
        }
      }
    );

    console.log('✅ OpenRouter Response:\n', response.data.choices[0].message.content);
  } catch (error) {
    console.error('❌ OpenRouter Error:', error?.response?.data || error.message);
  }
}

testOpenRouterAPI();
