import { NextRequest, NextResponse } from 'next/server';

// Hardcoded API key - same as client-side for consistency
const GEMINI_API_KEY = 'AIzaSyDxvCyONeV1_BNVKiVBslJUAjO1Kon4Yq8';

export async function POST(request: NextRequest) {
  try {
    // Parse the request body
    const requestData = await request.json();
    
    // Log the incoming request (without exposing sensitive data in production)
    console.log('📥 Server API route received request');
    
    // Determine which model to use from the request or default to gemini-1.5-flash
    const model = requestData.model || 'gemini-1.5-flash';
    
    // Create the API URL
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;
    
    // Forward the request to the Gemini API
    console.log(`🔄 Forwarding request to Gemini API (${model})`);
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestData.contents ? { contents: requestData.contents } : requestData),
    });
    
    // Log the response status
    console.log(`📤 Gemini API responded with status ${response.status}`);
    
    // Parse the response
    const data = await response.json();
    
    // Return the response with CORS headers
    return NextResponse.json(data, {
      status: response.status,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  } catch (error) {
    console.error('❌ Server API route error:', error);
    return NextResponse.json(
      { error: 'Failed to process request' },
      { 
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      }
    );
  }
}

// Handle OPTIONS requests for CORS preflight
export async function OPTIONS(request: NextRequest) {
  return NextResponse.json({}, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
} 