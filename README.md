# SEOCHON WINTER JOURNAL — 서촌 겨울 스탬프 투어 (beta 0.1)

귀여운 지도와 스탬프 투어로 겨울 서촌의 카페·소품샵을 둘러보고, 방문한 순간을 나만의 윈터 저널로 남기는 **모바일 웹**입니다.
기획서(SW융합프로젝트 조별활동기획서)의 화면 구성·연출·기술 설계를 그대로 따른 베타 버전입니다.

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
| `/?demo=7` | 7칸을 임시 사진·기록으로 미리 채움 → 마지막 1칸만 찍으면 완성 페이지 확인 가능 |
| `/?demo=8` | 8칸 모두 채움 (완성 페이지·공유 이미지 바로 확인) |
| `/?debug` | 콘솔에서 `__debug` 로 카메라·아바타 접근 |

저널 맨 아래 **"기록 초기화 (베타 테스트용)"** 를 두 번 누르면 저장된 기록이 모두 지워집니다.

## 기획서 대비 구현 현황

| 기획 항목 | 구현 | 위치 |
|---|---|---|
| 2D 일러스트 지도 + 매장만 3D 건물 | ✅ 가운데 큰길 + 양옆 가게 8곳 + 원형 광장 (코드로 그린 임시 지도) | `src/three/mapTexture.js` |
| 로우폴리 아바타, 골목 시작점 | ✅ 핑크 산타모자·코트 여자아이 (코드로 만든 임시 모델) | `src/three/Avatar.jsx` |
| 업종별 건물 + 간판 | ✅ 눈 지붕·둥근 간판(문양+이름)·차양 / 업종별 앞마당 소품 | `src/three/Building.jsx` |
| 거리 소품 | ✅ 눈 덮인 나무, 가로등, 벤치, 꽃덤불, 울타리, 벽돌 언덕, 광장 나무, 이정표 | `src/three/Decor.jsx` |
| 상단 진행도(3/8) + 저널 아이콘 | ✅ | `src/ui/Hud.jsx` |
| 첫 진입: 손 흔들고 돌아서 3인칭 시점 | ✅ | `MapScene.jsx` 인트로 타임라인 |
| 매장 탭 → 통 튀기(0.2s) → 골목 따라 걷기 + 카메라 추적 | ✅ 길 그래프 최단경로 | `src/data/map.js` |
| 정보 화면: 중앙에서 퍼짐(0.3s), 지도 어두워짐 | ✅ | `src/ui/StoreSheet.jsx` |
| 스탬프 인증: 문양·사진 촬영/업로드·한 줄 기록·인증 버튼 | ✅ | `src/ui/StampScreen.jsx` |
| 도장 쾅 + 잉크 번짐 + 햅틱(0.5s) | ✅ (`navigator.vibrate`, iOS 사파리는 미지원) | `styles.css` `.handle/.mark/.ink` |
| 시트 닫으면 건물 벽에 엽서 부착 + 반짝임(0.4s) | ✅ | `Building.jsx` `Postcard` |
| 저널: 책 펼침, 새 칸 반짝임 | ✅ | `src/ui/Journal.jsx` |
| 찍힌 칸 → 일기장 페이지(사진+한 줄), 기록 수정 | ✅ | `DiaryPage` |
| 빈 칸 → 지도로 돌아가 매장 앞 아바타 가운데로 | ✅ | `goToStore` |
| 완성 페이지 + 크리스마스 전구 + 이미지 한 장 저장/공유 | ✅ 1080×1920 PNG, Web Share API | `src/lib/shareImage.js` |
| 눈 내리는 효과, 지붕 위 눈, 창문 불빛 | ✅ | `MapScene.jsx` `Snow` |
| 종이 질감·마스킹테이프·폴라로이드·손글씨 폰트 | ✅ Gaegu / Gowun Dodum | `styles.css` |
| 핀치 확대/축소, 드래그 이동, 회전 잠금 | ✅ drei `MapControls` + 직교 카메라(거리 전체가 한 화면에) | |
| IndexedDB 저장 | ✅ (막히면 메모리 저장으로 대체) | `src/lib/db.js` |
| 실시간 날씨 반영 | ⏳ 다음 단계 | |
| Firebase 기기 간 동기화 | ⏳ `db.js` 의 함수 4개만 교체하면 됨 | |
| 위치(GPS) 기반 방문 확인 | ⏳ 기획서에 언급만 있어 미구현 | |

## 실제 자료로 교체하는 곳

1. **매장 정보** → `src/data/stores.js` 한 파일만 수정 (이름, 소개, 주소, 시간, 간판 문구, 색, 도장 모양).
   배치는 `side`(큰길 왼쪽 L / 오른쪽 R)와 `row`(0=입구 쪽 ~ 3=광장 쪽)만 정하면 건물 위치·아바타가 서는 자리·길이 자동으로 계산됩니다.
   차양 색은 `awning`, 모양은 `awningStyle`('stripe' 줄무늬 / 'solid' 단색)로 바꿉니다.
2. **AI 지도 이미지** → `public/map.png` 로 넣고 `MapScene.jsx` 의 `Ground` 에서 `drawMapCanvas()` 대신 `useTexture('./map.png')` 사용 (비율 36:54 = 2:3).
3. **Blender 모델(.glb)** → `public/models/` 에 넣고 `Avatar.jsx`, `Building.jsx` 의 `BODY[type]` 를 `useGLTF` 로 교체. 건물 정면은 +z 방향, 바닥은 y=0 기준으로 내보내면 그대로 맞습니다.
4. **간판 이미지** → `src/three/textures.js` 의 `signTexture` 를 이미지 텍스처로 교체.

## 폴더 구조
```
src/
  data/      stores.js(매장), map.js(골목 길 그래프·최단경로)
  three/     MapScene(캔버스·카메라·인트로·걷기), Building, Avatar, mapTexture, textures
  ui/        Hud, StoreSheet, StampScreen, Journal(저널·일기장·완성 페이지)
  lib/       db(IndexedDB), stampSvg(도장 문양), photo(사진 압축), shareImage(공유 이미지)
  store.js   전역 상태 (zustand)
```
