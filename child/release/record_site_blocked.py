"""
Site-Blocked overlay demo recorder.

Captures the branded "Site Blocked" overlay that fires the instant Chrome tries
to load a parent-blocked adult site (pornhub.com). This is the proof that OUR
VPN filter is doing the blocking (not a coincidental NXDOMAIN) AND that the
child gets an immediate, clear reason instead of a confusing endless load.

The overlay auto-dismisses after SITE_BLOCKED_AUTO_DISMISS_MS (currently 4s),
so timing is tight. To make the footage robust this script hits TWO distinct
fresh-throttle domains back-to-back (pornhub.com, then example.com) so the
branded overlay appears twice, and it grabs a timed screenshot mid-overlay for
each so we can PROVE the overlay was on-screen during the recording.

Pre-conditions:
  * emulator alive, vc7 installed + paired, perms granted, VPN active (tun0 up)
  * customBlock contains pornhub.com and example.com
  * screen-time NOT locking the device

Output: site-blocked-demo.mp4  (+ _verify1.png / _verify2.png proof frames)
"""
import subprocess, sys, time
from pathlib import Path

try: sys.stdout.reconfigure(encoding="utf-8", errors="replace")
except AttributeError: pass

ADB = r"C:\Users\friday\AppData\Local\Android\Sdk\platform-tools\adb.exe"
HERE = Path(__file__).parent
OUT = HERE / "site-blocked-demo.mp4"
DEV_PATH = "/sdcard/site-blocked.mp4"
CHROME = "com.android.chrome/com.google.android.apps.chrome.Main"


def adb(*a, timeout=20):
    return subprocess.run([ADB] + [str(x) for x in a],
                          capture_output=True, text=True, timeout=timeout)


def sh(*a, timeout=20): return adb("shell", *a, timeout=timeout)


def screencap(local_name):
    dev = f"/sdcard/{local_name}"
    sh("screencap", "-p", dev)
    dst = HERE / local_name
    if dst.exists(): dst.unlink()
    adb("pull", dev, str(dst))
    return dst


def open_url(url):
    sh("am", "start", "-a", "android.intent.action.VIEW", "-d", url, "-n", CHROME)


def main():
    print("=" * 60)
    print("Site-Blocked overlay demo recorder")
    print("=" * 60)

    # ── Off-camera pre-stage ─────────────────────────────────────────────
    print("\n[pre] Home, clear logcat, pre-warm Chrome at about:blank")
    sh("input", "keyevent", "KEYCODE_HOME"); time.sleep(0.5)
    sh("am", "force-stop", "com.android.chrome"); time.sleep(2)
    sh("logcat", "-c")
    sh("rm", "-f", DEV_PATH)
    open_url("about:blank"); time.sleep(9)      # let Chrome fully warm up
    sh("input", "keyevent", "KEYCODE_HOME"); time.sleep(1)

    # ── RECORDING STARTS ─────────────────────────────────────────────────
    print("\n[1] Start screenrecord (60s cap, 8 Mbps)")
    rec = subprocess.Popen(
        [ADB, "shell", "screenrecord", "--time-limit", "60",
         "--bit-rate", "8000000", DEV_PATH]
    )
    time.sleep(2)

    print("[2] Bring Chrome to front (clean 'before' with URL bar)")
    open_url("about:blank"); time.sleep(4)

    # ---- Blocked site #1: pornhub.com ----
    print("\n[3] Navigate Chrome -> pornhub.com  (adult site -> should block)")
    open_url("https://pornhub.com/")
    time.sleep(2.3)                              # let overlay fire
    print("    [verify] screenshot mid-overlay #1")
    screencap("_verify1.png")
    time.sleep(3)                               # hold through overlay lifetime

    # ---- Blocked site #2: example.com (fresh throttle -> overlay again) ----
    print("\n[4] Navigate Chrome -> example.com  (also blocked -> overlay again)")
    open_url("https://example.com/")
    time.sleep(2.3)
    print("    [verify] screenshot mid-overlay #2")
    screencap("_verify2.png")
    time.sleep(3)

    # ---- End padding so screenrecord tail-buffer doesn't truncate ----
    print("\n[5] End padding 6s")
    time.sleep(6)

    print("[6] Stop recording")
    sh("pkill", "-SIGINT", "screenrecord"); time.sleep(3)
    try: rec.wait(timeout=10)
    except subprocess.TimeoutExpired: rec.kill()

    print("[7] Pull video")
    if OUT.exists(): OUT.unlink()
    adb("pull", DEV_PATH, str(OUT))
    if OUT.exists():
        print(f"    Video: {OUT} ({OUT.stat().st_size/1024/1024:.2f} MB)")
    else:
        print("    [FATAL] no video pulled"); return 1

    print("\n[8] Overlay + block events in logcat:")
    r = sh("logcat", "-d")
    overlays = [l for l in r.stdout.splitlines() if "SITE_BLOCKED" in l or "Overlay shown" in l]
    blocks = [l for l in r.stdout.splitlines() if "Blocked:" in l and "custom" in l]
    for l in overlays[-6:]: print(f"    {l.strip()[:130]}")
    print(f"    -> {len(overlays)} overlay events, {len(blocks)} custom-block events")
    return 0


if __name__ == "__main__":
    sys.exit(main())
