export const handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const clientId = process.env.PAYPAL_CLIENT_ID;
  const secret = process.env.PAYPAL_SECRET;

  if (!clientId || !secret) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Missing PayPal credentials' }) };
  }

  try {
    const { orderID } = JSON.parse(event.body);
    if (!orderID) return { statusCode: 400, body: JSON.stringify({ error: 'Missing orderID' }) };

    // Get access token
    const tokenRes = await fetch('https://api.paypal.com/v1/oauth2/token', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${clientId}:${secret}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    });
    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;

    if (!accessToken) {
      return { statusCode: 500, body: JSON.stringify({ error: 'Failed to get PayPal access token' }) };
    }

    // Capture the order
    const captureRes = await fetch(`https://api.paypal.com/v2/checkout/orders/${orderID}/capture`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });
    const captureData = await captureRes.json();

    if (captureData.status === 'COMPLETED') {
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ success: true, orderID }),
      };
    }

    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Payment not completed', status: captureData.status }),
    };
  } catch (error) {
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
};
