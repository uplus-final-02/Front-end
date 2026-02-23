# API 명세서

## 로그인/회원가입

### 이메일/닉네임 중복 검사

- **Method**: `GET`
- **URL**: `/api/auth/check`
- **분류**: 비회원
- **설명**: 회원가입 전 이메일과 닉네임의 중복 여부 및 유효성(정규식)을 검증합니다.

---

### 이메일 회원가입

- **Method**: `POST`
- **URL**: `/api/auth/signup/email`
- **분류**: 비회원
- **설명**: 이메일, 비밀번호, 닉네임, 선호태그를 입력받아 회원가입 생성합니다.
- **기타**: 비밀번호 암호화 저장 필수

---

### 소셜 회원가입

- **Method**: `POST`
- **URL**: `/api/auth/signup/social`
- **분류**: 비회원
- **설명**: 소셜 인증 후, 신규 회원일 경우 닉네임과 선호태그를 입력받아 가입을 완료합니다.
- **기타**: 소셜 토큰은 비밀번호 컬럼에 암호화하여 저장

---

### 이메일 인증번호 전송

- **Method**: `POST`
- **URL**: `/api/auth/email/send`
- **분류**: 비회원
- **설명**: 사용자가 입력한 이메일로 6자리 인증번호를 발송합니다.

---

### 이메일 인증번호 확인

- **Method**: `POST`
- **URL**: `/api/auth/email/verify`
- **분류**: 비회원
- **설명**: 사용자가 입력한 인증번호가 유효한지 검증하고, 성공 시 회원가입용 인증 토큰을 발급합니다.
- **기타**: 발급된 토큰은 회원가입 API 호출 시 필수값

---

### 이메일 로그인

- **Method**: `POST`
- **URL**: `/api/auth/login`
- **분류**: 유저
- **설명**: 이메일과 비밀번호를 검증하여 Access/Refresh Token을 발급합니다.
- **기타**: 토큰 만료: Access(30분), Refresh(2주)

---

### 소셜 로그인

- **Method**: `POST`
- **URL**: `/api/auth/login/{provider}`
- **분류**: 비회원, 유저
- **설명**: 소셜 인증 토큰 받아 기존 회원이면 로그인을 처리하고, 신규 회원이면 가입이 필요하다는 응답을 반환합니다.
- **기타**: provider = kakao, naver, google

---

### 선호 태그 목록 조회

- **Method**: `GET`
- **URL**: `/api/common/tags`
- **분류**: 회원
- **설명**: 회원가입 또는 프로필 수정 시 선택할 수 있는 선호 태그(장르) 목록을 반환합니다.
- **기타**: 하드코딩 방지용

---

### 토큰 재발급

- **Method**: `POST`
- **URL**: `/api/auth/reissue`
- **분류**: 회원
- **설명**: 로그인 상태를 유지하기 위한 만료 코드입니다.

---

### 로그아웃

- **Method**: `POST`
- **URL**: `/api/auth/logout`
- **분류**: 회원
- **설명**: 사용자의 Refresh Token을 무효화(삭제) 처리 후 로그아웃을 완료합니다.

---

## 멤버십

### 구독 상태 조회

- **Method**: `GET`
- **URL**: `/api/members/me/membership`
- **분류**: 회원
- **설명**: 현재 로그인한 사용자의 구독 등급(미구독, 일반, LG U+)과 만료일을 조회합니다.
- **기타**: 로그인 필수

---

### LG U+ 회원 인증

- **Method**: `POST`
- **URL**: `/api/membership/uplus/verify`
- **분류**: 회원
- **설명**: 전화번호와 이름을 받아 통신사 가입 여부를 확인(Mocking 또는 실제 연동)하고 등급을 업그레이드합니다.

---

### 구독 해지(예약)

- **Method**: `POST`
- **URL**: `/api/membership/cancel`
- **분류**: 회원
- **설명**: 구독 중인 멤버십을 해지합니다. 즉시 종료되지 않고, 다음 결제일(만료일) 전까지는 혜택이 유지되며 그 이후에 미구독 상태로 변경됩니다.
- **기타**: 해지 시점은 선택

---

### 일반 구독 결제

- **Method**: `POST`
- **URL**: `/api/payments/subscription`
- **분류**: 회원
- **설명**: 통신사 연동 없이 요청만 오면 무조건 결제 성공 처리하고 구독 등급을 변경합니다.

---

### 재생 권한/정책 조회

- **Method**: `GET`
- **URL**: `/api/contents/{contentId}/play-policy`
- **분류**: 회원, 비회원
- **설명**: 영상 재생 요청 시, 사용자의 구독 등급을 판단하여 화질, 플레이어 기능 제한, 광고 정보를 통합 반환합니다.
- **기타**: 프론트엔드 플레이어 초기화 시 반드시 호출

---

### 회원 탈퇴

- **Method**: `DELETE`
- **URL**: `/api/members/me`
- **분류**: 회원
- **설명**: 서비스 이용을 중단하고 계정을 비활성화(Soft Delete) 합니다.

---

## 마이페이지

### 내 정보 조회

- **Method**: `GET`
- **URL**: `/users/me`
- **분류**: 유저
- **설명**: 내 정보 조회
- **기타**: 로그인 필수, 토큰으로 사용자 식별

---

### 닉네임 변경

- **Method**: `PATCH`
- **URL**: `/users/me/nickname`
- **분류**: 유저
- **기타**: 로그인 필수, 닉네임은 1달에 1번 변경 제한. 변경 시 다음 변경 가능 일시 반환

---

### 선호 태그 변경

- **Method**: `PUT`
- **URL**: `/users/me/perferred-tages`
- **분류**: 유저
- **기타**: 로그인 필수, 변경 후 추천 목록 갱신. 태그 3~5개 필수

---

### 찜 목록 조회

- **Method**: `GET`
- **URL**: `/users/me/bookmarks`
- **분류**: 유저
- **Param**: `cursor`, `size`
- **Response**: `{ bookmarks: [], nextCursor: string | null, hasMore: boolean }`
- **기타**: Cursor 기반 페이징, 삭제된 영상 표시, 찜 최신순

---

### 찜 삭제

- **Method**: `PATCH`
- **URL**: `/users/me/bookmarks/{contentId}`
- **분류**: 유저

---

### 찜 목록 연속 재생 정보 조회

- **Method**: `GET`
- **URL**: `/users/me/bookmarks/playlist`
- **분류**: 유저
- **설명**: 삭제된 콘텐츠는 제외, 찜한 순서(오래된 순)로 정렬. 시리즈의 경우 시청 중인 에피소드 또는 1화 반환

---

### 시청 이력 조회

- **Method**: `GET`
- **URL**: `/api/users/me/watch-history`
- **분류**: 유저
- **설명**: 로그인 필수, 최근 3개월 이력만 조회, 모든 시청 기록 표시. 마지막 시청 일자는 기본값은 전체 조회

---

### 시청 통계 조회

- **Method**: `GET`
- **URL**: `/users/me/watch-statistics`
- **분류**: 유저
- **설명**: 로그인 필수, 시청 완료(COMPLETED) 콘텐츠만 집계. 장르별 다 기준

---

## 콘텐츠 목록

### [1차] 기본 콘텐츠 리스트 조회

- **Method**: `GET`
- **URL**: `/api/contents/home/basic`
- **분류**: 회원
- **Param**: `cursor`, `size`, `category`
- **설명**: 메인화면 진입 시 노출되는 기본 콘텐츠 목록
- **Response**: `{ contents: [], nextCursor: string | null, hasMore: boolean }`
- **기타**: Cursor 기반 페이징 (최신순)

---

### [1차] 시청 중인 콘텐츠 (▶ 계속 보기)

- **Method**: `GET`
- **URL**: `/api/contents/home/watching`
- **분류**: 회원
- **Param**: 없음
- **설명**: 최근 3개월 내 시청 기록이 있는 영상 중, 상위 5개를 마지막 시청 일자 내림차순으로 조회

---

### [1차] 찜한 콘텐츠 리스트 조회

- **Method**: `GET`
- **URL**: `/api/contents/home/bookmark-list`
- **분류**: 회원
- **Param**: 없음
- **설명**: 사용자가 찜한 콘텐츠 중 최근 5개를 조회

---

### [1차] 콘텐츠 상세 정보 조회

- **Method**: `GET`
- **URL**: `/api/contents/{contentId}`
- **분류**: 회원
- **Param**: `contentId`
- **설명**: 특정 콘텐츠의 상세 정보(제목, 줄거리, 출연진, 태그, 영상 URL 등)를 조회

---

### [1차] 콘텐츠 에피소드 목록 조회

- **Method**: `GET`
- **URL**: `/api/contents/{contentId}/episodes`
- **분류**: 회원
- **Param**: `contentId`
- **설명**: type이 SERIES인 경우 각 에피소드 목록을 조회

---

### 실시간 개인화 추천 리스트 조회

- **Method**: `GET`
- **URL**: `/api/contents/home/recommendations`
- **분류**: 회원
- **Param**: 없음
- **설명**: 사용자 선호 태그 / 시청 이력을 기반으로 추천된 영상 목록

---

### 실시간 인기 순위 조회

- **Method**: `GET`
- **URL**: `/api/contents/home/ranking`
- **분류**: 회원
- **Param**: 없음
- **설명**: 최근 1주일간의 (북마크수+조회수+시청완료율 등) 상위 10개 목록

---

### 카테고리/제공자별 조회

- **Method**: `GET`
- **URL**: `/api/contents`
- **분류**: 회원
- **Param**: `category`, `genre`, `tag`, `sort`, `page`, `size`
- **설명**: 장르, 태그, 콘텐츠 유형(OTT/사용자 업로드) 등에 따른 필터링된 목록을 조회

---

### 콘텐츠 검색

- **Method**: `GET`
- **URL**: `/api/search`
- **분류**: 회원
- **Param**: `keyword`, `sort`, `page`, `size`
- **설명**: 제목, 설명, 태그 등을 포함하여 키워드로 콘텐츠를 검색

---

### 검색어 자동 완성

- **Method**: `GET`
- **URL**: `/api/search/suggestions`
- **분류**: 회원
- **Param**: `keyword`
- **설명**: 검색어 입력 시 연관된 추천 키워드 목록 제공

---

## 상호작용

### 찜하기 등록

- **Method**: `POST`
- **URL**: `/api/histories/bookmarks/{contentId}`
- **분류**: 회원
- **Param**: `contentId`
- **기타**: 토큰에서 userId 가져오기

---

### 찜하기 삭제

- **Method**: `DELETE`
- **URL**: `/api/histories/bookmarks/{contentId}`
- **분류**: 회원
- **Param**: `contentId`
- **기타**: 토큰에서 userId 가져오기

---

### 찜하기 목록 조회

- **Method**: `GET`
- **URL**: `/api/histories/bookmarks`
- **분류**: 회원
- **기타**: 토큰에서 userId 가져오기

---

### 댓글 작성

- **Method**: `POST`
- **URL**: `/api/contents/{contentId}/comments`
- **분류**: 회원
- **Param**: `comment`, `created_at`
- **기타**: 토큰에서 userId 가져오기

---

### 댓글 목록 조회

- **Method**: `GET`
- **URL**: `/api/contents/{contentId}/comments`
- **분류**: 회원
- **Param**: `contentId`
- **기타**: 토큰에서 userId 가져오기

---

### [플레이어로들어감] 재생 클릭 시 (시청 이력 저장 OR 이어보기)

- **Method**: `POST`
- **URL**: `/api/histories/starts/{contentId}`
- **분류**: 회원
- **Param**: `lastPosition`, `status`, `updated_at`
- **설명**: [HIS03_HIS101] (최초 재생 시) status = STARTED 로 시청 이력 insert (시청진척 기록)
  - (시청 이력O) &(& status = WATCHING) 최종시청지점을 가져와 이어보기
  - (status = COMPLETED ⇒ status=STARTED or status = STARTED) 처음부터 재생
- **기타**: 토큰에서 userId 가져오기

---

### [플레이어로들어감] 시청 지점 저장 (시청 지점 저장 OR 시청 완료 처리)

- **Method**: `PATCH`
- **URL**: `/api/histories/savepoint/{videoId}`
- **분류**: 회원
- **Param**: `lastPosition`, `updated_at`, `status`
- **설명**: [HIS03_HIS102] (시청 시속 시간이 60초 이상 될 경우) status = WATCHING
  - (재생 이후 10초마다 or 이탈 시) 최종시청일자와 최종시청지점이 초 단위로 저장된다.
  - (최종시청지점 ≥ 전체 길이의 90%) status = COMPLETED & 5초 대기 후 다음 화 재생
- **기타**: 토큰에서 userId 가져오기
  - 조회 방식 - userId + contentId로 조회&업데이트
  - OR /starts API 호출 시 historyId를 파생해넣던가 /savepoint API 호출 시마다 사용

---

### 시청 이력 목록 조회

- **Method**: `GET`
- **URL**: `/api/histories`
- **분류**: 회원
- **설명**: 현재 사용자의 3개월 이내 시청 이력 목록을 조회한다.
- **기타**: 토큰에서 userId 가져오기

---

### 시청 이력 이어보기

- **Method**: `GET`
- **분류**: 회원
- **설명**: [HIS03_HIS104] [HIS03_HIS101]에서 분기하여 처리

---

### 시청 완료 처리

- **Method**: `GET`
- **분류**: 회원
- **설명**: [HIS03_HIS105] [HIS03_HIS102]에서 분기하여 처리

---

### 시청 이력 필터링 검색

- **Method**: `GET`

---

## 백오피스

### 사용자 목록 조회

- **Method**: `GET`
- **URL**: `/api/admin/users`
- **분류**: 관리자
- **Param**: `page`, `size`, `keyword`
- **설명**: [ADM_UM01] 전체 사용자 목록을 페이징하여 조회하며 검색합니다.

---

### 사용자 상세 정보 및 이용 현황 조회

- **Method**: `GET`
- **URL**: `/api/admin/users/{userId}`
- **분류**: 관리자
- **설명**: [ADM_UM02] 특정 사용자의 프로필, 시청 이력, 찜 목록을 통합 조회합니다.

---

### 콘텐츠 등록

- **Method**: `POST`
- **URL**: `/api/admin/contents`
- **분류**: 관리자
- **Param**: `title`, `description`, `category`, `type`, `tags`
- **설명**: [PLY01_PM01]시리즈/에피소드 구분 및 제목, 줄거리, 썸네일, 태그 등 메타데이터를 등록합니다.

---

### 영상 업로드

- **Method**: `POST`
- **URL**: `/api/admin/contents/{contentId}/upload`
- **분류**: 관리자
- **Param**: `contentId`
- **설명**: [ADM_CM02] 관리자가 원본 영상을 서버에 업로드하고 트랜스코딩 프로세스를 트리거합니다.

---

### 콘텐츠 수정

- **Method**: `PUT`
- **URL**: `/api/admin/contents/{contentId}`
- **분류**: 관리자
- **Param**: `contentId`, `title`, `description`, `category`, `type`, `tags`
- **설명**: [PLY01_PM01]시리즈/에피소드 구분 및 제목, 줄거리, 썸네일, 태그 등 메타데이터를 수정합니다.

---

### 비동기 트랜스코딩

- **Method**: `GET`
- **URL**: `/api/admin/contents/{contentId}/transcoding`
- **분류**: 관리자
- **Param**: `contentId`
- **설명**: [ADM_CM03] 화질별(480p~1080p) 변환 진척도를 확인합니다.

---

### 사용자 업로드 영상 관리

- **Method**: `DELETE`
- **URL**: `/api/admin/users/contents/{contentId}`
- **분류**: 관리자
- **설명**: [ADM_UM03] 크리에이터가 올린 콘텐츠를 관리자 권한으로 삭제합니다.

---

### 인기 차트 조회

- **Method**: `GET`
- **URL**: `/api/admin/stats/popular`
- **분류**: 관리자
- **설명**: [ADM_OM01] 찜하기 수, 시청 완료율, 조회수 기반의 인기 차트 순위를 조회합니다.

---

### 시청 태그 통계 분석

- **Method**: `GET`
- **URL**: `/api/admin/stats/tags`
- **분류**: 관리자
- **설명**: [ADM_OM02] 선호 태그 시청 데이터를 시각화용 데이터로 추출합니다.

---

## 플레이어

### [1차] 영상 재생 정보 조회 (+ 이어보기) TODO: url 보안

- **Method**: `GET`
- **URL**: `/api/contents/{videoId}/play`
- **분류**: 유저
- **Param**: `videoId`
- **설명**: 콘텐츠에 대한 HLS 재생 정보를 조회한다. (접근권한 확인 필요)
- **기타**: 트리거 : 재생 버튼 클릭

---

### [1차] 시청 지점 저장(+시청 완료 처리)

- **Method**: `POST`
- **URL**: `/api/histories/savepoint/{videoId}`
- **분류**: 유저
- **설명**: [HIS03_HIS102] (시청 지속 시간이 60초 이상 될 경우) status = WATCHING
  - (재생 이후 10초마다 or 이탈 시) 최종시청일자와 최종시청지점이 초 단위로 저장된다.
  - (최종시청지점 ≥ 전체 길이의 90%) status = COMPLETED & 5초 대기 후 다음 화 재생
- **기타**: 토큰에서 userId 가져오기

---

### ABR 지원

- **Method**: `GET`
- **URL**: `/api/admin/contents/{videoId}/renditions`
- **설명**: ABR 자체는 플레이어(HLS)가 수행. 서버는 멀티 레디션(360/720/1080p) 생성 및 제공만.

---

### 댓글 작성

- **Method**: `POST`
- **URL**: `/api/contents/{videoId}/comments`
- **분류**: 유저
- **설명**: 상호작용 참고

---

### 댓글 목록 조회

- **Method**: `GET`
- **URL**: `/api/contents/{videoId}/comments`
- **분류**: 유저
- **설명**: 상호작용 참고
- **기타**: 상호 작용과 같음.

---

### 다음 콘텐츠 대상 조회

- **Method**: `GET`
- **URL**: `/api/contents/{contentId}/next`
- **분류**: 유저
- **설명**: 콘텐츠 재생 종료 후 자동재생을 위해 다음 콘텐츠를 조회한다.

---

## 멤버십 (추가)

### LG U+ 회원 인증

- **Method**: `POST`
- **URL**: `/api/membership/uplus/verify`
- **분류**: 회원
- **설명**: 전화번호와 이름을 받아 통신사 가입 여부를 확인(Mocking 또는 실제 연동)하고 등급을 업그레이드합니다.

---

### 일반 구독 결제

- **Method**: `POST`
- **URL**: `/api/payments/subscription`
- **분류**: 회원
- **설명**: 통신사 연동 없이 요청이 오면 무조건 결제 성공 처리하고 구독 등급을 변경합니다.

---
