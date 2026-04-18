// Run this once to create a default admin user:
//   node seed-user.js

const SUPABASE_URL = 'https://teuveucuqxesgnmzfcvh.supabase.co'
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRldXZldWN1cXhlc2dubXpmY3ZoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDI2MTgyMSwiZXhwIjoyMDg5ODM3ODIxfQ.p4Hm32DKkE0LhjJV-GR6Wdfq2HnrC9zxGB-t56jOZRY'

async function createDefaultUser() {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      'apikey': SERVICE_ROLE_KEY
    },
    body: JSON.stringify({
      email: 'admin@4jlaundry.com',
      password: 'admin1234',
      email_confirm: true
    })
  })

  const data = await res.json()

  if (res.ok) {
    console.log('Default admin user created successfully!')
    console.log('Email:    admin@4jlaundry.com')
    console.log('Password: admin1234')
    console.log('')
    console.log('You can now sign in to the app.')
  } else {
    if (data?.msg?.includes('already') || data?.message?.includes('already') || JSON.stringify(data).includes('already')) {
      console.log('User already exists! You can sign in with:')
      console.log('Email:    admin@4jlaundry.com')
      console.log('Password: admin1234')
    } else {
      console.error('Error creating user:', data)
    }
  }
}

createDefaultUser()
