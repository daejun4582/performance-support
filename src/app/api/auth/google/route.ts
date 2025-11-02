import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';

export async function GET(request: NextRequest) {
  try {
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

    // Google Drive 접근 권한 요청
    const scopes = [
      'https://www.googleapis.com/auth/drive.file',
      'https://www.googleapis.com/auth/drive'
    ];

    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline', // Refresh Token 받기 위해 필요
      scope: scopes,
      prompt: 'consent' // Refresh Token을 받기 위해 필요
    });

    // 인증 URL로 리다이렉트
    return NextResponse.redirect(authUrl);
  } catch (error) {
    console.error('OAuth error:', error);
    return NextResponse.json(
      { error: 'Failed to initiate OAuth flow' },
      { status: 500 }
    );
  }
}

