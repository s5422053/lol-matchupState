const axios = require('axios');

exports.handler = async function(event, context) {
  const { RIOT_API_KEY } = process.env;
  const apiUrl = event.queryStringParameters.url;

  if (!apiUrl) {
    return {
      statusCode: 400,
      body: JSON.stringify({ message: 'URL is required' })
    };
  }

  try {
    const response = await axios.get(apiUrl, {
      headers: {
        'X-Riot-Token': RIOT_API_KEY
      }
    });

    return {
      statusCode: 200,
      body: JSON.stringify(response.data)
    };
  } catch (error) {
    return {
      statusCode: error.response?.status || 500,
      body: JSON.stringify({ message: error.message })
    };
  }
};