# OpenSphere Logos Web

[svglogos.dev](https://svglogos.dev/) 스타일의 SVG 로고 갤러리 웹앱입니다.

**프로덕션:** https://images.opl.io.kr  
**상세 메뉴얼:** [docs/MANUAL.md](docs/MANUAL.md)

- [opensphere-platform/logos](https://github.com/opensphere-platform/logos) GitHub 저장소 연동
- [Statically CDN](https://statically.io) URL 제공 및 복사
- **AI·에이전트 API** (`/api/resolve`, `/llms.txt`, `/openapi.json`)
- **프로젝트 내장 SQLite** (`data/catalog.sqlite`) — 별도 DB 서버 불필요
- 관리자: GitHub 업로드, 카테고리·태그 관리

## 빠른 링크

| 문서 | 경로 |
|------|------|
| 운영·개발 메뉴얼 | [docs/MANUAL.md](docs/MANUAL.md) |
| AI 가이드 (라이브) | https://images.opl.io.kr/llms.txt |
| OpenAPI | https://images.opl.io.kr/openapi.json |

## AI API 한 줄 예시

```bash
curl "https://images.opl.io.kr/api/resolve?q=react&format=minimal"
# → https://cdn.statically.io/gh/opensphere-platform/logos@main/logos/react.svg
```

## 시작하기

```bash
cp .env.example .env.local
# .env.local 편집

npm install
npm run dev
```

http://localhost:3000 에서 확인합니다.

## 환경 변수

| 변수 | 설명 |
|------|------|
| `ADMIN_PASSWORD` | 관리자 페이지 비밀번호 |
| `GITHUB_TOKEN` | 로고 GitHub 업로드용 PAT (repo 권한) |
| `GITHUB_OWNER` | 기본값 `opensphere-platform` |
| `GITHUB_REPO` | 기본값 `logos` |
| `GITHUB_BRANCH` | 기본값 `main` |
| `STATICALLY_CDN_BASE` | Statically CDN base URL |
| `SITE_BASE_URL` | 공개 사이트 URL (기본 `https://images.opl.io.kr`) |
| `LOGOS_JSON_PATH` | (선택) 로컬 logos.json 경로, 동기화 시 우선 사용 |

로컬 logos.json 예시:

```env
LOGOS_JSON_PATH=../OpenSphere-logos/OpenSphere-logos-github/logos.json
```

## Statically CDN URL

```
https://cdn.statically.io/gh/opensphere-platform/logos@main/logos/{filename}.svg
```

## 내장 DB (SQLite)

- 경로: `data/catalog.sqlite` (gitignore)
- 테이블: `logos`, `logo_files`, `categories`, `tags`, `logo_categories`, `logo_tags`
- 카테고리·태그 메타데이터는 SQLite에서 관리
- `logos.json`은 GitHub에서 동기화 (관리자 → 동기화 버튼)

## 관리자: PC → GitHub → CDN 원스톱 배포

`/admin` 에서 GitHub 웹 UI 없이 로고를 배포합니다.

1. **PC에서 SVG 드래그 앤 드롭** — 즉시 미리보기
2. **메타데이터 입력** (브랜드명 자동 추론)
3. **「GitHub에 배포하고 CDN URL 받기」** 클릭
   - `logos/*.svg` + `logos.json` 단일 커밋으로 GitHub 반영
   - 로컬 SQLite에 메타데이터 저장
   - Statically CDN URL 즉시 표시

### GITHUB_TOKEN 설정 (필수)

```env
GITHUB_TOKEN=ghp_xxxxxxxx   # repo 권한 (opensphere-platform/logos)
ADMIN_PASSWORD=your-password
```

토큰 생성: GitHub → Settings → Developer settings → Personal access tokens → `repo` scope

배포 후 Statically CDN은 GitHub push를 감지해 **수 분 내** 자동 갱신됩니다.

## 기술 스택

- Next.js 16 (App Router)
- Tailwind CSS 4
- better-sqlite3 (내장 SQLite)
- Octokit (GitHub API)
