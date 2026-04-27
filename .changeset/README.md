# Changesets (npm release)

- 로컬에서 릴리스 범위만 적을 때: `pnpm changeset` → 변경 설명 + 패키지별 bump(patch/minor/major) 선택
- `main`에 머지되면 GitHub Action이
  1. 아직 changeset이 남아 있으면 “Version packages” PR을 만들고
  2. 그 PR 머지 이후(버전/체인지로그가 반영되면) `pnpm -r run build` 후 `changeset publish`로 npm에 올립니다
- **배포에 필요:** 리포지토리 시크릿 `NPM_TOKEN` (npm automation token, `publish` 권한)

`@scriptiz/*` 스코프는 npm에서 org를 만들고, 첫 `publish`는 해당 스코프 권한이 있는 토큰을 써야 합니다.