const DEAD = 0.032;
const RANGE = 0.16;
const JUMP_ON = 0.062;
const JUMP_OFF = 0.032;

function host() {
  try {
    return window.chrome && chrome.webview ? chrome.webview : null;
  } catch (e) {
    return null;
  }
}

const HeadCam = {
  active: false,
  ready: false,
  tracking: false,
  calibrating: false,
  locked: false,
  status: "off",
  move: 0,
  headHigh: false,
  nx: 0.5,
  ny: 0.5,
  video: null,
  preview: null,
  error: "",
  pts: null,
  lib: "",
  _cal: { x: 0.5, y: 0.5 },
  _needRest: true,
  _jumpArmed: true,
  _jumpEdge: false,
  _starting: false,
  _bound: false,

  consumeJump() {
    if (!this._jumpEdge) return false;
    this._jumpEdge = false;
    return true;
  },

  async start() {
    this.error = "";
    this.status = "loading";
    this._bind();
    const h = host();
    if (h) {
      try {
        if (h.hostObjects && h.hostObjects.bodhi) h.hostObjects.bodhi.StartCamera();
        else h.postMessage("start-camera");
      } catch (e) {
        h.postMessage("start-camera");
      }
      this.active = true;
      this.status = "seek";
      this._needRest = true;
      return true;
    }
    this.status = "error";
    this.error = "Uruchom Bodhisattva.exe / play.bat — MediaPipe idzie przez Pythona, nie przez przeglądarkę.";
    return false;
  },

  _bind() {
    if (this._bound) return;
    const h = host();
    if (!h) return;
    this._bound = true;
    h.addEventListener("message", (ev) => this._onHost(ev.data));
  },

  _onHost(data) {
    let msg = data && data.data !== undefined ? data.data : data;
    if (typeof msg === "string") {
      try { msg = JSON.parse(msg); } catch (e) { return; }
    }
    if (!msg || (msg.type && msg.type !== "head")) return;
    if (msg.jpg) {
      if (!this.preview) this.preview = new Image();
      this.preview.src = "data:image/jpeg;base64," + msg.jpg;
    }
    if (typeof msg.x === "number") this.nx = msg.x;
    if (typeof msg.y === "number") this.ny = msg.y;
    if (Array.isArray(msg.pts)) this.pts = msg.pts;
    if (typeof msg.lib === "string") this.lib = msg.lib;
    const ok = msg.ok === true || msg.ok === 1 || msg.ok === "true";
    this.tracking = ok;
    this.active = true;
    if (msg.err && !ok) {
      this.error = msg.err;
      this.status = this.active ? "lost" : "error";
    }
    if (ok) {
      this.error = "";
      if (this._needRest) this.lockRest();
      this.status = "track";
      let dx = this._cal.x - this.nx;
      if (Math.abs(dx) < DEAD) dx = 0;
      else dx = (dx - Math.sign(dx) * DEAD) / RANGE;
      this.move = Math.max(-1, Math.min(1, dx));
      const lift = this._cal.y - this.ny;
      this.headHigh = lift > JUMP_OFF;
      if (lift > JUMP_ON && this._jumpArmed) {
        this._jumpEdge = true;
        this._jumpArmed = false;
      } else if (lift < JUMP_OFF) {
        this._jumpArmed = true;
      }
    } else {
      this.move = 0;
      this.headHigh = false;
      if (!this.error) this.status = "seek";
    }
  },

  lockRest() {
    this._cal.x = this.nx;
    this._cal.y = this.ny;
    this._needRest = false;
    this.locked = true;
    this.calibrating = false;
    this._jumpArmed = true;
    this._jumpEdge = false;
    this.status = this.tracking ? "track" : "seek";
  },

  calibrate() {
    if (this.tracking) this.lockRest();
    else this._needRest = true;
  },

  stop() {
    const h = host();
    try {
      if (h && h.hostObjects && h.hostObjects.bodhi) h.hostObjects.bodhi.StopCamera();
      else if (h) h.postMessage("stop-camera");
    } catch (e) {}
    this.active = false;
    this.tracking = false;
    this.status = "off";
    this.move = 0;
  },
};

window.HeadCam = HeadCam;
if (window.__wantHeadCam) HeadCam.start();
export default HeadCam;
