"""Helper: advance from current onboarding step until MainActivity is reached.

Uses the same ADB+UI-dump helpers as record_demo.py. Polls activity each loop
and exits when topResumedActivity is .ui.main.MainActivity, or after 8 tries.

Tap priority each loop:
  1. If current step is granted ("ЗӨВШӨӨРӨГДСӨН"), tap "ДАРААХ" (Next).
  2. Else tap "ДАРАА ТОХИРУУЛАХ" (Skip later). If that triggers the "required"
     dialog with "БУЦАХ" (Cancel), tap "ЗӨВШӨӨРӨЛ ОЛГОХ" (Grant) and let the
     system permission flow handle itself.
  3. If a system permission dialog appears, tap Allow.

Idempotent and best-effort — meant to be re-run.
"""
import subprocess, sys, time, re
import xml.etree.ElementTree as ET
from pathlib import Path

try:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
except AttributeError:
    pass

ADB = r"C:\Users\friday\AppData\Local\Android\Sdk\platform-tools\adb.exe"
TMP = Path(__file__).parent / "_uidump_adv.xml"


def adb(*args, shell=False, timeout=15):
    cmd = [ADB]
    if shell:
        cmd.append("shell")
    cmd.extend(str(a) for a in args)
    return subprocess.run(cmd, capture_output=True, text=True, timeout=timeout)


def dump():
    adb("shell", "uiautomator", "dump", "/sdcard/dump.xml")
    adb("pull", "/sdcard/dump.xml", str(TMP))
    return TMP.read_text(encoding="utf-8", errors="replace") if TMP.exists() else ""


def parse_bounds(b):
    m = re.match(r"\[(\d+),(\d+)\]\[(\d+),(\d+)\]", b)
    if not m: return None
    x1, y1, x2, y2 = map(int, m.groups())
    return (x1 + x2) // 2, (y1 + y2) // 2


def find(xml, *candidates):
    try: root = ET.fromstring(xml)
    except ET.ParseError: return None
    for node in root.iter("node"):
        text = (node.get("text") or "")
        for c in candidates:
            if text == c:
                return parse_bounds(node.get("bounds", ""))
    return None


def tap(coords, label=""):
    if not coords: return False
    x, y = coords
    print(f"  tap ({x},{y}) {label}")
    adb("shell", "input", "tap", str(x), str(y))
    time.sleep(2)
    return True


def current_activity():
    r = adb("shell", "dumpsys", "activity", "activities")
    for line in r.stdout.splitlines():
        if "topResumedActivity" in line:
            m = re.search(r"u0\s+([^\s/]+/[^\s\}]+)", line)
            if m: return m.group(1)
    return ""


def main():
    print("Advancing onboarding to MainActivity...")
    for i in range(12):
        act = current_activity()
        print(f"\n[loop {i+1}] activity = {act}")
        if "ui.main.MainActivity" in act:
            print("REACHED MainActivity")
            return 0
        xml = dump()
        # Handle the "Allow / Don't allow" system perm dialog if it shows up
        if find(xml, "Allow"):
            tap(find(xml, "Allow"), "system: Allow")
            continue
        if find(xml, "Allow only while using the app", "While using the app"):
            tap(find(xml, "While using the app", "Allow only while using the app"), "fg-loc")
            continue
        # Handle battery-optimization system dialog
        if find(xml, "Allow", "Allow this app"):
            tap(find(xml, "Allow", "Allow this app"), "battery-allow")
            continue
        # Onboarding step actions
        if find(xml, "ЗӨВШӨӨРӨГДСӨН"):
            # Step granted -> Next
            if tap(find(xml, "ДАРААХ"), "next"): continue
        # Try skip
        if tap(find(xml, "ДАРАА ТОХИРУУЛАХ"), "skip"):
            time.sleep(1.5)
            # If "required" dialog appeared, tap Grant -> let system perm dialog handle next loop
            xml2 = dump()
            if find(xml2, "ЗӨВШӨӨРӨЛ ОЛГОХ"):
                tap(find(xml2, "ЗӨВШӨӨРӨЛ ОЛГОХ"), "grant on required dialog")
            continue
        # Fallback: try Next button by text alone
        if tap(find(xml, "ДАРААХ"), "next-only"):
            continue
        # Settings page for overlay/battery? Press BACK to return
        print("  no known buttons — pressing BACK")
        adb("shell", "input", "keyevent", "KEYCODE_BACK")
        time.sleep(2)

    print("DID NOT reach MainActivity in 12 loops")
    return 1


if __name__ == "__main__":
    sys.exit(main())
