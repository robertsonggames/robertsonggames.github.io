// ============================================================
// Galaxy Falcon 3 - 총알 시스템
// ============================================================

class Bullet {
  constructor({ x, y, angle, speed, damage, range, radius = 4,
                color = '#ffff00', isPlayerBullet = true,
                splashRadius = 0, splashDamage = 0,
                guided = false, guideFreq = 0, targetFn = null }) {
    this.x = x;
    this.y = y;
    this.angle = angle;
    this.speed = speed;
    this.damage = damage;
    this.range = range;
    this.radius = radius;
    this.color = color;
    this.isPlayerBullet = isPlayerBullet;
    this.splashRadius = splashRadius;
    this.splashDamage = splashDamage;
    this.guided = guided;
    this.guideFreq = guideFreq;
    this.targetFn = targetFn;

    this.startX = x;
    this.startY = y;
    this.alive = true;
    this.traveled = 0;

    // 폭발 상태
    this.exploding = false;
    this.explodeTimer = 0;
    this.explodeDuration = 0.3; // 폭발 이펙트 지속 시간
    this.explodeX = 0;
    this.explodeY = 0;
    this.splashApplied = false; // 스플래시 데미지 적용 여부

    // 유도 타이머
    this.guideTimer = 0;
    this.guideInterval = guideFreq > 0 ? 10 / guideFreq : 9999;

    const dir = Utils.dirFromAngle(this.angle);
    this.vx = dir.x * this.speed;
    this.vy = dir.y * this.speed;
  }

  update(dt) {
    // 폭발 이펙트 진행 중
    if (this.exploding) {
      this.explodeTimer += dt;
      if (this.explodeTimer >= this.explodeDuration) {
        this.alive = false;
        this.exploding = false;
      }
      return;
    }

    if (!this.alive) return;

    // 유도 총알: 주기적으로 방향 재계산
    if (this.guided && this.targetFn) {
      this.guideTimer += dt;
      if (this.guideTimer >= this.guideInterval) {
        this.guideTimer -= this.guideInterval;
        const target = this.targetFn();
        if (target) {
          this.angle = Utils.angleBetween(this.x, this.y, target.x, target.y);
          const dir = Utils.dirFromAngle(this.angle);
          this.vx = dir.x * this.speed;
          this.vy = dir.y * this.speed;
        }
      }
    }

    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.traveled = Utils.dist(this.startX, this.startY, this.x, this.y);

    // 사거리 도달 → 스플래시가 있으면 폭발, 없으면 소멸
    if (this.traveled >= this.range) {
      if (this.splashRadius > 0) {
        this.explode();
      } else {
        this.alive = false;
      }
      return;
    }

    // 화면 밖
    if (Utils.isOutOfBounds(this.x, this.y, 50)) {
      this.alive = false;
    }
  }

  // 폭발 시작
  explode() {
    if (this.exploding) return;
    this.exploding = true;
    this.explodeTimer = 0;
    this.explodeX = this.x;
    this.explodeY = this.y;
    this.vx = 0;
    this.vy = 0;
  }

  draw(ctx, canvas) {
    // 폭발 이펙트 그리기
    if (this.exploding) {
      const { x, y, scale } = Utils.gameToCanvas(this.explodeX, this.explodeY, canvas);
      const progress = this.explodeTimer / this.explodeDuration;
      const maxR = this.splashRadius * scale;
      const currentR = maxR * Math.min(progress * 2, 1); // 빠르게 확장
      const alpha = 1 - progress; // 서서히 투명해짐

      ctx.save();
      // 외곽 원
      ctx.strokeStyle = `rgba(255, 150, 50, ${alpha})`;
      ctx.lineWidth = 3 * scale;
      ctx.beginPath();
      ctx.arc(x, y, currentR, 0, Math.PI * 2);
      ctx.stroke();
      // 내부 채우기
      ctx.fillStyle = `rgba(255, 200, 100, ${alpha * 0.3})`;
      ctx.beginPath();
      ctx.arc(x, y, currentR, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      return;
    }

    if (!this.alive) return;
    const { x, y, scale } = Utils.gameToCanvas(this.x, this.y, canvas);
    const r = this.radius * scale;

    // 미사일 스프라이트 (플레이어 스플래시 탄)
    if (this.isPlayerBullet && this.splashRadius > 0) {
      const missileImg = Assets.get('missile');
      if (missileImg && missileImg.complete) {
        ctx.save();
        ctx.translate(x, y);
        const rotAngle = (this.angle - 0) * Math.PI / 180;
        ctx.rotate(rotAngle);
        const mw = r * 3;
        const mh = r * 6;
        ctx.drawImage(missileImg, -mw / 2, -mh / 2, mw, mh);
        ctx.restore();
        return;
      }
    }

    ctx.save();
    ctx.fillStyle = this.color;
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 6 * scale;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

class BulletManager {
  constructor() {
    this.playerBullets = [];
    this.enemyBullets = [];
  }

  addPlayerBullet(bullet) {
    this.playerBullets.push(bullet);
  }

  addEnemyBullet(bullet) {
    this.enemyBullets.push(bullet);
  }

  update(dt) {
    for (const b of this.playerBullets) b.update(dt);
    for (const b of this.enemyBullets) b.update(dt);
    // 폭발 중인 총알은 유지, 완전히 끝난 것만 제거
    this.playerBullets = this.playerBullets.filter(b => b.alive || b.exploding);
    this.enemyBullets = this.enemyBullets.filter(b => b.alive || b.exploding);
  }

  draw(ctx, canvas) {
    for (const b of this.playerBullets) b.draw(ctx, canvas);
    for (const b of this.enemyBullets) b.draw(ctx, canvas);
  }

  clear() {
    this.playerBullets = [];
    this.enemyBullets = [];
  }
}
