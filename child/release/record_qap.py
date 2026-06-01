"""
Automated Play Console QUERY_ALL_PACKAGES demo recording.
Drives the parent app on emulator-5556, captures via adb screenrecord.

Pre-conditions:
- emulator-5556 is the parent app emulator, logged in and on the dashboard
  showing at least one paired child ("Saraa").
- emulator-5554 is the child app emulator, paired to that same child so its
  installed apps already appear in the parent's block-app picker.

The video shows the parent navigating Dashboard -> Saraa -> Rules ->
App Management -> Block App -> picker (the QUERY_ALL_PACKAGES moment) ->
selecting YouTube to block -> saving.

Usage:
    python record_qap.py
"""
import subprocess
import sys
import time
from pathlib import Path

ADB = r"C:\Users\friday\AppData\Local\Android\Sdk\platform-tools\adb.exe"
SERIAL = "emulator-5556"  # parent app emulator
DEVICE_VIDEO_PATH = "/sdcard/qap.mp4"
TMP_VIDEO_LOCAL = Path(__file__).parent / "qap-scripted.mp4"

# Force UTF-8 stdout
try:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
except AttributeError:
    pass


def adb(*args, shell=False, timeout=15):
    cmd = [ADB, "-s", SERIAL]
    if shell:
        cmd.append("shell")
    cmd.extend(str(a) for a in args)
    result = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout)
    if result.returncode != 0 and result.stderr:
        print(f"[adb warn] {' '.join(args)} -> {result.stderr.strip()[:200]}")
    return result


def tap(x, y, label=""):
    print(f"  tap ({x}, {y}) {label}")
    adb("input", "tap", str(x), str(y), shell=True)


def swipe(x1, y1, x2, y2, duration_ms=500, label=""):
    print(f"  swipe ({x1},{y1})->({x2},{y2}) {duration_ms}ms {label}")
    adb("input", "swipe", str(x1), str(y1), str(x2), str(y2),
        str(duration_ms), shell=True)


def main():
    print("=" * 60)
    print("Scripted Play Console QUERY_ALL_PACKAGES demo recording")
    print(f"Device: {SERIAL}")
    print("=" * 60)

    print("\n[0] Ensure dashboard is foregrounded + collapse any QS panel")
    adb("input", "keyevent", "KEYCODE_HOME", shell=True)
    time.sleep(0.5)
    adb("input", "keyevent", "KEYCODE_HOME", shell=True)
    time.sleep(0.5)
    # Re-launch parent app so we start from a known dashboard state
    adb("shell", "am", "start", "-n", "com.parenthelper.parent/.MainActivity")
    time.sleep(3)
    adb("shell", "rm", "-f", DEVICE_VIDEO_PATH)

    print("\n[1] Starting screen recording (max 120s)")
    recorder = subprocess.Popen(
        [ADB, "-s", SERIAL, "shell", "screenrecord",
         "--time-limit", "75", "--bit-rate", "8000000", DEVICE_VIDEO_PATH],
        stdout=subprocess.PIPE, stderr=subprocess.PIPE,
    )
    time.sleep(2.0)  # let recorder + dashboard settle

    # 0:00-0:04 — hold on dashboard so the reviewer sees app context + child
    print("\n[2] Hold dashboard (4s) for reviewer to see context")
    time.sleep(4)

    # 0:04-0:08 — tap Saraa
    print("\n[3] Tap Saraa")
    tap(360, 791, label="Saraa row")
    time.sleep(4)

    # 0:08-0:14 — scroll down to reveal Manage section
    print("\n[4] Scroll to Manage section")
    swipe(360, 1200, 360, 400, 600, label="scroll down")
    time.sleep(3)

    # 0:14-0:18 — tap Rules (Дүрэм) card
    print("\n[5] Tap Rules card (Дүрэм)")
    tap(187, 1200, label="Rules card")
    time.sleep(3)

    # 0:18-0:23 — tap App Management (Аппын удирдлага)
    print("\n[6] Tap App Management card")
    tap(360, 757, label="App management")
    time.sleep(3)

    # 0:23-0:28 — tap Block App (+ Апп хаах)
    print("\n[7] Tap Block App button (+ Апп хаах)")
    tap(360, 615, label="Block App")
    time.sleep(3)

    # 0:28-0:42 — HOLD ON APP PICKER — the QUERY_ALL_PACKAGES moment.
    # The reviewer needs to clearly see this list of apps came from
    # enumerating installed packages on the paired child device.
    print("\n[8] HOLD on app picker for 14s — KEY MOMENT for reviewer")
    time.sleep(14)

    # 0:42-0:46 — tap YouTube's + to add it to the block list
    print("\n[9] Tap YouTube + to add to block list")
    tap(640, 330, label="YouTube +")
    time.sleep(4)

    # 0:46-0:52 — the picker probably dismissed; we should be back on App Mgmt
    # screen now showing YouTube as a newly-blocked app. Hold to show it.
    print("\n[10] Hold to show YouTube now in blocked list (6s)")
    time.sleep(6)

    # 0:52-0:58 — tap Save Changes (Өөрчлөлт хадгалах) at bottom
    print("\n[11] Tap Save Changes")
    tap(360, 1045, label="Save changes")
    time.sleep(4)

    # 0:58-1:02 — end frame
    print("\n[12] End frame (3s)")
    time.sleep(3)

    print("\n[13] Stopping screen recording")
    adb("shell", "pkill", "-SIGINT", "screenrecord")
    time.sleep(2)
    try:
        recorder.wait(timeout=10)
    except subprocess.TimeoutExpired:
        recorder.kill()

    print("\n[14] Pulling video")
    if TMP_VIDEO_LOCAL.exists():
        TMP_VIDEO_LOCAL.unlink()
    adb("pull", DEVICE_VIDEO_PATH, str(TMP_VIDEO_LOCAL))
    if TMP_VIDEO_LOCAL.exists():
        size_mb = TMP_VIDEO_LOCAL.stat().st_size / 1024 / 1024
        print(f"\nDONE. Video at: {TMP_VIDEO_LOCAL} ({size_mb:.2f} MB)")
    else:
        print("\n[ERROR] video not pulled — check emulator")
        sys.exit(1)


if __name__ == "__main__":
    main()
