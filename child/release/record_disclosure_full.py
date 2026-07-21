"""
Prominent-disclosure + VPN-consent FULL flow recorder.

Captures the complete Google-Play-required consent sequence:
  1. App's prominent disclosure dialog ("Web Content Filter") explaining that a
     local VPN filters content on-device and sends no browsing data off-device.
  2. User taps "I UNDERSTAND".
  3. Android's system VPN "Connection request" consent dialog.
  4. User taps OK -> the VPN tunnel is established (tun0 comes up).

Consent is reset non-destructively first by clearing the ACTIVATE_VPN appop
(this does NOT clear app data, so pairing survives), so prepare() returns a
fresh consent intent and the disclosure fires.

Output: disclosure-full.mp4  (+ _disc_v1.png / _disc_v2.png proof frames)
"""
import subprocess, sys, time, re
import xml.etree.ElementTree as ET
from pathlib import Path

try: sys.stdout.reconfigure(encoding="utf-8", errors="replace")
except AttributeError: pass

ADB = r"C:\Users\friday\AppData\Local\Android\Sdk\platform-tools\adb.exe"
PKG = "com.parenthelper.child"
HERE = Path(__file__).parent
OUT = HERE / "disclosure-full.mp4"
DEV_PATH = "/sdcard/disclosure-full.mp4"
DUMP = HERE / "_disc_dump.xml"


def adb(*a, timeout=20):
    return subprocess.run([ADB] + [str(x) for x in a],
                          capture_output=True, text=True, timeout=timeout)


def sh(*a, timeout=20): return adb("shell", *a, timeout=timeout)


def dump():
    sh("uiautomator", "dump", "/sdcard/_d.xml")
    adb("pull", "/sdcard/_d.xml", str(DUMP))
    return DUMP.read_text(encoding="utf-8", errors="replace") if DUMP.exists() else ""


def find(xml, needle):
    if not xml: return None
    try: root = ET.fromstring(xml)
    except ET.ParseError: return None
    for n in root.iter("node"):
        if (n.get("text") or "") == needle:
            m = re.match(r"\[(\d+),(\d+)\]\[(\d+),(\d+)\]", n.get("bounds", ""))
            if m:
                x1, y1, x2, y2 = map(int, m.groups())
                return ((x1 + x2) // 2, (y1 + y2) // 2)
    return None


def wait_for(needle, max_secs=15):
    deadline = time.time() + max_secs
    while time.time() < deadline:
        if find(dump(), needle):
            print(f"    '{needle}' visible"); return True
        time.sleep(0.5)
    print(f"    [TIMEOUT] '{needle}'"); return False


def tap(needle):
    c = find(dump(), needle)
    if c:
        print(f"    tap {c} '{needle}'")
        sh("input", "tap", str(c[0]), str(c[1])); return True
    print(f"    [MISS] '{needle}' not found"); return False


def screencap(name):
    sh("screencap", "-p", f"/sdcard/{name}")
    dst = HERE / name
    if dst.exists(): dst.unlink()
    adb("pull", f"/sdcard/{name}", str(dst))


def main():
    print("=" * 60)
    print("Prominent-disclosure + VPN-consent FULL flow recorder")
    print("=" * 60)

    # ── Off-camera: reset consent (non-destructive), clean state ─────────
    print("\n[pre] Reset VPN consent appop (keeps pairing), stop app")
    sh("cmd", "appops", "set", PKG, "ACTIVATE_VPN", "default")
    sh("am", "force-stop", PKG); time.sleep(2)
    sh("input", "keyevent", "KEYCODE_HOME"); time.sleep(0.5)
    sh("logcat", "-c")
    sh("rm", "-f", DEV_PATH)

    # ── RECORDING STARTS ────────────────────────────────────────────────
    print("\n[1] Start screenrecord (45s cap, 8 Mbps)")
    rec = subprocess.Popen(
        [ADB, "shell", "screenrecord", "--time-limit", "45",
         "--bit-rate", "8000000", DEV_PATH]
    )
    time.sleep(2)

    print("[2] Launch app -> disclosure should fire")
    sh("am", "start", "-n", f"{PKG}/.ui.onboarding.SplashActivity")

    print("[3] Wait for prominent disclosure")
    if not wait_for("Web Content Filter", max_secs=20):
        print("[FATAL] disclosure never showed"); rec.kill(); return 1

    print("[4] Hold disclosure 9s (reviewer reads every line)")
    time.sleep(4)
    screencap("_disc_v1.png")     # proof: disclosure on screen
    time.sleep(5)

    print("[5] Tap I UNDERSTAND")
    tap("I UNDERSTAND")
    time.sleep(2)

    print("[6] Wait for system VPN 'Connection request'")
    got = wait_for("Connection request", max_secs=10)
    time.sleep(1)
    screencap("_disc_v2.png")     # proof: system consent on screen

    print("[7] Hold system consent 3s, then tap OK")
    time.sleep(3)
    if not tap("OK"):
        tap("Allow")
    time.sleep(2)

    print("[8] Verify VPN tunnel establishes")
    up = False
    for _ in range(12):
        r = sh("ip", "addr", "show", "tun0")
        if "tun0" in r.stdout and "UP" in r.stdout:
            up = True; break
        time.sleep(1)
    print(f"    tun0 up: {up}")
    time.sleep(3)

    print("[9] End padding 5s")
    time.sleep(5)

    print("[10] Stop recording")
    sh("pkill", "-SIGINT", "screenrecord"); time.sleep(3)
    try: rec.wait(timeout=10)
    except subprocess.TimeoutExpired: rec.kill()

    print("[11] Pull video")
    if OUT.exists(): OUT.unlink()
    adb("pull", DEV_PATH, str(OUT))
    if OUT.exists():
        print(f"    Video: {OUT} ({OUT.stat().st_size/1024/1024:.2f} MB)")
    else:
        print("    [FATAL] no video"); return 1

    print("\n[12] VPN establish in logcat:")
    r = sh("logcat", "-d")
    est = [l for l in r.stdout.splitlines()
           if "tunnel established" in l.lower() or "VPN tunnel" in l or "runVpnLoop" in l]
    for l in est[-4:]: print(f"    {l.strip()[:130]}")
    print(f"    -> system consent shown: {got}, tun0 up: {up}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
