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
    
    // Handle error responses from Gemini API
    if (!response.ok) {
      console.error('❌ Gemini API error:', {
        status: response.status,
        data: data
      });
      
      let errorMessage = 'Unknown error occurred';
      let errorDetails: {
        code: number;
        message: string;
        timestamp: string;
        requestModel: any;
        apiEndpoint: string;
        technicalDetails: any;
        errorCode?: string | null;
        userMessage?: string;
        retryAfter?: string;
      } = {
        code: response.status,
        message: errorMessage,
        timestamp: new Date().toISOString(),
        requestModel: model,
        apiEndpoint: apiUrl.split('?')[0], // Remove API key from logs
        technicalDetails: data.error || null
      };
      
      // Extract error message from Gemini API response if available
      if (data.error) {
        errorMessage = `Gemini API Error: ${data.error.message || data.error.code || JSON.stringify(data.error)}`;
        errorDetails.message = data.error.message || errorMessage;
        errorDetails.errorCode = data.error.code || null;
      } else if (response.status === 400) {
        errorMessage = 'Bad request: The prompt may contain invalid content or formatting';
        errorDetails.message = 'The request contained invalid formatting or prohibited content';
        errorDetails.userMessage = 'Your prompt may contain content that cannot be processed. Please try rewording it.';
      } else if (response.status === 401) {
        errorMessage = 'Unauthorized: API key may be invalid or missing';
        errorDetails.message = 'Authentication failed';
        errorDetails.userMessage = 'We couldn\'t authenticate with the AI service. Please try again later.';
      } else if (response.status === 403) {
        errorMessage = 'Forbidden: Request not allowed or API key does not have sufficient permissions';
        errorDetails.message = 'Access denied to the AI service';
        errorDetails.userMessage = 'We don\'t have permission to perform this analysis right now. Please try again later.';
      } else if (response.status === 404) {
        errorMessage = `Model '${model}' not found or endpoint does not exist`;
        errorDetails.message = 'AI model not available';
        errorDetails.userMessage = 'The AI model needed for analysis is currently unavailable. Please try again later.';
      } else if (response.status === 429) {
        errorMessage = 'Rate limit exceeded: Too many requests to Gemini API';
        errorDetails.message = 'Rate limit exceeded';
        errorDetails.userMessage = 'We\'ve reached our limit with the AI service. Please try again in a few minutes.';
        errorDetails.retryAfter = response.headers.get('retry-after') || '60';
      } else if (response.status >= 500) {
        errorMessage = 'Gemini API server error: The service is currently unavailable';
        errorDetails.message = 'AI service temporarily unavailable';
        errorDetails.userMessage = 'The AI service is experiencing technical difficulties. Please try again later.';
      }
      
      console.log('🔍 Structured error response:', errorDetails);
      
      return NextResponse.json(
        { 
          error: errorMessage,
          details: errorDetails,
          userMessage: errorDetails.userMessage || 'Something went wrong with the AI analysis. Please try again.',
          status: response.status 
        },
        { 
          status: response.status,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
          },
        }
      );
    }
    
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
      { 
        error: 'Failed to process request', 
        details: error instanceof Error ? error.message : String(error) 
      },
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