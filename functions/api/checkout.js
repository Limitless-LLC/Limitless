// functions/api/checkout.js — Cloudflare Pages Function
fetch('https://lf-cart-apl.pages.dev/api/checkout_502', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer YOUR_ACTUAL_API_KEY' // ← ADD THIS
    },
    body: JSON.stringify({
        totals: {
            subtotal: 59.98,
            coreTotal: 10.00
        },
        customer: {
            email: "test@example.com",
            name: "John Doe",
            // ... rest of your customer data
        },
        payment: {
            method: "Credit Card",
            note: "3.5% processing fee"
        }
    })
})
.then(response => response.json())
.then(data => console.log('Response:', data))
.catch(error => console.error('Error:', error));
const ALLOW_LIST = new Set([
  'https://limitless-llc.us',   // your live cart
  'https://sallamih.github.io', // if you test from GitHub Pages
  'http://localhost:3000',      // for local development
  'http://localhost:5000',      // alternative local port
]);

function cors(origin) { 
  return ALLOW_LIST.has(origin) ? { 'Access-Control-Allow-Origin': origin } : {}; 
}

export function onRequestOptions({ request }) {
  const origin = request.headers.get('Origin');
  return new Response('', {
    headers: { 
      ...cors(origin), 
      'Access-Control-Allow-Methods': 'POST, OPTIONS', 
      'Access-Control-Allow-Headers': 'content-type' 
    }
  });
}

export async function onRequestPost({ request }) {
  const origin = request.headers.get('Origin') || '';
  let data;
  
  try { 
    data = await request.json(); 
  } catch { 
    return json({ ok: false, error: 'Invalid JSON' }, 400, origin); 
  }

  const { subject, items = [], totals = {}, customer = {}, payment = {}, textBody } = data;
  
  if (!subject || !Array.isArray(items) || items.length === 0) {
    return json({ ok: false, error: 'Bad request: Missing subject or items' }, 400, origin);
  }

  const { html, text } = renderEmail({ subject, items, totals, customer, payment, textBody });

  const payload = {
    personalizations: [
      { to: [{ email: 'info@limitless-llc.us', name: 'Limitless Orders' }] }
    ],
    from: { email: 'info@limitless-llc.us', name: 'Limitless Cart' },
    reply_to: { email: customer?.email || 'info@limitless-llc.us' },
    subject: subject,
    content: [
      { type: 'text/plain', value: text },
      { type: 'text/html', value: html }
    ]
  };

  console.log('Sending email from:', payload.from.email, 'to:', payload.personalizations[0].to[0].email);

  try {
    const r = await fetch('https://api.mailchannels.net/tx/v1/send', {
      method: 'POST', 
      headers: { 'content-type': 'application/json' }, 
      body: JSON.stringify(payload)
    });
    
    const mcText = await r.text().catch(() => '');
    console.log('MailChannels status:', r.status, mcText);

    if (!r.ok) {
      return json({ 
        ok: false, 
        error: `MailChannels error ${r.status}: ${mcText}` 
      }, 502, origin);
    }
    
    return json({ 
      ok: true, 
      orderId: randomId(),
      message: 'Order submitted successfully' 
    }, 200, origin);
    
  } catch (error) {
    return json({ 
      ok: false, 
      error: `Server error: ${error.message}` 
    }, 500, origin);
  }
}

// Helper functions
function json(obj, status, origin) {
  return new Response(JSON.stringify(obj), { 
    status, 
    headers: { 
      'content-type': 'application/json', 
      ...cors(origin) 
    } 
  });
}

function randomId() { 
  return Math.random().toString(36).slice(2, 10).toUpperCase(); 
}

function escapeHtml(s = '') { 
  return String(s).replace(/[&<>"']/g, m => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', 
    '"': '&quot;', "'": '&#39;'
  }[m])); 
}

function money(n) { 
  return (Number(n) || 0).toLocaleString('en-US', {
    style: 'currency', 
    currency: 'USD'
  }); 
}

function renderEmail({ subject, items, totals = {}, customer = {}, payment = {}, textBody }) {
  // HTML version
  const rows = items.map(it => {
    const qty = Math.max(1, parseInt(it.quantity || 1));
    const unit = Number(it.price) || 0;
    const core = Number(it.core_charge || 0);
    const line = qty * unit;
    
    return `<tr>
      <td style="padding:8px;border:1px solid #ddd;">${escapeHtml(it.part_number || '')}</td>
      <td style="padding:8px;border:1px solid #ddd;">${escapeHtml(it.description || '')}</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:right;">${qty}</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:right;">${money(unit)}</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:right;">${core ? money(core) : '-'}</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:right;">${money(line)}</td>
    </tr>`;
  }).join('');

  const html = `
    <div style="font-family:Segoe UI,Arial,sans-serif;font-size:14px;color:#222;">
      <h2 style="margin:0 0 12px 0;">${escapeHtml(subject)}</h2>
      <table style="border-collapse:collapse;width:100%;max-width:900px;">
        <thead>
          <tr style="background:#f3f4f6;">
            <th style="padding:8px;border:1px solid #ddd;text-align:left;">Part</th>
            <th style="padding:8px;border:1px solid #ddd;text-align:left;">Description</th>
            <th style="padding:8px;border:1px solid #ddd;text-align:right;">Qty</th>
            <th style="padding:8px;border:1px solid #ddd;text-align:right;">Unit</th>
            <th style="padding:8px;border:1px solid #ddd;text-align:right;">Core</th>
            <th style="padding:8px;border:1px solid #ddd;text-align:right;">Line</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      <div style="margin-top:12px;">
        <div><strong>Subtotal:</strong> ${money(totals.subtotal || 0)}</div>
        ${totals.coreTotal ? `<div><strong>Core Total:</strong> ${money(totals.coreTotal)}</div>` : ''}
      </div>
      <h3 style="margin:16px 0 6px;">Customer Information</h3>
      <div>Name: ${escapeHtml(customer.name || '')}</div>
      <div>Email: ${escapeHtml(customer.email || '')}</div>
      <div>Phone: ${escapeHtml(customer.phone || '')}</div>
      ${customer.company ? `<div>Company: ${escapeHtml(customer.company)}</div>` : ''}
      <div>Address: ${escapeHtml(customer.address1 || '')}</div>
      ${customer.address2 ? `<div>Address 2: ${escapeHtml(customer.address2)}</div>` : ''}
      <div>${escapeHtml(customer.city || '')}, ${escapeHtml(customer.state || '')} ${escapeHtml(customer.zip || '')}</div>
      <div>${escapeHtml(customer.country || '')}</div>
      ${customer.instructions ? `<div>Instructions: ${escapeHtml(customer.instructions)}</div>` : ''}
      <div style="margin-top:12px;"><strong>Payment:</strong> ${escapeHtml(payment.method || '')} ${payment.note ? `<em>(${escapeHtml(payment.note)})</em>` : ''}</div>
    </div>`;

  // Text version
  const text = textBody || [
    subject,
    '',
    'Part | Description | Qty | Unit | Core | Line',
    ...items.map(it => {
      const qty = Math.max(1, parseInt(it.quantity || 1));
      const unit = Number(it.price) || 0;
      const core = Number(it.core_charge || 0);
      const line = qty * unit;
      return [
        it.part_number || '',
        (it.description || '').replace(/\s+/g, ' '),
        qty,
        money(unit),
        core ? money(core) : '-',
        money(line)
      ].join(' | ');
    }),
    '',
    `Subtotal: ${money(totals.subtotal || 0)}`,
    totals.coreTotal ? `Core Total: ${money(totals.coreTotal)}` : '',
    '',
    `Customer: ${customer.name || ''} | ${customer.email || ''} | ${customer.phone || ''}`,
    customer.company ? `Company: ${customer.company}` : '',
    `Address: ${customer.address1 || ''} ${customer.address2 || ''}`,
    `${customer.city || ''}, ${customer.state || ''} ${customer.zip || ''} ${customer.country || ''}`,
    customer.instructions ? `Instructions: ${customer.instructions}` : '',
    payment.method ? `Payment: ${payment.method} ${payment.note ? `(${payment.note})` : ''}` : ''
  ].filter(Boolean).join('\n');

  return { html, text };
}
