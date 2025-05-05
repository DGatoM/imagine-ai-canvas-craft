
import fetch from 'node-fetch';

export default async function handler(req, res) {
  // Enable CORS for all origins
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only accept POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { model, input, webhook, ...rest } = req.body;
    
    if (!process.env.REPLICATE_API_TOKEN) {
      console.error('REPLICATE_API_TOKEN environment variable not set');
      return res.status(500).json({ 
        error: 'Server configuration error', 
        message: 'API token not configured' 
      });
    }
    
    console.log(`Proxying request to Replicate API for model: ${model}`);
    
    const replicateRes = await fetch("https://api.replicate.com/v1/predictions", {
      method: "POST",
      headers: {
        "Authorization": `Token ${process.env.REPLICATE_API_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        version: model,
        input,
        webhook,
        ...rest
      })
    });

    // Check if the response is OK
    if (!replicateRes.ok) {
      const errorText = await replicateRes.text();
      console.error(`Replicate API error (${replicateRes.status}):`, errorText);
      return res.status(replicateRes.status).json({ 
        error: 'Replicate API error',
        statusCode: replicateRes.status,
        message: errorText
      });
    }

    // Parse the JSON response
    const data = await replicateRes.json();
    console.log('Replicate API response:', data);
    return res.status(200).json(data);
  } catch (error) {
    console.error('Error proxying to Replicate API:', error);
    return res.status(500).json({ 
      error: 'Error proxying to Replicate API',
      message: error.message 
    });
  }
}
