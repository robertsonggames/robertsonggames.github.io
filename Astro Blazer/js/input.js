// ============================================================
// Galaxy Falcon 3 - 입력 시스템
// ============================================================

class InputManager {
  constructor(canvas) {
    this.canvas = canvas;
    this.touching = false;
    this.touchX = 0;
    this.touchY = 0;
    this.prevTouchX = 0;
    this.prevTouchY = 0;
    this.deltaX = 0;
    this.deltaY = 0;

    // 더블 탭 감지 (미사일)
    this.lastTapTime = 0;
    this.doubleTapFired = false;

    // 두 손가락 탭 감지 (회전)
    this.twoFingerTap = false;

    // 마우스 지원
    this.mouseDown = false;

    // UI 탭
    this.tapX = 0;
    this.tapY = 0;
    this.tapped = false;

    // 버튼 영역
    this.missileButtonPressed = false;
    this.rotateButtonPressed = false;

    this._bindEvents();
  }

  _bindEvents() {
    const c = this.canvas;

    // 터치 이벤트
    c.addEventListener('touchstart', (e) => this._onTouchStart(e), { passive: false });
    c.addEventListener('touchmove', (e) => this._onTouchMove(e), { passive: false });
    c.addEventListener('touchend', (e) => this._onTouchEnd(e), { passive: false });

    // 마우스 이벤트 (데스크톱 호환)
    c.addEventListener('mousedown', (e) => this._onMouseDown(e));
    c.addEventListener('mousemove', (e) => this._onMouseMove(e));
    c.addEventListener('mouseup', (e) => this._onMouseUp(e));

    // 키보드 (데스크톱 디버그)
    document.addEventListener('keydown', (e) => this._onKeyDown(e));
    document.addEventListener('keyup', (e) => this._onKeyUp(e));

    this.keys = {};
  }

  _getTouchPos(touch) {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: (touch.clientX - rect.left) * (this.canvas.width / rect.width),
      y: (touch.clientY - rect.top) * (this.canvas.height / rect.height),
    };
  }

  _onTouchStart(e) {
    e.preventDefault();

    // 두 손가락 탭 감지
    if (e.touches.length >= 2) {
      this.twoFingerTap = true;
      return;
    }

    const pos = this._getTouchPos(e.touches[0]);

    // 더블 탭 감지
    const now = Date.now();
    if (now - this.lastTapTime < 300) {
      this.doubleTapFired = true;
    }
    this.lastTapTime = now;

    this.touching = true;
    this.touchX = pos.x;
    this.touchY = pos.y;
    this.prevTouchX = pos.x;
    this.prevTouchY = pos.y;
    this.deltaX = 0;
    this.deltaY = 0;

    // UI 탭
    this.tapX = pos.x;
    this.tapY = pos.y;
    this.tapped = true;
  }

  _onTouchMove(e) {
    e.preventDefault();
    if (!this.touching || e.touches.length === 0) return;

    const pos = this._getTouchPos(e.touches[0]);
    this.deltaX = pos.x - this.prevTouchX;
    this.deltaY = pos.y - this.prevTouchY;
    this.prevTouchX = pos.x;
    this.prevTouchY = pos.y;
    this.touchX = pos.x;
    this.touchY = pos.y;
  }

  _onTouchEnd(e) {
    e.preventDefault();
    if (e.touches.length === 0) {
      this.touching = false;
      this.deltaX = 0;
      this.deltaY = 0;
    }
  }

  _onMouseDown(e) {
    const rect = this.canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (this.canvas.width / rect.width);
    const y = (e.clientY - rect.top) * (this.canvas.height / rect.height);

    // 더블 클릭 감지
    const now = Date.now();
    if (now - this.lastTapTime < 300) {
      this.doubleTapFired = true;
    }
    this.lastTapTime = now;

    this.mouseDown = true;
    this.touching = true;
    this.touchX = x;
    this.touchY = y;
    this.prevTouchX = x;
    this.prevTouchY = y;
    this.deltaX = 0;
    this.deltaY = 0;

    this.tapX = x;
    this.tapY = y;
    this.tapped = true;
  }

  _onMouseMove(e) {
    if (!this.mouseDown) return;
    const rect = this.canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (this.canvas.width / rect.width);
    const y = (e.clientY - rect.top) * (this.canvas.height / rect.height);

    this.deltaX = x - this.prevTouchX;
    this.deltaY = y - this.prevTouchY;
    this.prevTouchX = x;
    this.prevTouchY = y;
    this.touchX = x;
    this.touchY = y;
  }

  _onMouseUp(e) {
    this.mouseDown = false;
    this.touching = false;
    this.deltaX = 0;
    this.deltaY = 0;
  }

  _onKeyDown(e) {
    this.keys[e.code] = true;
    if (e.code === 'Space') this.doubleTapFired = true;
    if (e.code === 'KeyR') this.twoFingerTap = true;
  }

  _onKeyUp(e) {
    this.keys[e.code] = false;
  }

  // 키보드 이동 벡터 (데스크톱)
  getKeyboardDelta(speed) {
    let dx = 0, dy = 0;
    if (this.keys['ArrowLeft'] || this.keys['KeyA']) dx = -speed;
    if (this.keys['ArrowRight'] || this.keys['KeyD']) dx = speed;
    if (this.keys['ArrowUp'] || this.keys['KeyW']) dy = -speed;
    if (this.keys['ArrowDown'] || this.keys['KeyS']) dy = speed;
    return { dx, dy };
  }

  // 프레임마다 호출하여 일회성 이벤트 리셋
  resetFrame() {
    this.deltaX = 0;
    this.deltaY = 0;
    this.doubleTapFired = false;
    this.twoFingerTap = false;
    this.tapped = false;
    this.missileButtonPressed = false;
    this.rotateButtonPressed = false;
  }

  // 게임 좌표 기준 탭 위치
  getTapGamePos() {
    return Utils.canvasToGame(this.tapX, this.tapY, this.canvas);
  }
}
