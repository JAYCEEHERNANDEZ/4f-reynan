import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import nodemailer from 'nodemailer'
import https from 'https'
import querystring from 'querystring'
import fs from 'fs'
import { config } from 'dotenv'

config() // load .env

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'email-api',
      configureServer(server) {
        server.middlewares.use('/api/send-email', async (req, res) => {
          // CORS
          res.setHeader('Access-Control-Allow-Origin', '*')
          res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
          res.setHeader('Content-Type', 'application/json')

          if (req.method === 'OPTIONS') { res.end(''); return }
          if (req.method !== 'POST') {
            res.statusCode = 405
            res.end(JSON.stringify({ error: 'Method not allowed' }))
            return
          }

          let body = ''
          req.on('data', chunk => { body += chunk })
          req.on('end', async () => {
            try {
              const { to, subject, body: emailBody } = JSON.parse(body)
              if (!to || !subject || !emailBody) {
                res.statusCode = 400
                res.end(JSON.stringify({ error: 'Missing required fields' }))
                return
              }

              const transporter = nodemailer.createTransport({
                service: 'gmail',
                auth: {
                  user: process.env.GMAIL_EMAIL,
                  pass: process.env.GMAIL_APP_PASSWORD,
                },
              })

              const lines = emailBody.split('\n').map(l => l ? `<p style="margin:0 0 8px">${l}</p>` : '<br/>').join('')
              const html = `
                <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 520px; margin: 0 auto; padding: 32px 24px; background: #f9fafb; border-radius: 12px;">
                  <div style="text-align: center; margin-bottom: 24px;">
                    <h2 style="margin: 0; color: #111827; font-size: 20px;">🧺 4J Laundry</h2>
                  </div>
                  <div style="background: #fff; border-radius: 10px; padding: 24px; border: 1px solid #e5e7eb;">
                    <h3 style="margin: 0 0 16px; color: #111827; font-size: 16px;">${subject}</h3>
                    <div style="color: #374151; font-size: 14px; line-height: 1.6;">${lines}</div>
                  </div>
                  <div style="text-align: center; margin-top: 20px; color: #9ca3af; font-size: 12px;">
                    <p>This is an automated notification from 4J Laundry Management System</p>
                  </div>
                </div>`

              await transporter.sendMail({
                from: `"4J Laundry" <${process.env.GMAIL_EMAIL}>`,
                to,
                subject,
                text: emailBody,
                html,
              })

              res.statusCode = 200
              res.end(JSON.stringify({ success: true, message: 'Email sent successfully' }))
            } catch (err) {
              console.error('Email send error:', err.message)
              res.statusCode = 500
              res.end(JSON.stringify({ error: 'Failed to send email', details: err.message }))
            }
          })
        })

        // SMS API via Semaphore
        server.middlewares.use('/api/send-sms', async (req, res) => {
          res.setHeader('Access-Control-Allow-Origin', '*')
          res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
          res.setHeader('Content-Type', 'application/json')

          if (req.method === 'OPTIONS') { res.end(''); return }
          if (req.method !== 'POST') {
            res.statusCode = 405
            res.end(JSON.stringify({ error: 'Method not allowed' }))
            return
          }

          let body = ''
          req.on('data', chunk => { body += chunk })
          req.on('end', async () => {
            try {
              const { phone, message } = JSON.parse(body)
              if (!phone || !message) {
                res.statusCode = 400
                res.end(JSON.stringify({ error: 'Missing required fields: phone, message' }))
                return
              }

              const postData = querystring.stringify({
                apikey: process.env.SEMAPHORE_API_KEY,
                number: phone,
                message: message,
                sendername: process.env.SEMAPHORE_SENDER_NAME
              })

              const result = await new Promise((resolve, reject) => {
                const options = {
                  hostname: 'api.semaphore.co',
                  path: '/api/v4/messages',
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Content-Length': Buffer.byteLength(postData)
                  }
                }
                const apiReq = https.request(options, (apiRes) => {
                  let data = ''
                  apiRes.on('data', chunk => { data += chunk })
                  apiRes.on('end', () => {
                    try {
                      const parsed = JSON.parse(data)
                      if (apiRes.statusCode >= 200 && apiRes.statusCode < 300) resolve(parsed)
                      else reject(new Error(parsed.message || JSON.stringify(parsed)))
                    } catch { reject(new Error(`Semaphore API returned: ${data}`)) }
                  })
                })
                apiReq.on('error', reject)
                apiReq.write(postData)
                apiReq.end()
              })

              res.statusCode = 200
              res.end(JSON.stringify({ success: true, message: 'SMS sent successfully', data: result }))
            } catch (err) {
              console.error('SMS send error:', err.message)
              res.statusCode = 500
              res.end(JSON.stringify({ error: 'Failed to send SMS', details: err.message }))
            }
          })
        })
      }
    }
  ],
})
