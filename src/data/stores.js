// ─────────────────────────────────────────────────────────────
// 스탬프 대상 매장 데이터 (베타: 가상의 예시 매장)
// 실제 매장이 정해지면 이 파일만 교체하면 됩니다.
//  - type: 'cafe' | 'gift' | 'food'  → 건물 모양 + 빈 칸 실루엣(커피잔/선물상자/밥그릇)
//  - side: 'L' | 'R' (큰길 왼쪽/오른쪽), row: 0~3 (아래 → 위)
//  - awning / awningStyle: 차양 색과 모양 ('stripe' 줄무늬 | 'solid' 단색)
//  - 건물 좌표(building), 아바타가 서는 자리(front), 회전(rot)은 아래 layout 에서 자동 계산
//  - stamp: 매장별 도장 문양 (shape + motif)
// ─────────────────────────────────────────────────────────────

export const STORES = [
  {
    id: 'snowflake',
    name: '눈송이 로스터리',
    nameEn: 'SNOWFLAKE ROASTERY',
    type: 'cafe',
    intro: '첫눈 같은 우유 거품을 올린 "눈송이 라떼"가 시그니처인 작은 로스터리',
    address: '서울 종로구 자하문로 OO길 1 (예시)',
    hours: '10:00 – 21:00 · 월 휴무',
    sign: '눈송이 로스터리',
    color: '#6f8fb8',
    wall: '#f4ead8',
    side: 'L',
    row: 0,
    awning: '#d4b08c',
    awningStyle: 'stripe',
    stamp: { shape: 'circle', motif: 'snowflake' },
  },
  {
    id: 'sobok',
    name: '소복 문구',
    nameEn: 'SOBOK STATIONERY',
    type: 'gift',
    intro: '눈 쌓인 골목을 그린 엽서와 손글씨 노트를 파는 동네 문구점',
    address: '서울 종로구 필운대로 OO길 2 (예시)',
    hours: '11:00 – 20:00',
    sign: '소복 문구',
    color: '#c25b56',
    wall: '#f7e3cf',
    side: 'R',
    row: 0,
    awning: '#e9a6ad',
    awningStyle: 'stripe',
    stamp: { shape: 'scallop', motif: 'pencil' },
  },
  {
    id: 'ongi',
    name: '온기 국수',
    nameEn: 'ONGI NOODLE',
    type: 'food',
    intro: '멸치 육수에 들기름을 한 방울, 손이 시린 날 생각나는 한옥 국숫집',
    address: '서울 종로구 자하문로 OO길 3 (예시)',
    hours: '11:30 – 20:30 · 브레이크 15–17시',
    sign: '온기 국수',
    color: '#8a5a3c',
    wall: '#efe2cc',
    side: 'L',
    row: 1,
    awning: '#b8565c',
    awningStyle: 'solid',
    stamp: { shape: 'square', motif: 'bowl' },
  },
  {
    id: 'inwang',
    name: '인왕다방',
    nameEn: 'INWANG DABANG',
    type: 'cafe',
    intro: '창밖으로 인왕산 설경이 보이는 레트로 다방, 쌍화차와 비엔나커피',
    address: '서울 종로구 옥인길 OO (예시)',
    hours: '12:00 – 22:00',
    sign: '인왕다방',
    color: '#4f7a62',
    wall: '#f1e6d2',
    side: 'R',
    row: 1,
    awning: '#c7a07a',
    awningStyle: 'stripe',
    stamp: { shape: 'hexagon', motif: 'mountain' },
  },
  {
    id: 'dam',
    name: '필름상회 담',
    nameEn: 'FILM SHOP DAM',
    type: 'gift',
    intro: '필름 카메라와 겨울 한정 필름을 파는 곳, 현상 맡기면 엽서로 뽑아줘요',
    address: '서울 종로구 자하문로 OO길 5 (예시)',
    hours: '12:00 – 20:00 · 화 휴무',
    sign: '필름상회 담',
    color: '#3f4a6b',
    wall: '#e9e2d6',
    side: 'L',
    row: 2,
    awning: '#8fb39b',
    awningStyle: 'stripe',
    stamp: { shape: 'ticket', motif: 'camera' },
  },
  {
    id: 'morak',
    name: '모락 찻집',
    nameEn: 'MORAK TEA HOUSE',
    type: 'cafe',
    intro: '김이 모락모락, 유자차와 생강차를 무쇠 주전자에 끓여주는 찻집',
    address: '서울 종로구 필운대로 OO길 6 (예시)',
    hours: '11:00 – 21:00',
    sign: '모락 찻집',
    color: '#c98a3b',
    wall: '#f6ead6',
    side: 'R',
    row: 2,
    awning: '#e0b77e',
    awningStyle: 'stripe',
    stamp: { shape: 'octagon', motif: 'teapot' },
  },
  {
    id: 'ttakkeun',
    name: '따끈 붕어빵',
    nameEn: 'TTAKKEUN BUNGEO',
    type: 'food',
    intro: '팥·슈크림·고구마 세 가지 맛, 서촌 겨울의 상징 같은 붕어빵 공방',
    address: '서울 종로구 자하문로 OO길 7 (예시)',
    hours: '13:00 – 재료 소진 시',
    sign: '따끈 붕어빵',
    color: '#d0703a',
    wall: '#f3e1c6',
    side: 'L',
    row: 3,
    awning: '#c9744f',
    awningStyle: 'solid',
    stamp: { shape: 'flower', motif: 'fish' },
  },
  {
    id: 'pogeun',
    name: '포근 잡화점',
    nameEn: 'POGEUN GOODS',
    type: 'gift',
    intro: '손뜨개 장갑과 목도리, 겨울 캔들까지 포근한 것만 모은 소품샵',
    address: '서울 종로구 옥인길 OO (예시)',
    hours: '11:00 – 19:30',
    sign: '포근 잡화점',
    color: '#9b6aa8',
    wall: '#f3e6e0',
    side: 'R',
    row: 3,
    awning: '#c7a1cf',
    awningStyle: 'stripe',
    stamp: { shape: 'shield', motif: 'mitten' },
  },
]

// ── 배치: 가운데 큰길 양옆으로 4줄 ──
export const ROW_Z = [15, 6.5, -2, -10.5]
export const STREET_X = 7.1 // 큰길 중심에서 건물 중심까지
export const FRONT_DIST = 2.9 // 건물 중심 → 아바타가 서는 자리
STORES.forEach((s) => {
  const sign = s.side === 'L' ? -1 : 1
  s.rot = -sign * 0.3 // 정면(남쪽)을 살짝 큰길 쪽으로
  s.building = [sign * STREET_X, ROW_Z[s.row]]
  s.front = [s.building[0] + Math.sin(s.rot) * FRONT_DIST, s.building[1] + Math.cos(s.rot) * FRONT_DIST]
})

export const STORE_BY_ID = Object.fromEntries(STORES.map((s) => [s.id, s]))

export const TYPE_LABEL = { cafe: '카페', gift: '소품샵', food: '먹거리' }

