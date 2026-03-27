export function useFormatters() {
  function formatDate(d: string | Date, style: 'short' | 'long' | 'relative' = 'short'): string {
    if (!d) return '-';
    const date = new Date(d);
    if (style === 'relative') return timeAgo(date);
    if (style === 'long') {
      return date.toLocaleDateString('en-US', {
        year: 'numeric', month: 'long', day: 'numeric',
        hour: '2-digit', minute: '2-digit',
      });
    }
    return date.toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric',
    });
  }

  function formatTime(d: string | Date): string {
    if (!d) return '-';
    return new Date(d).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  }

  function timeAgo(date: Date): string {
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    if (seconds < 60) return 'just now';
    const mins = Math.floor(seconds / 60);
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return formatDate(date, 'short');
  }

  function timeUntil(d: string | Date): string {
    if (!d) return '-';
    const ms = new Date(d).getTime() - Date.now();
    if (ms <= 0) return 'Expired';
    const days = Math.floor(ms / 86400000);
    if (days > 30) return `${Math.floor(days / 30)} months`;
    if (days > 0) return `${days} days`;
    const hours = Math.floor(ms / 3600000);
    return `${hours} hours`;
  }

  function formatUptime(seconds: number): string {
    const d = Math.floor(seconds / 86400);
    const h = Math.floor((seconds % 86400) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const parts = [];
    if (d) parts.push(`${d}d`);
    if (h) parts.push(`${h}h`);
    parts.push(`${m}m`);
    return parts.join(' ');
  }

  function formatAlertType(type: string): string {
    const map: Record<string, string> = {
      screen_time_limit: 'Screen Time',
      new_app_installed: 'New App',
      blocked_content: 'Blocked Content',
      geofence_trigger: 'Geofence',
      device_offline: 'Device Offline',
      unusual_pattern: 'Unusual Pattern',
      uninstall_attempt: 'Uninstall Attempt',
    };
    return map[type] || type;
  }

  function formatMinutes(min: number): string {
    if (min < 60) return `${Math.round(min)}m`;
    const h = Math.floor(min / 60);
    const m = Math.round(min % 60);
    return m ? `${h}h ${m}m` : `${h}h`;
  }

  return { formatDate, formatTime, timeAgo, timeUntil, formatUptime, formatAlertType, formatMinutes };
}
