# SEOCHON WINTER JOURNAL — 서촌 겨울 스탬프 투어 (beta 0.1)

귀여운 지도와 스탬프 투어로 겨울 서촌의 카페·소품샵을 둘러보고, 방문한 순간을 나만의 윈터 저널로 남기는 **모바일 웹**입니다.
기획서(SW융합프로젝트 조별활동기획서)의 화면 구성·연출을 따르되, 지도는 3D 대신 2D 도트 마을로 만든 베타 버전입니다.

## 실행

```bash
npm install
npm run dev        # http://localhost:5173  (같은 와이파이의 휴대폰에서도 접속 가능: --host)
npm run build      # dist/ 생성 → Vercel / GitHub Pages 에 그대로 배포
```

> 휴대폰 카메라 호출(`capture`)은 **HTTPS** 에서만 안정적으로 동작합니다. 실기기 테스트는 Vercel 배포 주소로 하세요.

### 테스트용 주소 옵션
| 주소 | 설명 |
|---|---|
| `/?demo=7` | 7칸을 임시 사진·기록으로 미리 채움 |
| `/?demo=17` | 17칸 모두 채움 (완성 페이지·공유 이미지 바로 확인) |
| `/?debug` | 콘솔에서 `__pixel` 로 카메라·아바타·월드 접근 |

저널 맨 아래 **"기록 초기화 (베타 테스트용)"** 를 두 번 누르면 저장된 기록이 모두 지워집니다.

## 지금 버전 (도트 마을)

위에서 내려다본 **2D 도트(픽셀) 마을** 지도입니다. 그림은 외부 이미지 없이 전부 코드로 한 픽셀씩 그립니다.

| 항목 | 구현 | 위치 |
|---|---|---|
| 실제 서촌 지도 | ✅ 구글맵 목록 17곳 + OpenStreetMap 실제 길 (1칸 = 5m, 왜곡 없음) | `src/data/` |
| 도트 바닥 | ✅ 눈 바닥, 판석 돌길(테두리), 광장, 디딤돌, 얼음 웅덩이, 불빛 | `src/pixel/world.js` |
| 가게 17곳 | ✅ 6곳은 고유 모양(가방·마시멜로우 한옥·스웨터·고양이·알파카·유리창 카페), 11곳은 가게별 색의 공통 가게, 1.5배 크기 | `src/pixel/sprites.js` |
| 길가 소품 | ✅ 리본 가로등·눈꽃 배너, 전구 울타리, 화분, 벤치, 눈사람, 그루터기, 간판, 토끼·고양이, 숲 | `src/pixel/world.js` |
| 아바타 | ✅ 분홍 니트 모자 여자아이 (상하좌우 걷기 · 손 흔들기) | `src/pixel/sprites.js` |
| 매장 탭 → 통 튀기 → 실제 길 따라 걷기 + 카메라 추적 | ✅ 길 그래프 최단경로 | `src/pixel/PixelMap.jsx` |
| 종이 지도: 번호 핀 + 목록, 누르면 그 가게 앞으로 이동 | ✅ 오른쪽 아래 지도 버튼 | `src/ui/PaperMap.jsx` |
| 정보 화면 · 스탬프 인증 · 도장 쾅 · 햅틱 | ✅ | `src/ui/StoreSheet.jsx`, `StampScreen.jsx` |
| 도장 찍은 가게 벽에 엽서 + 반짝임 | ✅ | `PixelMap.jsx` |
| 저널 · 일기장 · 완성 페이지 · 공유 이미지(1080×1920) | ✅ | `src/ui/Journal.jsx`, `src/lib/shareImage.js` |
| 드래그 이동 · 두 손가락/휠 확대 (정수 배율) | ✅ | `PixelMap.jsx` |
| IndexedDB 저장 | ✅ (막히면 메모리 저장으로 대체) | `src/lib/db.js` |
| 실시간 날씨 · Firebase 동기화 · 위치 기반 방문 확인 | ⏳ 다음 단계 | |

지도 데이터 © OpenStreetMap contributors (ODbL) — 화면 왼쪽 아래 표기.

## 고치는 곳

1. **매장 정보** → `src/data/stores.js` (이름·소개·주소·색·도장 모양·`model` 고유 모양). 위치는 위경도만 넣으면 가장 가까운 길 옆에 자동 배치됩니다.
2. **길** → `src/data/streets.js` 는 자동 생성 파일. 매장이나 출발점을 바꾸면 `scripts/build-streets.mjs` 상단 주석대로 다시 생성하세요.
3. **도트 그림** → `src/pixel/sprites.js` (가게·나무·소품·아바타), 색은 `src/pixel/palette.js`·`colors.js`.

## 폴더 구조
```
src/
  data/      stores.js(매장), streets.js(길, 자동 생성), layout.js(배치·길 정리), map.js(길 그래프·최단경로)
  pixel/     PixelMap(캔버스·카메라·걷기·터치), world(바닥·물체 배치), sprites(도트 그림), draw(도트 도구), colors·palette
  ui/        Hud, PaperMap, StoreSheet, StampScreen, Journal(저널·일기장·완성 페이지)
  lib/       db(IndexedDB), stampSvg(도장 문양), photo(사진 압축), shareImage(공유 이미지)
  store.js   전역 상태 (zustand)
scripts/     build-streets.mjs (OpenStreetMap → streets.js)
```
