# Backend Sequence Diagrams

목적: TownPet의 복잡한 백엔드 흐름을 면접/리뷰에서 코드 없이 설명할 수 있게 Mermaid 시퀀스 다이어그램으로 고정한다.

범위:
- 현재 구현은 MSA가 아니라 Next.js App Router 기반 모놀리식 앱이다.
- 따라서 API 서버 여러 개나 Kafka를 가정하지 않고, `UI -> Route/Action -> Service/Query -> Prisma/External` 책임 경계를 그대로 표현한다.
- 단순 CRUD가 아니라 정책, 권한, rate-limit, 외부 저장소, 운영 게이트가 함께 얽히는 흐름만 포함한다.

## 1. 게시글 작성 + 이미지 업로드

상황: 사용자가 글 작성 중 이미지를 업로드하고, 최종 게시글을 생성한다.

관여 컴포넌트:
- `app/src/components/posts/post-create-form.tsx`
- `app/src/app/api/upload/route.ts`
- `app/src/server/upload.ts`
- `app/src/app/api/posts/route.ts`
- `app/src/server/services/posts/post-create.service.ts`
- `app/src/server/services/posts/post-create-variants.ts`

```mermaid
sequenceDiagram
  actor User
  participant UI as PostCreateForm
  participant UploadRoute as POST /api/upload
  participant UploadService as saveUploadedImage
  participant Storage as Upload storage
  participant PostRoute as POST /api/posts
  participant PostService as createPost
  participant Policy as Policy/RateLimit/Sanction
  participant DB as Prisma/PostgreSQL

  User->>UI: 이미지 선택
  UI->>UploadRoute: multipart file + auth/guest headers
  UploadRoute->>Policy: user sanction or guest step-up + rate-limit
  Policy-->>UploadRoute: allowed
  UploadRoute->>UploadService: validate signature/size/type
  UploadService->>Storage: store trusted upload asset
  Storage-->>UploadService: upload URL
  UploadService-->>UploadRoute: normalized image metadata
  UploadRoute-->>UI: 201 upload payload
  User->>UI: 게시글 제출
  UI->>PostRoute: title/content/type/structured fields/imageUrls
  PostRoute->>Policy: authenticated or guest write limits
  Policy-->>PostRoute: allowed
  PostRoute->>PostService: createPost(input)
  PostService->>Policy: validation, contact policy, forbidden keywords, board policy
  PostService->>DB: transaction create post + structured detail + image rows
  DB-->>PostService: created post
  PostService-->>PostRoute: public post payload
  PostRoute-->>UI: 201 created post
```

설계 포인트:
- 업로드와 게시글 생성은 API가 분리되어 있지만, 게시글 생성 시 이미지 URL을 다시 정규화해 신뢰 가능한 업로드만 연결한다.
- 작성 정책은 UI가 아니라 route/service 계층에서 rate-limit, sanction, guest step-up, 구조화 validation으로 집행한다.

## 2. 신고 접수 + 모더레이션 큐

상황: 로그인 사용자가 게시글이나 댓글을 신고하고, 관리자 큐에서 처리 가능한 상태로 쌓인다.

관여 컴포넌트:
- `app/src/app/api/reports/route.ts`
- `app/src/server/services/moderation/report.service.ts`
- `app/src/server/services/moderation/sanction.service.ts`
- `app/src/server/moderation-action-log.ts`
- `app/src/server/queries/moderation/report.queries.ts`
- `app/src/app/admin/reports`

```mermaid
sequenceDiagram
  actor Reporter
  participant ReportRoute as POST /api/reports
  participant Auth as requireCurrentUser
  participant RateLimit as AuthenticatedWriteThrottle
  participant ReportService as createReport
  participant ModerationPolicy as Report moderation policy
  participant DB as Prisma/PostgreSQL
  participant AdminQuery as report.queries
  participant AdminUI as /admin/reports

  Reporter->>ReportRoute: report target + reason
  ReportRoute->>Auth: require current user
  Auth-->>ReportRoute: reporter id
  ReportRoute->>RateLimit: report:create user/ip/fingerprint
  RateLimit-->>ReportRoute: allowed
  ReportRoute->>ReportService: createReport(reporterId, input)
  ReportService->>DB: check duplicate report
  ReportService->>DB: resolve active post/comment target
  ReportService->>ModerationPolicy: reporter trust + pending signals
  ModerationPolicy-->>ReportService: moderation summary
  ReportService->>DB: transaction create pending report
  opt auto-hide threshold reached
    ReportService->>DB: hide post target + bump caches
  end
  DB-->>ReportService: report row
  ReportService-->>ReportRoute: report payload
  ReportRoute-->>Reporter: 201 created
  AdminUI->>AdminQuery: list pending reports
  AdminQuery->>DB: aggregate/report list query
  DB-->>AdminQuery: queue items
  AdminQuery-->>AdminUI: moderation queue
```

설계 포인트:
- 신고 접수는 단순 insert가 아니라 duplicate 방지, 대상 상태 확인, reporter trust, 조건부 auto-hide까지 포함한다.
- 관리자 화면은 service가 아니라 query 계층에서 read model을 가져오고, 처리 시점의 audit/action log와 제재는 별도 moderation service가 담당한다.

## 3. Credentials 로그인 + 세션/제재 차단

상황: 사용자가 이메일/비밀번호로 로그인할 때 계정 상태, rate-limit, 감사 로그, 제재 상태를 함께 확인한다.

관여 컴포넌트:
- `app/src/app/api/auth/[...nextauth]/route.ts`
- `app/src/server/auth-credentials.ts`
- `app/src/server/auth-login-rate-limit.ts`
- `app/src/server/auth-audit-log.ts`
- `app/src/server/services/moderation/sanction.service.ts`
- `app/src/server/auth.ts`

```mermaid
sequenceDiagram
  actor User
  participant NextAuth as NextAuth route
  participant Credentials as authorizeCredentialsLogin
  participant RateLimit as Login rate limits
  participant UserQuery as User query
  participant Password as verifyPassword
  participant Sanction as sanction.service
  participant Audit as Auth audit log
  participant Session as JWT/session callbacks

  User->>NextAuth: email/password sign in
  NextAuth->>Credentials: authorize(credentials, request)
  Credentials->>RateLimit: IP/account+IP/account rules
  RateLimit-->>Credentials: attempt states
  Credentials->>UserQuery: find email case-insensitive
  UserQuery-->>Credentials: user + passwordHash + sessionVersion
  Credentials->>Password: verify password
  Password-->>Credentials: valid
  Credentials->>Sanction: assertUserInteractionAllowed(userId)
  Sanction-->>Credentials: allowed or blocked
  Credentials->>Audit: LOGIN_SUCCESS or failure reason
  Credentials-->>NextAuth: authorized user + sessionVersion
  NextAuth->>Session: issue JWT/session
  Session-->>User: authenticated session
```

설계 포인트:
- 로그인 실패도 동일한 감사 경로에 남기고, 실패 횟수에 따라 지연/제한을 적용한다.
- `sessionVersion`을 세션 payload에 포함해 비밀번호 변경/세션 무효화 시 기존 JWT를 끊을 수 있게 한다.

## 4. Vercel 배포 + security env preflight

상황: `main` push 후 Vercel이 production/staging 배포를 수행한다.

관여 컴포넌트:
- `app/package.json`
- `app/scripts/vercel-build.ts`
- `app/scripts/check-security-env.ts`
- `app/prisma/migrations`
- Vercel build runtime

```mermaid
sequenceDiagram
  actor Developer
  participant GitHub as GitHub main
  participant Vercel as Vercel build
  participant BuildScript as scripts/vercel-build.ts
  participant EnvCheck as ops:check:security-env:build
  participant Prisma as prisma migrate deploy
  participant NextBuild as next build
  participant Runtime as Production deployment

  Developer->>GitHub: push main
  GitHub-->>Vercel: deployment trigger
  Vercel->>BuildScript: pnpm build:vercel
  BuildScript->>EnvCheck: build-profile security env preflight
  EnvCheck-->>BuildScript: pass or failed keys
  BuildScript->>Prisma: migrate deploy with retry/baseline handling
  Prisma-->>BuildScript: schema ready
  BuildScript->>Prisma: prisma generate
  Prisma-->>BuildScript: client generated
  BuildScript->>NextBuild: next build
  NextBuild-->>BuildScript: build output
  BuildScript-->>Vercel: success
  Vercel-->>Runtime: promote deployment
```

설계 포인트:
- 배포 hot path는 `build` profile만 실행해 필수 env misconfig를 빠르게 막는다.
- 원격 `/api/health` control-plane drift는 운영자용 `ops:check:security-env:strict`로 분리해, unrelated 작업 뒤 반복 배포 실패가 생기지 않게 했다.

## 면접 설명 기준

- 이 문서는 "예쁜 UML"보다 런타임 메시지 흐름과 책임 경계를 설명하기 위한 문서다.
- 현재 구조를 MSA처럼 과장하지 않고, 모놀리식 앱 안에서도 route/service/query/DB/external boundary를 분리해 설명한다.
- 복잡도가 낮은 CRUD에는 다이어그램을 만들지 않고, 정책과 운영 리스크가 섞인 흐름에만 다이어그램을 사용한다.
