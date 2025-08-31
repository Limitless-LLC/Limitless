export async function onRequest(context) {
    const { request } = context;
    
    // Handle CORS - allow all origins
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS, GET',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    };

    // Handle preflight OPTIONS requests
    if (request.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders });
    }

    // Only allow POST requests
    if (request.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'Method not allowed. Use POST.' }), { 
            status: 405,
            headers: {
                'Content-Type': 'application/json',
                ...corsHeaders
            }
        });
    }

    try {
        // Get the order data from your frontend
        const orderData = await request.json();
        
        console.log('📦 Received order data:', JSON.stringify(orderData, null, 2));

        // Forward to YOUR API (no authentication needed!)
        const apiResponse = await fetch('https://lf-cart-api.pages.dev/api/checkout_502', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
                // No Authorization header needed since your API is open
            },
            body: JSON.stringify(orderData)
        });
        
        // Get the response from your API
        const responseText = await apiResponse.text();
        console.log('✅ API response status:', apiResponse.status);
        console.log('✅ API response:', responseText);

        // Try to parse as JSON, if fails return text as-is
        let responseData;
        try {
            responseData = JSON.parse(responseText);
        } catch {
            responseData = { response: responseText };
        }

        // Return the API response to your frontend
        return new Response(JSON.stringify(responseData), {
            status: apiResponse.status,
            headers: {
                'Content-Type': 'application/json',
                ...corsHeaders
            }
        });
        
    } catch (error) {
        console.error('❌ Proxy error:', error);
        
        return new Response(JSON.stringify({ 
            success: false,
            error: 'Internal server error',
            message: error.message,
            note: 'Check if lf-cart-api.pages.dev is accepting POST requests'
        }), {
            status: 500,
            headers: {
                'Content-Type': 'application/json',
                ...corsHeaders
            }
        });
    }
}
