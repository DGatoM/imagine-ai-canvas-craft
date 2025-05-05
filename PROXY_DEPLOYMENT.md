
# Proxy Deployment Instructions

This document explains how to deploy the Replicate API proxy on different hosting platforms.

## Environment Variables

Regardless of your hosting platform, you'll need to set the following environment variable:

```
REPLICATE_API_TOKEN=your_token_here
```

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

## Render Deployment

1. Set up a new Web Service pointing to your repository.

2. Configure the environment variable in the Render dashboard under Environment.

3. Use Express.js to create server endpoints that match the API routes.

## Testing the Proxy

After deployment, you can test if the proxy is working by:

1. Opening your browser's developer tools
2. Going to the Network tab
3. Making a request from your application 
4. Checking that the response headers include `Access-Control-Allow-Origin: *`

If there are any issues, check the logs in your hosting platform's dashboard.
