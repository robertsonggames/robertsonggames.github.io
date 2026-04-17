// ============================================================
// Galaxy Falcon 3 - 플레이어 시스템
// ============================================================

class Player {
  constructor(bulletManager) {
    this.x = 0;
    this.y = -800;
    this.radius = 55;
    this.bulletManager = bulletManager;

    // 스탯 (기본값, 구글시트에서 덮어쓰기 가능)
    this.stats = { ...PLAYER_STATS };
    this.energy = this.stats.energy;
    this.maxEnergy = this.stats.energy;
    this.alive = true;
    this.facingUp = true; // true=위, false=아래 (180도 회전)

    // 기관총
    this.gunTimer = 0;
    this.gunCoolDown = this.stats.gunCoolDown;

    // 미사일
    this.missileTimer = 0;
    this.missileCoolDown = this.stats.missileCoolDown;
    this.missileReady = true;
    this.missileCapacity = 1;

    // 회전 애니메이션
    this.rotationAngle = 0; // 실제 렌더링 각도
    this.targetRotation = 0;
    this.rotating = false;

    // 무적 시간
    this.invincibleTimer = 0;
  }

  // 구글시트 "My Fighter" 데이터로 스탯 적용
  applySheetStats(sheetStats) {
    if (!sheetStats) return;
    this.stats = {
      energy: sheetStats.Health || PLAYER_STATS.energy,
      gunSpeed: sheetStats.GunSpeed || PLAYER_STATS.gunSpeed,
      gunRange: sheetStats.GunDistance || PLAYER_STATS.gunRange,
      gunDamage: sheetStats.GunDamage || PLAYER_STATS.gunDamage,
      gunCoolDown: sheetStats.GunCoolDown || PLAYER_STATS.gunCoolDown,
      missileSpeed: sheetStats.MissileSpeed || PLAYER_STATS.missileSpeed,
      missileRange: sheetStats.MissileDistance || PLAYER_STATS.missileRange,
      missileDamage: sheetStats.MissileDamage || PLAYER_STATS.missileDamage,
      missileSplashRange: sheetStats.MissileSplashRange || PLAYER_STATS.missileSplashRange,
      missileSplashDamage: sheetStats.MissileSplashDamage || PLAYER_STATS.missileSplashDamage,
      missileCoolDown: sheetStats.MissileCoolDown || PLAYER_STATS.missileCoolDown,
      moveSpeed: PLAYER_STATS.moveSpeed,
    };
    this.missileCapacity = sheetStats.MissileCapacity || 1;
    this.maxEnergy = this.stats.energy;
    this.energy = this.maxEnergy;
    this.gunCoolDown = this.stats.gunCoolDown;
    this.missileCoolDown = this.stats.missileCoolDown;
    console.log('[Player] 구글시트 스탯 적용:', this.stats);
  }

  reset() {
    this.x = 0;
    this.y = -800;
    this.energy = this.maxEnergy;
    this.alive = true;
    this.facingUp = true;
    this.rotationAngle = 0;
    this.targetRotation = 0;
    this.rotating = false;
    this.gunTimer = 0;
    this.missileTimer = 0;
    this.missileReady = true;
    this.invincibleTimer = 0;
  }

  update(dt, input) {
    if (!this.alive) return;

    // 무적 타이머
    if (this.invincibleTimer > 0) {
      this.invincibleTimer -= dt;
    }

    // 이동: 터치 드래그
    if (input.touching) {
      const scale = Math.min(
        document.getElementById('gameCanvas').width / GAME.WIDTH,
        document.getElementById('gameCanvas').height / GAME.HEIGHT
      );
      this.x += input.deltaX / scale;
      this.y -= input.deltaY / scale; // 캔버스 Y 반전
    }

    // 키보드 이동
    const kd = input.getKeyboardDelta(this.stats.moveSpeed * dt);
    if (kd.dx || kd.dy) {
      const scale = Math.min(
        document.getElementById('gameCanvas').width / GAME.WIDTH,
        document.getElementById('gameCanvas').height / GAME.HEIGHT
      );
      this.x += kd.dx / scale;
      this.y -= kd.dy / scale;
    }

    // 화면 경계 제한
    this.x = Utils.clamp(this.x, -GAME.HALF_W + this.radius, GAME.HALF_W - this.radius);
    this.y = Utils.clamp(this.y, -GAME.HALF_H + this.radius, GAME.HALF_H - this.radius);

    // 회전 처리
    if (input.twoFingerTap && !this.rotating) {
      this.facingUp = !this.facingUp;
      this.targetRotation = this.facingUp ? 0 : Math.PI;
      this.rotating = true;
    }
    if (this.rotating) {
      const diff = this.targetRotation - this.rotationAngle;
      if (Math.abs(diff) < 0.1) {
        this.rotationAngle = this.targetRotation;
        this.rotating = false;
      } else {
        this.rotationAngle += diff * 10 * dt;
      }
    }

    // 자동 기관총
    this.gunTimer += dt;
    if (this.gunTimer >= this.gunCoolDown) {
      this.gunTimer -= this.gunCoolDown;
      this._fireGun();
    }

    // 미사일 쿨다운
    if (!this.missileReady) {
      this.missileTimer += dt;
      if (this.missileTimer >= this.missileCoolDown) {
        this.missileReady = true;
        this.missileTimer = 0;
      }
    }

    // 미사일 발사 (더블탭 또는 버튼)
    if ((input.doubleTapFired || input.missileButtonPressed) && this.missileReady) {
      this._fireMissile();
    }
  }

  _fireGun() {
    const angle = this.facingUp ? 0 : 180;
    this.bulletManager.addPlayerBullet(new Bullet({
      x: this.x,
      y: this.y,
      angle: angle,
      speed: this.stats.gunSpeed,
      damage: this.stats.gunDamage,
      range: this.stats.gunRange,
      radius: 6,
      color: '#00ffff',
      isPlayerBullet: true,
    }));
  }

  _fireMissile() {
    if (!this.missileReady) return;
    this.missileReady = false;
    this.missileTimer = 0;

    const angle = this.facingUp ? 0 : 180;
    this.bulletManager.addPlayerBullet(new Bullet({
      x: this.x,
      y: this.y,
      angle: angle,
      speed: this.stats.missileSpeed,
      damage: this.stats.missileDamage,
      range: this.stats.missileRange,
      radius: 6,
      color: '#ff8800',
      isPlayerBullet: true,
      splashRadius: this.stats.missileSplashRange,
      splashDamage: this.stats.missileSplashDamage,
    }));
  }

  takeDamage(amount) {
    if (this.invincibleTimer > 0) return;
    this.energy -= amount;
    this.invincibleTimer = 0.5; // 0.5초 무적
    if (this.energy <= 0) {
      this.energy = 0;
      this.alive = false;
    }
  }

  draw(ctx, canvas) {
    if (!this.alive) return;

    const { x, y, scale } = Utils.gameToCanvas(this.x, this.y, canvas);
    const s = this.radius * scale;

    // 무적 깜빡임
    if (this.invincibleTimer > 0 && Math.floor(this.invincibleTimer * 10) % 2) return;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(this.rotationAngle);

    const flightImg = Assets.get('flight');
    const effectImg = Assets.get('flightEffect');

    if (flightImg && flightImg.complete) {
      // 엔진 이펙트 (전투기 뒤쪽)
      if (effectImg && effectImg.complete) {
        const flicker = 0.8 + Math.random() * 0.4;
        const ew = s * 0.8;
        const eh = s * 1.5 * flicker;
        ctx.globalAlpha = 0.7 + Math.random() * 0.3;
        ctx.drawImage(effectImg, -ew / 2, s * 0.3, ew, eh);
        ctx.globalAlpha = 1;
      }

      // 전투기 스프라이트
      const imgW = s * 2.69;
      const imgH = s * 3.22;
      ctx.drawImage(flightImg, -imgW / 2, -imgH / 2, imgW, imgH);
    } else {
      // 폴백: 단색 삼각형
      ctx.fillStyle = '#4488ff';
      ctx.beginPath();
      ctx.moveTo(0, -s * 1.2);
      ctx.lineTo(-s * 0.7, s * 0.8);
      ctx.lineTo(s * 0.7, s * 0.8);
      ctx.closePath();
      ctx.fill();
    }

    ctx.restore();

    // 전투기 뒤쪽 Health Bar
    const barW = s * 2.2;
    const barH = 6 * scale;
    const barX = x - barW / 2;
    const barY = y + s * 1.7;
    const hpRatio = this.energy / this.maxEnergy;

    // 배경 (어두운 바)
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.fillRect(barX, barY, barW, barH);

    // HP 게이지 (노란색)
    ctx.fillStyle = hpRatio > 0.5 ? '#ffcc00' : hpRatio > 0.25 ? '#ff8800' : '#ff3300';
    ctx.fillRect(barX, barY, barW * hpRatio, barH);
  }
}
