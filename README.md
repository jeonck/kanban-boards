# kanban-boards

Claude 아티팩트로 배포하는 칸반 보드 모음입니다. 공통 코어(`src/core`)와 보드별 설정(`src/boards/*`)으로 나뉘어 있고, 빌드하면 아티팩트에 바로 올릴 수 있는 단일 HTML 파일이 `dist/`에 만들어집니다.

| 보드 | 용도 | 산출물 |
|---|---|---|
| `content` | 콘텐츠 제작 (아이디어→기획→작성→검토→발행, 클릭·노출 성과) | `dist/content-board.html` |
| `dev` | 개발 프로젝트 (담당자·포인트·P0~P3·막힘·WIP 제한·사이클 타임) | `dist/dev-board.html` |

## 명령

```bash
npm install
npm run build        # dist/*.html 생성 (node build.mjs [content|dev] 로 하나만도 가능)
npm test             # 빌드 후 jsdom 스모크 테스트 (렌더, 편집, 드래그, 이력, 내보내기·가져오기, DB 경로)
```

## 구조

```
src/
  core/        공통 로직 (보드와 무관)
    app.js       화면 조립, createApp(config)
    store.js     저장소: 아티팩트 DB → localStorage 폴백, 이력 기록
    drag.js      포인터 이벤트 드래그 (마우스 6px, 터치 길게 누르기)
    editor.js    편집창 공통 처리   transfer.js  JSON/CSV 내보내기·가져오기
    stages.js    모바일 단계 탭    history-view.js  이력 표시
    model.js, util.js, dates.js, toast.js
  styles/      공통 CSS (base, board, editor, data, mobile)
  partials/    공통 HTML 조각 (<!--@include path--> 로 삽입)
  boards/<id>/
    config.js    열, 저장 키, 훅 등 보드 설정
    model.js     카드 정규화·이력 비교   data.js  예시 카드
    card.js filters.js insights.js editor.js transfer.js
    template.html editor.html styles/*.css
    main.js      createApp(config) 호출
build.mjs      esbuild로 번들 + CSS/HTML 인라인 → dist/
tests/smoke.mjs
```

CSS는 보드 토큰 → 공통 → 보드 순서로 합쳐집니다. 공통 CSS는 `--danger`, `--warn`, `--ok`, `--scrim` 같은 의미 토큰만 쓰고, 값은 각 보드의 `tokens.css`가 정합니다.

## 아티팩트로 배포

`dist/*.html`을 Artifact 도구로 발행하고 캐퍼빌리티를 `{ "db": {}, "downloads": true }`로 지정합니다. 기존 URL에 `url`을 주면 같은 주소로 갱신되며 DB 데이터는 유지됩니다.

## DB 스키마

- `cards`: `title, col, pri, due, labels, order, sample` + 콘텐츠 `imp, clk` / 개발 `type, assignee, pts, link, blocked, key, createdAt, startedAt, doneAt`
- `history`: `cardId, at, type(create|move|edit), from, to`
- DB가 없으면 localStorage(`content-board-v1`, `dev-board-v1`, 이력은 `-h` 접미사)를 씁니다.

## 새 보드 추가

1. `src/boards/<id>/`를 기존 보드에서 복사해 열, 모델, 카드 렌더, 필터를 수정합니다.
2. `build.mjs`의 `BOARDS`에 항목을 추가합니다.
3. `tests/smoke.mjs`의 `BOARDS`에 기대값을 추가하고 `npm test`를 실행합니다.
