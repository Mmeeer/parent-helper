"""
Sequential dual-clip recording for FOREGROUND_SERVICE_LOCATION.

Records two clips one at a time (avoids overloading the host when both
emulators are running screenrecord simultaneously):

  Phase 1: PARENT emulator records live LocationScreen for 35s. GPS on the
           child emulator is mocked through a route DURING this recording,
           so the parent map updates in real time.
  Phase 2: CHILD emulator records its MainActivity then pulls the
           notification shade to show the persistent foreground-service
           notification. 15s.

The two clips will be combined in a video editor: parent as the main view,
child as a corner overlay (or short intro). They don't need to be the same
duration — they tell complementary parts of the same story.

Pre-conditions:
  - CHILD already past onboarding; MonitoringService running as foreground.
  - PARENT logged in and on Saraa's LocationScreen.

Usage:
    python record_fgs_sequential.py
"""
import subprocess
import sys
import time
from pathlib import Path

ADB = r"C:\Users\friday\AppData\Local\Android\Sdk\platform-tools\adb.exe"
CHILD = "emulator-5554"
PARENT = "emulator-5556"

DEVICE_VIDEO = "/sdcard/fgs.mp4"
OUT_DIR = Path(__file__).parent
PARENT_VIDEO_LOCAL = OUT_DIR / "fgs-parent.mp4"
CHILD_VIDEO_LOCAL = OUT_DIR / "fgs-child.mp4"

try:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
except AttributeError:
    pass


def adb(serial, *args, shell=False, timeout=15):
    cmd = [ADB, "-s", serial]
    if shell:
        cmd.append("shell")
    cmd.extend(str(a) for a in args)
    return subprocess.run(cmd, capture_output=True, text=True, timeout=timeout)


def emu(serial, *args, timeout=15):
    cmd = [ADB, "-s", serial, "emu", *(str(a) for a in args)]
    return subprocess.run(cmd, capture_output=True, text=True, timeout=timeout)


def phase_parent():
    print("\n" + "=" * 60)
    print("PHASE 1: Parent live-map recording (~35s)")
    print("=" * 60)

    adb(PARENT, "shell", "rm", "-f", DEVICE_VIDEO)

    print("\n[0] Setting initial GPS (school)")
    emu(CHILD, "geo", "fix", "106.917693", "47.918873")
    time.sleep(2)

    print("\n[1] Starting screen recording on PARENT")
    rec = subprocess.Popen(
        [ADB, "-s", PARENT, "shell", "screenrecord",
         "--time-limit", "35", "--bit-rate", "4000000", DEVICE_VIDEO],
    )
    time.sleep(1.5)

    # ── Hold initial position ─────────────────────────────────────
    print("[2] Hold initial position 5s")
    time.sleep(5)

    # ── GPS route — 5 movements over 25s, ~5s between each ───────
    waypoints = [
        ("106.920000", "47.918000"),
        ("106.923500", "47.916500"),
        ("106.927000", "47.914500"),
        ("106.930500", "47.912500"),
        ("106.935800", "47.910000"),
    ]
    for i, (lng, lat) in enumerate(waypoints, 1):
        print(f"[3.{i}] GPS waypoint {i}/5: ({lng}, {lat})")
        emu(CHILD, "geo", "fix", lng, lat)
        time.sleep(5)

    print("[4] Stopping recording")
    adb(PARENT, "shell", "pkill", "-SIGINT", "screenrecord")
    time.sleep(2)
    try:
        rec.wait(timeout=10)
    except subprocess.TimeoutExpired:
        rec.kill()

    print("[5] Pulling parent video")
    if PARENT_VIDEO_LOCAL.exists():
        PARENT_VIDEO_LOCAL.unlink()
    adb(PARENT, "pull", DEVICE_VIDEO, str(PARENT_VIDEO_LOCAL))
    if PARENT_VIDEO_LOCAL.exists():
        mb = PARENT_VIDEO_LOCAL.stat().st_size / 1024 / 1024
        print(f"  PARENT: {PARENT_VIDEO_LOCAL} ({mb:.2f} MB)")


def phase_child():
    print("\n" + "=" * 60)
    print("PHASE 2: Child notification recording (~15s)")
    print("=" * 60)

    adb(CHILD, "shell", "rm", "-f", DEVICE_VIDEO)

    # Make sure we're on MainActivity (not somewhere else)
    print("\n[0] Bring Prime Kids to foreground")
    adb(CHILD, "shell", "am", "start", "-n",
        "com.parenthelper.child/.ui.main.MainActivity")
    time.sleep(2)

    print("\n[1] Starting screen recording on CHILD")
    rec = subprocess.Popen(
        [ADB, "-s", CHILD, "shell", "screenrecord",
         "--time-limit", "15", "--bit-rate", "6000000", DEVICE_VIDEO],
    )
    time.sleep(1.5)

    print("[2] Hold MainActivity 4s (notification icon in status bar)")
    time.sleep(4)

    print("[3] Pull notification shade")
    adb(CHILD, "shell", "input", "swipe", "540", "0", "540", "1800", "300")
    time.sleep(0.5)
    adb(CHILD, "shell", "input", "swipe", "540", "0", "540", "1800", "300")
    time.sleep(8)  # hold shade visible

    print("[4] Stopping recording")
    adb(CHILD, "shell", "pkill", "-SIGINT", "screenrecord")
    time.sleep(2)
    try:
        rec.wait(timeout=10)
    except subprocess.TimeoutExpired:
        rec.kill()

    print("[5] Pulling child video")
    if CHILD_VIDEO_LOCAL.exists():
        CHILD_VIDEO_LOCAL.unlink()
    adb(CHILD, "pull", DEVICE_VIDEO, str(CHILD_VIDEO_LOCAL))
    if CHILD_VIDEO_LOCAL.exists():
        mb = CHILD_VIDEO_LOCAL.stat().st_size / 1024 / 1024
        print(f"  CHILD : {CHILD_VIDEO_LOCAL} ({mb:.2f} MB)")


def main():
    phase_parent()
    phase_child()
    print("\nDONE. Two clips ready for editing.")


if __name__ == "__main__":
    main()
