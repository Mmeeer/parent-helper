"""
Parent-emulator FOREGROUND_SERVICE_LOCATION clip recording.

screenrecord on this emulator uses delta-encoding — if the screen doesn't
change, it captures almost no frames (producing a 36KB unwatchable file).
This script actively pans and zooms the LocationScreen map during the
recording so frame changes happen continuously, giving screenrecord a
visible flow to capture. The map's trail of past locations stays visible
the whole time — the proof that the foreground service has been reporting.

Pre-condition: parent emulator is on Saraa's LocationScreen with the live
map visible and a location trail already populated from prior GPS moves.
"""
import subprocess
import sys
import time
from pathlib import Path

ADB = r"C:\Users\friday\AppData\Local\Android\Sdk\platform-tools\adb.exe"
PARENT = "emulator-5556"
DEVICE_VIDEO = "/sdcard/parent.mp4"
OUT = Path(__file__).parent / "fgs-parent.mp4"

try:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
except AttributeError:
    pass


def adb(*args, shell=False, timeout=15):
    cmd = [ADB, "-s", PARENT]
    if shell:
        cmd.append("shell")
    cmd.extend(str(a) for a in args)
    return subprocess.run(cmd, capture_output=True, text=True, timeout=timeout)


def main():
    print("Recording parent LocationScreen with active map pan...")
    adb("shell", "rm", "-f", DEVICE_VIDEO)

    rec = subprocess.Popen(
        [ADB, "-s", PARENT, "shell", "screenrecord",
         "--time-limit", "30", "--bit-rate", "4000000", DEVICE_VIDEO],
    )
    time.sleep(1.5)

    # Hold the static initial frame for ~2s (so the start of the video shows
    # the LocationScreen clearly before any panning).
    time.sleep(2)

    # Panning pattern: drag in different directions to traverse the map.
    # Each drag is short enough to keep the trail/pin in frame, slow enough
    # to capture intermediate frames.
    pans = [
        # (start_x, start_y, end_x, end_y, duration_ms)
        (360, 600, 200, 600, 600),   # pan right (drag content left)
        (200, 600, 400, 600, 700),   # pan back left
        (360, 400, 360, 600, 700),   # pan down
        (360, 600, 360, 400, 700),   # pan back up
        (360, 600, 250, 700, 600),   # diagonal
        (250, 700, 360, 500, 700),
        (360, 500, 480, 700, 600),
        (480, 700, 360, 500, 700),
        # Pinch-out zoom would need multi-touch; substitute with pans
        (360, 600, 300, 540, 800),
        (300, 540, 420, 660, 800),
    ]
    for x1, y1, x2, y2, d in pans:
        adb("shell", "input", "swipe", str(x1), str(y1),
            str(x2), str(y2), str(d))
        time.sleep(0.6)

    # Final hold
    time.sleep(1.5)

    print("Stopping recording")
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
