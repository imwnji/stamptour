# SEOCHON WINTER JOURNAL — 서촌 겨울 스탬프 투어 (모바일 웹, beta)

SW융합프로젝트 조별과제. 기획 요약은 `docs/plan.md` (원본 기획서 PDF 대신 이걸 읽을 것). 단, 기획서의 3D 지도는 폐기하고 **2D 도트(픽셀) 마을**로 만듦.
UI 문구·주석은 한국어. 세로 모바일(390×844) 우선.

## 명령
- `npm run dev` — 개발 서버 (`--host`, 같은 와이파이 폰에서 접속)
- `npm run build` — 배포용 `dist/` (Vercel / GitHub Pages, `base: './'`)
- `npm run build:artifact` — 폰트까지 CSS에 인라인한 `dist-artifact/` (claude.ai 미리보기용, 평소엔 불필요)
- 테스트 URL: `?demo=7` (7칸 미리 채움), `?demo=17`, `?debug` (`window.__pixel` = cam/av/world/useApp/setZoom)

## 스택
React 18 + Vite 5, Canvas2D(도트 렌더), zustand, IndexedDB.
폰트: 전부 도트(갈무리) — Galmuri11(화면 글: 제목·버튼·안내, 12·24·36px) + Galmuri14(내가 쓴 글: 날짜·한 줄 기록·메모, `.hand`, 14·28px). `src/fonts.css`. 굵게는 Galmuri11 Bold 만 (14 는 가짜 굵기 금지).

## 디자인 컨셉: "도트로 그린 겨울 서촌 일기장"
- 색: 한지(종이) `#F7F2E8` · 먹 `#272A40` · 인주 주홍 `#D14B35` · 등불 `#F4B860` · 솔 `#3B6655` · 겨울하늘 `#AFC3DA` · 남색 표지 `#43507A`. 지도는 `src/pixel/palette.js`, UI 는 `styles.css` 의 `:root` 변수.
- 지도 바닥 = 일기장 도트 그리드(1칸마다 2x2 점), UI 종이(`.page-paper`)도 같은 점.
- UI 부품 = 문구류: 마스킹테이프(`.tape .tape-red/blue/amber/pine`, `--tape`로 색), 메모 쪽지(안내), 인덱스 카드(매장), 여권식 STAMP HERE 칸, 폴라로이드, 줄 노트, 스프링 저널·남색 천 표지+주홍 고무줄.
- 도트 테두리 = `src/pixel-frames.css` (자동 생성, `node scripts/build-pixel-frames.mjs`). 회전·확대되는 요소엔 border-image 이음선이 보이므로 box-shadow 외곽선 사용.

## 구조 (어디를 고치나)
- `src/data/stores.js` — 매장 17곳 = 구글맵 공유 목록 "서촌겨울스탬프투어" (lat/lng·주소·cid·`model` 고유 모양·`pixelSide`). 길은 자동 선택, 필요할 때만 `shift`/`flip` 손보정.
- `src/data/streets.js` — **자동 생성** (`scripts/build-streets.mjs`, OpenStreetMap 도로). STREETS = 출발점→각 매장 실제 경로(걷는 길), BG_STREETS = 나머지 골목(그림만). `START_LL` = 출발점(8Q98HXG9+HJH). 매장·출발점 바꾸면 스크립트 상단 주석대로 다시 생성.
- `src/data/layout.js` — 위경도→칸 균일 변환(1칸=5m), 길 정리(`tidyStreets`: 짧은 막다른 가지·나란히 붙은 막다른 길 제거), 매장을 가까운 길 옆 빈자리에 배치(정면은 모두 남쪽, `shopScale` 1.5), 길 그래프 생성.
- `src/data/map.js` — layout 결과(NODES/EDGES/STREETS/BG_STREETS, MAP_W·MAP_H 자동) + 다익스트라 `findPath`, `distToStreets`. 출발 노드 `S`, 북쪽 끝 `PLAZA`.
- `src/pixel/` — 도트 마을 (Canvas2D, 정수 배율, 1칸=16px).
  - `palette.js`(겨울 팔레트 8색) · `colors.js`(명암 단계) · `draw.js`(도트 도구, 자동 외곽선, `withScale` 다시 그리기 배율)
  - `shopIcons.js` — 가게 아이콘 = "파는 물건 모양의 집". 그림 파일 `src/assets/shops/<이름>.png|webp` 는 **손대지 않고 그대로** 씀: 64px 이하 도트는 정수 2배, 큰 원본(webp 등)은 투명 테두리만 잘라 원본 11.25px = 지도 1px 로 부드럽게 축소(미리 줄인 단계 mips). 코드 그림 6종(moka-pot 등)은 예비. 가게에 붙이려면 stores.js 에 `icon: '<이름>'`.
  - `sprites.js` — 나무·소품·동물·아바타 전부 코드로. 예전 가게 그림(고유 모양 6종 + 공통)은 아이콘이 없을 때만 쓰는 예비. `SHOP_K`=1.5 (stores.js `shopScale` 과 같게)
  - `world.js` — 바닥(눈·판석 돌길·광장·디딤돌·불빛·발자국) + 물체 배치(가로등·길가 소품·숲·동물, 가게 둘레는 비움)
  - `PixelMap.jsx` — 카메라 추적·드래그·핀치/휠 확대, 탭→걷기, 텔레포트, 엽서, 눈송이, 인트로
- `src/ui/` — Hud(일기장 머리말: 날짜 라벨·도장 카드·메모 쪽지, 지도 버튼 포함), PaperMap(종이 지도: 번호 핀+목록→`goToStore`), StoreSheet, StampScreen, Journal(저널·일기장·완성 페이지).
- `src/lib/` — db(IndexedDB, Firebase 전환 시 이 파일만), stampSvg(도장 문양 SVG), photo(사진 압축), shareImage(1080×1920 공유 이미지).
- `src/store.js` — zustand 전역 상태 (phase, stamps, walkTarget, activeStore, journal, paperMap …).

## 좌표 규칙
월드: x 서(-)/동(+), z 북(-)/남(+), 1칸=5m=16px, 지도 크기는 layout 이 자동 계산. 가게 정면 = 남쪽(화면 아래).

## 작업 시 주의
- 바닥은 큰 캔버스 한 장(약 1200×2800px)에 미리 그리고, 물체는 보이는 것만 y 순서로 그림. 도트가 번지지 않게 정수 좌표·정수 배율 유지.
- 저장은 IndexedDB 실패 시 메모리로 대체됨 (try/catch 유지).
- 지도 데이터 © OpenStreetMap contributors (ODbL) — 화면 왼쪽 아래 표기(`.osm-credit`) 유지.
- iframe(미리보기) 안에서는 다운로드·Web Share 숨김 (`IN_FRAME`, Journal.jsx).
- 카메라 `capture`는 HTTPS에서만 안정 → 실기기 테스트는 Vercel 배포 주소로.

## 다음 할 일
- 위치 기반 방문 인증(가게 반경 안에서만 도장), 실시간 날씨, Firebase 동기화.
