// functions/api/checkout.js
export async function onRequest(context) {
    const { request } = context;
    
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
    };

    if (request.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        const orderData = await request.json();
        
        console.log('📦 Order received:', orderData);
        
        // SIMULATE SUCCESS - NO REAL API NEEDED
        return new Response(JSON.stringify({
            success: true,
            message: "Order received successfully!",
            orderId: "ORD-" + Date.now(),
            orderData: orderData
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
