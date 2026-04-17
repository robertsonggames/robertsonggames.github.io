// ============================================================
// Galaxy Falcon 3 - UI/HUD 시스템
// ============================================================

class UI {
  constructor(canvas, ctx) {
    this.canvas = canvas;
    this.ctx = ctx;
    this.buttons = [];
    this.stars = [];
  }

  // 배경 별 생성 (3레이어 - 이미지 별 사용)
  initStars(count = 80) {
    this.stars = [];
    const layers = ['bgStar1', 'bgStar2', 'bgStar3'];
    for (let i = 0; i < count; i++) {
      const layer = Math.floor(Math.random() * 3); // 0=먼, 1=중간, 2=가까운
      this.stars.push({
        x: Math.random() * GAME.WIDTH,
        y: Math.random() * GAME.HEIGHT,
        size: (layer + 1) * 8 + Math.random() * 8,
        speed: 20 + layer * 25 + Math.random() * 15,
        brightness: 0.3 + layer * 0.2 + Math.random() * 0.3,
        imgKey: layers[layer],
      });
    }
  }

  // 별 배경 업데이트 & 렌더
  drawStarBackground(dt) {
    const ctx = this.ctx;
    const c = this.canvas;
    const sx = c.width / GAME.WIDTH;
    const sy = c.height / GAME.HEIGHT;

    // 배경 이미지
    const bgImg = Assets.get('bgBase');
    if (bgImg && bgImg.complete) {
      ctx.drawImage(bgImg, 0, 0, c.width, c.height);
    } else {
      ctx.fillStyle = '#0a0a2e';
      ctx.fillRect(0, 0, c.width, c.height);
    }

    // 별 (이미지 스프라이트)
    for (const star of this.stars) {
      star.y += star.speed * dt;
      if (star.y > GAME.HEIGHT) {
        star.y = -star.size;
        star.x = Math.random() * GAME.WIDTH;
      }
      const px = star.x * sx;
      const py = star.y * sy;
      const size = star.size * sx;

      const img = Assets.get(star.imgKey);
      if (img && img.complete) {
        ctx.globalAlpha = star.brightness;
        ctx.drawImage(img, px - size / 2, py - size / 2, size, size);
        ctx.globalAlpha = 1;
      } else {
        ctx.fillStyle = `rgba(255, 255, 255, ${star.brightness})`;
        ctx.beginPath();
        ctx.arc(px, py, size * 0.15, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  // ==================== 타이틀 화면 ====================
  drawTitle(dataLoaded, dataLoading) {
    const ctx = this.ctx;
    const c = this.canvas;
    const cx = c.width / 2;
    const cy = c.height / 2;
    const s = (c.width / GAME.WIDTH) * GAME.UI_SCALE;

    ctx.textBaseline = 'middle';

    // 로고 이미지
    const logoImg = Assets.get('logo');
    if (logoImg && logoImg.complete) {
      const logoW = 500 * s;
      const logoH = logoW * (logoImg.naturalHeight / logoImg.naturalWidth);
      ctx.drawImage(logoImg, cx - logoW / 2, cy - 200 * s, logoW, logoH);
    } else {
      ctx.fillStyle = '#ffffff';
      ctx.font = `bold ${72 * s}px 'Arial', sans-serif`;
      ctx.textAlign = 'center';
      ctx.shadowColor = '#4488ff';
      ctx.shadowBlur = 20 * s;
      ctx.fillText('GALAXY', cx, cy - 120 * s);
      ctx.fillText('FALCON 3', cx, cy - 40 * s);
      ctx.shadowBlur = 0;
    }

    // Start 버튼
    const btnW = 400 * s;
    const btnH = 80 * s;
    const btnX = cx - btnW / 2;
    const btnY = cy + 120 * s;

    const btnImg = Assets.get('btnMain');
    if (btnImg && btnImg.complete && !dataLoading) {
      ctx.drawImage(btnImg, btnX, btnY, btnW, btnH);
    } else {
      ctx.fillStyle = dataLoading ? '#555555' : '#22cc66';
      ctx.beginPath();
      ctx.roundRect(btnX, btnY, btnW, btnH, 12 * s);
      ctx.fill();
    }

    ctx.fillStyle = '#1a1a2e';
    ctx.font = `bold ${32 * s}px Arial`;
    ctx.textAlign = 'center';
    ctx.fillText(dataLoading ? 'LOADING...' : 'START', cx, btnY + btnH / 2);

    this.buttons = [{
      id: 'start',
      x: btnX, y: btnY, w: btnW, h: btnH,
    }];

    // 하단 버전
    ctx.fillStyle = '#666';
    ctx.font = `${16 * s}px Arial`;
    ctx.fillText('Prototype v0.1', cx, c.height - 30 * s);
  }

  // ==================== 스테이지 선택 ====================
  drawStageSelect(sheet) {
    const ctx = this.ctx;
    const c = this.canvas;
    const cx = c.width / 2;
    const s = (c.width / GAME.WIDTH) * GAME.UI_SCALE;

    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${48 * s}px Arial`;
    ctx.textAlign = 'center';
    ctx.fillText('Stage Select', cx, 200 * s);

    // 스프레드시트에서 가져온 스테이지 목록
    const stageList = sheet.getStageList();

    this.buttons = [];
    const btnSize = 100 * s;
    const gap = 30 * s;
    const cols = Math.min(stageList.length, 5);
    const totalW = cols * btnSize + (cols - 1) * gap;
    const startX = cx - totalW / 2;

    const stageImg = Assets.get('stageUnlocked');

    for (let i = 0; i < stageList.length; i++) {
      const stageNum = stageList[i];
      const col = i % 5;
      const row = Math.floor(i / 5);
      const x = startX + col * (btnSize + gap);
      const y = (400 + row * 140) * s;

      if (stageImg && stageImg.complete) {
        ctx.drawImage(stageImg, x, y, btnSize, btnSize);
      } else {
        ctx.fillStyle = '#4466cc';
        ctx.beginPath();
        ctx.roundRect(x, y, btnSize, btnSize, 10 * s);
        ctx.fill();
      }

      ctx.fillStyle = '#fff';
      ctx.font = `bold ${36 * s}px Arial`;
      ctx.textAlign = 'center';
      ctx.fillText(`${stageNum}`, x + btnSize / 2, y + btnSize / 2 + 5 * s);

      this.buttons.push({ id: `stage_${stageNum}`, x, y, w: btnSize, h: btnSize });
    }

    this._drawBackButton(s);
  }

  // ==================== 미션 선택 ====================
  drawMissionSelect(stageNum, sheet) {
    const ctx = this.ctx;
    const c = this.canvas;
    const cx = c.width / 2;
    const s = (c.width / GAME.WIDTH) * GAME.UI_SCALE;

    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${42 * s}px Arial`;
    ctx.textAlign = 'center';
    ctx.fillText(`Stage ${stageNum}`, cx, 180 * s);

    ctx.fillStyle = '#cccccc';
    ctx.font = `bold ${32 * s}px Arial`;
    ctx.fillText('Missions', cx, 300 * s);

    // 스프레드시트에서 가져온 미션 목록
    const missionList = sheet.getMissionList(stageNum);

    this.buttons = [];
    const btnSize = 90 * s;
    const gap = 20 * s;
    const cols = 5;
    const totalW = Math.min(missionList.length, cols) * btnSize + (Math.min(missionList.length, cols) - 1) * gap;
    const startX = cx - totalW / 2;

    const missionImg = Assets.get('missionUnlocked');

    for (let i = 0; i < missionList.length; i++) {
      const { mission: missionNum, title } = missionList[i];
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = startX + col * (btnSize + gap);
      const y = 380 * s + row * (btnSize + gap + 30 * s);

      if (missionImg && missionImg.complete) {
        ctx.drawImage(missionImg, x, y, btnSize, btnSize);
      } else {
        ctx.fillStyle = '#22cc66';
        ctx.beginPath();
        ctx.roundRect(x, y, btnSize, btnSize, 10 * s);
        ctx.fill();
      }

      ctx.fillStyle = '#fff';
      ctx.font = `bold ${32 * s}px Arial`;
      ctx.textAlign = 'center';
      ctx.fillText(`M${missionNum}`, x + btnSize / 2, y + btnSize / 2 + 5 * s);

      // 미션 제목
      if (title) {
        ctx.fillStyle = '#aaffaa';
        ctx.font = `${16 * s}px Arial`;
        ctx.fillText(title, x + btnSize / 2, y + btnSize + 20 * s);
      }

      this.buttons.push({ id: `mission_${missionNum}`, x, y, w: btnSize, h: btnSize });
    }

    this._drawBackButton(s);
  }

  // ==================== 로비 상단 HUD ====================
  drawLobbyHUD(totalScore, hearts, maxHearts, stars) {
    const ctx = this.ctx;
    const c = this.canvas;
    const s = (c.width / GAME.WIDTH) * GAME.UI_SCALE;

    // 상단바 배경
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(0, 0, c.width, 50 * s);

    // TOTAL SCORE (좌측)
    ctx.fillStyle = '#ffcc00';
    ctx.font = `bold ${16 * s}px Arial`;
    ctx.textAlign = 'left';
    const scoreStr = totalScore.toLocaleString().padStart(9, '0');
    ctx.fillText(`TOTAL SCORE: ${scoreStr}`, 15 * s, 32 * s);

    // 하트 (중앙-우측)
    ctx.fillStyle = '#ff4466';
    ctx.font = `bold ${16 * s}px Arial`;
    ctx.textAlign = 'center';
    const heartX = c.width - 230 * s;
    ctx.fillText(`♥ ${hearts}/${maxHearts}`, heartX, 32 * s);

    // + 버튼 (하트)
    ctx.fillStyle = '#44cc44';
    ctx.font = `bold ${14 * s}px Arial`;
    ctx.fillText('+', heartX + 55 * s, 32 * s);

    // 스타 (우측)
    ctx.fillStyle = '#ffdd44';
    ctx.font = `bold ${16 * s}px Arial`;
    const starX = c.width - 80 * s;
    ctx.fillText(`★ ${stars}`, starX, 32 * s);

    // + 버튼 (스타)
    ctx.fillStyle = '#44cc44';
    ctx.font = `bold ${14 * s}px Arial`;
    ctx.fillText('+', starX + 45 * s, 32 * s);
  }

  // ==================== 인게임 HUD ====================
  drawInGameHUD(player, waveManager, stageNum, missionNum, missionTitle, bossEnemy) {
    const ctx = this.ctx;
    const c = this.canvas;
    const s = (c.width / GAME.WIDTH) * GAME.UI_SCALE;

    // 상단바 배경
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(0, 0, c.width, 70 * s);

    // 좌측: 일시정지 버튼
    ctx.fillStyle = '#fff';
    ctx.font = `bold ${28 * s}px Arial`;
    ctx.textAlign = 'left';
    ctx.fillText('II', 20 * s, 40 * s);

    // 중앙: 미션 이름 + 스코어
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${20 * s}px Arial`;
    ctx.fillText(missionTitle || '', c.width / 2, 28 * s);
    ctx.fillStyle = '#ffcc00';
    ctx.font = `bold ${22 * s}px Arial`;
    ctx.fillText(`${waveManager.score}`, c.width / 2, 55 * s);

    // 우측: S1 | M10 (클릭하면 데이터 리로드)
    const smLabel = `S${stageNum || 1} | M${missionNum || 1}`;
    ctx.textAlign = 'right';
    ctx.fillStyle = '#aaaaff';
    ctx.font = `bold ${20 * s}px Arial`;
    const smTextW = ctx.measureText(smLabel).width;
    const smX = c.width - 20 * s - smTextW;
    const smY = 15 * s;
    const smW = smTextW + 10 * s;
    const smH = 35 * s;
    ctx.fillText(smLabel, c.width - 20 * s, 40 * s);
    this.reloadBtn = { x: smX - 5 * s, y: smY, w: smW, h: smH };

    // 보스 체력바 (보스 존재 시)
    if (bossEnemy && bossEnemy.alive && bossEnemy.isBoss) {
      const bBarX = 60 * s;
      const bBarY = 75 * s;
      const bBarW = c.width - 120 * s;
      const bBarH = 12 * s;
      const bRatio = bossEnemy.health / bossEnemy.maxHealth;

      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.fillRect(bBarX, bBarY, bBarW, bBarH);
      ctx.fillStyle = '#ff2244';
      ctx.fillRect(bBarX, bBarY, bBarW * bRatio, bBarH);
      ctx.strokeStyle = '#ff6688';
      ctx.lineWidth = 1;
      ctx.strokeRect(bBarX, bBarY, bBarW, bBarH);

      ctx.fillStyle = '#fff';
      ctx.font = `bold ${10 * s}px Arial`;
      ctx.textAlign = 'center';
      ctx.fillText('BOSS', c.width / 2, bBarY + bBarH / 2 + 3 * s);
    }

    // 에너지 바
    const barX = 30 * s;
    const barY = c.height - 50 * s;
    const barW = c.width - 60 * s;
    const barH = 20 * s;
    const energyRatio = player.energy / player.maxEnergy;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(barX - 2 * s, barY - 2 * s, barW + 4 * s, barH + 4 * s);

    const gradient = ctx.createLinearGradient(barX, barY, barX + barW * energyRatio, barY);
    gradient.addColorStop(0, energyRatio > 0.5 ? '#00ff44' : '#ff4400');
    gradient.addColorStop(1, energyRatio > 0.5 ? '#44ff88' : '#ffaa00');
    ctx.fillStyle = gradient;
    ctx.fillRect(barX, barY, barW * energyRatio, barH);

    ctx.strokeStyle = '#446688';
    ctx.lineWidth = 1;
    ctx.strokeRect(barX, barY, barW, barH);

    ctx.fillStyle = '#fff';
    ctx.font = `bold ${14 * s}px Arial`;
    ctx.textAlign = 'center';
    ctx.fillText(`${player.energy} / ${player.maxEnergy}`, c.width / 2, barY + barH / 2 + 5 * s);

    // 미사일 쿨다운 표시
    const mBtnX = c.width - 70 * s;
    const mBtnY = c.height - 120 * s;
    const mBtnR = 30 * s;

    ctx.fillStyle = player.missileReady ? '#ff8800' : '#553300';
    ctx.beginPath();
    ctx.arc(mBtnX, mBtnY, mBtnR, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffaa44';
    ctx.lineWidth = 2 * s;
    ctx.stroke();

    ctx.fillStyle = '#fff';
    ctx.font = `bold ${16 * s}px Arial`;
    ctx.textAlign = 'center';
    ctx.fillText('M', mBtnX, mBtnY + 5 * s);

    // 회전 버튼
    const rBtnX = 70 * s;
    const rBtnY = c.height - 120 * s;

    ctx.fillStyle = '#4466cc';
    ctx.beginPath();
    ctx.arc(rBtnX, rBtnY, mBtnR, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#6688ee';
    ctx.lineWidth = 2 * s;
    ctx.stroke();

    ctx.fillStyle = '#fff';
    ctx.font = `bold ${20 * s}px Arial`;
    ctx.fillText('↕', rBtnX, rBtnY + 6 * s);

    // 디버그: 빨리감기 버튼 (<< >>)
    const dbBtnW = 40 * s;
    const dbBtnH = 30 * s;
    const dbBtnY2 = c.height - 115 * s;
    const dbPrevX = c.width / 2 - 55 * s;
    const dbNextX = c.width / 2 + 15 * s;

    ctx.fillStyle = 'rgba(100, 100, 100, 0.6)';
    ctx.beginPath();
    ctx.roundRect(dbPrevX, dbBtnY2, dbBtnW, dbBtnH, 6 * s);
    ctx.fill();
    ctx.beginPath();
    ctx.roundRect(dbNextX, dbBtnY2, dbBtnW, dbBtnH, 6 * s);
    ctx.fill();

    ctx.fillStyle = '#ccc';
    ctx.font = `bold ${16 * s}px Arial`;
    ctx.textAlign = 'center';
    ctx.fillText('<<', dbPrevX + dbBtnW / 2, dbBtnY2 + dbBtnH / 2 + 5 * s);
    ctx.fillText('>>', dbNextX + dbBtnW / 2, dbBtnY2 + dbBtnH / 2 + 5 * s);

    // 일시정지, 미사일, 회전, 디버그 버튼 영역 저장
    this.pauseBtn = { x: 0, y: 0, w: 60 * s, h: 70 * s };
    this.missileBtnArea = { x: mBtnX - mBtnR, y: mBtnY - mBtnR, w: mBtnR * 2, h: mBtnR * 2 };
    this.rotateBtnArea = { x: rBtnX - mBtnR, y: rBtnY - mBtnR, w: mBtnR * 2, h: mBtnR * 2 };
    this.debugPrevBtn = { x: dbPrevX, y: dbBtnY2, w: dbBtnW, h: dbBtnH };
    this.debugNextBtn = { x: dbNextX, y: dbBtnY2, w: dbBtnW, h: dbBtnH };
  }

  // ==================== 결과 화면 ====================
  drawResult(success, waveManager, totalScore = 0, animProgress = 1) {
    const ctx = this.ctx;
    const c = this.canvas;
    const cx = c.width / 2;
    const s = (c.width / GAME.WIDTH) * GAME.UI_SCALE;

    // 반투명 오버레이
    ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
    ctx.fillRect(0, 0, c.width, c.height);

    const panelY = 150 * s;

    // 결과 패널 배경 (코드로 그리기 - 이미지 경계선 문제 해결)

    if (success) {
      // 별
      const starCount = waveManager.getStars();
      const starSize = 50 * s;
      const starGap = 10 * s;
      const maxStars = 5;
      const totalStarW = maxStars * starSize + (maxStars - 1) * starGap;
      const starStartX = cx - totalStarW / 2;
      const starImg = Assets.get('iconStar');
      const starDisImg = Assets.get('iconStarDis');

      for (let i = 0; i < maxStars; i++) {
        const imgSrc = i < starCount ? starImg : starDisImg;
        const sx = starStartX + i * (starSize + starGap);
        if (imgSrc && imgSrc.complete) {
          ctx.drawImage(imgSrc, sx, panelY, starSize, starSize);
        } else {
          this._drawStar(ctx, sx + starSize / 2, panelY + starSize / 2, starSize * 0.4);
        }
      }

      // Comp Rate
      ctx.fillStyle = '#ffcc00';
      ctx.font = `${20 * s}px Arial`;
      ctx.textAlign = 'center';
      ctx.fillText(`Comp Rate: ${waveManager.getCompRate()}%`, cx, panelY + 70 * s);

      // MISSION SUCCESS
      ctx.fillStyle = '#22cc66';
      ctx.font = `bold ${48 * s}px Arial`;
      ctx.fillText('MISSION', cx, panelY + 140 * s);
      ctx.fillStyle = '#ffffff';
      ctx.font = `bold ${56 * s}px Arial`;
      ctx.fillText('SUCCESS', cx, panelY + 200 * s);
    } else {
      ctx.fillStyle = '#ff4444';
      ctx.font = `bold ${48 * s}px Arial`;
      ctx.textAlign = 'center';
      ctx.fillText('MISSION', cx, panelY + 100 * s);
      ctx.fillStyle = '#ffffff';
      ctx.font = `bold ${56 * s}px Arial`;
      ctx.fillText('FAILED', cx, panelY + 160 * s);
    }

    // 스코어 정보
    const infoY = panelY + (success ? 280 : 240) * s;
    const lineH = 50 * s;

    ctx.font = `${24 * s}px Arial`;
    const items = [
      ['REWARD', success ? `★ ${waveManager.getStars()}` : '-'],
      ['SCORE', `${waveManager.score}`],
      ['COMP. RATE', `${waveManager.getCompRate()}%`],
      ['PLAY TIME', waveManager.getPlayTime()],
    ];

    for (let i = 0; i < items.length; i++) {
      const yy = infoY + i * lineH;
      ctx.fillStyle = '#888';
      ctx.textAlign = 'left';
      ctx.fillText(items[i][0], cx - 200 * s, yy);
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'right';
      ctx.fillText(items[i][1], cx + 200 * s, yy);

      // 구분선
      ctx.strokeStyle = '#333';
      ctx.beginPath();
      ctx.moveTo(cx - 200 * s, yy + 15 * s);
      ctx.lineTo(cx + 200 * s, yy + 15 * s);
      ctx.stroke();
    }

    // Score → Total Score 애니메이션
    if (success) {
      const totalY = infoY + items.length * lineH + 10 * s;
      const animScore = Math.floor(waveManager.score * (1 - animProgress));
      const displayTotal = totalScore + waveManager.score - animScore;

      ctx.fillStyle = '#888';
      ctx.font = `${20 * s}px Arial`;
      ctx.textAlign = 'left';
      ctx.fillText('TOTAL SCORE', cx - 200 * s, totalY);
      ctx.fillStyle = '#ffcc00';
      ctx.font = `bold ${24 * s}px Arial`;
      ctx.textAlign = 'right';
      ctx.fillText(displayTotal.toLocaleString(), cx + 200 * s, totalY);

      // 이동 중인 스코어 표시
      if (animProgress < 1) {
        ctx.fillStyle = `rgba(255, 204, 0, ${1 - animProgress})`;
        ctx.font = `bold ${18 * s}px Arial`;
        ctx.textAlign = 'center';
        const flyY = Utils.lerp(infoY + lineH, totalY, animProgress);
        ctx.fillText(`+${animScore > 0 ? animScore : waveManager.score}`, cx, flyY);
      }
    }

    // 버튼
    this.buttons = [];
    const btnW = 160 * s;
    const btnH = 55 * s;
    const btnY = infoY + items.length * lineH + (success ? 60 : 40) * s;

    // EXIT
    ctx.fillStyle = '#444';
    ctx.beginPath();
    ctx.roundRect(cx - btnW - 20 * s, btnY, btnW, btnH, 8 * s);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = `bold ${24 * s}px Arial`;
    ctx.textAlign = 'center';
    ctx.fillText('EXIT', cx - btnW / 2 - 20 * s, btnY + btnH / 2 + 8 * s);
    this.buttons.push({ id: 'exit', x: cx - btnW - 20 * s, y: btnY, w: btnW, h: btnH });

    // RETRY
    ctx.fillStyle = '#cc4444';
    ctx.beginPath();
    ctx.roundRect(cx + 20 * s, btnY, btnW, btnH, 8 * s);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.fillText('RETRY', cx + btnW / 2 + 20 * s, btnY + btnH / 2 + 8 * s);
    this.buttons.push({ id: 'retry', x: cx + 20 * s, y: btnY, w: btnW, h: btnH });

    if (success) {
      // NEXT (성공 시)
      const nextY = btnY + btnH + 20 * s;
      const nextW = btnW * 2 + 40 * s;
      ctx.fillStyle = '#22cc66';
      ctx.beginPath();
      ctx.roundRect(cx - nextW / 2, nextY, nextW, btnH, 8 * s);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.fillText('NEXT', cx, nextY + btnH / 2 + 8 * s);
      this.buttons.push({ id: 'next', x: cx - nextW / 2, y: nextY, w: nextW, h: btnH });
    } else {
      // AD CONTINUE (실패 시)
      const adY = btnY + btnH + 20 * s;
      const adW = btnW * 2 + 40 * s;
      ctx.fillStyle = '#cc8800';
      ctx.beginPath();
      ctx.roundRect(cx - adW / 2, adY, adW, btnH, 8 * s);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.fillText('AD CONTINUE', cx, adY + btnH / 2 + 8 * s);
      this.buttons.push({ id: 'adContinue', x: cx - adW / 2, y: adY, w: adW, h: btnH });
    }
  }

  // ==================== 일시정지 ====================
  drawPause() {
    const ctx = this.ctx;
    const c = this.canvas;
    const cx = c.width / 2;
    const s = (c.width / GAME.WIDTH) * GAME.UI_SCALE;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, c.width, c.height);

    ctx.fillStyle = '#fff';
    ctx.font = `bold ${56 * s}px Arial`;
    ctx.textAlign = 'center';
    ctx.fillText('PAUSED', cx, c.height / 2 - 60 * s);

    this.buttons = [];

    // Resume
    const btnW = 250 * s;
    const btnH = 60 * s;
    let btnY = c.height / 2 + 20 * s;

    ctx.fillStyle = '#22cc66';
    ctx.beginPath();
    ctx.roundRect(cx - btnW / 2, btnY, btnW, btnH, 10 * s);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = `bold ${28 * s}px Arial`;
    ctx.fillText('RESUME', cx, btnY + btnH / 2 + 8 * s);
    this.buttons.push({ id: 'resume', x: cx - btnW / 2, y: btnY, w: btnW, h: btnH });

    // Exit
    btnY += btnH + 20 * s;
    ctx.fillStyle = '#cc4444';
    ctx.beginPath();
    ctx.roundRect(cx - btnW / 2, btnY, btnW, btnH, 10 * s);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.fillText('EXIT', cx, btnY + btnH / 2 + 8 * s);
    this.buttons.push({ id: 'exit', x: cx - btnW / 2, y: btnY, w: btnW, h: btnH });
  }

  // ==================== 유틸 ====================
  _drawBackButton(s) {
    const ctx = this.ctx;
    const bx = 20 * s;
    const by = 30 * s;
    const bw = 50 * s;
    const bh = 50 * s;

    const backImg = Assets.get('iconBack');
    if (backImg && backImg.complete) {
      ctx.drawImage(backImg, bx, by, bw, bh);
    } else {
      ctx.fillStyle = '#446688';
      ctx.beginPath();
      ctx.roundRect(bx, by, bw, bh, 8 * s);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = `bold ${28 * s}px Arial`;
      ctx.textAlign = 'center';
      ctx.fillText('←', bx + bw / 2, by + bh / 2 + 8 * s);
    }

    this.buttons.push({ id: 'back', x: bx, y: by, w: bw, h: bh });
  }

  _drawStar(ctx, x, y, r) {
    ctx.save();
    ctx.fillStyle = '#ffcc00';
    ctx.shadowColor = '#ffcc00';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const outerAngle = (Math.PI * 2 / 5) * i - Math.PI / 2;
      const innerAngle = outerAngle + Math.PI / 5;
      ctx.lineTo(x + Math.cos(outerAngle) * r, y + Math.sin(outerAngle) * r);
      ctx.lineTo(x + Math.cos(innerAngle) * r * 0.4, y + Math.sin(innerAngle) * r * 0.4);
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  // 버튼 히트 테스트
  checkButtonHit(cx, cy) {
    for (const btn of this.buttons) {
      if (cx >= btn.x && cx <= btn.x + btn.w &&
          cy >= btn.y && cy <= btn.y + btn.h) {
        return btn.id;
      }
    }
    return null;
  }

  // HUD 버튼 히트 테스트 (인게임)
  checkHUDHit(cx, cy) {
    if (this.pauseBtn &&
        cx >= this.pauseBtn.x && cx <= this.pauseBtn.x + this.pauseBtn.w &&
        cy >= this.pauseBtn.y && cy <= this.pauseBtn.y + this.pauseBtn.h) {
      return 'pause';
    }
    if (this.missileBtnArea &&
        cx >= this.missileBtnArea.x && cx <= this.missileBtnArea.x + this.missileBtnArea.w &&
        cy >= this.missileBtnArea.y && cy <= this.missileBtnArea.y + this.missileBtnArea.h) {
      return 'missile';
    }
    if (this.rotateBtnArea &&
        cx >= this.rotateBtnArea.x && cx <= this.rotateBtnArea.x + this.rotateBtnArea.w &&
        cy >= this.rotateBtnArea.y && cy <= this.rotateBtnArea.y + this.rotateBtnArea.h) {
      return 'rotate';
    }
    if (this.reloadBtn &&
        cx >= this.reloadBtn.x && cx <= this.reloadBtn.x + this.reloadBtn.w &&
        cy >= this.reloadBtn.y && cy <= this.reloadBtn.y + this.reloadBtn.h) {
      return 'reload';
    }
    if (this.debugPrevBtn &&
        cx >= this.debugPrevBtn.x && cx <= this.debugPrevBtn.x + this.debugPrevBtn.w &&
        cy >= this.debugPrevBtn.y && cy <= this.debugPrevBtn.y + this.debugPrevBtn.h) {
      return 'debugPrev';
    }
    if (this.debugNextBtn &&
        cx >= this.debugNextBtn.x && cx <= this.debugNextBtn.x + this.debugNextBtn.w &&
        cy >= this.debugNextBtn.y && cy <= this.debugNextBtn.y + this.debugNextBtn.h) {
      return 'debugNext';
    }
    return null;
  }
}
