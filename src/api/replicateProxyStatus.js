
import fetch from 'node-fetch';

export default async function handler(req, res) {
  // Enable CORS for all origins
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only accept GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { predictionId } = req.query;

    if (!predictionId) {
      return res.status(400).json({ error: 'Prediction ID is required' });
    }
    
    // Check for test request and respond with a test response
    if (predictionId === 'test') {
      return res.status(200).json({ 
        status: 'success',
        message: 'Proxy connection test successful' 
      });
    }

    if (!process.env.REPLICATE_API_TOKEN) {
      console.error('REPLICATE_API_TOKEN environment variable not set');
      return res.status(500).json({ 
        error: 'Server configuration error', 
        message: 'API token not configured' 
      });
    }
    
    console.log(`Fetching prediction status for ID: ${predictionId}`);
    
    const replicateRes = await fetch(`https://api.replicate.com/v1/predictions/${predictionId}`, {
      method: "GET",
      headers: {
        "Authorization": `Token ${process.env.REPLICATE_API_TOKEN}`,
        "Content-Type": "application/json"
      }
    });

    // Get the response as text first for debugging
    const responseText = await replicateRes.text();
    console.log(`Replicate API status response (${replicateRes.status}):`, responseText);
    
    // Parse the JSON if possible
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      console.error('Failed to parse JSON response:', parseError);
      return res.status(500).json({
        error: 'Invalid JSON response from Replicate API',
        responseStatus: replicateRes.status,
        responseText: responseText.substring(0, 300) // Truncate long responses
      });
    }

    // Return the parsed response with the actual status code
    return res.status(replicateRes.status).json(data);
  } catch (error) {
    console.error('Error fetching prediction status:', error);
    return res.status(500).json({ 
      error: 'Error connecting to Replicate API',
      message: error.message 
    });
  }
}
