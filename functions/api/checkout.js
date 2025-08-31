// CloudFlare Pages Function - Backend Proxy
export async function onRequest(context) {
    const { request } = context;
    
    // Handle CORS
    const origin = request.headers.get('Origin') || '';
    const ALLOW_LIST = new Set([
        'https://limitless-llc.us',
        'https://sallamin.github.io',
        'http://localhost:3000',
        'http://localhost:5000'
    ]);
    
    const corsHeaders = ALLOW_LIST.has(origin) 
        ? { 
            'Access-Control-Allow-Origin': origin,
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization'
          } 
        : {};

    // Handle preflight OPTIONS request
    if (request.method === 'OPTIONS') {
        return new Response(null, {
            headers: corsHeaders
        });
    }

    // Only allow POST requests
    if (request.method !== 'POST') {
        return new Response('Method not allowed', { 
            status: 405,
            headers: corsHeaders
        });
    }

    try {
        // Get the request data from the client
        const requestData = await request.json();
        
        // Forward the request to the actual API with authentication
        const apiResponse = await fetch('https://lf-cart-api.pages.dev/api/checkout_502', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer YOUR_ACTUAL_API_KEY' // ← REPLACE THIS!
            },
            body: JSON.stringify(requestData)
        });
        
        // Check if the API response is successful
        if (!apiResponse.ok) {
            throw new Error(`API responded with status: ${apiResponse.status}`);
        }
        
        const responseData = await apiResponse.json();
        
        // Return the API response to the client
        return new Response(JSON.stringify(responseData), {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                ...corsHeaders
            }
        });
        
    } catch (error) {
        // Handle errors
        return new Response(JSON.stringify({ 
            error: 'Internal server error',
            message: error.message 
        }), {
            status: 500,
            headers: {
                'Content-Type': 'application/json',
                ...corsHeaders
            }
        });
    }
}
