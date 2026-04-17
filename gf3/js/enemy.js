// ============================================================
// Galaxy Falcon 3 - 적 시스템
// ============================================================

class Enemy {
  constructor({ type, size, health, bulletData, moveData, startX, startY, facing, reward }) {
    this.type = type;           // 'T', 'Box', 'R', 'P', 'H', 'D', 'C', 'TT', 'TR', etc.
    this.size = size || 4;
    this.health = health;
    this.maxHealth = health;
    this.reward = reward || 10;
    this.alive = true;
    this.x = startX;
    this.y = startY;
    this.facing = facing || '';  // '', 'D', 'A'
    this.radius = BASE_ENEMY_RADIUS * (SIZE_SCALE[this.size] || 1);

    // 보스 시스템: B 접두사 + 도형이니셜 (예: BR, BT, BC 등), Box는 제외
    this.isBoss = /^B[A-Z]/.test(this.type) && this.type !== 'Box';
    this.bossParent = null;   // 보스 파트의 리더 참조
    this.bossParts = [];      // 리더가 관리하는 파트 목록
    this.bossOffsetX = 0;     // 리더 대비 상대 좌표
    this.bossOffsetY = 0;
    this.isHealthShared = false; // D 마크: 체력 공유 표시용

    // 색상 (T1, T2 등 변형 타입은 기본 타입(T)의 색상 사용)
    const baseType = this.type.replace(/^B/, '').replace(/\d+$/, '');
    const colorKey = Object.keys(ENEMY_COLORS).find(k => baseType.startsWith(k)) || 'T';
    this.fillColor = ENEMY_COLORS[colorKey].fill;
    this.strokeColor = ENEMY_COLORS[colorKey].stroke;

    // 이동 시스템
    this.moveSteps = this._parseMoveData(moveData);
    this.currentMoveIndex = 0;
    this.moveSpecial = null; // 'TT', 'Rebound'
    this.ttFreq = 0;
    this.ttTimer = 0;
    this.reboundAngle = 0;

    // Return/Repeat 시스템
    this.originX = startX;
    this.originY = startY;
    this.waypoints = [{ x: startX, y: startY }]; // 각 스텝 시작 위치 기록
    this.returning = false;       // Return: 경로 역순 복귀 중
    this.repeating = false;       // Repeat: 초기 위치로 직선 복귀 중
    this.returnWaypointIdx = 0;   // 현재 향하는 웨이포인트 인덱스
    this.returnSpeed = 0;

    this._initMovement(moveData);
    this._applyCurrentMove();

    // 총알 시스템: 시퀀스 그룹 (Wait으로 구분)
    this.bulletSequence = this._parseBulletSequence(bulletData);
    this.bulletSeqIndex = 0;      // 현재 시퀀스 그룹 인덱스
    this.bulletSeqTimer = 0;      // 시퀀스 타이머
    this.bulletSeqWaiting = false; // Wait 중인지
    this.bulletSeqWaitTime = 0;   // Wait 시간
    this.bulletFired = false;     // 현재 그룹 발사 완료 여부

    // 렌더링 각도
    this.renderAngle = 0;
  }

  _parseMoveData(moveData) {
    if (!moveData || moveData === '') return [{ angle: 180, speed: 100, stop: 'Out' }];

    // 특수 이동 체크 (TT, Rebound)
    if (moveData.startsWith('TT')) return [];
    if (moveData.startsWith('Rebound')) return [];

    const steps = moveData.split(/[\|\n]+/);
    return steps.map(step => {
      const trimmed = step.trim();
      // Return, Repeat 단독 키워드
      if (trimmed === 'Return' || trimmed === 'Repeat') {
        return { angle: 0, speed: 0, stop: trimmed };
      }
      // 새 구분자: ',' (이전 ';'도 호환)
      const parts = trimmed.split(/\s*[,;]\s*/).map(s => s.trim());
      // "속도, Repeat" 또는 "속도, Return" 형식 (예: 160, Repeat)
      if (parts.length === 2 && (parts[1] === 'Repeat' || parts[1] === 'Return')) {
        return { angle: 0, speed: parseFloat(parts[0]) || 100, stop: parts[1] };
      }
      if (parts.length >= 3) {
        return {
          angle: parseFloat(parts[0]),
          speed: parseFloat(parts[1]),
          stop: parts[2],
        };
      }
      return null;
    }).filter(s => s !== null);
  }

  _initMovement(moveData) {
    if (!moveData) return;

    if (moveData.startsWith('TT')) {
      this.moveSpecial = 'TT';
      const parts = moveData.split(/\s*[,;]\s*/);
      this.speed = (parseFloat(parts[1]) || 120) * ENEMY_SPEED_SCALE;
      this.ttFreq = parseFloat(parts[2]) || 3;
      this.ttTimer = 0;
      this.vx = 0;
      this.vy = 0;
      return;
    }

    if (moveData.startsWith('Rebound')) {
      this.moveSpecial = 'Rebound';
      const parts = moveData.split(/\s*[,;]\s*/);
      this.reboundAngle = parseFloat(parts[1]) || 225;
      this.speed = (parseFloat(parts[2]) || 120) * ENEMY_SPEED_SCALE;
      const dir = Utils.dirFromAngle(this.reboundAngle);
      this.vx = dir.x * this.speed;
      this.vy = dir.y * this.speed;
      return;
    }
  }

  _applyCurrentMove() {
    if (this.moveSpecial) return;
    if (this.currentMoveIndex >= this.moveSteps.length) {
      this.alive = false;
      return;
    }
    const step = this.moveSteps[this.currentMoveIndex];
    const dir = Utils.dirFromAngle(step.angle);
    this.vx = dir.x * step.speed * ENEMY_SPEED_SCALE;
    this.vy = dir.y * step.speed * ENEMY_SPEED_SCALE;
    this.currentAngle = step.angle;

    // 웨이포인트 기록 (각 스텝 시작 위치)
    if (this.waypoints.length <= this.currentMoveIndex) {
      this.waypoints.push({ x: this.x, y: this.y });
    }
  }

  // 총알 시퀀스 파서: Wait으로 구분된 그룹 배열 반환
  // 반환: [{ type:'fire', patterns:[...] }, { type:'wait', duration:N }, ...]
  _parseBulletSequence(bulletData) {
    if (!bulletData || bulletData === '') return [];

    // | 로 분리
    const parts = bulletData.split(/[\|\n]+/);
    const sequence = [];
    let currentGroup = [];

    for (const p of parts) {
      const trimmed = p.trim();
      const waitMatch = trimmed.match(/^Wait\s+(\d+\.?\d*)$/i);
      if (waitMatch) {
        // 현재 그룹을 fire로 추가
        if (currentGroup.length > 0) {
          sequence.push({ type: 'fire', patterns: currentGroup });
          currentGroup = [];
        }
        sequence.push({ type: 'wait', duration: parseFloat(waitMatch[1]) });
      } else {
        const pattern = this._parseSingleBullet(trimmed);
        if (pattern) currentGroup.push(pattern);
      }
    }

    // 마지막 그룹
    if (currentGroup.length > 0) {
      sequence.push({ type: 'fire', patterns: currentGroup });
    }

    // 시퀀스가 없으면 빈 배열
    // Wait이 없는 경우: 기존 동작 (독립 쿨타임 발사)
    return sequence;
  }

  _parseSingleBullet(str) {
    const clean = str.replace(/[()\"]/g, '').trim();
    const parts = clean.split(',').map(s => s.trim());
    if (parts.length < 7) return null;

    // 새 형식: (크기, 개수, 속도, 거리, 데미지, 쿨타임, 각도, 터질때반경, 스플래쉬데미지)
    const angleStr = parts[6];
    let guided = false;
    let guideFreq = 0;
    let angle = 0;

    if (angleStr && angleStr.startsWith('G(')) {
      guided = true;
      guideFreq = parseFloat(angleStr.replace('G(', '').replace(')', ''));
      angle = 0;
    } else {
      angle = parseFloat(angleStr) || 0;
    }

    return {
      size: parseFloat(parts[0]) || 4,
      count: parseFloat(parts[1]) || 1,
      speed: parseFloat(parts[2]) || 100,
      range: parseFloat(parts[3]) || 500,
      damage: parseFloat(parts[4]) || 30,
      coolTime: parseFloat(parts[5]) || 1,
      angle,
      splashRadius: parseFloat(parts[7]) || 0,
      splashDamage: parseFloat(parts[8]) || 0,
      guided,
      guideFreq,
    };
  }

  update(dt, playerRef, bulletManager, allEnemies) {
    if (!this.alive) return;

    // 보스 파트: 리더를 따라 움직임
    if (this.bossParent) {
      if (!this.bossParent.alive) {
        this.alive = false;
        return;
      }
      this.x = this.bossParent.x + this.bossOffsetX;
      this.y = this.bossParent.y + this.bossOffsetY;
      this.renderAngle = this.bossParent.renderAngle;
      // 총알은 파트도 독립적으로 발사
      this._updateBullets(dt, playerRef, bulletManager);
      return;
    }

    // 특수 이동: TT (추적)
    if (this.moveSpecial === 'TT') {
      this.ttTimer += dt;
      const interval = this.ttFreq > 0 ? 10 / this.ttFreq : 9999;
      if (this.ttTimer >= interval && playerRef) {
        this.ttTimer -= interval;
        const angle = Utils.angleBetween(this.x, this.y, playerRef.x, playerRef.y);
        const dir = Utils.dirFromAngle(angle);
        this.vx = dir.x * this.speed;
        this.vy = dir.y * this.speed;
      }
      this.x += this.vx * dt;
      this.y += this.vy * dt;
    }
    // 특수 이동: Rebound (반사 - 벽 + 다른 적)
    else if (this.moveSpecial === 'Rebound') {
      this.x += this.vx * dt;
      this.y += this.vy * dt;
      // 벽 반사
      if (this.x <= -GAME.HALF_W + this.radius || this.x >= GAME.HALF_W - this.radius) {
        this.vx *= -1;
        this.x = Utils.clamp(this.x, -GAME.HALF_W + this.radius, GAME.HALF_W - this.radius);
      }
      if (this.y <= -GAME.HALF_H + this.radius || this.y >= GAME.HALF_H - this.radius) {
        this.vy *= -1;
        this.y = Utils.clamp(this.y, -GAME.HALF_H + this.radius, GAME.HALF_H - this.radius);
      }
      // 다른 적과 충돌 시 반사 (시각적 크기 기준)
      if (allEnemies) {
        for (const other of allEnemies) {
          if (other === this || !other.alive) continue;
          const dist = Utils.dist(this.x, this.y, other.x, other.y);
          const visualScale = 1.2; // 도형의 실제 보이는 크기 기준
          const minDist = (this.radius + other.radius) * visualScale;
          if (dist < minDist && dist > 0) {
            // 충돌 방향으로 반사
            const nx = (this.x - other.x) / dist;
            const ny = (this.y - other.y) / dist;
            const dot = this.vx * nx + this.vy * ny;
            if (dot < 0) { // 서로 다가가는 중일 때만
              this.vx -= 2 * dot * nx;
              this.vy -= 2 * dot * ny;
            }
            // 겹침 완전 해소
            const overlap = minDist - dist;
            this.x += nx * overlap;
            this.y += ny * overlap;
          }
        }
      }
    }
    // Return 중: 경로를 역순으로 되돌아감
    else if (this.returning) {
      const target = this.waypoints[this.returnWaypointIdx];
      const dx = target.x - this.x;
      const dy = target.y - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < this.returnSpeed * dt) {
        this.x = target.x;
        this.y = target.y;
        this.returnWaypointIdx--;
        if (this.returnWaypointIdx < 0) {
          // 원점 도착 → 다시 정방향 시작
          this.returning = false;
          this.currentMoveIndex = 0;
          this.waypoints = [{ x: this.originX, y: this.originY }];
          this._applyCurrentMove();
        } else {
          // 다음 역방향 웨이포인트로, 해당 스텝의 속도 사용
          this.returnSpeed = this.moveSteps[this.returnWaypointIdx].speed * ENEMY_SPEED_SCALE;
        }
      } else {
        this.vx = (dx / dist) * this.returnSpeed;
        this.vy = (dy / dist) * this.returnSpeed;
        this.x += this.vx * dt;
        this.y += this.vy * dt;
      }
    }
    // Repeat 중: 초기 위치로 직선 복귀
    else if (this.repeating) {
      const dx = this.originX - this.x;
      const dy = this.originY - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < this.returnSpeed * dt) {
        this.x = this.originX;
        this.y = this.originY;
        this.repeating = false;
        this.currentMoveIndex = 0;
        this.waypoints = [{ x: this.originX, y: this.originY }];
        this._applyCurrentMove();
      } else {
        this.vx = (dx / dist) * this.returnSpeed;
        this.vy = (dy / dist) * this.returnSpeed;
        this.x += this.vx * dt;
        this.y += this.vy * dt;
      }
    }
    // 일반 이동
    else {
      this.x += this.vx * dt;
      this.y += this.vy * dt;
      this._checkStopCondition();
    }

    // 방향 설정
    if (this.facing === 'D') {
      this.renderAngle = Math.atan2(-this.vx, this.vy);
    } else if (this.facing === 'A' && playerRef) {
      const a = Utils.angleBetween(this.x, this.y, playerRef.x, playerRef.y);
      this.renderAngle = (a - 180) * Math.PI / 180;
    } else {
      this.renderAngle = 0;
    }

    // 총알 발사
    this._updateBullets(dt, playerRef, bulletManager);

    // 화면 밖으로 나가면 제거 (Out 이동의 경우)
    if (this.moveSpecial !== 'Rebound' && Utils.isOutOfBounds(this.x, this.y, 200)) {
      const step = this.moveSteps[this.currentMoveIndex];
      if (step && step.stop === 'Out') {
        this.alive = false;
      }
    }
  }

  _checkStopCondition() {
    if (this.moveSpecial) return;
    if (this.currentMoveIndex >= this.moveSteps.length) return;

    const step = this.moveSteps[this.currentMoveIndex];
    const stop = step.stop;
    let shouldAdvance = false;

    if (stop === 'Out') {
      // Out은 화면 밖에서 처리
      return;
    } else if (stop === 'Return') {
      // 최초 좌표로 돌아가기
      this._startReturn();
      return;
    } else if (stop === 'Repeat') {
      // 초기 위치로 돌아간 뒤 처음부터 반복
      this._startRepeat();
      return;
    } else if (stop.startsWith('X')) {
      const targetX = parseFloat(stop.substring(1));
      if ((this.vx > 0 && this.x >= targetX) || (this.vx < 0 && this.x <= targetX) || (this.vx === 0 && Math.abs(this.x - targetX) < 5)) {
        shouldAdvance = true;
      }
    } else if (stop.startsWith('Y')) {
      const targetY = parseFloat(stop.substring(1));
      if ((this.vy > 0 && this.y >= targetY) || (this.vy < 0 && this.y <= targetY) || (this.vy === 0 && Math.abs(this.y - targetY) < 5)) {
        shouldAdvance = true;
      }
    }

    if (shouldAdvance) {
      this.currentMoveIndex++;
      if (this.currentMoveIndex < this.moveSteps.length) {
        const nextStop = this.moveSteps[this.currentMoveIndex].stop;
        if (nextStop === 'Return') {
          // Return: 경로 역순 왕복
          this._startReturn();
        } else if (nextStop === 'Repeat') {
          this._startRepeat();
        } else {
          this._applyCurrentMove();
        }
      } else {
        this.alive = false;
      }
    }
  }

  _startReturn() {
    // 현재 위치를 마지막 웨이포인트로 추가
    this.waypoints.push({ x: this.x, y: this.y });
    // 마지막 웨이포인트에서 하나 전으로 향함
    this.returnWaypointIdx = this.waypoints.length - 2;
    // 현재 스텝(Return 직전)의 속도 사용
    let speed = 100;
    if (this.returnWaypointIdx >= 0 && this.returnWaypointIdx < this.moveSteps.length) {
      speed = this.moveSteps[this.returnWaypointIdx].speed || 100;
    }
    this.returnSpeed = speed * ENEMY_SPEED_SCALE;
    this.returning = true;
  }

  _startRepeat() {
    // 초기 위치로 돌아간 뒤 처음부터 반복
    let speed = 100;
    const step = this.moveSteps[this.currentMoveIndex];
    if (step && step.speed > 0) {
      speed = step.speed;
    } else {
      // Repeat 스텝에 speed가 없으면 직전 스텝의 speed 사용
      for (let i = this.currentMoveIndex - 1; i >= 0; i--) {
        if (this.moveSteps[i].speed > 0) {
          speed = this.moveSteps[i].speed;
          break;
        }
      }
    }
    this.returnSpeed = speed * ENEMY_SPEED_SCALE;
    this.repeating = true;
  }

  _updateBullets(dt, playerRef, bulletManager) {
    if (this.bulletSequence.length === 0) return;

    // Wait이 없는 시퀀스 (fire만 있음) → 독립 쿨타임 모드
    const hasWait = this.bulletSequence.some(s => s.type === 'wait');

    if (!hasWait) {
      // 기존 동작: 각 패턴이 독립적으로 쿨타임 기반 발사
      for (const seq of this.bulletSequence) {
        if (seq.type !== 'fire') continue;
        for (const pattern of seq.patterns) {
          if (!pattern._timer) pattern._timer = 0;
          pattern._timer += dt;
          if (pattern._timer >= pattern.coolTime) {
            pattern._timer -= pattern.coolTime;
            this._firePattern(pattern, playerRef, bulletManager);
          }
        }
      }
      return;
    }

    // Wait이 있는 시퀀스 → 순차 실행
    if (this.bulletSeqIndex >= this.bulletSequence.length) {
      // 마지막 도달: 처음으로 순환
      this.bulletSeqIndex = 0;
      this.bulletSeqWaiting = false;
      this.bulletFired = false;
    }

    if (this.bulletSeqWaiting) {
      this.bulletSeqTimer += dt;
      if (this.bulletSeqTimer >= this.bulletSeqWaitTime) {
        this.bulletSeqWaiting = false;
        this.bulletSeqIndex++;
        this.bulletFired = false;
      }
      return;
    }

    const current = this.bulletSequence[this.bulletSeqIndex];
    if (!current) return;

    if (current.type === 'wait') {
      this.bulletSeqWaiting = true;
      this.bulletSeqTimer = 0;
      this.bulletSeqWaitTime = current.duration;
      return;
    }

    if (current.type === 'fire' && !this.bulletFired) {
      // 그룹 내 모든 패턴 동시 발사
      for (const pattern of current.patterns) {
        this._firePattern(pattern, playerRef, bulletManager);
      }
      this.bulletFired = true;
      this.bulletSeqIndex++;
      this.bulletFired = false;
    }
  }

  _firePattern(pattern, playerRef, bulletManager) {
    let baseAngle = 180; // 기본: 아래 방향
    if (this.facing === 'A' && playerRef) {
      // Aim: 플레이어를 향해 발사
      baseAngle = Utils.angleBetween(this.x, this.y, playerRef.x, playerRef.y);
    } else if (this.facing === 'D') {
      // Direction: 이동 방향으로 발사
      baseAngle = this.currentAngle || 180;
    }

    if (pattern.count === 1) {
      this._spawnBullet(bulletManager, pattern, baseAngle + pattern.angle, playerRef);
    } else {
      const spread = pattern.angle;
      const totalSpread = spread * (pattern.count - 1);
      const startAngle = baseAngle - totalSpread / 2;
      for (let j = 0; j < pattern.count; j++) {
        const a = startAngle + spread * j;
        this._spawnBullet(bulletManager, pattern, a, playerRef);
      }
    }
  }

  _spawnBullet(bulletManager, pattern, angle, playerRef) {
    // 적 도형의 아래쪽(꼭지점)에서 총알 발사
    const spawnOffsetY = -this.radius;
    bulletManager.addEnemyBullet(new Bullet({
      x: this.x,
      y: this.y + spawnOffsetY,
      angle: angle,
      speed: pattern.speed,
      damage: pattern.damage,
      range: pattern.range,
      radius: pattern.size * 3,
      color: '#ff4444',
      isPlayerBullet: false,
      splashRadius: pattern.splashRadius,
      splashDamage: pattern.splashDamage,
      guided: pattern.guided,
      guideFreq: pattern.guideFreq,
      targetFn: pattern.guided ? () => playerRef : null,
    }));
  }

  takeDamage(amount) {
    // 보스 파트: 리더에게 데미지 전달
    if (this.bossParent) {
      this.bossParent.takeDamage(amount);
      return;
    }

    this.health -= amount;
    if (this.health <= 0) {
      this.health = 0;
      this.alive = false;
      // 보스 리더 사망 시 모든 파트도 제거
      for (const part of this.bossParts) {
        part.alive = false;
      }
    }
  }

  draw(ctx, canvas) {
    if (!this.alive) return;

    const { x, y, scale } = Utils.gameToCanvas(this.x, this.y, canvas);
    const r = this.radius * scale;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(this.renderAngle);

    const img = Assets.getEnemy(this.type);
    if (img && img.complete) {
      const imgSize = r * 3.35;
      ctx.drawImage(img, -imgSize / 2, -imgSize / 2, imgSize, imgSize);
    } else {
      // 폴백: 기본 도형
      ctx.fillStyle = this.fillColor;
      ctx.strokeStyle = this.strokeColor;
      ctx.lineWidth = 2 * scale;
      this._drawShape(ctx, r);
    }

    // HP 바: 적과 함께 회전 (rotation 컨텍스트 안에서 그림)
    {
      const barW = r * 2.4;
      const barH = 5 * scale;
      const barOffsetY = -r - 14 * scale;
      const ratio = this.health / this.maxHealth;
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.fillRect(-barW / 2, barOffsetY, barW, barH);
      ctx.fillStyle = ratio > 0.5 ? '#44ff44' : ratio > 0.25 ? '#ffaa00' : '#ff4444';
      ctx.fillRect(-barW / 2, barOffsetY, barW * ratio, barH);
    }

    ctx.restore();
  }

  _drawShape(ctx, r) {
    const type = this.type.replace(/^B/, ''); // 보스 접두사 제거

    switch (type) {
      case 'T':
        this._drawPolygon(ctx, r, 3);
        break;
      case 'Box':
      case 'R':
        this._drawRect(ctx, r);
        break;
      case 'P':
        this._drawPolygon(ctx, r, 5);
        break;
      case 'H':
        this._drawPolygon(ctx, r, 6);
        break;
      case 'D':
        this._drawDiamond(ctx, r);
        break;
      case 'C':
        this._drawCircle(ctx, r);
        break;
      case 'TT':
        this._drawPolygon(ctx, r, 3);
        this._drawPolygon(ctx, r * 0.6, 3, Math.PI);
        break;
      case 'TR':
        this._drawPolygon(ctx, r, 3);
        this._drawRect(ctx, r * 0.5);
        break;
      case 'TD':
        this._drawPolygon(ctx, r, 3);
        this._drawDiamond(ctx, r * 0.5);
        break;
      case 'TC':
        this._drawPolygon(ctx, r, 3);
        this._drawCircle(ctx, r * 0.4);
        break;
      case 'TP':
        this._drawPolygon(ctx, r, 3);
        this._drawPolygon(ctx, r * 0.5, 5);
        break;
      case 'RC':
        this._drawRect(ctx, r);
        this._drawCircle(ctx, r * 0.5);
        break;
      case 'RP':
        this._drawRect(ctx, r);
        this._drawPolygon(ctx, r * 0.5, 5);
        break;
      case 'PH':
        this._drawPolygon(ctx, r, 5);
        this._drawPolygon(ctx, r * 0.5, 6);
        break;
      default:
        this._drawPolygon(ctx, r, 3);
    }
  }

  _drawPolygon(ctx, r, sides, rotOffset = 0) {
    ctx.beginPath();
    for (let i = 0; i < sides; i++) {
      // 삼각형은 꼭지점이 아래를 향하도록 (180도 = 아래)
      const angle = rotOffset + (Math.PI * 2 / sides) * i - Math.PI / 2 + Math.PI;
      const px = Math.cos(angle) * r;
      const py = Math.sin(angle) * r;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  _drawRect(ctx, r) {
    ctx.beginPath();
    ctx.rect(-r, -r, r * 2, r * 2);
    ctx.fill();
    ctx.stroke();
  }

  _drawDiamond(ctx, r) {
    ctx.beginPath();
    ctx.moveTo(0, -r);
    ctx.lineTo(r * 0.7, 0);
    ctx.lineTo(0, r);
    ctx.lineTo(-r * 0.7, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  _drawCircle(ctx, r) {
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
}
