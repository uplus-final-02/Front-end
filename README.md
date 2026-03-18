# U-TOPIA Frontend

> LG U+ 고객 맞춤형 숏폼 OTT 플랫폼 — 1~5분 짧은 러닝타임 콘텐츠 스트리밍 서비스

<img width="1918" height="948" alt="image" src="https://github.com/user-attachments/assets/91293ddf-92bf-4e94-a196-f31e3b01e6a6" />


## 배포

🔗 [https://utopiaott.vercel.app](https://utopiaott.vercel.app)

## 프로젝트 소개

U-TOPIA는 출퇴근길, 점심시간 등 짧은 시간에 즐길 수 있는 프리미엄 숏폼 콘텐츠를 제공하는 OTT 플랫폼입니다. 관리자가 업로드하는 OTT 콘텐츠와 크리에이터가 직접 제작하는 유저 콘텐츠를 모두 지원하며, 개인화 추천과 실시간 인기 차트를 통해 사용자 맞춤형 경험을 제공합니다.

## 기술 스택

| 분류      | 기술                                  |
| --------- | ------------------------------------- |
| Core      | React 18, TypeScript, Vite 5          |
| Styling   | Tailwind CSS, Lucide React (아이콘)   |
| Routing   | React Router DOM 6                    |
| 상태 관리 | Context API                           |
| HTTP      | Axios (JWT 인터셉터, 토큰 자동 갱신)  |
| 영상      | HLS.js (적응형 비트레이트, 화질 선택) |
| 차트      | Recharts                              |
| 배포      | Vercel                                |

## 주요 기능

### 사용자

- 이메일 회원가입 (인증코드) / 소셜 로그인 (카카오, 네이버, 구글)
- 선호 태그 기반 개인화 추천
- 실시간 인기 차트 (캐러셀)
- 실시간 검색 자동완성 (초성 검색 지원)
- OTT + 크리에이터 영상 통합 검색
- HLS 적응형 스트리밍 (다중 화질 선택, 배속 재생)
- 구독 등급별 기능 제한 (일반: 720p·배속 잠금 / 구독: 전체 화질·배속)
- 이어보기 (10초 간격 자동 저장)
- 찜하기 / 시청 이력 관리
- 댓글 CRUD
- 구독 시스템 (일반 / LG U+ 자동 구독)
- 프로필 관리 (닉네임, 프로필 이미지, 선호 태그)
- 시청 통계 시각화
- 회원 탈퇴

### 크리에이터

- 숏폼 피드 (무한 스크롤)
- 영상 업로드 (Presigned URL → S3 직접 업로드 → 트랜스코딩 자동 대기)
- 원본 OTT 콘텐츠 연결 (리액션/리뷰 영상)
- 스튜디오 (내 콘텐츠 관리)
- 썸네일 업로드
- CloudFront Signed Cookie 기반 보안 스트리밍

### 백오피스 (관리자)

- 콘텐츠 CRUD (단일/시리즈)
- 시리즈 에피소드 관리
- Presigned URL 기반 영상 업로드
- 썸네일 업로드
- 콘텐츠 제목 검색 (클라이언트 필터링)
- 사용자 관리
- 홈 태그 통계 (Recharts 차트)
- 인기 차트 운영 (스냅샷, 타임라인, 상세, 검증)

## 연동 API

백엔드와 총 **75개** API 엔드포인트 연동

| 서비스              | API 수 | 주요 기능                                     |
| ------------------- | ------ | --------------------------------------------- |
| authService         | 10     | 회원가입, 로그인, 소셜 로그인, 로그아웃, 탈퇴 |
| contentService      | 8      | 홈 콘텐츠, 인기 차트, 추천, 상세 조회         |
| videoService        | 2      | HLS 재생, 조회수                              |
| commentService      | 4      | 댓글 CRUD                                     |
| bookmarkService     | 4      | 찜하기/해제, 목록, 플레이리스트               |
| historyService      | 5      | 시청 이력, 세이브포인트, 통계                 |
| profileService      | 5      | 프로필 조회/수정, 프로필 이미지, 선호 태그    |
| subscriptionService | 4      | 구독 조회, 결제, U+ 인증, 해지                |
| searchService       | 3      | OTT 검색, 크리에이터 검색, 자동완성           |
| creatorService      | 10     | 피드, 재생, 업로드, 메타데이터, 댓글          |
| adminService        | 20     | 콘텐츠/사용자 관리, 통계, 인기 차트 운영      |

## 프로젝트 구조

```
src/
├── components/
│   ├── common/          # Header, VideoPlayer, AlertModal, ConfirmModal
│   └── content/         # ContentCard, ContentModal
├── constants/           # admin, content, oauth 상수
├── contexts/            # AuthContext (인증 상태 관리)
├── pages/
│   ├── admin/           # AdminPage, ContentsManagement, HomeTagStatistics,
│   │                    # Statistics, TrendingOperations
│   ├── auth/            # LoginPage, SignupPage, OAuthCallbackPage, SocialSetupPage
│   ├── content/         # HomePage, ContentDetailPage, SearchPage,
│   │                    # MoviePage, SeriesPage, OriginalPage
│   ├── creator/         # CreatorPage (숏폼 피드), StudioPage (업로드/관리)
│   └── user/            # MyPage, SubscribePage
├── services/            # API 서비스 레이어 (13개 모듈)
├── types/               # TypeScript 타입 정의
├── utils/               # 포맷터, OAuth 유틸
├── App.tsx              # 라우터 설정
└── index.css            # Tailwind + 커스텀 스타일
```

## 시작하기

```bash
# 의존성 설치
npm install

# 개발 서버 (http://localhost:3000)
npm run dev

# 프로덕션 빌드
npm run build

# 빌드 프리뷰
npm run preview
```

## 디자인

| 항목       | 값                                                        |
| ---------- | --------------------------------------------------------- |
| 글꼴       | S-CoreDream (100~900 웨이트)                              |
| Primary    | `#EB008B`                                                 |
| Background | `#141414`                                                 |
| Theme      | Dark Mode                                                 |
| 반응형     | 모바일(1-2열) → 태블릿(3열) → 데스크톱(4-5열) |
