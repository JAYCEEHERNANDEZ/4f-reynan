// Netlify serverless function to send email via Gmail SMTP
// Uses nodemailer — install via: npm install nodemailer

const nodemailer = require('nodemailer')

exports.handler = async (event) => {
  // Only allow POST
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) }
  }

  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' }
  }

  try {
    const { to, subject, body } = JSON.parse(event.body)

    if (!to || !subject || !body) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing required fields: to, subject, body' })
      }
    }

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_EMAIL,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    })

    await transporter.sendMail({
      from: `"4J Laundry" <${process.env.GMAIL_EMAIL}>`,
      to,
      subject,
      text: body,
      html: generateHtml(subject, body),
    })

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, message: 'Email sent successfully' })
    }
  } catch (error) {
    console.error('Email send error:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to send email', details: error.message })
    }
  }
}

function generateHtml(subject, textBody) {
  const lines = textBody.split('\n').map(l => l ? `<p style="margin:0 0 8px">${l}</p>` : '<br/>').join('')
  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 520px; margin: 0 auto; padding: 32px 24px; background: #f9fafb; border-radius: 12px;">
      <div style="text-align: center; margin-bottom: 24px;">
        <h2 style="margin: 0; color: #111827; font-size: 20px;">🧺 4J Laundry</h2>
      </div>
      <div style="background: #fff; border-radius: 10px; padding: 24px; border: 1px solid #e5e7eb;">
        <h3 style="margin: 0 0 16px; color: #111827; font-size: 16px;">${subject}</h3>
        <div style="color: #374151; font-size: 14px; line-height: 1.6;">
          ${lines}
        </div>
      </div>
      <div style="text-align: center; margin-top: 20px; color: #9ca3af; font-size: 12px;">
        <p>This is an automated notification from 4J Laundry Management System</p>
      </div>
    </div>
  `
}
