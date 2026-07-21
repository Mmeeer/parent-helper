"""
Background-location video, PART 2: the feature in action.

Google's rejection requires the video to show "the declared in-app feature's
functionality in action" and "how the feature uses location in the background".
On the CHILD device the payoff (parent viewing the map) is not visible, and
Google's own guidance covers this: "If your declared feature's functionality
isn't directly visible to the user, demonstrate the in-app experience."

So this records the in-app evidence that the feature is live and running in the
background:
  * MainActivity showing "ХЯНАЛТ ИДЭВХТЭЙ" (MONITORING ACTIVE)
  * app sent to the background (HOME)
  * the persistent, non-dismissible Prime Kids monitoring notification, which is
    the user-visible proof the service keeps running (and is also required by the
    Stalkerware policy)

Concatenate after bg-location-demo.mp4.

Output: bg-feature-demo.mp4 (+ _f1..3.png proof frames)
"""
import subprocess, sys, time
from pathlib import Path

try: sys.stdout.reconfigure(encoding="utf-8", errors="replace")
except AttributeError: pass

ADB = r"C:\Users\friday\AppData\Local\Android\Sdk\platform-tools\adb.exe"
PKG = "com.parenthelper.child"
HERE = Path(__file__).parent
OUT = HERE / "bg-feature-demo.mp4"
DEV = "/sdcard/bg-feature.mp4"


def adb(*a, timeout=25):
    return subprocess.run([ADB] + [str(x) for x in a],
                          capture_output=True, text=True, timeout=timeout)


def sh(*a, timeout=25): return adb("shell", *a, timeout=timeout)


def shot(name):
    sh("screencap", "-p", f"/sdcard/{name}")
    d = HERE / name
    if d.exists(): d.unlink()
    adb("pull", f"/sdcard/{name}", str(d))


def main():
    print("=" * 58)
    print("Background-location video PART 2 — feature in action")
    print("=" * 58)

    print("\n[pre] bring the child app to the foreground, clean state")
    sh("input", "keyevent", "KEYCODE_HOME"); time.sleep(1)
    sh("am", "start", "-n", f"{PKG}/.ui.onboarding.SplashActivity")
    time.sleep(8)                      # splash -> MainActivity
    sh("rm", "-f", DEV)

    print("[1] start screenrecord (60s cap)")
    rec = subprocess.Popen([ADB, "shell", "screenrecord", "--time-limit", "60",
                            "--bit-rate", "8000000", DEV])
    time.sleep(2)

    print("[2] HOLD MainActivity 7s — 'ХЯНАЛТ ИДЭВХТЭЙ' (monitoring active)")
    time.sleep(4)
    shot("_f1_monitoring_active.png")
    time.sleep(3)

    print("[3] send app to BACKGROUND (HOME)")
    sh("input", "keyevent", "KEYCODE_HOME")
    time.sleep(4)

    # ONE swipe only. A second swipe expands Quick Settings full-screen and
    # HIDES the notification list, which is the whole point of this shot.
    print("[4] pull notification shade — persistent monitoring notification")
    sh("input", "swipe", "540", "5", "540", "1400", "400")
    time.sleep(3)
    shot("_f2_notification.png")
    print("    HOLD 6s so the ongoing notification is readable")
    time.sleep(6)

    print("[5] close shade")
    sh("input", "keyevent", "KEYCODE_BACK")
    time.sleep(3)
    shot("_f3_end.png")

    print("[6] end padding 6s")
    time.sleep(6)

    print("[7] stop + pull")
    sh("pkill", "-SIGINT", "screenrecord"); time.sleep(3)
    try: rec.wait(timeout=10)
    except subprocess.TimeoutExpired: rec.kill()
    if OUT.exists(): OUT.unlink()
    adb("pull", DEV, str(OUT))
    if OUT.exists():
        print(f"\n  VIDEO: {OUT} ({OUT.stat().st_size/1024/1024:.2f} MB)")
    else:
        print("  [FATAL] no video"); return 1

    r = sh("dumpsys", "activity", "services", PKG)
    out = r.stdout.replace("\r", "")
    print(f"  MonitoringService foreground: {'isForeground=true' in out}")
    print(f"  location FGS type (0x...8):   {'0x40000008' in out}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
