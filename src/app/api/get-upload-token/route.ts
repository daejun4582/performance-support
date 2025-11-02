export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';

export async function GET(request: NextRequest) {
  try {
    // ===== ENV 점검 =====
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;
    const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;

    const issues: string[] = [];
    if (!clientId) issues.push('GOOGLE_CLIENT_ID is missing');
    if (!clientSecret) issues.push('GOOGLE_CLIENT_SECRET is missing');
    if (!refreshToken) issues.push('GOOGLE_REFRESH_TOKEN is missing');
    if (!folderId) issues.push('GOOGLE_DRIVE_FOLDER_ID is missing');

    if (issues.length) {
      return NextResponse.json(
        { success: false, error: 'Configuration error', issues },
        { status: 500 }
      );
    }

    // ===== OAuth 인증 (Refresh Token 사용) =====
    const redirectUri = process.env.GOOGLE_REDIRECT_URI || `${request.nextUrl.origin}/api/auth/callback`;
    
    const oauth2Client = new google.auth.OAuth2(
      clientId!,
      clientSecret!,
      redirectUri
    );

    // Refresh Token으로 Access Token 가져오기
    oauth2Client.setCredentials({
      refresh_token: refreshToken!
    });

    // Access Token 자동 갱신
    const accessToken = await oauth2Client.getAccessToken();
    
    if (!accessToken.token) {
      return NextResponse.json(
        { success: false, error: 'Failed to get access token. Refresh token may be invalid.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      accessToken: accessToken.token,
      folderId: folderId
    });

  } catch (error: any) {
    console.error('Get upload token error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get upload token',
        message: error.message
      },
      { status: 500 }
    );
  }
}

