// Cloudflare Pages Function — Send email via Gmail SMTP over TCP sockets
import { connect } from 'cloudflare:sockets'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
}

export async function onRequestPost(context) {
  try {
    const { to, subject, body } = await context.request.json()

    if (!to || !subject || !body) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), { status: 400, headers: CORS })
    }

    const gmailEmail = context.env.GMAIL_EMAIL
    const gmailAppPassword = context.env.GMAIL_APP_PASSWORD

    if (!gmailEmail || !gmailAppPassword) {
      return new Response(JSON.stringify({ error: 'Gmail credentials not configured' }), { status: 500, headers: CORS })
    }

    const lines = body.split('\n').map(l => l ? `<p style="margin:0 0 8px">${l}</p>` : '<br/>').join('')
    const html = `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;background:#f9fafb;border-radius:12px"><div style="text-align:center;margin-bottom:24px"><h2 style="margin:0;color:#111827;font-size:20px">🧺 4J Laundry</h2></div><div style="background:#fff;border-radius:10px;padding:24px;border:1px solid #e5e7eb"><h3 style="margin:0 0 16px;color:#111827;font-size:16px">${subject}</h3><div style="color:#374151;font-size:14px;line-height:1.6">${lines}</div></div><div style="text-align:center;margin-top:20px;color:#9ca3af;font-size:12px"><p>Automated notification from 4J Laundry</p></div></div>`

    await sendGmailSMTP(gmailEmail, gmailAppPassword, to, subject, body, html)

    return new Response(JSON.stringify({ success: true }), { status: 200, headers: CORS })
  } catch (error) {
    console.error('Email error:', error)
    return new Response(JSON.stringify({ error: 'Failed to send email', details: error.message }), { status: 500, headers: CORS })
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    headers: { ...CORS, 'Access-Control-Allow-Methods': 'POST, OPTIONS' }
  })
}

async function sendGmailSMTP(from, password, to, subject, textBody, htmlBody) {
  const socket = connect({ hostname: 'smtp.gmail.com', port: 465 }, { secureTransport: 'on' })

  const writer = socket.writable.getWriter()
  const reader = socket.readable.getReader()
  const decoder = new TextDecoder()
  const encoder = new TextEncoder()

  // Read all available data (SMTP may send multi-line responses)
  async function readResponse() {
    let result = ''
    const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('SMTP read timeout')), 10000))
    try {
      while (true) {
        const { value, done } = await Promise.race([reader.read(), timeout])
        if (done) break
        result += decoder.decode(value, { stream: true })
        // SMTP: lines starting with "NNN " (space after code) are final
        const lines = result.split('\r\n')
        const last = lines.filter(l => l.length > 0).pop()
        if (last && /^\d{3} /.test(last)) break
        // Also break if we have a complete line
        if (result.endsWith('\r\n') && result.trim().length > 0) break
      }
    } catch (e) {
      if (result.length > 0) return result.trim()
      throw e
    }
    return result.trim()
  }

  async function send(cmd) {
    await writer.write(encoder.encode(cmd + '\r\n'))
    return await readResponse()
  }

  // Read greeting
  await readResponse()

  // EHLO — may return multi-line
  await send('EHLO localhost')

  // AUTH LOGIN
  await send('AUTH LOGIN')
  await send(btoa(from))
  const authRes = await send(btoa(password))

  if (!authRes.includes('235')) {
    throw new Error('SMTP auth failed: ' + authRes)
  }

  // MAIL FROM
  await send(`MAIL FROM:<${from}>`)

  // RCPT TO
  await send(`RCPT TO:<${to}>`)

  // DATA
  await send('DATA')

  // Build MIME message
  const boundary = 'b_' + Date.now()
  const msg = [
    `From: "4J Laundry" <${from}>`,
    `To: ${to}`,
    `Subject: ${subject}`,
    `MIME-Version: 1.0`,
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    '',
    `--${boundary}`,
    'Content-Type: text/plain; charset=UTF-8',
    '',
    textBody,
    '',
    `--${boundary}`,
    'Content-Type: text/html; charset=UTF-8',
    '',
    htmlBody,
    '',
    `--${boundary}--`,
    '.',
  ].join('\r\n')

  await send(msg)

  // QUIT
  try { await send('QUIT') } catch (_) {}
  try { writer.close() } catch (_) {}

  return true
}
