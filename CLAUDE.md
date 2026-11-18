# SEOCHON WINTER JOURNAL — 서촌 겨울 스탬프 투어 (모바일 웹, beta)

SW융합프로젝트 조별과제. 기획 요약은 `docs/plan.md` (원본 기획서 PDF 대신 이걸 읽을 것).
UI 문구·주석은 한국어. 세로 모바일(390×844) 우선.

## 명령
- `npm run dev` — 개발 서버 (`--host`, 같은 와이파이 폰에서 접속)
- `npm run build` — 배포용 `dist/` (Vercel / GitHub Pages, `base: './'`)
- `npm run build:artifact` — 폰트까지 CSS에 인라인한 `dist-artifact/` (claude.ai 미리보기용, 평소엔 불필요)
- 테스트 URL: `?demo=7` (7칸 미리 채움), `?demo=8`, `?debug` (`window.__debug` = avatar/camera/controls/project)

## 스택
React 18 + Vite 5, three 0.169 + @react-three/fiber 8 + drei 9, gsap, zustand, IndexedDB.
폰트: Gaegu(손글씨)·Gowun Dodum — `src/fonts.css` (woff2 한글 서브셋).

## 구조 (어디를 고치나)
- `src/data/stores.js` — 매장 17곳 = 구글맵 공유 목록 "서촌겨울스탬프투어" (lat/lng·주소·cid). 길은 자동 선택, 필요할 때만 `shift`/`flip` 손보정.
- `src/data/streets.js` — **자동 생성** (`scripts/build-streets.mjs`, OpenStreetMap 도로). STREETS = 출발점→각 매장 실제 경로(걷는 길), BG_STREETS = 나머지 골목(그림만). `START_LL` = 출발점(8Q98HXG9+HJH). 매장·출발점 바꾸면 스크립트 상단 주석대로 다시 생성.
- `src/data/layout.js` — 위경도→칸 균일 변환(1칸=5m, 왜곡 없음), 매장을 가까운 길 옆 빈자리에 배치(다른 길·건물과 안 겹치게), 길 그래프 생성. `BUILD_SCALE`=0.8.
- `src/data/map.js` — layout 결과(NODES/EDGES/STREETS/BG_STREETS, MAP_W·MAP_H 자동) + 다익스트라 `findPath`, `distToStreets`. 출발 노드 `S`, 필운대로 북쪽 끝 `PLAZA`.
- `src/three/MapScene.jsx` — Canvas(직교 카메라, `VIEW_W`=가로 보이는 칸 수), 인트로 타임라인, 걷기/카메라 추적, 줌에 따른 이동 범위 제한, 눈 파티클.
- `src/three/mapTexture.js` — 바닥 일러스트를 Canvas2D로 그림 (AI 지도 이미지 생기면 Ground에서 텍스처 교체).
- `src/three/Building.jsx` — 동글동글한 공통 가게(둥근 벽·구름 눈 지붕·아치 문·둥근 창·말린 차양·간판) + 업종별 앞마당 소품 + 방문 엽서(Postcard).
- `src/three/Decor.jsx` — 나무·가로등·벤치·꽃·광장. `StreetDecor`가 길·가게를 피해 자동 배치(나무·덤불은 Instances).
- `src/three/Avatar.jsx` — 여자아이 아바타(정면 +z). 애니메이션 모드: idle / walk / wave.
- `src/three/textures.js` — 간판·차양·벽돌·칠판 등 CanvasTexture.
- `src/ui/` — Hud, StoreSheet(매장 정보), StampScreen(사진+한 줄 기록+도장), Journal(저널·일기장·완성 페이지).
- `src/lib/` — db(IndexedDB, Firebase 전환 시 이 파일만), stampSvg(도장 문양 SVG), photo(사진 압축), shareImage(1080×1920 공유 이미지).
- `src/store.js` — zustand 전역 상태 (phase, stamps, walkTarget, activeStore, journal …).

## 좌표 규칙
월드: x 서(-)/동(+), z 북(-)/남(+), 1칸=5m, 지도 크기는 layout 이 자동 계산(현재 약 76×175칸). 모델 정면 = 로컬 +z. 건물 회전 `rot`(라디안).

## 작업 시 주의
- 메시 수가 많음(가게당 ~60). 소품 추가 시 모바일 성능 고려 → 반복 소품은 Instances/merge 우선.
- 저장은 IndexedDB 실패 시 메모리로 대체됨 (try/catch 유지).
- 지도 데이터 © OpenStreetMap contributors (ODbL) — 바닥 그림 왼쪽 아래 표기 유지.
- iframe(미리보기) 안에서는 다운로드·Web Share 숨김 (`IN_FRAME`, Journal.jsx).
- 카메라 `capture`는 HTTPS에서만 안정 → 실기기 테스트는 Vercel 배포 주소로.

## 다음 할 일
- 위치 기반 방문 인증(가게 반경 안에서만 도장), 실시간 날씨, Firebase 동기화.
- Blender .glb 로 Avatar/Building 교체.
