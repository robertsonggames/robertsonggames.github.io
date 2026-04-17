// ============================================================
// Galaxy Falcon 3 - 웨이브/CSV 파싱 시스템
// ============================================================

class WaveManager {
  constructor() {
    this.waves = [];       // 파싱된 웨이브 데이터
    this.currentIndex = 0;
    this.enemies = [];
    this.waitTimer = 0;
    this.waiting = false;
    this.waitForClear = false;
    this.missionComplete = false;
    this.score = 0;
    this.totalEnemies = 0;
    this.killedEnemies = 0;
    this.startTime = 0;
    this.endTime = 0; // 미션 종료 시간 고정
  }

  // 스프레드시트 CSV 데이터로 로드
  loadFromCSV(csvText) {
    this._parseCSV(csvText);
  }

  // CSV 텍스트를 행 단위로 분리 (따옴표 안 줄바꿈 처리)
  _splitCSVLines(text) {
    const lines = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (ch === '"') { inQuotes = !inQuotes; current += ch; }
      else if (ch === '\n' && !inQuotes) { lines.push(current); current = ''; }
      else if (ch !== '\r') { current += ch; }
    }
    if (current) lines.push(current);
    return lines;
  }

  _parseCSV(text) {
    const lines = this._splitCSVLines(text.trim());
    // 헤더(1행) 스킵 - 메타데이터는 SpreadsheetLoader에서 처리
    this.waves = [];

    for (let i = 1; i < lines.length; i++) {
      const row = this._parseCSVRow(lines[i]);
      if (row.length < 2) continue;

      // A열(row[0]): Skip - 1이면 이 행을 무시
      const skipFlag = row[0].trim();
      if (skipFlag === '1') continue;

      // 컬럼: Skip | enemy_type | size | health | bullet | movement | Start_X&Y | facing | reward
      const type = row[1].trim();
      if (!type) continue;

      // Wait 명령: "Wait N" 형식 (예: "Wait 2", "Wait 0")
      const waitMatch = type.match(/^Wait\s+(\d+\.?\d*)$/i);
      if (waitMatch) {
        this.waves.push({
          type: 'Wait',
          duration: parseFloat(waitMatch[1]),
        });
      } else {
        // Start_X&Y 파싱: "0, 1000" 형식
        const xyStr = (row[6] || '').trim();
        const xyParts = xyStr.split(/\s*,\s*/);
        const startX = parseFloat(xyParts[0]) || 0;
        const startY = parseFloat(xyParts[1]) || 900;

        this.waves.push({
          type: 'Enemy',
          enemyType: type,
          size: parseInt(row[2]) || 4,
          health: parseInt(row[3]) || 100,
          bullet: row[4] || '',
          movement: row[5] || '',
          startX,
          startY,
          facing: row[7] || '',
          reward: parseInt(row[8]) || 10,
        });
        this.totalEnemies++;
      }
    }
  }

  _parseCSVRow(line) {
    const result = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        inQuotes = !inQuotes;
      } else if (ch === ',' && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += ch;
      }
    }
    result.push(current);
    return result;
  }

  reset() {
    this.currentIndex = 0;
    this.enemies = [];
    this.waitTimer = 0;
    this.waiting = false;
    this.waitForClear = false;
    this.missionComplete = false;
    this.score = 0;
    this.killedEnemies = 0;
    this.totalEnemies = 0;

    // 적 수 다시 계산
    for (const w of this.waves) {
      if (w.type === 'Enemy') this.totalEnemies++;
    }

    this.startTime = Date.now();
    this.endTime = 0;
    this.completeTimer = null;
  }

  update(dt, player, bulletManager) {
    // 적 업데이트 (대기 중에도 기존 적은 계속 움직임)
    for (const enemy of this.enemies) {
      enemy.update(dt, player, bulletManager, this.enemies);
    }

    // 대기 중
    if (this.waiting) {
      this.waitTimer -= dt;
      if (this.waitTimer <= 0) {
        this.waiting = false;
        this._spawnNext(bulletManager);
      }
    }

    // 전멸 대기
    if (this.waitForClear) {
      const aliveEnemies = this.enemies.filter(e => e.alive);
      if (aliveEnemies.length === 0) {
        this.waitForClear = false;
        this._spawnNext(bulletManager);
      }
    }

    // 죽은 적 점수 계산
    const newDead = this.enemies.filter(e => !e.alive && !e._scored);
    for (const e of newDead) {
      if (e.health <= 0) {
        this.score += e.reward;
        this.killedEnemies++;
      }
      e._scored = true;
    }

    // 미션 완료 체크 (마지막 적 사망 후 1초 지연)
    if (this.currentIndex >= this.waves.length && this.enemies.every(e => !e.alive)) {
      if (this.completeTimer === null || this.completeTimer === undefined) {
        this.completeTimer = 0;
        if (!this.endTime) this.endTime = Date.now();
      } else {
        this.completeTimer += dt;
        if (this.completeTimer >= 1.0) {
          this.missionComplete = true;
        }
      }
    }
  }

  _spawnNext(bulletManager) {
    if (this.currentIndex >= this.waves.length) return;

    // Wait을 만날 때까지 모든 적을 스폰
    while (this.currentIndex < this.waves.length) {
      const entry = this.waves[this.currentIndex];

      if (entry.type === 'Wait') {
        if (entry.duration === 0) {
          this.waitForClear = true;
        } else {
          this.waiting = true;
          this.waitTimer = entry.duration;
        }
        this.currentIndex++;
        return;
      }

      // 적 스폰
      const enemy = new Enemy({
        type: entry.enemyType,
        size: entry.size,
        health: entry.health,
        bulletData: entry.bullet,
        moveData: entry.movement,
        startX: entry.startX,
        startY: entry.startY,
        facing: entry.facing,
        reward: entry.reward,
      });

      // 보스 그룹: B 접두사 적들을 그룹으로 묶기 (Box 제외)
      if (/^B[A-Z]/.test(entry.enemyType) && entry.enemyType !== 'Box') {
        // 체력이 있고 이동 데이터가 있으면 리더
        if (entry.health > 0 && entry.movement) {
          this._currentBossLeader = enemy;
        } else if (this._currentBossLeader) {
          // 파트: 리더에 연결
          enemy.bossParent = this._currentBossLeader;
          enemy.bossOffsetX = entry.startX - this._currentBossLeader.x;
          enemy.bossOffsetY = entry.startY - this._currentBossLeader.y;
          this._currentBossLeader.bossParts.push(enemy);
          // 체력 D 마크
          if (entry.health === 0 || entry.healthShared) {
            enemy.isHealthShared = true;
          }
        }
      } else {
        this._currentBossLeader = null;
      }

      console.log(`[Spawn] ${entry.enemyType} at (${entry.startX}, ${entry.startY}), move: ${entry.movement}`);
      this.enemies.push(enemy);
      this.currentIndex++;
    }
  }

  start(bulletManager) {
    this.reset();
    this._spawnNext(bulletManager);
  }

  draw(ctx, canvas) {
    for (const enemy of this.enemies) {
      if (enemy.alive) enemy.draw(ctx, canvas);
    }
  }

  getAliveEnemies() {
    return this.enemies.filter(e => e.alive);
  }

  getCompRate() {
    if (this.totalEnemies === 0) return 100;
    return Math.round((this.killedEnemies / this.totalEnemies) * 1000) / 10;
  }

  getPlayTime() {
    const end = this.endTime || Date.now();
    const elapsed = Math.floor((end - this.startTime) / 1000);
    const min = Math.floor(elapsed / 60);
    const sec = elapsed % 60;
    return `${min}:${sec.toString().padStart(2, '0')}`;
  }

  getStars() {
    const rate = this.getCompRate();
    if (rate >= 95) return 5;
    if (rate >= 80) return 4;
    if (rate >= 60) return 3;
    if (rate >= 40) return 2;
    if (rate >= 20) return 1;
    return 0;
  }

  // 디버그: 다음 Wait 0까지 스킵
  skipToNextWait0(bulletManager) {
    // 현재 살아있는 적 모두 제거
    for (const e of this.enemies) {
      if (e.alive) {
        e.alive = false;
        e._scored = true;
      }
    }
    this.waiting = false;
    this.waitForClear = false;

    // 다음 Wait 0 찾기
    while (this.currentIndex < this.waves.length) {
      const entry = this.waves[this.currentIndex];
      if (entry.type === 'Wait' && entry.duration === 0) {
        this.currentIndex++;
        break;
      }
      if (entry.type === 'Enemy') {
        this.totalEnemies--; // 스킵된 적은 카운트에서 제거
      }
      this.currentIndex++;
    }

    this._spawnNext(bulletManager);
  }

  // 디버그: 이전 Wait 0으로 스킵 (현재 웨이브 재시작)
  skipToPrevWait0(bulletManager) {
    // 현재 살아있는 적 모두 제거
    for (const e of this.enemies) {
      if (e.alive) {
        e.alive = false;
        e._scored = true;
      }
    }
    this.waiting = false;
    this.waitForClear = false;

    // 현재 위치에서 뒤로 탐색하여 이전 Wait 0 찾기
    let target = Math.max(0, this.currentIndex - 2);
    while (target > 0) {
      const entry = this.waves[target];
      if (entry.type === 'Wait' && entry.duration === 0) {
        break;
      }
      target--;
    }

    this.currentIndex = target > 0 ? target + 1 : 0;
    this._spawnNext(bulletManager);
  }
}
