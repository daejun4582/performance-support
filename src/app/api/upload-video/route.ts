export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { Readable } from 'stream';

export async function POST(request: NextRequest) {
  console.time('UPLOAD_TOTAL');

  try {
    // ===== 0) ENV 점검 =====
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;
    const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;

    const issues: string[] = [];
    if (!clientId) issues.push('GOOGLE_CLIENT_ID is missing');
    if (!clientSecret) issues.push('GOOGLE_CLIENT_SECRET is missing');
    if (!refreshToken) issues.push('GOOGLE_REFRESH_TOKEN is missing (run /api/auth/google first)');
    if (!folderId) issues.push('GOOGLE_DRIVE_FOLDER_ID is missing');

    if (issues.length) {
      return NextResponse.json(
        { success: false, stage: 'env-check', issues },
        { status: 500 }
      );
    }

    // ===== 1) 파일 파싱 =====
    const formData = await request.formData();
    const videoFile = formData.get('video') as File | null;

    if (!videoFile) {
      return NextResponse.json(
        { success: false, stage: 'file-check', error: 'No video file provided' },
        { status: 400 }
      );
    }

    const arrayBuffer = await videoFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // ===== 2) OAuth 인증 (Refresh Token 사용) =====
    console.time('AUTH');
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
      throw new Error('Failed to get access token. Refresh token may be invalid.');
    }

    const drive = google.drive({ version: 'v3', auth: oauth2Client });
    console.timeEnd('AUTH');

    // ===== 3) 폴더 접근 사전 검증 =====
    console.time('FOLDER_GET');
    let folderMeta: any = null;
    try {
      const r = await drive.files.get({
        fileId: folderId!,
        fields: 'id,name,mimeType,capabilities',
      });
      folderMeta = r.data;
    } catch (e: any) {
      console.timeEnd('FOLDER_GET');
      return NextResponse.json(
        {
          success: false,
          stage: 'folder-check',
          message: 'Cannot access folder before upload',
          code: e?.code,
          error: e?.message,
          hint:
            e?.code === 404
              ? 'Folder not found. Check folder ID.'
              : e?.code === 403
              ? 'Permission denied. Make sure you have access to this folder.'
              : undefined,
          debug: {
            folderId,
          },
        },
        { status: 500 }
      );
    }
    console.timeEnd('FOLDER_GET');

    // ===== 4) 업로드 메타데이터 구성 =====
    // 파일 확장자 유지 (mp4 또는 webm)
    const fileName = videoFile.name || 'practice_video.webm';
    const sentFileName = `${Date.now()}_${fileName}`;
    const fileMetadata = {
      name: sentFileName,
      parents: [folderId!], // 사용자 계정이므로 일반 폴더에 업로드 가능
    };

    // ===== 5) 업로드 =====
    console.time('UPLOAD');
    const stream = new Readable();
    stream.push(buffer);
    stream.push(null);

    // 파일 타입에 맞는 mimeType 사용 (mp4 또는 webm)
    const fileMimeType = videoFile.type || 
      (fileName.endsWith('.mp4') ? 'video/mp4' : 
       fileName.endsWith('.webm') ? 'video/webm' : 
       'video/webm');

    let uploadRes;
    try {
      uploadRes = await drive.files.create({
        requestBody: fileMetadata,
        media: { mimeType: fileMimeType, body: stream },
        fields: 'id,name,parents,webViewLink,webContentLink',
      });
    } catch (e: any) {
      console.timeEnd('UPLOAD');
      return NextResponse.json(
        {
          success: false,
          stage: 'upload',
          code: e?.code,
          message: e?.message,
          hint:
            e?.code === 403
              ? 'Permission denied. Check folder access or refresh token may be expired.'
              : e?.code === 401
              ? 'Access token expired. Refresh token may be invalid.'
              : undefined,
          debug: {
            folderId,
            fileInfo: { name: videoFile.name, type: videoFile.type, size: videoFile.size },
          },
          response: e?.response?.data,
        },
        { status: 500 }
      );
    }
    console.timeEnd('UPLOAD');

    const fileId = uploadRes.data.id!;

    // ===== 6) 파일 정보 가져오기 =====
    console.time('POST_GET');
    const info = await drive.files.get({
      fileId,
      fields: 'id,name,parents,webViewLink,webContentLink',
    });
    console.timeEnd('POST_GET');

    // ===== 7) 공개 권한 부여 =====
    console.time('PERMISSION_SET');
    try {
      await drive.permissions.create({
        fileId,
        requestBody: { role: 'reader', type: 'anyone' },
      });
    } catch (permErr: any) {
      console.warn('Permission create failed:', permErr?.message);
    }
    console.timeEnd('PERMISSION_SET');

    console.timeEnd('UPLOAD_TOTAL');

    // 최종 응답
    return NextResponse.json({
      success: true,
      stage: 'done',
      fileId,
      fileName: info.data.name,
      url: info.data.webViewLink || `https://drive.google.com/file/d/${fileId}/view`,
    });
  } catch (e: any) {
    console.timeEnd('UPLOAD_TOTAL');
    return NextResponse.json(
      {
        success: false,
        stage: 'fatal',
        code: e?.code,
        message: e?.message || 'Internal error',
        response: e?.response?.data,
      },
      { status: 500 }
    );
  }
}