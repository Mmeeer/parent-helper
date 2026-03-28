<template>
  <div>
    <PageHeader title="Alerts" subtitle="Platform-wide alert monitoring" :breadcrumbs="[{ label: 'Alerts' }]">
      <template #actions>
        <select v-model="typeFilter" @change="alertPage = 1; loadAlerts()" class="px-3 py-2 border border-ink-200 rounded-lg text-xs bg-white focus:ring-1 focus:ring-ac-500 outline-none text-ink-700">
          <option value="">All Types</option>
          <option v-for="t in alertTypes" :key="t" :value="t">{{ fmt.formatAlertType(t) }}</option>
        </select>
        <select v-model="readFilter" @change="alertPage = 1; loadAlerts()" class="px-3 py-2 border border-ink-200 rounded-lg text-xs bg-white focus:ring-1 focus:ring-ac-500 outline-none text-ink-700">
          <option value="">All</option>
          <option value="false">Unread</option>
          <option value="true">Read</option>
        </select>
      </template>
    </PageHeader>

    <LoadingSkeleton v-if="summaryLoading" type="cards" :count="4" wrapper-class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6" />

    <template v-else>
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Alerts Today" :value="summary?.totalToday ?? 0" color="yellow"
          icon='<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>' />
        <StatCard label="Unread" :value="summary?.totalUnread ?? 0" color="red"
          icon='<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>' />
        <StatCard label="Most Common" :value="mostCommonType" color="blue"
          icon='<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>' />
        <StatCard label="Top User" :value="summary?.topUsers?.[0]?.name || '-'" :subtitle="summary?.topUsers?.[0] ? `${summary.topUsers[0].alertCount} alerts` : ''" color="purple"
          icon='<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>' />
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <!-- Trend -->
        <div class="lg:col-span-2 bg-white rounded-xl border border-ink-100 p-5">
          <h2 class="text-sm font-semibold text-ink-800 mb-4">Alert Trend (14 days)</h2>
          <div v-if="summary?.trend?.length" class="flex items-end gap-1 h-32">
            <div v-for="day in summary.trend" :key="day.date" class="flex-1 flex flex-col items-center gap-1">
              <span class="text-[10px] text-ink-400">{{ day.count }}</span>
              <div class="w-full bg-ink-800 rounded-t" :style="{ height: barHeight(day.count) + '%', minHeight: day.count ? '4px' : '1px' }"></div>
              <span class="text-[9px] text-ink-400 -rotate-45 origin-left whitespace-nowrap">{{ day.date.slice(5) }}</span>
            </div>
          </div>
          <EmptyState v-else title="No trend data" message="Not enough data for the trend chart" />
        </div>

        <!-- By Type -->
        <div class="bg-white rounded-xl border border-ink-100 p-5">
          <h2 class="text-sm font-semibold text-ink-800 mb-4">By Type (14 days)</h2>
          <div v-if="Object.keys(summary?.byType ?? {}).length" class="space-y-2.5">
            <div v-for="(count, type) in summary.byType" :key="type">
              <div class="flex justify-between text-xs mb-1">
                <span class="font-medium text-ink-700">{{ fmt.formatAlertType(type as string) }}</span>
                <span class="text-ink-400">{{ count }}</span>
              </div>
              <div class="w-full bg-ink-100 rounded-full h-1.5">
                <div class="h-1.5 rounded-full bg-ink-700" :style="{ width: `${Math.min(100, (count as number / maxTypeCount) * 100)}%` }"></div>
              </div>
            </div>
          </div>
          <EmptyState v-else title="No alerts" message="No alerts in the past 14 days" />
        </div>
      </div>

      <!-- Alert List -->
      <div class="bg-white rounded-xl border border-ink-100 overflow-hidden">
        <LoadingSkeleton v-if="alertsLoading" type="table" :count="8" wrapper-class="p-4" />
        <table v-else-if="alerts.length" class="w-full">
          <thead>
            <tr class="bg-ink-50/60 border-b border-ink-100">
              <th class="px-4 py-2.5 text-left text-[10px] font-semibold text-ink-400 uppercase tracking-widest">Time</th>
              <th class="px-4 py-2.5 text-left text-[10px] font-semibold text-ink-400 uppercase tracking-widest">Type</th>
              <th class="px-4 py-2.5 text-left text-[10px] font-semibold text-ink-400 uppercase tracking-widest">Child</th>
              <th class="px-4 py-2.5 text-left text-[10px] font-semibold text-ink-400 uppercase tracking-widest">Parent</th>
              <th class="px-4 py-2.5 text-left text-[10px] font-semibold text-ink-400 uppercase tracking-widest">Message</th>
              <th class="px-4 py-2.5 text-left text-[10px] font-semibold text-ink-400 uppercase tracking-widest">Read</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-ink-50">
            <tr v-for="a in alerts" :key="a._id" class="text-xs hover:bg-ink-50/40 transition">
              <td class="px-4 py-2.5 text-ink-400 whitespace-nowrap">{{ fmt.formatDate(a.createdAt, 'relative') }}</td>
              <td class="px-4 py-2.5"><Badge :label="fmt.formatAlertType(a.type)" :variant="alertVariant(a.type)" /></td>
              <td class="px-4 py-2.5 text-ink-800 font-medium">{{ a.childId?.name || '-' }}</td>
              <td class="px-4 py-2.5 text-ink-600">{{ a.parentId?.name || a.parentId?.email || '-' }}</td>
              <td class="px-4 py-2.5 text-ink-500 truncate max-w-xs">{{ a.message }}</td>
              <td class="px-4 py-2.5">
                <span class="w-2 h-2 rounded-full inline-block" :class="a.read ? 'bg-ink-300' : 'bg-ac-500'"></span>
              </td>
            </tr>
          </tbody>
        </table>
        <EmptyState v-else title="No alerts" message="No alerts match your filters" />

        <div v-if="alertTotalPages > 1" class="flex items-center justify-between px-5 py-3 border-t border-ink-100 bg-ink-50/40">
          <p class="text-xs text-ink-400">Page {{ alertPage }} of {{ alertTotalPages }} ({{ alertTotal }} total)</p>
          <div class="flex gap-1.5">
            <button :disabled="alertPage <= 1" @click="alertPage--; loadAlerts()"
              class="px-3 py-1.5 text-xs border border-ink-200 rounded-lg disabled:opacity-30 hover:bg-white transition text-ink-600">Prev</button>
            <button :disabled="alertPage >= alertTotalPages" @click="alertPage++; loadAlerts()"
              class="px-3 py-1.5 text-xs border border-ink-200 rounded-lg disabled:opacity-30 hover:bg-white transition text-ink-600">Next</button>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
const { getAlerts, getAlertsSummary } = useApi();
const fmt = useFormatters();

const alertTypes = ['screen_time_limit', 'new_app_installed', 'blocked_content', 'geofence_trigger', 'device_offline', 'unusual_pattern', 'uninstall_attempt'];

const summary = ref<any>(null);
const summaryLoading = ref(true);
const alerts = ref<any[]>([]);
const alertsLoading = ref(true);
const typeFilter = ref('');
const readFilter = ref('');
const alertPage = ref(1);
const alertTotal = ref(0);
const alertTotalPages = ref(1);

const maxTypeCount = computed(() => {
  const types = summary.value?.byType ?? {};
  return Math.max(1, ...Object.values(types) as number[]);
});

const mostCommonType = computed(() => {
  const types = summary.value?.byType ?? {};
  const entries = Object.entries(types);
  if (!entries.length) return '-';
  entries.sort((a, b) => (b[1] as number) - (a[1] as number));
  return fmt.formatAlertType(entries[0][0]);
});

const maxTrend = computed(() => Math.max(1, ...(summary.value?.trend?.map((t: any) => t.count) ?? [1])));
function barHeight(count: number): number {
  return (count / maxTrend.value) * 100;
}

function alertVariant(type: string): 'red' | 'yellow' | 'blue' | 'purple' | 'gray' {
  if (type.includes('blocked') || type.includes('uninstall')) return 'red';
  if (type.includes('geofence')) return 'purple';
  if (type.includes('new_app')) return 'blue';
  if (type.includes('device_offline')) return 'gray';
  return 'yellow';
}

async function loadAlerts() {
  alertsLoading.value = true;
  try {
    const data = await getAlerts({ page: alertPage.value, limit: 20, type: typeFilter.value, read: readFilter.value });
    alerts.value = data.alerts;
    alertTotal.value = data.total;
    alertTotalPages.value = data.totalPages;
  } catch { }
  finally { alertsLoading.value = false; }
}

onMounted(async () => {
  try { summary.value = await getAlertsSummary(); }
  catch { }
  finally { summaryLoading.value = false; }
  loadAlerts();
});
</script>
