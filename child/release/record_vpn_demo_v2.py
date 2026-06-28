"""
VPN demo recorder v2 — explicit verification + tighter button targeting.

Each tap is verified via UI dump and the actual log signal we expect.

Pre-conditions: emulator-5556 (or sole device) up, app paired+permissioned,
VPN consent NOT yet granted, customBlock has at least one entry.

Produces: vpn-filter-final.mp4
"""
import subprocess
import sys
import time
import re
import xml.etree.ElementTree as ET
from pathlib import Path

try:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
except AttributeError:
    pass

ADB = r"C:\Users\friday\AppData\Local\Android\Sdk\platform-tools\adb.exe"
TMP_DUMP = Path(__file__).parent / "_uidump_v2.xml"
TMP_VIDEO = Path(__file__).parent / "vpn-filter-final.mp4"
DEVICE_VIDEO = "/sdcard/vpn-demo-v2.mp4"


def adb(*args, timeout=15):
    cmd = [ADB] + [str(a) for a in args]
    return subprocess.run(cmd, capture_output=True, text=True, timeout=timeout)


def sh(*args, timeout=15):
    return adb("shell", *args, timeout=timeout)


def dump():
    sh("uiautomator", "dump", "/sdcard/dump.xml")
    adb("pull", "/sdcard/dump.xml", str(TMP_DUMP))
    return TMP_DUMP.read_text(encoding="utf-8", errors="replace") if TMP_DUMP.exists() else ""


def find_bounds(xml, text, exact=True):
    """Return (cx, cy) for first node whose text matches."""
    if not xml: return None
    try: root = ET.fromstring(xml)
    except ET.ParseError: return None
    for node in root.iter("node"):
        nt = node.get("text") or ""
        if (exact and nt == text) or (not exact and text in nt):
            b = node.get("bounds", "")
            m = re.match(r"\[(\d+),(\d+)\]\[(\d+),(\d+)\]", b)
            if m:
                x1,y1,x2,y2 = map(int, m.groups())
                return ((x1+x2)//2, (y1+y2)//2)
    return None


def wait_for_text(text, max_secs=15, exact=True):
    for i in range(max_secs):
        time.sleep(1)
        xml = dump()
        if find_bounds(xml, text, exact):
            print(f"  [{i+1}s] '{text}' visible")
            return True
    print(f"  [TIMEOUT] '{text}' never appeared in {max_secs}s")
    return False


def tap_text(text, exact=True):
    xml = dump()
    coords = find_bounds(xml, text, exact)
    if coords:
        print(f"  tap '{text}' at {coords}")
        sh("input", "tap", str(coords[0]), str(coords[1]))
        return True
    print(f"  [FAIL] '{text}' not found")
    return False


def wait_logcat_for(pattern, max_secs=20, since_ts=None):
    """Poll logcat for a line matching pattern. since_ts filters by timestamp."""
    for _ in range(max_secs):
        time.sleep(1)
        r = sh("logcat", "-d", "-t", "200")
        for line in r.stdout.splitlines():
            if re.search(pattern, line):
                if since_ts is None or line[:18] > since_ts:
                    print(f"  log: {line.strip()[:140]}")
                    return True
    print(f"  [TIMEOUT] no log match for {pattern}")
    return False


def main():
    print("=" * 60)
    print("VPN demo recording v2 (with verification)")
    print("=" * 60)

    BLOCKED = sys.argv[1] if len(sys.argv) > 1 else "example-blocked.com"
    ALLOWED = sys.argv[2] if len(sys.argv) > 2 else "wikipedia.org"

    # Stop everything cleanly
    sh("input", "keyevent", "KEYCODE_HOME"); time.sleep(0.5)
    sh("am", "force-stop", "com.parenthelper.child"); time.sleep(2)
    sh("am", "force-stop", "com.android.chrome"); time.sleep(1)
    sh("rm", "-f", DEVICE_VIDEO)

    print("\n[1] Start recording")
    rec = subprocess.Popen(
        [ADB, "shell", "screenrecord", "--time-limit", "90",
         "--bit-rate", "8000000", DEVICE_VIDEO]
    )
    time.sleep(2)

    print("\n[2] Launch SplashActivity → MainActivity → triggers VPN consent")
    sh("am", "start", "-n", "com.parenthelper.child/.ui.onboarding.SplashActivity")

    print("\n[3] Wait for disclosure dialog (up to 20s)")
    if not wait_for_text("Web Content Filter", max_secs=20, exact=False):
        print("  [ERROR] disclosure didn't appear — aborting")
        rec.kill(); return 1
    print("  HOLDING disclosure for 6s for reviewer to read")
    time.sleep(6)

    print("\n[4] Tap I UNDERSTAND")
    if not tap_text("I UNDERSTAND"):
        print("  [ERROR] couldn't tap I UNDERSTAND"); rec.kill(); return 1
    time.sleep(2)

    print("\n[5] Wait for system VPN consent dialog ('Connection request')")
    if not wait_for_text("Connection request", max_secs=10, exact=False):
        print("  [ERROR] system VPN dialog didn't appear"); rec.kill(); return 1
    time.sleep(2)

    print("\n[6] Tap OK on system VPN consent")
    # The AOSP dialog has OK and Cancel buttons. Match exact "OK".
    if not tap_text("OK"):
        print("  [WARN] no 'OK', try Allow")
        tap_text("Allow")
    time.sleep(3)

    print("\n[7] Verify VPN started in logcat")
    wait_logcat_for(r"VPN tunnel established", max_secs=10)

    print("\n[8] Pull notification shade — show monitoring + VPN notifications")
    sh("input", "keyevent", "KEYCODE_HOME"); time.sleep(1)
    sh("input", "swipe", "540", "0", "540", "1500", "300"); time.sleep(1)
    sh("input", "swipe", "540", "0", "540", "1500", "300"); time.sleep(5)
    sh("input", "keyevent", "KEYCODE_BACK"); time.sleep(1)

    print(f"\n[9] Open Chrome at https://{BLOCKED}/")
    sh("am", "start", "-a", "android.intent.action.VIEW",
       "-d", f"https://{BLOCKED}/",
       "-n", "com.android.chrome/com.google.android.apps.chrome.Main")
    time.sleep(8)
    print("  Hold blocked-page error 5s")
    time.sleep(5)

    print(f"\n[10] Open Chrome at https://{ALLOWED}/")
    sh("am", "start", "-a", "android.intent.action.VIEW",
       "-d", f"https://{ALLOWED}/",
       "-n", "com.android.chrome/com.google.android.apps.chrome.Main")
    time.sleep(8)
    print("  Hold allowed-page 5s")
    time.sleep(5)

    print("\n[11] Home + stop recording")
    sh("input", "keyevent", "KEYCODE_HOME"); time.sleep(2)
    sh("pkill", "-SIGINT", "screenrecord")
    time.sleep(3)
    try: rec.wait(timeout=10)
    except subprocess.TimeoutExpired: rec.kill()

    print("\n[12] Pull video")
    if TMP_VIDEO.exists(): TMP_VIDEO.unlink()
    adb("pull", DEVICE_VIDEO, str(TMP_VIDEO))
    if TMP_VIDEO.exists():
        size_mb = TMP_VIDEO.stat().st_size / 1024 / 1024
        print(f"\nDONE: {TMP_VIDEO} ({size_mb:.2f} MB)")
        print("\n[13] Did any blocking happen?")
        wait_logcat_for(r"Blocking domain:.*" + re.escape(BLOCKED.split('.')[0]), max_secs=2)
    else:
        print("[ERROR] video not pulled")
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
