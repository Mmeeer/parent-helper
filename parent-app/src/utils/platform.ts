import type { Device, DeviceStatus } from '../types';

/** Anything that carries a device `platform` (Device, DeviceStatus, ...). */
export type PlatformLike = Pick<Device, 'platform'> | Pick<DeviceStatus, 'platform'> | { platform?: string | null };

function isIosPlatform(d: PlatformLike | null | undefined): boolean {
  return typeof d?.platform === 'string' && d.platform.toLowerCase() === 'ios';
}

/**
 * True when the child has (at least one) paired iPhone/iPad.
 * Used to gate Android-only UI (package-name app lists, lock screen, browsing history...).
 */
export function isIosChild(devices?: PlatformLike[] | PlatformLike | null): boolean {
  if (!devices) return false;
  if (Array.isArray(devices)) return devices.some(isIosPlatform);
  return isIosPlatform(devices);
}

/**
 * True when every device in the list is iOS (and there is at least one).
 * Used for account-wide screens (notification settings, dashboard) that are not per child.
 */
export function isIosOnly(devices?: PlatformLike[] | null): boolean {
  if (!devices || devices.length === 0) return false;
  return devices.every(isIosPlatform);
}
