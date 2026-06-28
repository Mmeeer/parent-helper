"""
Standalone capture of the VPN prominent-disclosure dialog.

Use case: Play Console "Prominent disclosure" form field on the VpnService
Declaration Form wants its own short clip focused only on the disclosure
shown to the user before VpnService consent. This script captures exactly
that — no Chrome demo, no permissions, no notifications.

PRE-CONDITIONS
--------------
1. One emulator/device connected.
2. com.parenthelper.child is INSTALLED and already PAIRED + permissioned.
   (i.e. record_demo.py was run successfully first.)
3. VPN consent has NOT been granted for this app — if it was, revoke via
   Settings → Network & internet → VPN → tap Prime Kids → Forget VPN.

USAGE
-----
    python record_disclosure_only.py

Produces `disclosure-only.mp4` (~15 s) next to this script.
"""
import subprocess
import sys
import time
import re
import xml.etree.ElementTree as ET
from pathlib import Path

try:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")
except AttributeError:
    pass

ADB = r"C:\Users\friday\AppData\Local\Android\Sdk\platform-tools\adb.exe"
TMP_DUMP_LOCAL = Path(__file__).parent / "_uidump_disc.xml"
TMP_VIDEO_LOCAL = Path(__file__).parent / "disclosure-only.mp4"
DEVICE_VIDEO_PATH = "/sdcard/disclosure-only.mp4"


def adb(*args, shell=False, check=True, timeout=20):
    cmd = [ADB]
    if shell:
        cmd.append("shell")
    cmd.extend(str(a) for a in args)
    result = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout)
    if check and result.returncode != 0 and result.stderr:
        print(f"[adb warn] {' '.join(args)} -> {result.stderr.strip()[:200]}")
    return result


def dump_ui():
    adb("uiautomator", "dump", "/sdcard/dump.xml", shell=True)
    adb("pull", "/sdcard/dump.xml", str(TMP_DUMP_LOCAL))
    if not TMP_DUMP_LOCAL.exists():
        return None
    return TMP_DUMP_LOCAL.read_text(encoding="utf-8", errors="replace")


def parse_bounds(bounds_str):
    m = re.match(r"\[(\d+),(\d+)\]\[(\d+),(\d+)\]", bounds_str)
    if not m:
        return None
    x1, y1, x2, y2 = map(int, m.groups())
    return (x1 + x2) // 2, (y1 + y2) // 2


def find_text_coords(xml_str, candidates):
    if not xml_str:
        return None
    try:
        root = ET.fromstring(xml_str)
    except ET.ParseError:
        return None
    cands_lower = [c.lower() for c in candidates]
    for node in root.iter("node"):
        text = (node.get("text") or "")
        if text in candidates:
            return parse_bounds(node.get("bounds", ""))
        text_l = text.lower()
        for c in cands_lower:
            if c and c in text_l:
                return parse_bounds(node.get("bounds", ""))
    return None


def tap(x, y, label=""):
    print(f"  tap ({x}, {y}) {label}")
    adb("input", "tap", str(x), str(y), shell=True)


def main():
    print("=" * 60)
    print("Recording: VPN prominent-disclosure dialog (standalone)")
    print("=" * 60)

    # Step 0: Home screen, remove stale recording
    adb("shell", "input", "keyevent", "KEYCODE_HOME")
    time.sleep(0.5)
    adb("shell", "rm", "-f", DEVICE_VIDEO_PATH)

    # Step 1: Start screen recording (max 25 sec is plenty)
    print("\n[1] Starting screen recording (max 25s)")
    recorder = subprocess.Popen(
        [ADB, "shell", "screenrecord", "--time-limit", "25",
         "--bit-rate", "8000000", DEVICE_VIDEO_PATH],
        stdout=subprocess.PIPE, stderr=subprocess.PIPE,
    )
    time.sleep(1.5)

    # Step 2: Launch via SplashActivity (MainActivity is not exported). With the
    # app already paired and onboarding complete, Splash routes straight to
    # MainActivity, which calls startMonitoringService -> requestVpnConsent
    # and shows our prominent disclosure.
    print("\n[2] Launching SplashActivity to route into MainActivity")
    adb("shell", "am", "force-stop", "com.parenthelper.child")
    time.sleep(0.5)
    adb("shell", "am", "start", "-n",
        "com.parenthelper.child/.ui.onboarding.SplashActivity")
    # Allow time for splash -> MainActivity transition + disclosure show
    time.sleep(6)

    # Step 3: Hold disclosure dialog visible for ~10 sec so reviewer can read EVERY line
    print("\n[3] Holding disclosure dialog visible for 10 sec")
    time.sleep(10)

    # Step 4: Tap "I Understand" — show user consent affirmatively given
    print("\n[4] Tapping I Understand")
    xml = dump_ui()
    coords = find_text_coords(xml, ["I Understand", "Ойлголоо", "OK"])
    if coords:
        tap(*coords, label="I Understand")
        time.sleep(3)
    else:
        print("  [WARN] I Understand button not found — dialog may not be showing")
        if xml:
            texts = sorted(set(re.findall(r'text="([^"]+)"', xml or "")))
            print(f"  visible: {[t for t in texts if t.strip()][:25]}")

    # Step 5: Stop recording and pull
    print("\n[5] Stopping recording")
    adb("shell", "pkill", "-SIGINT", "screenrecord")
    time.sleep(2)
    try:
        recorder.wait(timeout=10)
    except subprocess.TimeoutExpired:
        recorder.kill()

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
