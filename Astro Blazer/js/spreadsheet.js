// ============================================================
// Galaxy Falcon 3 - Google Spreadsheet 로더
// ============================================================
// 구조: "Stage 1", "Stage 2" 등 탭 안에 M1, M2 미션이 구분자로 포함

class SpreadsheetLoader {
  constructor(spreadsheetId) {
    this.spreadsheetId = spreadsheetId;
    this.missions = {};  // { 'S1M1': { stage, mission, title, csv } }
    this.stages = {};    // { 1: { title, missions: [{mission, title}] } }
    this.fighterStats = null; // My Fighter 시트에서 로드한 전투기 스탯
    this.loaded = false;
    this.loading = false;
  }

  // gviz CSV 엔드포인트 URL
  _sheetUrl(sheetName) {
    return `https://docs.google.com/spreadsheets/d/${this.spreadsheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetName)}`;
  }

  // 시트 CSV fetch
  async _fetchSheet(sheetName) {
    try {
      const res = await fetch(this._sheetUrl(sheetName));
      if (!res.ok) return null;
      const text = await res.text();
      if (!text) return null;
      const lines = text.trim().split('\n');
      if (lines.length < 2) return null;
      return text;
    } catch {
      return null;
    }
  }

  // CSV 텍스트를 행 단위로 분리 (따옴표 안 줄바꿈 처리)
  _splitCSVLines(text) {
    const lines = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (ch === '"') {
        inQuotes = !inQuotes;
        current += ch;
      } else if (ch === '\n' && !inQuotes) {
        lines.push(current);
        current = '';
      } else if (ch === '\r') {
        // \r 무시
      } else {
        current += ch;
      }
    }
    if (current) lines.push(current);
    return lines;
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

  // "Stage N" 탭 하나를 파싱하여 미션별로 분리
  // 헤더에서 M1 정보 추출, "M2", "M3" 등의 구분자로 미션 분리
  _parseStageTab(csv, stageNum) {
    const lines = this._splitCSVLines(csv.trim());
    if (lines.length < 2) return [];

    const missions = [];
    let currentMission = null;
    let headerLine = null;

    for (let i = 0; i < lines.length; i++) {
      const row = this._parseCSVRow(lines[i]);

      if (i === 0) {
        // 첫 번째 헤더행: M1 정보 추출
        // col[1] = "M1 enemy_type" → 미션 번호
        // col[2] = "초보자aa size" → 미션 이름
        const mMatch = (row[1] || '').match(/^M(\d+)/);
        const mNum = mMatch ? parseInt(mMatch[1]) : 1;
        const nameMatch = (row[2] || '').match(/^(.+?)\s+\S+$/);
        const mName = nameMatch ? nameMatch[1] : '';

        // 헤더를 공통 형식으로 저장
        headerLine = 'skip,enemy_type,size,health,bullet,movement,xy,facing,reward';
        currentMission = { mission: mNum, title: mName, lines: [headerLine] };
        continue;
      }

      const col1 = (row[1] || '').trim();

      // 새 미션 구분자: col[1]이 "M{숫자}"
      const missionMarker = col1.match(/^M(\d+)$/);
      if (missionMarker) {
        // 이전 미션 저장
        if (currentMission && currentMission.lines.length > 1) {
          missions.push(currentMission);
        }
        const mNum = parseInt(missionMarker[1]);
        // 미션 이름: col[2]에서 추출
        const mName = (row[2] || '').trim();
        currentMission = { mission: mNum, title: mName, lines: [headerLine] };
        continue;
      }

      // 서브헤더 스킵: col[1]이 "enemy_type"
      if (col1.toLowerCase() === 'enemy_type') {
        // 서브헤더에서 미션 이름 추출 (col[2]에 "이름 size" 형식)
        if (currentMission && !currentMission.title) {
          const subName = (row[2] || '').match(/^(.+?)\s+\S+$/);
          if (subName) currentMission.title = subName[1];
        }
        continue;
      }

      // 빈 행 스킵
      if (!col1) continue;

      // 데이터 행 → 현재 미션에 추가
      if (currentMission) {
        currentMission.lines.push(lines[i]);
      }
    }

    // 마지막 미션 저장
    if (currentMission && currentMission.lines.length > 1) {
      missions.push(currentMission);
    }

    return missions;
  }

  // 메인 로드: "Stage 1", "Stage 2", ... 탭을 탐색하여 로드
  async loadAll() {
    if (this.loading) return;
    this.loading = true;
    this.missions = {};
    this.stages = {};

    // My Fighter 시트 로드
    const fighterCSV = await this._fetchSheet('My Fighter');
    if (fighterCSV) {
      this._parseFighterCSV(fighterCSV);
    }

    // Stage 1 ~ Stage 20 까지 병렬 시도
    const maxStages = 20;
    const fetches = [];
    for (let s = 1; s <= maxStages; s++) {
      fetches.push(
        this._fetchSheet(`Stage ${s}`).then(csv => ({ stageNum: s, csv }))
      );
    }

    const results = await Promise.all(fetches);

    for (const { stageNum, csv } of results) {
      if (!csv) continue;

      // 헤더에서 실제 스테이지 번호 검증 (예: "S1 Skip" → Stage 1)
      const firstRow = this._parseCSVRow(csv.split('\n')[0]);
      const headerMatch = (firstRow[0] || '').match(/^S(\d+)/);
      if (!headerMatch || parseInt(headerMatch[1]) !== stageNum) continue;

      const missions = this._parseStageTab(csv, stageNum);
      if (missions.length === 0) continue;

      this.stages[stageNum] = { title: `Stage ${stageNum}`, missions: [] };

      for (const m of missions) {
        const key = `S${stageNum}M${m.mission}`;
        const missionCSV = m.lines.join('\n');
        this.missions[key] = {
          stage: stageNum,
          mission: m.mission,
          title: m.title,
          csv: missionCSV,
        };
        this.stages[stageNum].missions.push({
          mission: m.mission,
          title: m.title,
        });
      }
    }

    console.log('[SpreadsheetLoader] 로드 완료:', Object.keys(this.missions));
    this.loaded = true;
    this.loading = false;
  }

  // "My Fighter" 시트 파싱
  // 헤더: Parts, NecessaryStars, Health, GunSpeed, GunRange, GunDamage, GunCoolDown,
  //        MissileSpeed, MissileRange, MissileDamage, MissileSplashRange, MissileSplashDamage, MissileCoolDown, MissileCapacity
  _parseFighterCSV(csv) {
    const lines = csv.trim().split('\n');
    if (lines.length < 2) return;

    const header = this._parseCSVRow(lines[0]);
    // 각 행을 파이터 데이터로 파싱 (F1, F2, ...)
    for (let i = 1; i < lines.length; i++) {
      const row = this._parseCSVRow(lines[i]);
      if (!row[0] || !row[0].trim()) continue;

      const stats = {};
      for (let j = 0; j < header.length; j++) {
        const key = header[j].trim();
        const val = (row[j] || '').trim();
        stats[key] = isNaN(parseFloat(val)) ? val : parseFloat(val);
      }

      // 첫 번째 전투기(F1)를 기본 스탯으로 사용
      if (!this.fighterStats) {
        this.fighterStats = stats;
        console.log('[SpreadsheetLoader] My Fighter 로드:', stats);
      }
    }
  }

  // 전투기 스탯 반환
  getFighterStats() {
    return this.fighterStats;
  }

  // 사용 가능한 스테이지 번호 목록
  getStageList() {
    return Object.keys(this.stages).map(Number).sort((a, b) => a - b);
  }

  // 특정 스테이지의 미션 목록 [{ mission, title }, ...]
  getMissionList(stageNum) {
    const stage = this.stages[stageNum];
    if (!stage) return [];
    return stage.missions.slice().sort((a, b) => a.mission - b.mission);
  }

  // 미션 제목
  getMissionTitle(stageNum, missionNum) {
    const list = this.getMissionList(stageNum);
    const entry = list.find(m => m.mission === missionNum);
    return entry ? entry.title : '';
  }

  // 미션 CSV 데이터 반환
  getMissionCSV(stageNum, missionNum) {
    const key = `S${stageNum}M${missionNum}`;
    const data = this.missions[key];
    return data ? data.csv : null;
  }

  // 스테이지/미션 존재 여부
  hasMission(stageNum, missionNum) {
    return !!this.missions[`S${stageNum}M${missionNum}`];
  }
}
