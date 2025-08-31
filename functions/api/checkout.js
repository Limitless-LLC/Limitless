// CloudFlare Pages Function - Backend Proxy
export async function onRequest(context) {
    const { request } = context;
    
    // Handle CORS
    const origin = request.headers.get('Origin') || '';
    const ALLOW_LIST = new Set([
        'https://limitless-llc.us',
        'https://sallamin.github.io',
        'http://localhost:3000',
        'http://localhost:5000',
        'https://your-domain.pages.dev' // Replace with your actual CloudFlare Pages domain
    ]);
    
    const corsHeaders = ALLOW_LIST.has(origin) 
        ? { 
            'Access-Control-Allow-Origin': origin,
            'Access-Control-Allow-Methods': 'POST, OPTIONS, GET',
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
        return new Response(JSON.stringify({ error: 'Method not allowed' }), { 
            status: 405,
            headers: {
                'Content-Type': 'application/json',
                ...corsHeaders
            }
        });
    }

    try {
        // Get the request data from the client
        const requestData = await request.json();
        
        // Validate required fields
        if (!requestData.totals || !requestData.customer || !requestData.payment) {
            return new Response(JSON.stringify({ 
                error: 'Missing required fields: totals, customer, or payment' 
            }), {
                status: 400,
                headers: {
                    'Content-Type': 'application/json',
                    ...corsHeaders
                }
            });
        }

        // Validate customer data
        const { customer } = requestData;
        if (!customer.email || !customer.name || !customer.phone || !customer.address1 || 
            !customer.city || !customer.state || !customer.zip || !customer.country) {
            return new Response(JSON.stringify({ 
                error: 'Missing required customer information' 
            }), {
                status: 400,
                headers: {
                    'Content-Type': 'application/json',
                    ...corsHeaders
                }
            });
        }

        // Prepare data for the actual API
        const apiData = {
            totals: requestData.totals,
            customer: {
                email: customer.email,
                name: customer.name,
                phone: customer.phone,
                address1: customer.address1,
                address2: customer.address2 || '',
                city: customer.city,
                state: customer.state,
                zip: customer.zip,
                country: customer.country
            },
            payment: {
                method: requestData.payment.method,
                note: requestData.payment.note || ''
            }
        };

        // Forward the request to the actual API with authentication
        const apiResponse = await fetch('https://lf-cart-api.pages.dev/api/checkout_502', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer YOUR_ACTUAL_API_KEY' // ← REPLACE THIS WITH YOUR REAL API KEY!
            },
            body: JSON.stringify(apiData)
        });
        
        // Check if the API response is successful
        if (!apiResponse.ok) {
            const errorText = await apiResponse.text();
            console.error('API Error:', apiResponse.status, errorText);
            
            return new Response(JSON.stringify({ 
                error: `API error: ${apiResponse.status}`,
                details: errorText.substring(0, 200) // Limit response size
            }), {
                status: apiResponse.status,
                headers: {
                    'Content-Type': 'application/json',
                    ...corsHeaders
                }
            });
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
        console.error('Proxy error:', error);
        
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
