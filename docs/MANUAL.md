# OpenSphere Logos Web — 운영·개발 메뉴얼

[svglogos.dev](https://svglogos.dev/) 스타일의 SVG 로고 갤러리 웹앱입니다.  
로고 원본은 [opensphere-platform/logos](https://github.com/opensphere-platform/logos) GitHub 저장소이며, 이미지는 [Statically CDN](https://statically.io)에서 제공합니다.

**프로덕션:** https://images.opl.io.kr

---

## 목차

1. [빠른 시작](#빠른-시작)
2. [환경 변수](#환경-변수)
3. [AI·에이전트 API](#ai에이전트-api)
4. [일반 REST API](#일반-rest-api)
5. [관리자](#관리자)
6. [배포](#배포)
7. [아키텍처](#아키텍처)

---

## 빠른 시작

```bash
git clone https://github.com/opensphere-platform/logos-web.git
cd logos-web
cp .env.example .env.local
# .env.local 편집

npm install
npm run dev
```

브라우저: http://localhost:3000

최초 실행 시 `data/catalog.sqlite`가 생성되고, `logos.json`이 GitHub에서 자동 동기화됩니다.

---

## 환경 변수

| 변수 | 필수 | 설명 |
|------|------|------|
| `ADMIN_EMAIL` | ○ | 최초 관리자 이메일 |
| `ADMIN_PASSWORD` | ○ | 최초 관리자 비밀번호 |
| `GITHUB_TOKEN` | △ | GitHub 업로드용 PAT (`repo` 권한). 업로드 기능 사용 시 필수 |
| `GITHUB_OWNER` | | 기본 `opensphere-platform` |
| `GITHUB_REPO` | | 기본 `logos` |
| `GITHUB_BRANCH` | | 기본 `main` |
| `STATICALLY_CDN_BASE` | | Statically CDN base URL |
| `LOGOS_JSON_PATH` | | (선택) 로컬 `logos.json` 경로. 있으면 원격 대신 사용 |
| `SITE_BASE_URL` | | 공개 사이트 URL. 기본 `https://images.opl.io.kr` |
| `SMTP_HOST` | △ | Gmail 등 SMTP. OTP·비밀번호 찾기 사용 시 |
| `SMTP_USER` | △ | SMTP 계정 |
| `SMTP_PASS` | △ | SMTP 앱 비밀번호 |
| `SMTP_FROM` | | 발신 주소 |

로컬 `logos.json` 예시:

```env
LOGOS_JSON_PATH=../OpenSphere-logos/OpenSphere-logos-github/logos.json
```

---

## AI·에이전트 API

AI·자동화 도구가 HTML 스크래핑 없이 로고 URL을 얻도록 설계된 엔드포인트입니다.

### 발견(Discovery) 문서

| 경로 | 설명 |
|------|------|
| `/llms.txt` | 에이전트용 요약 가이드 |
| `/openapi.json` | OpenAPI 3.1 스펙 |
| `/robots.txt` | `/api/*` 크롤 허용 |
| `/sitemap.xml` | 로고 상세 페이지 목록 |

### 핵심: 로고 URL 해석 — `GET /api/resolve`

가장 많이 쓰는 엔드포인트입니다. 검색어·별칭으로 최적 로고의 CDN URL을 반환합니다.

```http
GET /api/resolve?q=react
GET /api/resolve?q=react&variant=icon
GET /api/resolve?q=react&format=minimal
```

**파라미터**

| 이름 | 설명 |
|------|------|
| `q` | 로고 이름, shortname, 별칭 (예: `react`, `k8s`) |
| `variant` | `default` \| `icon` \| `wordmark` (기본: `default`) |
| `format` | `json` (기본) \| `minimal` — `minimal`은 CDN URL만 plain text |

**응답 예 (`format=json`)**

```json
{
  "query": "k8s",
  "variant": "default",
  "match": {
    "shortname": "kubernetes",
    "name": "Kubernetes",
    "confidence": 1,
    "matchReason": "alias:k8s"
  },
  "url": "https://cdn.statically.io/gh/opensphere-platform/logos@main/logos/kubernetes.svg",
  "format": "svg",
  "scalable": true,
  "file": {
    "filename": "kubernetes.svg",
    "role": "default"
  },
  "pageUrl": "https://images.opl.io.kr/logo/kubernetes",
  "candidates": []
}
```

**curl 예시**

```bash
# URL만 필요할 때
curl "https://images.opl.io.kr/api/resolve?q=docker&format=minimal"

# 아이콘 variant
curl "https://images.opl.io.kr/api/resolve?q=adobe&variant=icon"
```

### 별칭(alias)

| 별칭 | shortname |
|------|-----------|
| `k8s`, `kube` | `kubernetes` |
| `reactjs` | `react` |
| `nodejs`, `node` | `nodejs` |
| `golang` | `go` |
| `postgres`, `psql` | `postgresql` |
| `gh` | `github` |
| `ts` | `typescript` |
| `nextjs` | `nextjs` |
| `tailwind`, `tailwindcss` | `tailwindcss` |

별칭 목록은 `src/lib/aliases.ts`에서 확장할 수 있습니다.

### variant(변형)와 사이즈

- SVG는 **벡터**이므로 CDN URL에 픽셀 크기 파라미터가 없습니다.
- `default` — 일반 로고 (`react.svg`)
- `icon` — 아이콘형 (`*-icon.svg`)
- `wordmark` — 워드마크형 (파일명에 `wordmark` 포함 시)
- 표시 크기는 HTML/CSS `width`/`height`로 지정합니다.

### 전체 카탈로그 — `GET /api/catalog`

인덱싱·RAG·오프라인 검색용 전체 덤프입니다.

```http
GET /api/catalog
GET /api/catalog?fields=shortname,name,url,iconUrl
```

### 단축 URL — `GET /i/{shortname}`

CDN으로 302 리다이렉트합니다.

```http
GET /i/react
GET /i/adobe?variant=icon
```

### URL 패턴 정리

| 용도 | 패턴 |
|------|------|
| 갤러리 페이지 | `https://images.opl.io.kr/logo/{shortname}` |
| CDN 직접 | `https://cdn.statically.io/gh/opensphere-platform/logos@main/logos/{filename}.svg` |
| 단축 | `https://images.opl.io.kr/i/{shortname}` |

---

## 일반 REST API

| 메서드 | 경로 | 설명 |
|--------|------|------|
| `GET` | `/api/logos` | 목록·검색 (`q`, `category`, `tag`, `page`, `pageSize`) |
| `GET` | `/api/logos/{shortname}` | 단일 로고 상세 |
| `GET` | `/api/categories` | 카테고리 목록 |
| `GET` | `/api/tags` | 태그 목록 |
| `POST` | `/api/sync` | `logos.json` → SQLite 동기화 (관리자) |

`files[]` 각 항목에는 `role`, `format`, `scalable` 메타데이터가 포함됩니다.

---

## 관리자

URL: `/admin` (헤더 버튼 없음, 직접 접속)

### 메뉴

| 경로 | 기능 |
|------|------|
| `/admin/contents` | 로고 업로드, 카테고리·태그, `logos.json` 동기화 |
| `/admin/site` | GitHub/SMTP 연동 상태, 비밀번호 변경, 관리자 계정 |

### 인증

- 이메일 + 비밀번호
- 이메일 OTP (SMTP 설정 필요)
- 비밀번호 찾기: 로그인 화면에서 OTP → 새 비밀번호 설정

### GitHub 업로드 흐름

1. SVG 드래그 앤 드롭
2. 메타데이터 입력
3. 「GitHub에 배포」→ `logos/*.svg` + `logos.json` 단일 커밋
4. Statically CDN URL 즉시 표시 (CDN 반영은 수 분 소요 가능)

---

## 배포

### 프로덕션 환경 (현재)

| 항목 | 값 |
|------|-----|
| 서버 | OCI `cc2-dns1` (Ubuntu) |
| 앱 경로 | `/var/www/images.opl.io.kr` |
| 프로세스 | `opensphere-logos` (systemd) |
| 내부 포트 | `3100` |
| 리버스 프록시 | Caddy → HTTPS |
| 도메인 | `images.opl.io.kr` |

### 재배포

```bash
bash scripts/deploy-remote.sh
```

또는 수동:

```bash
rsync -az --delete \
  --exclude node_modules --exclude .next --exclude .git \
  --exclude 'data/*.sqlite*' --exclude '.env*.local' \
  ./ cc2-dns1:/var/www/images.opl.io.kr/

ssh cc2-dns1 "cd /var/www/images.opl.io.kr && npm run build && sudo systemctl restart opensphere-logos"
```

서버 `.env.production`에 비밀값을 설정합니다. (`rsync --delete` 시 로컬에 없는 파일은 삭제되지 않도록 주의)

### E2.Micro 주의사항

- RAM 1GB 환경에서는 `npm ci` 시 swap(2GB) 권장
- `better-sqlite3` 네이티브 빌드 필요

### Caddy 설정 예

```caddy
images.opl.io.kr {
    reverse_proxy localhost:3100
}
```

---

## 아키텍처

```
브라우저 / AI 에이전트
        │
        ▼
  images.opl.io.kr (Next.js)
        │
        ├── SQLite (data/catalog.sqlite) — 메타·카테고리·태그
        │
        ├── GitHub API — logos.json / SVG 업로드
        │
        └── 응답에 CDN URL 포함
                    │
                    ▼
        cdn.statically.io (실제 SVG 바이트)
```

- **웹서버**: 페이지·API·검색·관리
- **CDN**: 로고 이미지 트래픽의 대부분
- **GitHub**: 로고 원본 저장소 (SoT)

### 주요 디렉터리

```
src/
  app/api/resolve/     # AI URL 해석
  app/api/catalog/     # 전체 카탈로그 덤프
  app/llms.txt/        # AI 가이드
  lib/resolve.ts       # 검색·매칭 로직
  lib/aliases.ts       # 별칭 맵
  lib/logo-files.ts    # variant 메타데이터
```

---

## 기술 스택

- Next.js 16 (App Router)
- TypeScript, Tailwind CSS 4
- better-sqlite3 (내장 SQLite)
- Octokit (GitHub API)
- nodemailer + bcryptjs (관리자 인증)

---

## 라이선스·출처

로고 SVG 저작권은 각 브랜드 소유입니다.  
원본 저장소: https://github.com/opensphere-platform/logos
