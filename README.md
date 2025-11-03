# Performance Support : 연기 연습 보조 서비스

![performance-support-banner](https://raw.githubusercontent.com/daejun4582/performance-support/main/splash.png)

## :bulb: 소개

배우보죠는 언제 어디서나 연기 연습을 할 수 있도록 도와주는 웹 애플리케이션입니다. AI 상대역과 함께 대본을 연습하고, 실시간으로 발음과 대사를 확인하며, 연습 영상을 자동으로 녹화하여 기록으로 남길 수 있습니다.

## :memo: 주요 기능

1. **AI 상대역 연기 연습**: 선택한 작품과 캐릭터에 맞춰 AI가 상대역을 연기합니다.
2. **실시간 음성 인식**: OpenAI Whisper를 활용한 정확한 음성 인식 및 대사 비교
3. **영상 자동 녹화**: 화면과 웹캠을 동시에 녹화하여 연습 과정을 기록
4. **Google Drive 연동**: 녹화된 영상을 자동으로 Google Drive에 업로드하고 QR 코드 생성
5. **발음 정확도 분석**: 대사 정확도를 실시간으로 확인하고 피드백 제공

## 🧑‍🤝‍🧑 개발자

| ![](https://github.com/daejun4582.png) |
| :--------------------------------------: |
|             **반대준**             |
|             **Full Stack**              |

## 🎨 디자이너

| **안민애** | **유하은** | **권미소** | **정현** |
| :--------: | :--------: | :--------: | :------: |
|  **Design**  |  **Design**  |  **Design**  | **Design** |

## 🔧 기술스택

| division        | stack                                                                                                                                                                                                                                                                                                       |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Front-end       | <img src="https://img.shields.io/badge/Next.js-15.5.6-000000?style=for-the-badge&logo=next.js&logoColor=white">  <img src="https://img.shields.io/badge/React-19.1.0-61DAFB?style=for-the-badge&logo=react&logoColor=black">  <img src="https://img.shields.io/badge/TypeScript-5.0-3178C6?style=for-the-badge&logo=typescript&logoColor=white">  <img src="https://img.shields.io/badge/CSS%20Modules-000000?style=for-the-badge&logo=css3&logoColor=white"> |
| Back-end        | <img src="https://img.shields.io/badge/Next.js%20API-15.5.6-000000?style=for-the-badge&logo=next.js&logoColor=white">  <img src="https://img.shields.io/badge/Node.js-20.0-339933?style=for-the-badge&logo=node.js&logoColor=white"> |
| AI/ML           | <img src="https://img.shields.io/badge/OpenAI-Whisper-412991?style=for-the-badge&logo=openai&logoColor=white"> |
| Storage         | <img src="https://img.shields.io/badge/Google%20Drive-4285F4?style=for-the-badge&logo=googledrive&logoColor=white"> |
| Code Management | <img src="https://img.shields.io/badge/git-F05032?style=for-the-badge&logo=git&logoColor=black"> <img src="https://img.shields.io/badge/github-181717?style=for-the-badge&logo=github&logoColor=black"> |

## 🚀 시작하기

### 필요 사항

- Node.js 20.0 이상
- npm 또는 yarn

### 설치

```bash
# 저장소 클론
git clone https://github.com/daejun4582/performance-support.git

# 프로젝트 디렉토리로 이동
cd performance-support

# 의존성 설치
npm install
```

### 환경 변수 설정

`.env.local` 파일을 생성하고 다음 환경 변수를 설정하세요:

```env
# OpenAI API
OPENAI_API_KEY=your_openai_api_key

# Google Drive API (OAuth)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REFRESH_TOKEN=your_google_refresh_token
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/callback
GOOGLE_DRIVE_FOLDER_ID=your_google_drive_folder_id
```

### 실행

```bash
# 개발 서버 실행
npm run dev

# 프로덕션 빌드
npm run build
npm start
```

브라우저에서 [http://localhost:3000](http://localhost:3000)을 열어 확인하세요.

## 📁 프로젝트 구조

```
performance-support/
├── src/
│   ├── app/              # Next.js App Router 페이지
│   │   ├── api/         # API 라우트
│   │   │   ├── stt/     # 음성 인식 API
│   │   │   ├── upload-video/  # 영상 업로드 API
│   │   │   └── auth/    # Google OAuth 인증
│   │   ├── logoPage/    # 스플래쉬 페이지
│   │   ├── startPage/   # 시작 페이지 (작품/캐릭터 선택)
│   │   ├── runPage/     # 연기 연습 페이지
│   │   └── resultPage/  # 결과 페이지
│   ├── components/      # 재사용 가능한 컴포넌트
│   ├── constants/       # 상수 정의
│   ├── lib/             # 핵심 로직 (Turn Engine)
│   └── utils/           # 유틸리티 함수
├── public/              # 정적 파일
└── package.json
```

## 💻 주요 기능 설명

### 1. 작품 및 캐릭터 선택
- 다양한 작품과 캐릭터를 선택하여 연습할 대본을 결정합니다.
- 캐릭터의 성격과 톤을 설정할 수 있습니다.

### 2. 실시간 연기 연습
- AI 상대역과 함께 대본을 연습합니다.
- 사용자의 대사와 발음을 실시간으로 분석합니다.
- 자막을 통해 현재 대사를 확인할 수 있습니다.

### 3. 영상 녹화
- 화면과 웹캠을 동시에 녹화합니다.
- 녹화된 영상은 자동으로 Google Drive에 업로드됩니다.
- QR 코드를 통해 업로드된 영상을 쉽게 확인할 수 있습니다.

## 🔗 관련 링크

- GitHub Repository: https://github.com/daejun4582/performance-support
- Figma Url : https://www.figma.com/design/sXya8CS3IIq9gjEBVMS9N4/%EC%97%B0%EA%B8%B0%EB%B3%B4%EC%A3%A0--%EC%97%B0%EA%B8%B0-%EC%97%B0%EC%8A%B5-%EB%B3%B4%EC%A1%B0-%EC%84%9C%EB%B9%84%EC%8A%A4-%EC%A0%84%EC%8B%9C-%EC%9D%B8%ED%84%B0%EB%9E%99%EC%85%98?node-id=278-631&m=dev

## 📝 라이선스

이 프로젝트는 개인 프로젝트입니다.

