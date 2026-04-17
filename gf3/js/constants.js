// ============================================================
// Galaxy Falcon 3 - 게임 상수
// ============================================================

const GAME = {
  // 기준 해상도 (좌표계 기준)
  WIDTH: 1178,
  HEIGHT: 2556,

  // 좌표계: 중심 (0,0), 범위 (-589~589, -1278~1278)
  HALF_W: 589,
  HALF_H: 1278,

  FPS: 60,

  // UI 스케일 배율 (1.0 = 기본, 2.0 = 2배)
  UI_SCALE: 2.0,

  // Google Spreadsheet ID
  SPREADSHEET_ID: '1ueC2uBmcsY-X3c4ytt2ejda-HM-LlOOAl4a1XeLf49k',

  // 씬
  SCENE: {
    TITLE: 'title',
    STAGE_SELECT: 'stageSelect',
    MISSION_SELECT: 'missionSelect',
    IN_GAME: 'inGame',
    RESULT: 'result',
    PAUSE: 'pause',
  },
};

// 플레이어 기본 스탯 (F1)
const PLAYER_STATS = {
  energy: 100,
  gunSpeed: 2000,
  gunRange: 1400,
  gunDamage: 5,
  gunCoolDown: 0.2,
  missileSpeed: 1000,
  missileRange: 2000,
  missileDamage: 50,
  missileSplashRange: 100,
  missileSplashDamage: 10,
  missileCoolDown: 2,
  moveSpeed: 800,
};

// 각도 정의: 0=위, 90=오른쪽, 180=아래, 270=왼쪽
const DIR = {
  UP: 0,
  RIGHT: 90,
  DOWN: 180,
  LEFT: 270,
};

// 적 도형 색상
const ENEMY_COLORS = {
  T:   { fill: '#ff4444', stroke: '#ffaaaa' },
  Box: { fill: '#44aaff', stroke: '#aaddff' },
  R:   { fill: '#44ff44', stroke: '#aaffaa' },
  P:   { fill: '#ffaa44', stroke: '#ffddaa' },
  H:   { fill: '#aa44ff', stroke: '#ddaaff' },
  D:   { fill: '#ff44aa', stroke: '#ffaadd' },
  C:   { fill: '#44ffaa', stroke: '#aaffdd' },
  TT:  { fill: '#ff6666', stroke: '#ffcccc' },
  TR:  { fill: '#66aaff', stroke: '#ccdeff' },
  TD:  { fill: '#ff66aa', stroke: '#ffccdd' },
  TC:  { fill: '#66ffaa', stroke: '#ccffdd' },
  TP:  { fill: '#ffcc44', stroke: '#ffeeaa' },
  RC:  { fill: '#44cccc', stroke: '#aaeeff' },
  RP:  { fill: '#cc8844', stroke: '#eeccaa' },
  PH:  { fill: '#8844cc', stroke: '#ccaaee' },
};

// 적 크기 배율 테이블
const SIZE_SCALE = {
  1: 0.25, 2: 0.50, 3: 0.75, 4: 1.00,
  5: 1.25, 6: 1.50, 7: 1.75, 8: 2.00,
  9: 2.50, 10: 3.00, 11: 3.50, 12: 4.00,
};

// 적 이동 속도 배율
const ENEMY_SPEED_SCALE = 1.0;

// 기본 도형 크기 (size 4 = 100% 기준 반지름)
const BASE_ENEMY_RADIUS = 56;
