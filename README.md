# U-TOPIA - OTT 플랫폼 프론트엔드

> 1~5분 짧은 러닝타임 콘텐츠를 제공하는 LG U+ 고객 맞춤형 OTT 플랫폼

## 🎬 프로젝트 소개

U-TOPIA는 짧고 강렬한 5분 이내의 콘텐츠를 제공하는 차세대 OTT 플랫폼입니다.
출퇴근길, 점심시간 등 짧은 시간에 즐길 수 있는 프리미엄 콘텐츠를 제공합니다.

## ✨ 주요 기능

- 🎯 **실시간 인기 차트** - 캐러셀 형태로 10개 콘텐츠 탐색
- 🔥 **개인화 추천** - 사용자 선호 태그 기반 추천
- 🔍 **실시간 검색 자동완성** - 2글자 이상 입력 시 즉시 추천
- 📺 **Netflix 스타일 모달** - 상세 페이지 전 미리보기
- 🎬 **HLS 비디오 스트리밍** - 적응형 비트레이트 지원
- 📱 **완전 반응형 디자인** - 모바일부터 데스크톱까지
- 🎭 **시리즈/단독 콘텐츠** - 에피소드별 관리 및 재생
- ⏱️ **이어보기** - 10초마다 시청 이력 자동 저장
- 💎 **구독 시스템** - LG U+ 회원 자동 구독

## 🛠️ 기술 스택

### Core

- **React 18.3.1** - UI 라이브러리
- **TypeScript 5.4.2** - 타입 안정성
- **Vite 5.1.4** - 빌드 도구
- **Node.js** - 런타임 환경

### Styling

- **Tailwind CSS 3.4.1** - 유틸리티 CSS
- **PostCSS** - CSS 후처리
- **Lucide React** - 아이콘

### Features

- **React Router DOM 6.22.0** - 라우팅
- **HLS.js 1.5.7** - 비디오 스트리밍
- **Context API** - 상태 관리

## 🚀 시작하기

### 설치

```bash
# 의존성 설치
npm install
```

### 개발 서버 실행

```bash
npm run dev
```

브라우저에서 http://localhost:3000 접속

### 빌드

```bash
npm run build
```

### 프리뷰

```bash
npm run preview
```

## 📁 프로젝트 구조

```
OTT_kiro_make/
├── src/
│   ├── components/      # 재사용 컴포넌트
│   │   ├── Header.tsx
│   │   ├── ContentCard.tsx
│   │   ├── ContentModal.tsx
│   │   └── VideoPlayer.tsx
│   ├── pages/          # 페이지 컴포넌트
│   │   ├── HomePage.tsx
│   │   ├── ContentDetailPage.tsx
│   │   ├── LoginPage.tsx
│   │   ├── MyPage.tsx
│   │   └── ...
│   ├── contexts/       # Context API
│   │   └── AuthContext.tsx
│   ├── services/       # 비즈니스 로직
│   │   ├── authService.ts
│   │   ├── contentService.ts
│   │   └── mockData.ts
│   ├── types/          # TypeScript 타입
│   │   └── index.ts
│   └── App.tsx
├── package.json
└── vite.config.ts
```

## 🎨 주요 페이지

- **홈** - 인기 차트, 추천, 이어보기
- **오리지널** - 독점 프리미엄 콘텐츠
- **크리에이터** - 사용자 제작 콘텐츠
- **검색** - 실시간 자동완성 검색
- **상세보기** - 비디오 플레이어 + 댓글
- **마이페이지** - 프로필, 찜, 시청이력, 통계
- **스튜디오** - 콘텐츠 업로드 관리

## 🎯 핵심 기능 상세

### 비디오 스트리밍

- HLS 적응형 비트레이트
- 다중 화질 지원 (360p, 720p, 1080p)
- 배속 재생 (0.5x ~ 2x)
- 전체화면 자동 재생

### 구독 시스템

- 미구독: 제한된 콘텐츠 + 광고
- 일반 구독: 전체 콘텐츠 + 배속 재생
- LG U+ 회원: 자동 구독 혜택

### 개인화

- 선호 태그 기반 추천
- 시청 이력 분석
- 태그별 통계 시각화

## 📱 반응형 디자인

- 모바일 (sm): 1-2열
- 태블릿 (md): 3열
- 데스크톱 (lg): 4열
- 대형 화면 (xl): 5열

## 🎨 디자인 시스템

- **Primary Color**: #EB008B (핑크)
- **Background**: #141414 (다크)
- **Typography**: 시스템 폰트
- **Theme**: 다크 모드

## 📄 라이선스

MIT License

## 🔗 링크

- [GitHub Repository](https://github.com/uplus-final-02/Front-end)
- [Vercel Deployment](https://ott-ui-prototype.vercel.app)
