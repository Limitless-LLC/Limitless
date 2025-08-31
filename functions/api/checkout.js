// functions/api/checkout.js - TEST VERSION (no API key needed)
export async function onRequest(context) {
    const { request } = context;
    
    // Handle CORS
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
    };

    if (request.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders });
    }

    if (request.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'Method not allowed' }), { 
            status: 405,
            headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
    }

    try {
        const orderData = await request.json();
        
        console.log('📦 Order received (TEST MODE):', JSON.stringify(orderData, null, 2));
        
        // SIMULATE SUCCESS - No API call needed!
        // This creates a fake successful response for testing
        return new Response(JSON.stringify({
            success: true,
            message: "Order received successfully (Test Mode)",
            orderId: "TEST-" + Date.now(),
            orderData: orderData, // Echo back the received data
            timestamp: new Date().toISOString()
        }), {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                ...corsHeaders
            }
        });
        
    } catch (error) {
        return new Response(JSON.stringify({ 
            success: false,
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
