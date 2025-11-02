import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';

export async function GET(request: NextRequest) {
  try {
    const code = request.nextUrl.searchParams.get('code');
    
    if (!code) {
      return NextResponse.json(
        { error: 'Authorization code not found' },
        { status: 400 }
      );
    }

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI || `${request.nextUrl.origin}/api/auth/callback`;

    if (!clientId || !clientSecret) {
      return NextResponse.json(
        { error: 'Google OAuth credentials are not configured' },
        { status: 500 }
      );
    }

    const oauth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret,
      redirectUri
    );

    // Authorization code를 Access Token과 Refresh Token으로 교환
    const { tokens } = await oauth2Client.getToken(code);
    
    if (!tokens.refresh_token) {
      return NextResponse.json(
        { 
          error: 'Refresh token not received',
          hint: 'Make sure to set prompt: "consent" in the auth URL. You may need to revoke access and try again.',
          receivedTokens: {
            hasAccessToken: !!tokens.access_token,
            hasRefreshToken: !!tokens.refresh_token
          }
        },
        { status: 400 }
      );
    }

    // Refresh Token 반환 (환경 변수에 저장하도록 안내)
    return NextResponse.json({
      success: true,
      message: 'OAuth authentication successful',
      refreshToken: tokens.refresh_token,
      instruction: 'Copy the refreshToken value below and add it to your .env.local file as GOOGLE_REFRESH_TOKEN',
      nextStep: 'Add this to your .env.local file: GOOGLE_REFRESH_TOKEN=' + tokens.refresh_token
    }, {
      headers: {
        'Content-Type': 'application/json',
      }
    });

  } catch (error: any) {
    console.error('OAuth callback error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to complete OAuth flow',
        message: error.message,
        details: error.response?.data
      },
      { status: 500 }
    );
  }
}

