import json
import os
import sys
import time

os.environ["TF_CPP_MIN_LOG_LEVEL"] = "3"
os.environ["GLOG_minloglevel"] = "3"
os.environ["MEDIAPIPE_DISABLE_GPU"] = "1"

def emit(ok, x=0.5, y=0.5, pts=None, err="", jpg="", lib="mediapipe"):
    sys.stdout.write(json.dumps({
        "type": "head",
        "ok": bool(ok),
        "x": float(x),
        "y": float(y),
        "pts": pts or [],
        "err": err or "",
        "jpg": jpg or "",
        "lib": lib,
    }, separators=(",", ":")) + "\n")
    sys.stdout.flush()


emit(False, err="MediaPipe loading…")

import base64
import cv2
import mediapipe as mp

# YOLO5Face / YuNet convention: left eye, right eye, nose, left mouth, right mouth
MESH_IDX = (33, 263, 1, 61, 291)
IRIS_IDX = (468, 473, 1, 61, 291)

COLORS = (
    (80, 180, 255),
    (80, 180, 255),
    (60, 220, 120),
    (220, 160, 60),
    (220, 160, 60),
)


def open_cam():
    for api in (cv2.CAP_DSHOW, cv2.CAP_MSMF, cv2.CAP_ANY):
        for i in range(3):
            cap = cv2.VideoCapture(i, api)
            if cap.isOpened():
                cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
                cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
                cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)
                ok, frame = cap.read()
                if ok and frame is not None:
                    return cap
                cap.release()
    return None


def encode_jpg(frame):
    small = cv2.resize(frame, (360, 202), interpolation=cv2.INTER_AREA)
    ok, buf = cv2.imencode(".jpg", small, [int(cv2.IMWRITE_JPEG_QUALITY), 58])
    if not ok:
        return ""
    return base64.b64encode(buf.tobytes()).decode("ascii")


def draw_rig(frame, pts, cop):
    h, w = frame.shape[:2]
    px = [(int(p[0] * w), int(p[1] * h)) for p in pts]
    if len(px) >= 5:
        cv2.line(frame, px[0], px[2], (90, 160, 200), 1, cv2.LINE_AA)
        cv2.line(frame, px[1], px[2], (90, 160, 200), 1, cv2.LINE_AA)
        cv2.line(frame, px[3], px[4], (90, 160, 200), 1, cv2.LINE_AA)
        mid_m = ((px[3][0] + px[4][0]) // 2, (px[3][1] + px[4][1]) // 2)
        cv2.line(frame, px[2], mid_m, (90, 160, 200), 1, cv2.LINE_AA)
    for i, p in enumerate(px):
        cv2.circle(frame, p, 4, COLORS[i % 5], -1, cv2.LINE_AA)
        cv2.circle(frame, p, 6, (20, 20, 20), 1, cv2.LINE_AA)
    cx, cy = int(cop[0] * w), int(cop[1] * h)
    cv2.drawMarker(frame, (cx, cy), (90, 210, 255), cv2.MARKER_CROSS, 22, 2, cv2.LINE_AA)
    cv2.circle(frame, (cx, cy), 11, (90, 210, 255), 2, cv2.LINE_AA)
    cv2.putText(frame, "MediaPipe  5pts  CoP", (8, 18), cv2.FONT_HERSHEY_SIMPLEX, 0.48, (210, 200, 160), 1, cv2.LINE_AA)


def main():
    cap = open_cam()
    if cap is None:
        emit(False, err="Nie otworzono kamery (MediaPipe/OpenCV). Zamknij Teams/Zoom.")
        return 2

    mesh_mod = mp.solutions.face_mesh
    tick = 0
    miss = 0
    sx, sy = 0.5, 0.5
    emit(False, err="Szukam twarzy…")

    with mesh_mod.FaceMesh(
        static_image_mode=False,
        max_num_faces=1,
        refine_landmarks=True,
        min_detection_confidence=0.5,
        min_tracking_confidence=0.5,
    ) as mesh:
        while True:
            ok, frame = cap.read()
            if not ok or frame is None:
                time.sleep(0.02)
                continue
            rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            rgb.flags.writeable = False
            res = mesh.process(rgb)
            rgb.flags.writeable = True

            pts = []
            if res.multi_face_landmarks:
                lm = res.multi_face_landmarks[0].landmark
                idx = IRIS_IDX if len(lm) > 473 else MESH_IDX
                for i in idx:
                    pts.append([float(lm[i].x), float(lm[i].y)])
                copx = sum(p[0] for p in pts) / 5.0
                copy = sum(p[1] for p in pts) / 5.0
                sx = sx * 0.55 + copx * 0.45
                sy = sy * 0.55 + copy * 0.45
                miss = 0
                draw_rig(frame, pts, (sx, sy))
                tick += 1
                jpg = encode_jpg(frame) if tick % 2 == 0 else ""
                try:
                    emit(True, sx, sy, pts, "", jpg)
                except BrokenPipeError:
                    break
            else:
                miss += 1
                tick += 1
                jpg = encode_jpg(frame) if tick % 2 == 0 else ""
                try:
                    emit(False, sx, sy, [], "Spójrz w kamerę (MediaPipe)", jpg if miss > 8 else "")
                except BrokenPipeError:
                    break

    cap.release()
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as ex:
        emit(False, err="MediaPipe: " + str(ex))
        raise SystemExit(1)
