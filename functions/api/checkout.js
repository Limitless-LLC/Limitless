// functions/api/checkout.js  — Cloudflare Pages Function

const ALLOW_LIST = new Set([
  'https://limitless-llc.us',   // your live cart
  'https://sallamih.github.io', // if you test from GitHub Pages
]);

function cors(origin) { return ALLOW_LIST.has(origin) ? { 'Access-Control-Allow-Origin': origin } : {}; }

export function onRequestOptions({ request }) {
  const origin = request.headers.get('Origin');
  return new Response('', {
    headers: { ...cors(origin), 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'content-type' }
  });
}

export async function onRequestPost({ request }) {
  const origin = request.headers.get('Origin') || '';
  let data;
  try { data = await request.json(); } catch { return json({ ok:false, error:'Invalid JSON' }, 400, origin); }

  const { subject, items = [], totals = {}, customer = {}, payment = {}, textBody } = data;
  if (!subject || !Array.isArray(items) || items.length === 0) {
    return json({ ok:false, error:'Bad request' }, 400, origin);
  }

  const { html, text } = renderEmail({ subject, items, totals, customer, payment, textBody });

  const payload = {
    personalizations: [{ to: [{ email: 'info@limitless-llc.us', name: 'Limitless Orders' }] }],
    from: { email: 'info@limitless-llc.us', name: 'Limitless Cart' }, // set SPF/DKIM for this domain
    reply_to: { email: customer?.email || 'info@limitless-llc.us' },
    subject,
    content: [{ type: 'text/plain', value: text }, { type: 'text/html', value: html }]
  };

  console.log('FROM:', payload.from?.email, 'TO:', payload.personalizations?.[0]?.to?.map(t => t.email).join(','));

  const r = await fetch('https://api.mailchannels.net/tx/v1/send', {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload)
  });
const mcText = await r.text().catch(() => '');
console.log('MailChannels status:', r.status, mcText);

if (!r.ok) {
  return new Response(JSON.stringify({ ok: false, error: `MailChannels ${r.status}: ${mcText}` }), {
    status: 502,
    headers: { 'content-type': 'application/json', ...cors(origin) }
  });
} 
  

  return json({ ok:true, orderId: randomId() }, 200, origin);
}

function json(obj, status, origin) {
  return new Response(JSON.stringify(obj), { status, headers: { 'content-type':'application/json', ...cors(origin) } });
}
function randomId(){ return Math.random().toString(36).slice(2,10).toUpperCase(); }
function escapeHtml(s=''){ return String(s).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;', "'":'&#39;'}[m])); }
function money(n){ return (Number(n)||0).toLocaleString('en-US',{style:'currency',currency:'USD'}); }

function renderEmail({ subject, items, totals={}, customer={}, payment={}, textBody }) {
  const rows = items.map(it => {
    const qty  = Math.max(1, parseInt(it.quantity||1));
    const unit = Number(it.price)||0;
    const core = Number(it.core_charge||0);
    const line = qty*unit;
    return `<tr>
      <td style="padding:8px;border:1px solid #ddd;">${escapeHtml(it.part_number||'')}</td>
      <td style="padding:8px;border:1px solid #ddd;">${escapeHtml(it.description||'')}</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:right;">${qty}</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:right;">${money(unit)}</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:right;">${core?money(core):'-'}</td>
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
        <div><strong>Subtotal:</strong> ${money(totals?.subtotal||0)}</div>
        ${totals?.coreTotal ? `<div><strong>Core Total:</strong> ${money(totals.coreTotal)}</div>` : ''}
      </div>
      <h3 style="margin:16px 0 6px;">Customer Information</h3>
      <div>Name: ${escapeHtml(customer.name||'')}</div>
      <div>Email: ${escapeHtml(customer.email||'')}</div>
      <div>Phone: ${escapeHtml(customer.phone||'')}</div>
      ${customer.company ? `<div>Company: ${escapeHtml(customer.company)}</div>`:''}
      <div>Address: ${escapeHtml(customer.address1||'')}</div>
      ${customer.address2 ? `<div>Address 2: ${escapeHtml(customer.address2)}</div>`:''}
      <div>${escapeHtml(customer.city||'')}, ${escapeHtml(customer.state||'')} ${escapeHtml(customer.zip||'')}</div>
      <div>${escapeHtml(customer.country||'')}</div>
      ${customer.instructions ? `<div>Instructions: ${escapeHtml(customer.instructions)}</div>`:''}
      <div style="margin-top:12px;"><strong>Payment:</strong> ${escapeHtml(payment.method||'')} ${payment?.note?`<em>(${escapeHtml(payment.note)})</em>`:''}</div>
    </div>`;

  const text = (textBody && String(textBody)) || [
    subject, '',
    'Part | Description | Qty | Unit | Core | Line',
    ...items.map(it=>{
      const qty  = Math.max(1, parseInt(it.quantity||1));
      const unit = Number(it.price)||0;
      const core = Number(it.core_charge||0);
      const line = qty*unit;
      return [it.part_number||'', (it.description||'').replace(/\s+/g,' '), qty, money(unit), core?money(core):'-', money(line)].join(' | ');
    }),
    '',
    `Subtotal: ${money(totals?.subtotal||0)}`,
    totals?.coreTotal ? `Core Total: ${money(totals.coreTotal)}` : '',
    '',
    `Customer: ${customer.name||''}  ${customer.email||''}  ${customer.phone||''}`,
    `Address: ${customer.address1||''} ${customer.address2||''} ${customer.city||''} ${customer.state||''} ${customer.zip||''} ${customer.country||''}`,
    payment?.method ? `Payment: ${payment.method} ${payment?.note?`(${payment.note})`:''}` : ''
  ].filter(Boolean).join('\n');

  return { html, text };
}
