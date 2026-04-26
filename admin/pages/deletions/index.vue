<template>
  <div>
    <PageHeader :title="$t('deletions.title')" :subtitle="$t('deletions.subtitle')" :breadcrumbs="[{ label: $t('deletions.title') }]">
      <template #actions>
        <button @click="handlePurge" :disabled="purging"
          class="px-3 py-2 text-xs font-medium rounded-lg transition"
          :class="purging ? 'bg-ink-100 text-ink-400' : 'bg-danger-50 text-danger-600 hover:bg-danger-100'">
          {{ purging ? $t('deletions.purging') : $t('deletions.purgeExpired') }}
        </button>
      </template>
    </PageHeader>

    <div class="bg-white rounded-xl border border-ink-100 overflow-hidden">
      <LoadingSkeleton v-if="loading" type="table" :count="6" wrapper-class="p-4" />

      <table v-else-if="users.length" class="w-full">
        <thead>
          <tr class="border-b border-ink-100 bg-ink-50/60">
            <th class="px-5 py-3 text-left text-[10px] font-semibold text-ink-400 uppercase tracking-widest">User</th>
            <th class="px-5 py-3 text-left text-[10px] font-semibold text-ink-400 uppercase tracking-widest">Requested</th>
            <th class="px-5 py-3 text-left text-[10px] font-semibold text-ink-400 uppercase tracking-widest">Purge Date</th>
            <th class="px-5 py-3 text-left text-[10px] font-semibold text-ink-400 uppercase tracking-widest">Days Left</th>
            <th class="px-5 py-3 text-left text-[10px] font-semibold text-ink-400 uppercase tracking-widest">Reason</th>
            <th class="px-5 py-3 text-right text-[10px] font-semibold text-ink-400 uppercase tracking-widest">Actions</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-ink-50">
          <tr v-for="user in users" :key="user._id" class="hover:bg-ink-50/40 transition-colors">
            <td class="px-5 py-3.5">
              <p class="text-sm font-medium text-ink-800">{{ user.name || '-' }}</p>
              <p class="text-xs text-ink-400">{{ user.email }}</p>
            </td>
            <td class="px-5 py-3.5 text-xs text-ink-500">{{ fmt.formatDate(user.deletionRequestedAt) }}</td>
            <td class="px-5 py-3.5 text-xs text-ink-500">{{ fmt.formatDate(user.purgeAt) }}</td>
            <td class="px-5 py-3.5">
              <Badge :label="`${user.daysRemaining}d`" :variant="user.daysRemaining <= 7 ? 'red' : user.daysRemaining <= 14 ? 'yellow' : 'gray'" />
            </td>
            <td class="px-5 py-3.5 text-xs text-ink-400 max-w-[200px] truncate">{{ user.deletionReason || '-' }}</td>
            <td class="px-5 py-3.5 text-right">
              <button @click="confirmCancel(user)" class="text-xs text-nest-500 hover:text-nest-600 font-medium">
                Cancel Deletion
              </button>
            </td>
          </tr>
        </tbody>
      </table>

      <EmptyState v-else title="No pending deletions" message="No accounts are currently pending deletion" />

      <!-- Pagination -->
      <div v-if="totalPages > 1" class="flex items-center justify-between px-5 py-3 border-t border-ink-100 bg-ink-50/40">
        <p class="text-xs text-ink-400">Page {{ page }} of {{ totalPages }} ({{ total }} total)</p>
        <div class="flex gap-1.5">
          <button :disabled="page <= 1" @click="page--; load()"
            class="px-3 py-1.5 text-xs border border-ink-200 rounded-lg disabled:opacity-30 hover:bg-white transition text-ink-600">Prev</button>
          <button :disabled="page >= totalPages" @click="page++; load()"
            class="px-3 py-1.5 text-xs border border-ink-200 rounded-lg disabled:opacity-30 hover:bg-white transition text-ink-600">Next</button>
        </div>
      </div>
    </div>

    <ConfirmModal
      :show="showCancelModal"
      title="Cancel Account Deletion"
      :message="`Are you sure you want to cancel the deletion request for ${cancelTarget?.email}? The account will be restored.`"
      confirm-label="Cancel Deletion"
      variant="primary"
      @confirm="doCancelDeletion"
      @cancel="showCancelModal = false"
    />
  </div>
</template>

<script setup lang="ts">
const api = useApi();
const fmt = useFormatters();
const toast = useToast();

const users = ref<any[]>([]);
const page = ref(1);
const total = ref(0);
const totalPages = ref(1);
const loading = ref(true);
const purging = ref(false);
const showCancelModal = ref(false);
const cancelTarget = ref<any>(null);

async function load() {
  loading.value = true;
  try {
    const data = await api.getDeletionsPending(page.value, 20);
    users.value = data.users;
    total.value = data.total;
    totalPages.value = data.totalPages;
  } catch {}
  finally { loading.value = false; }
}

function confirmCancel(user: any) {
  cancelTarget.value = user;
  showCancelModal.value = true;
}

async function doCancelDeletion() {
  if (!cancelTarget.value) return;
  try {
    await api.cancelDeletion(cancelTarget.value._id);
    toast.success('Account deletion cancelled');
    showCancelModal.value = false;
    cancelTarget.value = null;
    await load();
  } catch (err: any) {
    toast.error(err?.message || 'Failed to cancel deletion');
  }
}

async function handlePurge() {
  purging.value = true;
  try {
    const result = await api.purgeDeletions();
    toast.success(result.message);
    await load();
  } catch (err: any) {
    toast.error(err?.message || 'Purge failed');
  } finally {
    purging.value = false;
  }
}

onMounted(load);
</script>
