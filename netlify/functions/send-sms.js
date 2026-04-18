// Netlify serverless function to send SMS via Semaphore API

const https = require('https')
const querystring = require('querystring')

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' }
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) }
  }

  try {
    const { phone, message } = JSON.parse(event.body)

    if (!phone || !message) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing required fields: phone, message' })
      }
    }

    const result = await sendSemaphoreSMS(phone, message)

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, message: 'SMS sent successfully', data: result })
    }
  } catch (error) {
    console.error('SMS send error:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to send SMS', details: error.message })
    }
  }
}

function sendSemaphoreSMS(phone, message) {
  return new Promise((resolve, reject) => {
    const postData = querystring.stringify({
      apikey: process.env.SEMAPHORE_API_KEY,
      number: phone,
      message: message,
      sendername: process.env.SEMAPHORE_SENDER_NAME
    })

    const options = {
      hostname: 'api.semaphore.co',
      path: '/api/v4/messages',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postData)
      }
    }

    const req = https.request(options, (res) => {
      let data = ''
      res.on('data', (chunk) => { data += chunk })
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data)
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(parsed)
          } else {
            reject(new Error(parsed.message || JSON.stringify(parsed) || 'Semaphore API error'))
          }
        } catch {
          reject(new Error(`Semaphore API returned status ${res.statusCode}: ${data}`))
        }
      })
    })

    req.on('error', (err) => reject(err))
    req.write(postData)
    req.end()
  })
}
