This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Environment Variables

### Google Drive API 설정 (OAuth 방식)

영상 녹화 후 Google Drive 업로드 기능을 사용하려면 다음 환경 변수를 설정해야 합니다:

1. **Google Cloud Console에서 프로젝트 생성 및 설정**
   - [Google Cloud Console](https://console.cloud.google.com/) 접속
   - 새 프로젝트 생성 또는 기존 프로젝트 선택
   - "Google Drive API" 활성화

2. **OAuth 클라이언트 ID 생성**
   - Google Cloud Console → API 및 서비스 → 사용자 인증 정보
   - "사용자 인증 정보 만들기" → "OAuth 클라이언트 ID"
   - 애플리케이션 유형: "웹 애플리케이션"
   - 승인된 리디렉션 URI 추가: `http://localhost:3000/api/auth/callback` (프로덕션에서는 실제 도메인)

3. **OAuth 인증 실행 (한 번만)**
   - 브라우저에서 `http://localhost:3000/api/auth/google` 접속
   - Google 계정으로 로그인 및 권한 승인
   - 콜백 페이지에서 받은 `refreshToken` 복사

4. **환경 변수 설정**
   - 프로젝트 루트에 `.env.local` 파일 생성:
   ```
   GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=your-client-secret
   GOOGLE_REFRESH_TOKEN=your-refresh-token-from-step-3
   GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/callback
   GOOGLE_DRIVE_FOLDER_ID=your-folder-id-here
   OPENAI_API_KEY=your-openai-api-key
   ```
   
   - `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`: OAuth 클라이언트 ID 생성 시 받은 값
   - `GOOGLE_REFRESH_TOKEN`: `/api/auth/google` 실행 후 받은 refresh token
   - `GOOGLE_DRIVE_FOLDER_ID`: Google Drive 폴더 URL에서 확인 가능 (예: `https://drive.google.com/drive/folders/1a2b3c4d5e6f7g8h9i0j` → `1a2b3c4d5e6f7g8h9i0j`)

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
