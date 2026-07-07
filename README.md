# OpenSphere Logos

개발·디자인에 필요한 **SVG 로고를 검색하고 바로 사용할 수 있는 웹 갤러리**입니다.

**기본 도메인:** https://logos.opl.io.kr/

## 무엇을 할 수 있나요?

- 브랜드·기술 로고를 **검색**하고 미리봅니다.
- 로고마다 제공되는 **CDN 주소(URL)를 복사**해 문서·웹페이지·슬라이드에 바로 넣습니다.
- 하나의 로고에 아이콘·워드마크 등 여러 형태가 있으면 **원하는 형태를 골라** 사용합니다.

## 어떻게 쓰나요?

1. https://logos.opl.io.kr/ 접속
2. 원하는 로고 이름 검색 (예: `react`, `docker`, `centos`)
3. 로고를 클릭해 상세 화면으로 이동
4. 원하는 형태의 **미리보기 또는 「복사」 버튼**을 눌러 URL 복사

복사한 주소는 이런 형태입니다.

```
https://cdn.statically.io/gh/openplatform-labs/images@main/logos/react.svg
```

HTML에서는 이렇게 사용합니다.

```html
<img src="https://cdn.statically.io/gh/openplatform-labs/images@main/logos/react.svg" alt="React" />
```

## 개발자·에이전트용 API

프로그램에서 로고 주소를 바로 받아올 수 있습니다.

```bash
curl "https://logos.opl.io.kr/api/resolve?q=react&format=minimal"
# → https://cdn.statically.io/gh/openplatform-labs/images@main/logos/react.svg
```

## 더 알아보기

| 항목 | 링크 |
|------|------|
| AI 가이드 | https://logos.opl.io.kr/llms.txt |
| API 명세 (OpenAPI) | https://logos.opl.io.kr/openapi.json |
| 운영·개발 상세 문서 | [docs/MANUAL.md](docs/MANUAL.md) |
