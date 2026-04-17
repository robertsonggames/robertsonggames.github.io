// ============================================================
// Galaxy Falcon 3 - 에셋 로더
// ============================================================

const Assets = {
  images: {},
  loaded: false,

  _manifest: {
    // 플레이어
    flight: 'assets/flight/Flight_v1.png',
    flightEffect: 'assets/flight/Flight_effect.png',
    missile: 'assets/flight/missile.png',

    // 배경
    bgBase: 'assets/bg/bg_base.jpg',
    bgStar1: 'assets/bg/bg_star_1.png',
    bgStar2: 'assets/bg/bg_star_2.png',
    bgStar3: 'assets/bg/bg_star_3.png',
    bgRound: 'assets/bg/bg_round.png',

    // UI
    logo: 'assets/ui/logo.png',
    mainBg: 'assets/ui/main_background.png',
    iconStar: 'assets/ui/icon_star.png',
    iconStarDis: 'assets/ui/icon_star_dis.png',
    btnMain: 'assets/ui/btn_main.png',
    iconBack: 'assets/ui/icon_back.png',
    missionUnlocked: 'assets/ui/mission_unlocked.png',
    starSelect: 'assets/ui/star_select.png',
    stageUnlocked: 'assets/ui/stage_unlocked.png',
    resultSuccess: 'assets/ui/result_pop_up_success.png',
    resultFailed: 'assets/ui/result_pop_up_failed.png',

    // 적 (타입별)
    enemy_T: 'assets/enemy/T_512.png',
    enemy_Box: 'assets/enemy/Box_512.png',
    enemy_R: 'assets/enemy/R_512.png',
    enemy_P: 'assets/enemy/P_512.png',
    enemy_H: 'assets/enemy/H_512.png',
    enemy_D: 'assets/enemy/D_512.png',
    enemy_C: 'assets/enemy/C_512.png',
    enemy_TT: 'assets/enemy/TT_512.png',
    enemy_TR: 'assets/enemy/TR_512.png',
    enemy_TD: 'assets/enemy/TD_512.png',
    enemy_TC: 'assets/enemy/TC_512.png',
    enemy_TP: 'assets/enemy/TP_512.png',
    enemy_RC: 'assets/enemy/RC_512.png',
    enemy_RP: 'assets/enemy/RP_512.png',
    enemy_PH: 'assets/enemy/PH_512.png',
  },

  load() {
    const entries = Object.entries(this._manifest);
    let count = 0;

    return new Promise((resolve) => {
      for (const [key, src] of entries) {
        const img = new Image();
        img.onload = () => {
          count++;
          if (count >= entries.length) {
            this.loaded = true;
            resolve();
          }
        };
        img.onerror = () => {
          console.warn(`[Assets] 로드 실패: ${src}`);
          count++;
          if (count >= entries.length) {
            this.loaded = true;
            resolve();
          }
        };
        img.src = src;
        this.images[key] = img;
      }
    });
  },

  get(key) {
    return this.images[key] || null;
  },

  getEnemy(type) {
    const key = `enemy_${type}`;
    // 이미 로드된 이미지가 있으면 반환
    if (this.images[key]) return this.images[key];

    // 없으면 동적 로드 시도 (T1, T2, Box3 등 변형 타입)
    const img = new Image();
    img.src = `assets/enemy/${type}_512.png`;
    this.images[key] = img; // 캐시에 저장 (로드 실패해도 재시도 방지)

    // 로드 실패 시 기본 타입 이미지로 폴백
    const baseType = type.replace(/\d+$/, '');
    img.onerror = () => {
      this.images[key] = this.images[`enemy_${baseType}`] || this.images['enemy_T'];
    };

    return img;
  },
};
