
# Proxy Deployment Instructions

This document explains how to deploy the Replicate API proxy on different hosting platforms.

## Environment Variables

Regardless of your hosting platform, you'll need to set the following environment variable:

```
REPLICATE_API_TOKEN=your_token_here
```

⚠️ **IMPORTANT**: The `REPLICATE_API_TOKEN` must be set on the server environment, not just in the browser. Make sure to add it in your hosting provider's environment variables section.

## Vercel Deployment

1. Create a `vercel.json` file in the project root:

```json
{
  "rewrites": [
    { "source": "/api/replicateProxy", "destination": "/src/api/replicateProxy.js" },
    { "source": "/api/replicateProxyStatus", "destination": "/src/api/replicateProxyStatus.js" }
  ]
}
```

2. Set the environment variable in the Vercel dashboard under Project Settings > Environment Variables.

3. Deploy using the Vercel CLI or by connecting your GitHub repository.

## Netlify Deployment

1. Create a `netlify.toml` file in the project root:

```toml
[build]
  command = "npm run build"
  publish = "dist"

[[redirects]]
  from = "/api/replicateProxy"
  to = "/.netlify/functions/replicateProxy"
  status = 200

[[redirects]]
  from = "/api/replicateProxyStatus"
  to = "/.netlify/functions/replicateProxyStatus"
  status = 200
```

2. Move the proxy files to the Netlify Functions format:
   - Create a `netlify/functions/replicateProxy.js` file
   - Create a `netlify/functions/replicateProxyStatus.js` file
   - Adapt the handler function to use Netlify Functions format

3. Set the environment variable in the Netlify dashboard under Site settings > Environment variables.

## Testing the Proxy

After deployment, you can test if the proxy is working correctly by:

1. Making a direct request to test the proxy connection:
   ```
   curl -X GET https://your-deployment-url.com/api/replicateProxyStatus?predictionId=test
   ```
   You should receive a response like: `{"status":"success","message":"Proxy connection test successful"}`

2. If the connection test works but image generation still fails:
   - Check that your Replicate API token is valid
   - Verify that your token has permission to use the specific model
   - Look at the server logs for more detailed error information

## Troubleshooting

1. **HTML Response Instead of JSON**: If you're seeing errors like "Unexpected token '<', '<!DOCTYPE '... is not valid JSON", you're likely getting an HTML error page instead of a JSON response. This usually means:
   - Your API routes aren't properly configured in your hosting platform
   - The server function is crashing before it can return a proper response
   - Check your hosting platform's function logs for more details

2. **CORS Issues**: Make sure the proxy is setting the Access-Control-Allow-Origin header.

3. **API Token**: Verify the REPLICATE_API_TOKEN environment variable is correctly set on your hosting platform.

4. **Response Parsing**: If you get "Unexpected end of JSON input" errors, the proxy might not be receiving a valid response from Replicate.

5. **Timeout Issues**: For long-running image generations, ensure your hosting platform allows for longer request timeouts.

6. **Serverless Function Limits**: Be aware of memory limits and execution time limits on serverless platforms.
