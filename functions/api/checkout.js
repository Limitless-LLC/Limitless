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
        
        // Prepare email content
        const emailSubject = `New Order from ${orderData.customer.name} - Order #ORD-${Date.now()}`;
        
        let emailBody = `NEW ORDER RECEIVED!\n\n`;
        emailBody += `Order ID: ORD-${Date.now()}\n`;
        emailBody += `Customer: ${orderData.customer.name}\n`;
        emailBody += `Email: ${orderData.customer.email}\n`;
        emailBody += `Phone: ${orderData.customer.phone}\n`;
        emailBody += `Company: ${orderData.customer.company || 'None'}\n\n`;
        
        emailBody += `ORDER TOTALS:\n`;
        emailBody += `Subtotal: $${orderData.totals.subtotal}\n`;
        emailBody += `Core Charge: $${orderData.totals.coreTotal}\n`;
        emailBody += `Total: $${orderData.totals.subtotal + orderData.totals.coreTotal}\n\n`;
        
        emailBody += `ITEMS (${orderData.items.length}):\n`;
        orderData.items.forEach(item => {
            emailBody += `- ${item.quantity}x ${item.part_number || item.name} - $${item.price} each\n`;
        });
        emailBody += `\n`;
        
        emailBody += `SHIPPING ADDRESS:\n`;
        emailBody += `${orderData.customer.address1}\n`;
        if (orderData.customer.address2) emailBody += `${orderData.customer.address2}\n`;
        emailBody += `${orderData.customer.city}, ${orderData.customer.state} ${orderData.customer.zip}\n`;
        emailBody += `${orderData.customer.country}\n\n`;
        
        emailBody += `PAYMENT METHOD: ${orderData.payment.method}\n`;
        emailBody += `PAYMENT NOTE: ${orderData.payment.note || 'None'}\n\n`;
        
        emailBody += `SPECIAL INSTRUCTIONS:\n`;
        emailBody += `${orderData.customer.instructions || 'None'}\n\n`;
        

        // Return the email data to frontend - frontend will open email client
        return new Response(JSON.stringify({
            success: true,
            message: "Ready to send email",
            emailData: {
                to: "info@limitless-llc.us",
                subject: emailSubject,
                body: emailBody
            }
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
