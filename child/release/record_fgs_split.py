"""
Dual-emulator simultaneous recording for the FOREGROUND_SERVICE_LOCATION
Play Console declaration.

Records two synchronized ~35-second clips:
  - CHILD (emulator-5554):  Prime Kids active, persistent foreground-service
                            notification visible in the pulled-down shade.
  - PARENT (emulator-5556): Live LocationScreen, map updates in real time as
                            GPS on the child is moved through a route.

Both clips have the same duration so they can be stitched side-by-side in any
free editor (Shotcut, DaVinci Resolve, YouTube editor).

Pre-conditions:
  - CHILD already past onboarding, MonitoringService running as foreground
    (verify with: adb -s emulator-5554 shell dumpsys activity services com.parenthelper.child)
  - PARENT logged in and on Saraa's LocationScreen (the live map view, not
    the static detail preview).

Usage:
    python record_fgs_split.py
"""
import subprocess
import sys
import time
from pathlib import Path

ADB = r"C:\Users\friday\AppData\Local\Android\Sdk\platform-tools\adb.exe"
CHILD = "emulator-5554"
PARENT = "emulator-5556"

DEVICE_CHILD_VIDEO = "/sdcard/fgs_child.mp4"
DEVICE_PARENT_VIDEO = "/sdcard/fgs_parent.mp4"

OUT_DIR = Path(__file__).parent
CHILD_VIDEO_LOCAL = OUT_DIR / "fgs-child.mp4"
PARENT_VIDEO_LOCAL = OUT_DIR / "fgs-parent.mp4"

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


def main():
    print("=" * 60)
    print("Dual-emulator FOREGROUND_SERVICE_LOCATION recording")
    print(f"CHILD : {CHILD}")
    print(f"PARENT: {PARENT}")
    print("=" * 60)

    # Wipe old device-side video files
    adb(CHILD, "shell", "rm", "-f", DEVICE_CHILD_VIDEO)
    adb(PARENT, "shell", "rm", "-f", DEVICE_PARENT_VIDEO)

    # Initial GPS — somewhere in Ulaanbaatar (a school)
    print("\n[0] Setting initial GPS (school)")
    emu(CHILD, "geo", "fix", "106.917693", "47.918873")
    time.sleep(2)

    # Start BOTH recordings, as close to simultaneously as possible
    print("\n[1] Starting both screen recordings")
    child_rec = subprocess.Popen(
        [ADB, "-s", CHILD, "shell", "screenrecord",
         "--time-limit", "35", "--bit-rate", "8000000", DEVICE_CHILD_VIDEO],
    )
    parent_rec = subprocess.Popen(
        [ADB, "-s", PARENT, "shell", "screenrecord",
         "--time-limit", "35", "--bit-rate", "8000000", DEVICE_PARENT_VIDEO],
    )

    # Both recorders need ~1.5s to actually start capturing
    time.sleep(1.5)

    # ── 0:00-0:08 — Hold initial state ────────────────────────────────
    print("\n[2] Hold initial state 6.5s — child shows app, parent shows map")
    time.sleep(6.5)

    # ── 0:08 — Pull notification shade on child ──────────────────────
    # This makes the persistent Prime Kids foreground notification visible.
    print("\n[3] Pull notification shade on child")
    adb(CHILD, "shell", "input", "swipe", "540", "0", "540", "1800", "300")
    time.sleep(0.5)
    adb(CHILD, "shell", "input", "swipe", "540", "0", "540", "1800", "300")
    time.sleep(1.5)

    # ── 0:10 — GPS movement #1 (heading away from school) ────────────
    print("\n[4] GPS move #1")
    emu(CHILD, "geo", "fix", "106.921500", "47.917500")
    time.sleep(5)

    # ── 0:15 — GPS movement #2 ───────────────────────────────────────
    print("\n[5] GPS move #2")
    emu(CHILD, "geo", "fix", "106.926500", "47.915000")
    time.sleep(5)

    # ── 0:20 — GPS movement #3 ───────────────────────────────────────
    print("\n[6] GPS move #3")
    emu(CHILD, "geo", "fix", "106.931500", "47.912000")
    time.sleep(5)

    # ── 0:25 — GPS movement #4 (arriving at home area) ───────────────
    print("\n[7] GPS move #4 (arrived)")
    emu(CHILD, "geo", "fix", "106.935800", "47.910000")
    time.sleep(5)

    # ── 0:30 — Hold final state ──────────────────────────────────────
    print("\n[8] Hold final state 3s")
    time.sleep(3)

    # ── Stop both recordings ─────────────────────────────────────────
    print("\n[9] Stopping recordings")
    adb(CHILD, "shell", "pkill", "-SIGINT", "screenrecord")
    adb(PARENT, "shell", "pkill", "-SIGINT", "screenrecord")
    time.sleep(2)

    for rec in (child_rec, parent_rec):
        try:
            rec.wait(timeout=10)
        except subprocess.TimeoutExpired:
            rec.kill()

    # ── Pull both files ──────────────────────────────────────────────
    print("\n[10] Pulling videos")
    for p in (CHILD_VIDEO_LOCAL, PARENT_VIDEO_LOCAL):
        if p.exists():
            p.unlink()

    adb(CHILD, "pull", DEVICE_CHILD_VIDEO, str(CHILD_VIDEO_LOCAL))
    adb(PARENT, "pull", DEVICE_PARENT_VIDEO, str(PARENT_VIDEO_LOCAL))

    for label, p in (("CHILD ", CHILD_VIDEO_LOCAL),
                     ("PARENT", PARENT_VIDEO_LOCAL)):
        if p.exists():
            mb = p.stat().st_size / 1024 / 1024
            print(f"  {label}: {p} ({mb:.2f} MB)")
        else:
            print(f"  {label}: [ERROR] not pulled")

    print("\nDONE.")


if __name__ == "__main__":
    main()
