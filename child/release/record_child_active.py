"""
Child-emulator clip for FOREGROUND_SERVICE_LOCATION video.

Shows the persistent Prime Kids foreground-service notification in three
contexts (status bar icon -> pulled-down shade -> after pressing home and
re-pulling), proving the service runs continuously regardless of whether
the app is in the foreground. Includes small motion so screenrecord
captures fluid frames.
"""
import subprocess
import sys
import time
from pathlib import Path

ADB = r"C:\Users\friday\AppData\Local\Android\Sdk\platform-tools\adb.exe"
CHILD = "emulator-5554"
DEVICE_VIDEO = "/sdcard/child.mp4"
OUT = Path(__file__).parent / "fgs-child.mp4"

try:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
except AttributeError:
    pass


def adb(*args, shell=False, timeout=15):
    cmd = [ADB, "-s", CHILD]
    if shell:
        cmd.append("shell")
    cmd.extend(str(a) for a in args)
    return subprocess.run(cmd, capture_output=True, text=True, timeout=timeout)


def main():
    print("Recording child clip with active notification flow...")

    # Ensure Prime Kids MainActivity is foreground
    adb("shell", "am", "start", "-n",
        "com.parenthelper.child/.ui.main.MainActivity")
    time.sleep(2)

    adb("shell", "rm", "-f", DEVICE_VIDEO)

    rec = subprocess.Popen(
        [ADB, "-s", CHILD, "shell", "screenrecord",
         "--time-limit", "22", "--bit-rate", "6000000", DEVICE_VIDEO],
    )
    time.sleep(1.5)

    # 0:00-0:04 — MainActivity visible. Add a gentle scroll inside the
    # activity to produce frame changes so screenrecord captures the start.
    print("[1] MainActivity hold + small scrolls (4s)")
    adb("shell", "input", "swipe", "540", "1500", "540", "1200", "400")
    time.sleep(1)
    adb("shell", "input", "swipe", "540", "1200", "540", "1500", "400")
    time.sleep(2)

    # 0:04-0:06 — Pull notification shade.
    print("[2] Pull notification shade")
    adb("shell", "input", "swipe", "540", "0", "540", "1800", "300")
    time.sleep(0.5)
    adb("shell", "input", "swipe", "540", "0", "540", "1800", "300")
    time.sleep(1.5)

    # 0:06-0:12 — Hold shade visible. Add tiny scroll inside shade so
    # screenrecord catches frames.
    print("[3] Hold notification shade visible (6s) with small scrolls")
    for _ in range(3):
        adb("shell", "input", "swipe", "540", "800", "540", "900", "400")
        time.sleep(0.6)
        adb("shell", "input", "swipe", "540", "900", "540", "800", "400")
        time.sleep(1.2)

    # 0:12-0:14 — Close shade.
    print("[4] Close shade")
    adb("shell", "input", "keyevent", "KEYCODE_BACK")
    time.sleep(2)

    # 0:14-0:16 — Press home to leave app.
    print("[5] Press home")
    adb("shell", "input", "keyevent", "KEYCODE_HOME")
    time.sleep(2)

    # 0:16-0:22 — Re-open notification shade from launcher — notification
    # is STILL there because the foreground service runs independent of
    # whether the app is foreground.
    print("[6] Pull shade again from launcher (proves service is persistent)")
    adb("shell", "input", "swipe", "540", "0", "540", "1800", "300")
    time.sleep(0.5)
    adb("shell", "input", "swipe", "540", "0", "540", "1800", "300")
    time.sleep(4)

    print("[7] Stopping recording")
    adb("shell", "pkill", "-SIGINT", "screenrecord")
    time.sleep(2)
    try:
        rec.wait(timeout=10)
    except subprocess.TimeoutExpired:
        rec.kill()

    if OUT.exists():
        OUT.unlink()
    adb("pull", DEVICE_VIDEO, str(OUT))
    if OUT.exists():
        mb = OUT.stat().st_size / 1024 / 1024
        print(f"DONE: {OUT} ({mb:.2f} MB)")
    else:
        print("[ERROR] video not pulled")


if __name__ == "__main__":
    main()
