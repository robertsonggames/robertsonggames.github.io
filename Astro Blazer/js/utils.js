// ============================================================
// Galaxy Falcon 3 - 유틸리티
// ============================================================

const Utils = {
  // 각도(게임 좌표계: 0=위)를 라디안으로 변환
  degToRad(deg) {
    return (deg - 90) * Math.PI / 180;
  },

  // 각도에서 방향 벡터 (게임 좌표계)
  dirFromAngle(deg) {
    const rad = this.degToRad(deg);
    return { x: Math.cos(rad), y: -Math.sin(rad) };
  },

  // 두 점 사이 거리
  dist(x1, y1, x2, y2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    return Math.sqrt(dx * dx + dy * dy);
  },

  // 두 점 사이 각도 (게임 좌표계, 0=위)
  angleBetween(x1, y1, x2, y2) {
    const rad = Math.atan2(-(y2 - y1), x2 - x1);
    let deg = rad * 180 / Math.PI + 90;
    if (deg < 0) deg += 360;
    return deg % 360;
  },

  // 게임 좌표 → 캔버스 좌표
  gameToCanvas(gx, gy, canvas) {
    const scaleX = canvas.width / GAME.WIDTH;
    const scaleY = canvas.height / GAME.HEIGHT;
    const scale = Math.min(scaleX, scaleY);
    const offsetX = (canvas.width - GAME.WIDTH * scale) / 2;
    const offsetY = (canvas.height - GAME.HEIGHT * scale) / 2;
    return {
      x: (gx + GAME.HALF_W) * scale + offsetX,
      y: (GAME.HALF_H - gy) * scale + offsetY,
      scale,
    };
  },

  // 캔버스 좌표 → 게임 좌표
  canvasToGame(cx, cy, canvas) {
    const scaleX = canvas.width / GAME.WIDTH;
    const scaleY = canvas.height / GAME.HEIGHT;
    const scale = Math.min(scaleX, scaleY);
    const offsetX = (canvas.width - GAME.WIDTH * scale) / 2;
    const offsetY = (canvas.height - GAME.HEIGHT * scale) / 2;
    return {
      x: (cx - offsetX) / scale - GAME.HALF_W,
      y: GAME.HALF_H - (cy - offsetY) / scale,
    };
  },

  // 화면 밖 체크
  isOutOfBounds(x, y, margin = 100) {
    return x < -GAME.HALF_W - margin || x > GAME.HALF_W + margin ||
           y < -GAME.HALF_H - margin || y > GAME.HALF_H + margin;
  },

  // 원-원 충돌
  circleCollision(x1, y1, r1, x2, y2, r2) {
    const d = this.dist(x1, y1, x2, y2);
    return d < r1 + r2;
  },

  clamp(val, min, max) {
    return Math.max(min, Math.min(max, val));
  },

  lerp(a, b, t) {
    return a + (b - a) * t;
  },

  randomRange(min, max) {
    return Math.random() * (max - min) + min;
  },
};

// roundRect 폴리필 (구형 브라우저 대응)
if (!CanvasRenderingContext2D.prototype.roundRect) {
  CanvasRenderingContext2D.prototype.roundRect = function(x, y, w, h, r) {
    if (typeof r === 'number') r = [r, r, r, r];
    const [tl, tr, br, bl] = r;
    this.moveTo(x + tl, y);
    this.lineTo(x + w - tr, y);
    this.quadraticCurveTo(x + w, y, x + w, y + tr);
    this.lineTo(x + w, y + h - br);
    this.quadraticCurveTo(x + w, y + h, x + w - br, y + h);
    this.lineTo(x + bl, y + h);
    this.quadraticCurveTo(x, y + h, x, y + h - bl);
    this.lineTo(x, y + tl);
    this.quadraticCurveTo(x, y, x + tl, y);
    this.closePath();
    return this;
  };
}
