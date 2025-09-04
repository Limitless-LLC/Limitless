// functions/api/checkout.js
export async function onRequest(context) {
  const { request } = context;

  // --- CORS ---
  const corsHeaders = {
    // For stricter security, set this to your site origin: 'https://limitless-llc.us'
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }

  try {
    const orderData = await request.json();
    const now = Date.now();
    const orderId = `ORD-${now}`;

    const customer = orderData.customer || {};
    const items = Array.isArray(orderData.items) ? orderData.items : [];
    const totals = orderData.totals || { subtotal: 0, coreTotal: 0 };

    const toAddress =
      (orderData.email && orderData.email.to) || 'info@limitless-llc.us';
    const ccList =
      (orderData.email && Array.isArray(orderData.email.cc) && orderData.email.cc.filter(Boolean)) || [];

    const subject =
      orderData.subject ||
      `New Order from ${customer.name || 'Customer'} — ${orderId}`;

    // Build bodies if frontend didn't send them
    const textBody =
      orderData.textBody ||
      buildTextEmail({ orderId, customer, items, totals, payment: orderData.payment });

    const htmlBody =
      orderData.htmlBody ||
      `<pre style="font-family:Segoe UI,Tahoma,Arial,sans-serif">${escapeHtml(textBody)}</pre>`;

    // --- Send email via MailChannels ---
    const mailPayload = {
      personalizations: [
        {
          to: [{ email: toAddress }],
          ...(ccList.length ? { cc: ccList.map(e => ({ email: e })) } : {})
        }
      ],
      from: { email: 'no-reply@limitless-llc.us', name: 'Limitless Cart' },
      ...(customer.email
        ? { reply_to: { email: customer.email, name: customer.name || 'Customer' } }
        : {}),
      subject,
      content: [
        { type: 'text/plain', value: textBody },
        { type: 'text/html', value: htmlBody }
      ]
    };

    const mailRes = await fetch('https://api.mailchannels.net/tx/v1/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(mailPayload)
    });

    if (!mailRes.ok) {
      const errText = await mailRes.text();
      console.error('MailChannels error:', errText);
      return new Response(JSON.stringify({
        success: false,
        error: 'Email send failed',
        details: errText
      }), { status: 502, headers: { 'Content-Type': 'application/json', ...corsHeaders } });
    }

    // Success
    return new Response(JSON.stringify({
      success: true,
      message: 'Email sent',
      orderId
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });

  } catch (error) {
    console.error('Checkout error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Internal server error',
      message: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }
}

// ---------- helpers ----------
function fmt2(n) { return Number(n || 0).toFixed(2); }

function buildTextEmail({ orderId, customer, items, totals, payment }) {
  const lines = [];
  lines.push(`NEW ORDER RECEIVED!`);
  lines.push(`Order ID: ${orderId}`);
  lines.push('');
  lines.push(`Customer: ${customer.name || ''}`);
  lines.push(`Email: ${customer.email || ''}`);
  if (customer.phone) lines.push(`Phone: ${customer.phone}`);
  lines.push(`Company: ${customer.company || 'None'}`);
  lines.push('');
  lines.push(`ORDER TOTALS:`);
  lines.push(`Subtotal: $${fmt2(totals.subtotal)}`);
  lines.push(`Core Charge: $${fmt2(totals.coreTotal)}`);
  lines.push(`Total: $${fmt2((totals.subtotal || 0) + (totals.coreTotal || 0))}`);
  lines.push('');
  lines.push(`ITEMS (${items.length}):`);
  items.forEach(item => {
    lines.push(`- ${item.quantity}x ${item.part_number || item.name} — $${fmt2(item.price)} each`);
  });
  lines.push('');
  lines.push(`SHIPPING ADDRESS:`);
  if (customer.address1) lines.push(customer.address1);
  if (customer.address2) lines.push(customer.address2);
  if (customer.city || customer.state || customer.zip) {
    lines.push(`${customer.city || ''}, ${customer.state || ''} ${customer.zip || ''}`.trim());
  }
  if (customer.country) lines.push(customer.country);
  lines.push('');
  lines.push(`PAYMENT METHOD: ${payment?.method || 'N/A'}`);
  if (payment?.note) lines.push(`PAYMENT NOTE: ${payment.note}`);
  lines.push('');
  lines.push(`SPECIAL INSTRUCTIONS:`);
  lines.push(`${customer.instructions || 'None'}`);
  return lines.join('\n');
}

function escapeHtml(s) {
  return (s ?? '').toString().replace(/[&<>"']/g, c => (
    ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c])
  ));
}
