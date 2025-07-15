// Using built-in fetch (available in Node 18+)

async function testLogin() {
  const baseUrl = 'http://localhost:5000';
  
  console.log('Testing login flow...');
  
  try {
    // Test login
    console.log('1. Attempting login...');
    const loginResponse = await fetch(`${baseUrl}/api/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: 'admin',
        password: 'adminpassword'
      }),
      credentials: 'include'
    });
    
    console.log('Login status:', loginResponse.status);
    
    if (loginResponse.ok) {
      const user = await loginResponse.json();
      console.log('✅ Login successful:', user);
      
      // Test user endpoint
      console.log('\n2. Testing /api/user endpoint...');
      const userResponse = await fetch(`${baseUrl}/api/user`, {
        credentials: 'include'
      });
      
      console.log('User endpoint status:', userResponse.status);
      
      if (userResponse.ok) {
        const userData = await userResponse.json();
        console.log('✅ User data:', userData);
      } else {
        const error = await userResponse.text();
        console.log('❌ User endpoint error:', error);
      }
      
      // Test bookings endpoint
      console.log('\n3. Testing /api/bookings endpoint...');
      const bookingsResponse = await fetch(`${baseUrl}/api/bookings`, {
        credentials: 'include'
      });
      
      console.log('Bookings endpoint status:', bookingsResponse.status);
      
      if (bookingsResponse.ok) {
        const bookings = await bookingsResponse.json();
        console.log('✅ Bookings data:', bookings);
      } else {
        const error = await bookingsResponse.text();
        console.log('❌ Bookings endpoint error:', error);
      }
      
    } else {
      const error = await loginResponse.text();
      console.log('❌ Login failed:', error);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testLogin(); 