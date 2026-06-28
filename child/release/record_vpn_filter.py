"""
Automated Play Console VpnService demo recording.

Captures a ~75-second screen recording on emulator-5554 (or first connected
device) demonstrating Prime Kids' web-filter VPN: the prominent disclosure,
the Android VpnService consent prompt, a blocked-domain attempt failing,
and an allowed-domain attempt succeeding.

PRE-CONDITIONS (must be true BEFORE you run this script)
---------------------------------------------------------
1. Emulator or device is up:        adb devices  →  shows one device
2. Child app is INSTALLED:          com.parenthelper.child present
3. Child app is PAIRED & permissioned (run record_demo.py once first if not).
4. VPN consent has NOT yet been granted for this app — if it was, revoke it:
      Settings → Network & internet → VPN → tap Prime Kids → Forget VPN
   (or just reinstall the app: `adb shell pm clear com.parenthelper.child`
    then re-run record_demo.py to re-pair.)
5. The paired account's web-filter has a domain that is reliably BLOCKED on
   this device. Pass that domain as the first CLI argument.
6. (Optional) An ALLOWED domain to demonstrate non-blocked traffic — pass as
   second CLI argument. Defaults to wikipedia.org.

USAGE
-----
    python record_vpn_filter.py <BLOCKED_DOMAIN> [ALLOWED_DOMAIN]

Example:
    python record_vpn_filter.py example-blocked.com wikipedia.org

The script drives the consent + Chrome flow and saves the recording as
`vpn-filter-scripted.mp4` next to itself. Upload that mp4 (or a re-encoded
version) to YouTube as Unlisted and paste the URL into Play Console.
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
TMP_DUMP_LOCAL = Path(__file__).parent / "_uidump_vpn.xml"
TMP_VIDEO_LOCAL = Path(__file__).parent / "vpn-filter-scripted.mp4"
DEVICE_VIDEO_PATH = "/sdcard/vpn-demo.mp4"

CHROME_PKG = "com.android.chrome"


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


def find_by_text(xml_str, exact_text):
    if not xml_str:
        return None
    try:
        root = ET.fromstring(xml_str)
    except ET.ParseError:
        return None
    for node in root.iter("node"):
        if node.get("text") == exact_text:
            return parse_bounds(node.get("bounds", ""))
    return None


def find_by_text_contains(xml_str, substring):
    if not xml_str:
        return None
    try:
        root = ET.fromstring(xml_str)
    except ET.ParseError:
        return None
    sub_lower = substring.lower()
    for node in root.iter("node"):
        text = (node.get("text") or "").lower()
        if sub_lower and sub_lower in text:
            return parse_bounds(node.get("bounds", ""))
    return None


def tap(x, y, label=""):
    print(f"  tap ({x}, {y}) {label}")
    adb("input", "tap", str(x), str(y), shell=True)


def tap_text_any(labels, wait=2.0, descriptor=""):
    """Try each label in order, tap the first one that exists. Returns True on hit."""
    xml = dump_ui()
    for label in labels:
        coords = find_by_text(xml, label) or find_by_text_contains(xml, label)
        if coords:
            tap(*coords, label=f"{descriptor}: {label}")
            time.sleep(wait)
            return True
    print(f"  [WARN] none of {labels} found ({descriptor})")
    if xml:
        texts = sorted(set(re.findall(r'text="([^"]+)"', xml or "")))
        print(f"  visible: {[t for t in texts if t.strip()][:25]}")
    return False


def open_url_in_chrome(url):
    """Open URL using Chrome's VIEW intent, falling back to default browser."""
    print(f"  navigating Chrome to {url}")
    adb(
        "shell", "am", "start", "-a", "android.intent.action.VIEW",
        "-d", f"https://{url}/", "-n",
        f"{CHROME_PKG}/com.google.android.apps.chrome.Main",
    )


def main():
    if len(sys.argv) < 2:
        print("Usage: python record_vpn_filter.py <BLOCKED_DOMAIN> [ALLOWED_DOMAIN]")
        sys.exit(1)
    blocked_domain = sys.argv[1].strip().lower()
    allowed_domain = (sys.argv[2].strip().lower() if len(sys.argv) > 2 else "wikipedia.org")

    print("=" * 60)
    print("Scripted Play Console VpnService demo recording")
    print(f"Blocked test domain: {blocked_domain}")
    print(f"Allowed test domain: {allowed_domain}")
    print("=" * 60)

    # Step 0: Clean shell state, home screen, remove stale recording
    print("\n[0] Resetting UI state")
    adb("shell", "input", "keyevent", "KEYCODE_HOME")
    time.sleep(0.5)
    adb("shell", "input", "keyevent", "KEYCODE_HOME")
    time.sleep(0.5)
    adb("shell", "rm", "-f", DEVICE_VIDEO_PATH)
    # Close Chrome from prior runs so it starts clean and lands on the URL
    adb("shell", "am", "force-stop", CHROME_PKG)
    time.sleep(0.5)

    # Step 1: Start screen recording in background (90 second cap)
    print("\n[1] Starting screen recording (max 90s)")
    recorder = subprocess.Popen(
        [ADB, "shell", "screenrecord", "--time-limit", "90",
         "--bit-rate", "8000000", DEVICE_VIDEO_PATH],
        stdout=subprocess.PIPE, stderr=subprocess.PIPE,
    )
    time.sleep(1.5)

    # Step 2: Launch via SplashActivity — MainActivity is NOT exported (would
    # SecurityException on `am start`). With the app paired + onboarded, Splash
    # routes straight to MainActivity, which calls startMonitoringService ->
    # requestVpnConsent() -> shows the prominent disclosure AlertDialog.
    print("\n[2] Launching SplashActivity (routes to MainActivity, triggers VPN consent)")
    adb("shell", "am", "force-stop", "com.parenthelper.child")
    time.sleep(2)
    adb("shell", "am", "start", "-n",
        "com.parenthelper.child/.ui.onboarding.SplashActivity")
    # Allow plenty of time for Splash -> MainActivity -> startMonitoringService
    # -> requestVpnConsent to show the disclosure. Material splash + service
    # init typically takes 6-10s on a cold start.
    time.sleep(11)

    # Step 3: Poll for the disclosure dialog (up to 10s) and hold it visible
    # for 6s for the reviewer to read every line.
    print("\n[3] Waiting for disclosure dialog + holding 6s")
    disclosure_seen = False
    for _ in range(10):
        xml = dump_ui()
        if xml and "Web Content Filter" in xml:
            disclosure_seen = True
            break
        time.sleep(1)
    if not disclosure_seen:
        print("  [WARN] disclosure dialog never appeared")
    time.sleep(6)

    # Step 4: Tap "I UNDERSTAND" (Material uppercases button text) on our disclosure
    print("\n[4] Tapping I UNDERSTAND")
    tap_text_any(["I UNDERSTAND", "I Understand", "i understand", "Ойлголоо"],
                 wait=2.5, descriptor="disclosure")

    # Step 5: Android system VPN consent prompt — tap OK / Allow
    print("\n[5] System VPN consent: OK")
    # The system VPN dialog has buttons OK + Cancel on AOSP, or Allow/Deny on some skins.
    # Poll for up to 8 seconds because the system dialog can take a moment to appear.
    ok_found = False
    for _ in range(8):
        time.sleep(1)
        if tap_text_any(["OK", "Allow", "Connect", "Зөвшөөрөх"], wait=0, descriptor="system-vpn"):
            ok_found = True
            break
    if not ok_found:
        print("  [WARN] system VPN consent button not found — may already be granted")
    time.sleep(3)

    # Step 6: Swipe notification shade down — show VPN + monitoring notifications
    print("\n[6] Pulling notification shade to show foreground service + VPN notification")
    adb("shell", "input", "keyevent", "KEYCODE_HOME")
    time.sleep(1.5)
    adb("shell", "input", "swipe", "540", "0", "540", "1500", "300")
    time.sleep(1)
    adb("shell", "input", "swipe", "540", "0", "540", "1500", "300")
    time.sleep(4)  # hold the shade visible
    # Collapse shade
    adb("shell", "input", "keyevent", "KEYCODE_BACK")
    time.sleep(1)
    adb("shell", "input", "keyevent", "KEYCODE_HOME")
    time.sleep(1)

    # Step 7: Open the BLOCKED domain in Chrome
    print(f"\n[7] Visiting blocked domain: {blocked_domain}")
    open_url_in_chrome(blocked_domain)
    time.sleep(8)  # let Chrome's "site can't be reached" / DNS error render

    # Step 8: Hold the blocked-page screen visible for the reviewer
    print("\n[8] Holding blocked-page error visible 5 sec")
    time.sleep(5)

    # Step 9: Open the ALLOWED domain in Chrome (in the same tab)
    print(f"\n[9] Visiting allowed domain: {allowed_domain}")
    open_url_in_chrome(allowed_domain)
    time.sleep(8)  # let Wikipedia load

    # Step 10: Hold the allowed-page screen visible for the reviewer
    print("\n[10] Holding allowed-page visible 5 sec")
    time.sleep(5)

    # Step 11: Return home — clean end frame
    print("\n[11] Returning to home screen")
    adb("shell", "input", "keyevent", "KEYCODE_HOME")
    time.sleep(2)

    # Step 12: Stop screen recording and pull file
    print("\n[12] Stopping recording")
    adb("shell", "pkill", "-SIGINT", "screenrecord")
    time.sleep(2)
    try:
        recorder.wait(timeout=10)
    except subprocess.TimeoutExpired:
        recorder.kill()

    print("\n[13] Pulling video")
    if TMP_VIDEO_LOCAL.exists():
        TMP_VIDEO_LOCAL.unlink()
    adb("pull", DEVICE_VIDEO_PATH, str(TMP_VIDEO_LOCAL))
    if TMP_VIDEO_LOCAL.exists():
        size_mb = TMP_VIDEO_LOCAL.stat().st_size / 1024 / 1024
        print(f"\nDONE. Video at: {TMP_VIDEO_LOCAL} ({size_mb:.2f} MB)")
        print("\nNext steps:")
        print("  1. Review the mp4 — make sure the disclosure dialog and the")
        print("     blocked vs allowed Chrome pages are clearly visible.")
        print("  2. Add captions in any free editor (Shotcut / YouTube editor).")
        print("  3. Upload to YouTube as UNLISTED.")
        print("  4. Paste the YouTube URL into the VpnService Declaration Form.")
    else:
        print("\n[ERROR] video not pulled — check the emulator and rerun")
        sys.exit(1)


if __name__ == "__main__":
    main()
