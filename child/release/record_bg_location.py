"""
Background-location declaration video (Google Play "Permissions and APIs that
Access Sensitive Information" policy).

The Jul 13 2026 rejection said: "Unable to verify background feature in app".
Google requires the video to show ALL of:
  1. the declared in-app feature's functionality in action
  2. how the feature uses location in the background
  3. how the user TRIGGERS the prominent disclosure for background location
  4. the device runtime permission (with user consent) displaying to the user

This records the real end-to-end child-device journey:
  pair -> onboarding -> Location step -> PROMINENT DISCLOSURE -> Continue
       -> foreground location prompt ("While using the app")
       -> notifications prompt
       -> BACKGROUND location page -> "Allow all the time"
       -> monitoring active (feature running, persistent notification)

Pre-conditions:
  * emulator alive, vc9 installed
  * backend healthy (PRIME888 review pairing code enabled)

Output: bg-location-demo.mp4 (+ _bg1..4.png proof frames)
"""
import subprocess, sys, time, re
import xml.etree.ElementTree as ET
from pathlib import Path

try: sys.stdout.reconfigure(encoding="utf-8", errors="replace")
except AttributeError: pass

ADB = r"C:\Users\friday\AppData\Local\Android\Sdk\platform-tools\adb.exe"
PKG = "com.parenthelper.child"
HERE = Path(__file__).parent
OUT = HERE / "bg-location-demo.mp4"
DEV = "/sdcard/bg-location.mp4"
DUMP = HERE / "_bg_dump.xml"

# Mongolian UI strings
CONNECT      = "ХОЛБОХ"
CONTINUE_MN  = "ҮРГЭЛЖЛҮҮЛЭХ"      # Continue (pairing success + disclosure)
NEXT_MN      = "ДАРААХ"            # Next (permission step)
GRANT_MN     = "ЗӨВШӨӨРӨЛ ОЛГОХ"   # Grant permission
SKIP_MN      = "ДАРАА ТОХИРУУЛАХ"  # configure later
DISCLOSURE   = "Байршлын зөвшөөрөл / Location Permission"


def adb(*a, timeout=25):
    return subprocess.run([ADB] + [str(x) for x in a],
                          capture_output=True, text=True, timeout=timeout)


def sh(*a, timeout=25): return adb("shell", *a, timeout=timeout)


def dump():
    sh("uiautomator", "dump", "/sdcard/_d.xml")
    adb("pull", "/sdcard/_d.xml", str(DUMP))
    return DUMP.read_text(encoding="utf-8", errors="replace") if DUMP.exists() else ""


def find(xml, needle, exact=True):
    if not xml: return None
    try: root = ET.fromstring(xml)
    except ET.ParseError: return None
    for n in root.iter("node"):
        t = n.get("text") or ""
        if (exact and t == needle) or (not exact and needle in t):
            m = re.match(r"\[(\d+),(\d+)\]\[(\d+),(\d+)\]", n.get("bounds", ""))
            if m:
                x1, y1, x2, y2 = map(int, m.groups())
                return ((x1 + x2) // 2, (y1 + y2) // 2)
    return None


def wait_for(needle, secs=25, exact=True):
    end = time.time() + secs
    while time.time() < end:
        if find(dump(), needle, exact):
            print(f"    visible: {needle[:45]}")
            return True
        time.sleep(0.6)
    print(f"    [TIMEOUT] {needle[:45]}")
    return False


def tap(needle, exact=True):
    c = find(dump(), needle, exact)
    if not c:
        print(f"    [MISS] {needle[:45]}")
        return False
    print(f"    tap {c} <- {needle[:38]}")
    sh("input", "tap", str(c[0]), str(c[1]))
    return True


def shot(name):
    sh("screencap", "-p", f"/sdcard/{name}")
    d = HERE / name
    if d.exists(): d.unlink()
    adb("pull", f"/sdcard/{name}", str(d))


def step_num():
    m = re.search(r'text="Алхам (\d) / 5"', dump())
    return int(m.group(1)) if m else -1


def main():
    print("=" * 62)
    print("Background-location declaration video")
    print("=" * 62)

    print("\n[pre] full reset (unpair) so the real first-run journey is filmed")
    sh("am", "force-stop", PKG)
    sh("pm", "clear", PKG); time.sleep(2)
    sh("input", "keyevent", "KEYCODE_HOME"); time.sleep(1)
    sh("logcat", "-c")
    sh("rm", "-f", DEV)

    print("\n[1] start screenrecord (180s cap)")
    rec = subprocess.Popen([ADB, "shell", "screenrecord", "--time-limit", "180",
                            "--bit-rate", "8000000", DEV])
    time.sleep(2)

    print("[2] launch app")
    sh("am", "start", "-n", f"{PKG}/.ui.onboarding.SplashActivity")
    if not wait_for(CONNECT, 30):
        rec.kill(); return 1
    time.sleep(2)

    print("[3] enter review pairing code PRIME888")
    sh("input", "tap", "121", "963"); time.sleep(1)
    for ch in "PRIME888":
        sh("input", "text", ch); time.sleep(0.35)
    time.sleep(1.5)
    tap(CONNECT)

    print("[4] wait for pairing success")
    if not wait_for(CONTINUE_MN, 35):
        rec.kill(); return 1
    time.sleep(2.5)
    tap(CONTINUE_MN)
    time.sleep(3)

    print("[5] advance onboarding to the Location step (3/5)")
    for _ in range(6):
        s = step_num()
        print(f"    at step {s}")
        if s == 3: break
        if not tap(NEXT_MN):
            tap(SKIP_MN)
        time.sleep(2.5)
    else:
        print("    [FATAL] never reached step 3"); rec.kill(); return 1

    print("[6] HOLD location step 4s (reviewer reads why location is needed)")
    time.sleep(4)
    shot("_bg1_step.png")

    print("[7] tap GRANT -> prominent disclosure must appear")
    tap(GRANT_MN)
    if not wait_for(DISCLOSURE, 15):
        rec.kill(); return 1

    print("[8] HOLD prominent disclosure 10s  <-- key policy frame")
    time.sleep(5)
    shot("_bg2_disclosure.png")
    time.sleep(5)

    print("[9] Continue -> foreground location runtime prompt")
    tap(CONTINUE_MN)
    if wait_for("While using the app", 15):
        time.sleep(2.5)
        shot("_bg3_fg_prompt.png")
        tap("While using the app")
        time.sleep(3)

    print("[10] notifications prompt (bundled) -> Allow")
    if find(dump(), "Allow"):
        tap("Allow")
        time.sleep(3)

    print("[11] BACKGROUND location page -> 'Allow all the time'  <-- key policy frame")
    if not wait_for("Allow all the time", 20):
        rec.kill(); return 1
    time.sleep(4)
    shot("_bg4_allow_all_time.png")
    tap("Allow all the time")
    time.sleep(4)

    print("[12] verify background location actually granted")
    r = sh("dumpsys", "package", PKG)
    granted = "ACCESS_BACKGROUND_LOCATION: granted=true" in r.stdout.replace("\r", "")
    print(f"    ACCESS_BACKGROUND_LOCATION granted = {granted}")

    print("[13] finish remaining onboarding steps -> monitoring active")
    for _ in range(8):
        time.sleep(2)
        x = dump()
        if find(x, NEXT_MN): tap(NEXT_MN)
        elif find(x, CONTINUE_MN): tap(CONTINUE_MN)
        elif find(x, SKIP_MN): tap(SKIP_MN)
        else: break

    print("[14] hold final screen 6s")
    time.sleep(6)
    shot("_bg5_final.png")

    print("[15] end padding 6s")
    time.sleep(6)

    print("[16] stop + pull")
    sh("pkill", "-SIGINT", "screenrecord"); time.sleep(3)
    try: rec.wait(timeout=10)
    except subprocess.TimeoutExpired: rec.kill()
    if OUT.exists(): OUT.unlink()
    adb("pull", DEV, str(OUT))
    if OUT.exists():
        print(f"\n  VIDEO: {OUT}  ({OUT.stat().st_size/1024/1024:.2f} MB)")
    else:
        print("  [FATAL] no video"); return 1
    print(f"  background location granted: {granted}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
