// ============================================================
// Galaxy Falcon 3 - 메인 게임
// ============================================================

class Game {
  constructor() {
    this.canvas = document.getElementById('gameCanvas');
    this.ctx = this.canvas.getContext('2d');

    this.input = new InputManager(this.canvas);
    this.ui = new UI(this.canvas, this.ctx);
    this.bulletManager = new BulletManager();
    this.player = new Player(this.bulletManager);
    this.waveManager = new WaveManager();

    this.scene = GAME.SCENE.TITLE;
    this.lastTime = 0;
    this.missionSuccess = false;

    // 결과 화면 애니메이션
    this.resultAnimTimer = 0;
    this.resultScoreAnimated = false;

    // 스프레드시트 로더
    this.sheet = new SpreadsheetLoader(GAME.SPREADSHEET_ID);
    this.dataLoaded = false;
    this.dataLoading = false;
    this.currentStage = 1;
    this.currentMission = 1;

    // 재화 시스템
    this.totalScore = 0;
    this.hearts = 10;
    this.maxHearts = 10;
    this.stars = 100;

    // 에셋 로드 상태
    this.assetsLoaded = false;

    this._resize();
    window.addEventListener('resize', () => this._resize());

    this.ui.initStars();

    // 에셋 로드 후 게임 루프 시작
    Assets.load().then(() => {
      this.assetsLoaded = true;
      requestAnimationFrame((t) => this._loop(t));
    });
  }

  _resize() {
    const dpr = window.devicePixelRatio || 1;
    const w = window.innerWidth;
    const h = window.innerHeight;

    // 게임 비율 유지 (세로형)
    const gameRatio = GAME.WIDTH / GAME.HEIGHT;
    const screenRatio = w / h;

    let canvasW, canvasH;
    if (screenRatio < gameRatio) {
      canvasW = w;
      canvasH = w / gameRatio;
    } else {
      canvasH = h;
      canvasW = h * gameRatio;
    }

    this.canvas.style.width = `${canvasW}px`;
    this.canvas.style.height = `${canvasH}px`;
    this.canvas.width = canvasW * dpr;
    this.canvas.height = canvasH * dpr;
  }

  _loop(time) {
    const dt = Math.min((time - this.lastTime) / 1000, 0.05);
    this.lastTime = time;

    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    switch (this.scene) {
      case GAME.SCENE.TITLE:
        this._updateTitle(dt);
        break;
      case GAME.SCENE.STAGE_SELECT:
        this._updateStageSelect(dt);
        break;
      case GAME.SCENE.MISSION_SELECT:
        this._updateMissionSelect(dt);
        break;
      case GAME.SCENE.IN_GAME:
        this._updateInGame(dt);
        break;
      case GAME.SCENE.RESULT:
        this._updateResult(dt);
        break;
      case GAME.SCENE.PAUSE:
        this._updatePause(dt);
        break;
    }

    this.input.resetFrame();
    requestAnimationFrame((t) => this._loop(t));
  }

  // ==================== 타이틀 ====================
  _updateTitle(dt) {
    this.ui.drawStarBackground(dt);
    this.ui.drawTitle(this.dataLoaded, this.dataLoading);
    this.ui.drawLobbyHUD(this.totalScore, this.hearts, this.maxHearts, this.stars);

    if (this.input.tapped) {
      const hit = this.ui.checkButtonHit(this.input.tapX, this.input.tapY);
      if (hit === 'start' && !this.dataLoading) {
        if (!this.dataLoaded) {
          // 스프레드시트 데이터 로드 시작
          this.dataLoading = true;
          this.sheet.loadAll().then(() => {
            this.dataLoaded = true;
            this.dataLoading = false;
            // My Fighter 스탯 적용
            this.player.applySheetStats(this.sheet.getFighterStats());
            this.scene = GAME.SCENE.STAGE_SELECT;
          }).catch(() => {
            this.dataLoading = false;
          });
        } else {
          this.scene = GAME.SCENE.STAGE_SELECT;
        }
      }
    }
  }

  // ==================== 스테이지 선택 ====================
  _updateStageSelect(dt) {
    this.ui.drawStarBackground(dt);
    this.ui.drawStageSelect(this.sheet);
    this.ui.drawLobbyHUD(this.totalScore, this.hearts, this.maxHearts, this.stars);

    if (this.input.tapped) {
      const hit = this.ui.checkButtonHit(this.input.tapX, this.input.tapY);
      if (hit && hit.startsWith('stage_')) {
        this.currentStage = parseInt(hit.split('_')[1]);
        this.scene = GAME.SCENE.MISSION_SELECT;
      } else if (hit === 'back') {
        this.scene = GAME.SCENE.TITLE;
      }
    }
  }

  // ==================== 미션 선택 ====================
  _updateMissionSelect(dt) {
    this.ui.drawStarBackground(dt);
    this.ui.drawMissionSelect(this.currentStage, this.sheet);
    this.ui.drawLobbyHUD(this.totalScore, this.hearts, this.maxHearts, this.stars);

    if (this.input.tapped) {
      const hit = this.ui.checkButtonHit(this.input.tapX, this.input.tapY);
      if (hit && hit.startsWith('mission_')) {
        this.currentMission = parseInt(hit.split('_')[1]);
        this._startMission();
      } else if (hit === 'back') {
        this.scene = GAME.SCENE.STAGE_SELECT;
      }
    }
  }

  // ==================== 인게임 ====================
  _startMission() {
    const csv = this.sheet.getMissionCSV(this.currentStage, this.currentMission);
    if (!csv) return;

    this.waveManager.loadFromCSV(csv);
    this.player.reset();
    this.bulletManager.clear();
    this.waveManager.start(this.bulletManager);
    this.scene = GAME.SCENE.IN_GAME;
    this.missionSuccess = false;
  }

  _updateInGame(dt) {
    // HUD 버튼 처리
    if (this.input.tapped) {
      const hudHit = this.ui.checkHUDHit(this.input.tapX, this.input.tapY);
      if (hudHit === 'pause') {
        this.scene = GAME.SCENE.PAUSE;
        return;
      }
      if (hudHit === 'missile') {
        this.input.missileButtonPressed = true;
      }
      if (hudHit === 'rotate') {
        this.input.twoFingerTap = true;
      }
      if (hudHit === 'reload') {
        // 구글시트 데이터 다시 불러오기
        this.sheet.loaded = false;
        this.sheet.loadAll().then(() => {
          this.player.applySheetStats(this.sheet.getFighterStats());
          this._startMission();
        });
        return;
      }
      if (hudHit === 'debugNext') {
        this.waveManager.skipToNextWait0(this.bulletManager);
        return;
      }
      if (hudHit === 'debugPrev') {
        this.waveManager.skipToPrevWait0(this.bulletManager);
        return;
      }
    }

    // 게임 로직 업데이트
    this.player.update(dt, this.input);
    this.waveManager.update(dt, this.player, this.bulletManager);
    this.bulletManager.update(dt);

    // 충돌 감지
    this._checkCollisions();

    // 미션 완료/실패 체크
    if (!this.player.alive) {
      this.missionSuccess = false;
      this.resultAnimTimer = 0;
      this.resultScoreAnimated = false;
      if (!this.waveManager.endTime) this.waveManager.endTime = Date.now();
      this.scene = GAME.SCENE.RESULT;
    } else if (this.waveManager.missionComplete) {
      this.missionSuccess = true;
      this.resultAnimTimer = 0;
      this.resultScoreAnimated = false;
      this.scene = GAME.SCENE.RESULT;
    }

    // 렌더링
    this.ui.drawStarBackground(dt);
    this.waveManager.draw(this.ctx, this.canvas);
    this.bulletManager.draw(this.ctx, this.canvas);
    this.player.draw(this.ctx, this.canvas);
    const mTitle = this.sheet.getMissionTitle(this.currentStage, this.currentMission);
    const bossEnemy = this.waveManager.getAliveEnemies().find(e => e.isBoss && !e.bossParent);
    this.ui.drawInGameHUD(this.player, this.waveManager, this.currentStage, this.currentMission, mTitle, bossEnemy);
  }

  _checkCollisions() {
    const aliveEnemies = this.waveManager.getAliveEnemies();

    // 플레이어 총알 → 적
    for (const bullet of this.bulletManager.playerBullets) {
      if (!bullet.alive || bullet.exploding) continue;
      for (const enemy of aliveEnemies) {
        if (!enemy.alive) continue;
        if (Utils.circleCollision(bullet.x, bullet.y, bullet.radius, enemy.x, enemy.y, enemy.radius)) {
          enemy.takeDamage(bullet.damage);

          // 스플래시가 있으면 폭발 이펙트 + 스플래시 데미지
          if (bullet.splashRadius > 0) {
            bullet.explode();
            this._applySplashDamage(bullet, aliveEnemies, enemy);
          } else {
            bullet.alive = false;
          }
          break;
        }
      }
    }

    // 폭발 중인 미사일의 스플래시 데미지 (사거리 도달로 폭발한 경우)
    for (const bullet of this.bulletManager.playerBullets) {
      if (bullet.exploding && !bullet.splashApplied) {
        bullet.splashApplied = true;
        this._applySplashDamage(bullet, aliveEnemies, null);
      }
    }

    // 적 총알 → 플레이어
    for (const bullet of this.bulletManager.enemyBullets) {
      if (!bullet.alive || bullet.exploding) continue;
      if (Utils.circleCollision(bullet.x, bullet.y, bullet.radius, this.player.x, this.player.y, this.player.radius * 0.5)) {
        this.player.takeDamage(bullet.damage);
        if (bullet.splashRadius > 0) {
          bullet.explode();
        } else {
          bullet.alive = false;
        }
      }
    }

    // 적 몸체 → 플레이어
    for (const enemy of aliveEnemies) {
      if (Utils.circleCollision(this.player.x, this.player.y, this.player.radius * 0.5, enemy.x, enemy.y, enemy.radius)) {
        this.player.takeDamage(10);
      }
    }
  }

  // 스플래시 데미지 적용
  _applySplashDamage(bullet, enemies, hitEnemy) {
    const bx = bullet.explodeX || bullet.x;
    const by = bullet.explodeY || bullet.y;
    for (const enemy of enemies) {
      if (!enemy.alive || enemy === hitEnemy) continue;
      if (Utils.dist(bx, by, enemy.x, enemy.y) < bullet.splashRadius) {
        enemy.takeDamage(bullet.splashDamage);
      }
    }
  }

  // ==================== 결과 ====================
  _updateResult(dt) {
    this.resultAnimTimer += dt;

    // Score → Total Score 애니메이션 (2초간)
    const animDuration = 2;
    const animProgress = Math.min(this.resultAnimTimer / animDuration, 1);

    if (this.missionSuccess && !this.resultScoreAnimated && animProgress >= 1) {
      this.totalScore += this.waveManager.score;
      this.stars += this.waveManager.getStars();
      this.resultScoreAnimated = true;
    }

    this.ui.drawStarBackground(dt);
    this.ui.drawResult(this.missionSuccess, this.waveManager, this.totalScore, animProgress);

    if (this.input.tapped) {
      const hit = this.ui.checkButtonHit(this.input.tapX, this.input.tapY);
      if (hit === 'exit') {
        this.scene = GAME.SCENE.MISSION_SELECT;
      } else if (hit === 'retry') {
        this._startMission();
      } else if (hit === 'next' && this.missionSuccess) {
        // 다음 미션으로 직행
        const missionList = this.sheet.getMissionList(this.currentStage);
        const currentIdx = missionList.findIndex(m => m.mission === this.currentMission);
        if (currentIdx >= 0 && currentIdx < missionList.length - 1) {
          this.currentMission = missionList[currentIdx + 1].mission;
          this._startMission();
        } else {
          this.scene = GAME.SCENE.STAGE_SELECT;
        }
      } else if (hit === 'adContinue' && !this.missionSuccess) {
        // AD CONTINUE: 에너지 회복 후 게임 계속 (광고 플레이스홀더)
        this.player.energy = this.player.maxEnergy;
        this.player.alive = true;
        this.player.invincibleTimer = 2;
        this.scene = GAME.SCENE.IN_GAME;
        this.waveManager.missionComplete = false;
      }
    }
  }

  // ==================== 일시정지 ====================
  _updatePause(dt) {
    this.ui.drawStarBackground(0); // 별 멈춤
    this.waveManager.draw(this.ctx, this.canvas);
    this.bulletManager.draw(this.ctx, this.canvas);
    this.player.draw(this.ctx, this.canvas);
    this.ui.drawPause();

    if (this.input.tapped) {
      const hit = this.ui.checkButtonHit(this.input.tapX, this.input.tapY);
      if (hit === 'resume') {
        this.scene = GAME.SCENE.IN_GAME;
      } else if (hit === 'exit') {
        this.scene = GAME.SCENE.MISSION_SELECT;
      }
    }
  }
}

// 게임 시작
window.addEventListener('DOMContentLoaded', () => {
  window._game = new Game();
});
