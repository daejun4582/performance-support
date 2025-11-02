import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';

export async function GET(request: NextRequest) {
  try {
    // Google Drive API 인증 정보 확인
    const serviceAccountEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');
    const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;

    if (!serviceAccountEmail || !privateKey || !folderId) {
      return NextResponse.json(
        { 
          error: 'Google Drive credentials are not configured',
          hasCredentials: false
        },
        { status: 500 }
      );
    }

    console.log('🔍 Checking Google Drive folder access...');
    console.log('📧 Service Account:', serviceAccountEmail);
    console.log('📁 Folder ID:', folderId);

    // Google Drive API 인증 설정
    const auth = new google.auth.JWT({
      email: serviceAccountEmail,
      key: privateKey,
      scopes: ['https://www.googleapis.com/auth/drive']
    });

    const drive = google.drive({ version: 'v3', auth });

      // 폴더 정보 가져오기 (권한 확인)
    try {
      const folderResponse = await drive.files.get({
        fileId: folderId,
        fields: 'id, name, mimeType, permissions, capabilities, owners',
      });

      console.log('✅ Folder access successful!');
      console.log('📂 Folder name:', folderResponse.data.name);
      console.log('📋 MIME type:', folderResponse.data.mimeType);
      console.log('🔑 Permissions:', folderResponse.data.permissions?.length || 0);
      console.log('👤 Owners:', folderResponse.data.owners?.map(o => o.emailAddress).join(', '));
      
      // 서비스 계정이 권한 목록에 있는지 확인
      const serviceAccountInPermissions = folderResponse.data.permissions?.some(
        (p: any) => p.emailAddress === serviceAccountEmail || 
                    (p.deleted === false && p.type === 'user')
      );
      console.log('🔍 Service account in permissions:', serviceAccountInPermissions);
      
      // 모든 권한 목록 출력 (디버깅용)
      if (folderResponse.data.permissions) {
        console.log('📋 All permissions:');
        folderResponse.data.permissions.forEach((p: any, index: number) => {
          console.log(`  [${index}] Type: ${p.type}, Role: ${p.role}, Email: ${p.emailAddress || 'N/A'}, Deleted: ${p.deleted || false}`);
        });
      }

      // 폴더인지 확인
      const isFolder = folderResponse.data.mimeType === 'application/vnd.google-apps.folder';
      
      if (!isFolder) {
        return NextResponse.json({
          success: false,
          error: 'The provided ID is not a folder. Please check GOOGLE_DRIVE_FOLDER_ID.',
          details: {
            name: folderResponse.data.name,
            mimeType: folderResponse.data.mimeType,
            type: 'file (not a folder)'
          }
        });
      }

      // 폴더에 쓰기 권한이 있는지 확인
      const hasWritePermission = folderResponse.data.capabilities?.canEdit === true;

      return NextResponse.json({
        success: true,
        hasAccess: true,
        hasWritePermission: hasWritePermission,
        details: {
          folderName: folderResponse.data.name,
          folderId: folderResponse.data.id,
          isFolder: true,
          permissionCount: folderResponse.data.permissions?.length || 0,
          canEdit: hasWritePermission,
          serviceAccountInPermissions: serviceAccountInPermissions,
          ownerEmail: folderResponse.data.owners?.[0]?.emailAddress || 'N/A',
          permissions: folderResponse.data.permissions?.map((p: any) => ({
            type: p.type,
            role: p.role,
            email: p.emailAddress || null,
            deleted: p.deleted || false
          })) || [],
          message: hasWritePermission 
            ? '✅ Service account has edit access to the folder!' 
            : '⚠️ Service account can access the folder but may not have edit permission.'
        }
      });

    } catch (error: any) {
      console.error('❌ Folder access failed:', error);
      
      if (error.code === 404) {
        console.error('❌ 404 Error Details:', {
          code: error.code,
          message: error.message,
          response: error.response?.data || 'No response data',
          folderId: folderId,
          serviceAccountEmail: serviceAccountEmail
        });
        
        return NextResponse.json({
          success: false,
          hasAccess: false,
          error: 'Folder not found or not accessible',
          details: {
            code: 404,
            message: 'The folder with the provided ID does not exist or the service account does not have access to it.',
            possibleCauses: [
              'The folder ID is incorrect',
              'The service account does not have access to the folder (sharing is required)',
              'The folder was deleted',
              'The folder ID belongs to a file, not a folder'
            ],
            folderId: folderId,
            serviceAccountEmail: serviceAccountEmail,
            suggestion: 'Please verify: 1) The folder ID is correct, 2) The folder is shared with the service account email with Editor permission'
          }
        }, { status: 404 });
      } else if (error.code === 403) {
        return NextResponse.json({
          success: false,
          hasAccess: false,
          error: 'Permission denied',
          details: {
            code: 403,
            message: 'The service account does not have access to this folder.',
            suggestion: 'Please share the folder with the service account email: ' + serviceAccountEmail + ' with "Editor" permission.'
          }
        }, { status: 403 });
      } else {
        return NextResponse.json({
          success: false,
          hasAccess: false,
          error: error.message || 'Unknown error',
          details: {
            code: error.code || 'UNKNOWN',
            message: error.message
          }
        }, { status: 500 });
      }
    }

  } catch (error) {
    console.error('❌ Check access error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to check access',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

