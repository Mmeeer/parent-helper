<template>
  <div>
    <PageHeader title="Subscription Keys" subtitle="Create and manage subscription keys for clients" :breadcrumbs="[{ label: 'Subscriptions' }]">
      <template #actions>
        <div class="flex items-center gap-2">
          <input v-model="searchQuery" @input="debouncedSearch" type="text" placeholder="Search keys or notes..."
            class="px-3 py-2 border border-ink-200 rounded-lg text-xs bg-white focus:ring-1 focus:ring-nest-500 outline-none text-ink-700 w-48 placeholder:text-ink-300" />
          <select v-model="statusFilter" @change="page = 1; loadKeys()"
            class="px-3 py-2 border border-ink-200 rounded-lg text-xs bg-white focus:ring-1 focus:ring-nest-500 outline-none text-ink-700">
            <option value="">All statuses</option>
            <option value="unused">Unused</option>
            <option value="active">Active</option>
            <option value="expired">Expired</option>
          </select>
          <button @click="handleExportCSV"
            class="px-3 py-2 text-xs border border-ink-200 rounded-lg hover:bg-ink-50 transition text-ink-600">Export CSV</button>
        </div>
      </template>
    </PageHeader>

    <!-- Batch Create Form -->
    <div class="bg-white rounded-xl border border-ink-100 p-5 mb-6">
      <div class="flex items-center justify-between mb-3">
        <h2 class="text-sm font-semibold text-ink-800">Generate Keys in Batch</h2>
        <button @click="showSingleCreate = !showSingleCreate" class="text-[11px] text-nest-600 hover:underline">
          {{ showSingleCreate ? 'Batch mode' : 'Single key mode' }}
        </button>
      </div>

      <!-- Single Key Create -->
      <div v-if="showSingleCreate" class="flex flex-wrap gap-3 items-end">
        <div>
          <label for="new-max-kids" class="block text-[10px] font-medium text-ink-400 uppercase tracking-widest mb-1.5">Max Kids</label>
          <input id="new-max-kids" v-model.number="newKey.maxKids" type="number" min="1" max="20"
            class="w-20 px-3 py-2 border border-ink-200 rounded-lg text-xs focus:ring-1 focus:ring-nest-500 outline-none text-ink-700" />
        </div>
        <div>
          <label for="new-duration" class="block text-[10px] font-medium text-ink-400 uppercase tracking-widest mb-1.5">Duration</label>
          <select id="new-duration" v-model.number="newKey.durationMonths"
            class="px-3 py-2 border border-ink-200 rounded-lg text-xs bg-white focus:ring-1 focus:ring-nest-500 outline-none text-ink-700">
            <option v-for="m in 12" :key="m" :value="m">{{ m }} month{{ m > 1 ? 's' : '' }}</option>
          </select>
        </div>
        <div class="flex-1 min-w-[180px]">
          <label for="new-note" class="block text-[10px] font-medium text-ink-400 uppercase tracking-widest mb-1.5">Note (optional)</label>
          <input id="new-note" v-model="newKey.note" type="text" placeholder="Client name, purpose..."
            class="w-full px-3 py-2 border border-ink-200 rounded-lg text-xs focus:ring-1 focus:ring-nest-500 outline-none text-ink-700 placeholder:text-ink-300" />
        </div>
        <button :disabled="creating" @click="handleCreate"
          class="px-4 py-2 bg-ink-900 text-white text-xs font-semibold rounded-lg hover:bg-ink-800 disabled:opacity-50 transition">
          {{ creating ? 'Creating...' : 'Generate Key' }}
        </button>
      </div>

      <!-- Batch Create -->
      <div v-else class="flex flex-wrap gap-3 items-end">
        <div>
          <label for="batch-qty" class="block text-[10px] font-medium text-ink-400 uppercase tracking-widest mb-1.5">Quantity</label>
          <input id="batch-qty" v-model.number="batchForm.quantity" type="number" min="1" max="500"
            class="w-24 px-3 py-2 border border-ink-200 rounded-lg text-xs focus:ring-1 focus:ring-nest-500 outline-none text-ink-700" />
        </div>
        <div>
          <label for="batch-days" class="block text-[10px] font-medium text-ink-400 uppercase tracking-widest mb-1.5">Duration (days)</label>
          <input id="batch-days" v-model.number="batchForm.duration_days" type="number" min="1" max="365"
            class="w-24 px-3 py-2 border border-ink-200 rounded-lg text-xs focus:ring-1 focus:ring-nest-500 outline-none text-ink-700" />
        </div>
        <div>
          <label for="batch-prefix" class="block text-[10px] font-medium text-ink-400 uppercase tracking-widest mb-1.5">Prefix</label>
          <input id="batch-prefix" v-model="batchForm.prefix" type="text" placeholder="PK" maxlength="6"
            class="w-24 px-3 py-2 border border-ink-200 rounded-lg text-xs focus:ring-1 focus:ring-nest-500 outline-none text-ink-700 uppercase placeholder:text-ink-300" />
        </div>
        <div>
          <label for="batch-kids" class="block text-[10px] font-medium text-ink-400 uppercase tracking-widest mb-1.5">Max Kids</label>
          <input id="batch-kids" v-model.number="batchForm.maxKids" type="number" min="1" max="20"
            class="w-20 px-3 py-2 border border-ink-200 rounded-lg text-xs focus:ring-1 focus:ring-nest-500 outline-none text-ink-700" />
        </div>
        <div class="flex-1 min-w-[140px]">
          <label for="batch-note" class="block text-[10px] font-medium text-ink-400 uppercase tracking-widest mb-1.5">Note (optional)</label>
          <input id="batch-note" v-model="batchForm.note" type="text" placeholder="Batch purpose..."
            class="w-full px-3 py-2 border border-ink-200 rounded-lg text-xs focus:ring-1 focus:ring-nest-500 outline-none text-ink-700 placeholder:text-ink-300" />
        </div>
        <button :disabled="creating" @click="handleBatchCreate"
          class="px-4 py-2 bg-ink-900 text-white text-xs font-semibold rounded-lg hover:bg-ink-800 disabled:opacity-50 transition">
          {{ creating ? 'Generating...' : `Generate ${batchForm.quantity} Key${batchForm.quantity > 1 ? 's' : ''}` }}
        </button>
      </div>

      <!-- Created key feedback (single) -->
      <div v-if="createdKey" class="mt-3 p-3 bg-nest-500/5 border border-nest-500/20 rounded-lg flex items-center gap-3">
        <div class="text-xs text-nest-600">
          <span class="font-medium">Key created!</span> Share this with the client:
        </div>
        <code class="text-sm font-mono font-bold text-ink-900 tracking-wider flex-1">{{ createdKey }}</code>
        <button @click="copyText(createdKey)" class="px-2.5 py-1 text-[11px] bg-nest-500 text-white rounded-lg hover:bg-nest-600 transition">Copy</button>
      </div>

      <!-- Batch result feedback -->
      <div v-if="batchResult" class="mt-3 p-3 bg-nest-500/5 border border-nest-500/20 rounded-lg">
        <div class="flex items-center justify-between mb-2">
          <div class="text-xs text-nest-600 font-medium">{{ batchResult.length }} keys generated</div>
          <button @click="copyBatchKeys"
            class="px-2.5 py-1 text-[11px] bg-nest-500 text-white rounded-lg hover:bg-nest-600 transition">Copy All</button>
        </div>
        <div class="max-h-32 overflow-y-auto">
          <code class="text-[11px] font-mono text-ink-800 leading-relaxed block">{{ batchResult.map(k => k.key).join('\n') }}</code>
        </div>
      </div>
    </div>

    <!-- Bulk Actions Bar -->
    <div v-if="selectedKeys.length > 0" class="bg-ink-800 text-white rounded-xl p-3 mb-4 flex items-center justify-between">
      <span class="text-xs">{{ selectedKeys.length }} key{{ selectedKeys.length > 1 ? 's' : '' }} selected</span>
      <div class="flex gap-2">
        <button @click="selectedKeys = []" class="px-3 py-1.5 text-xs border border-ink-600 rounded-lg hover:bg-ink-700 transition">Clear</button>
        <button @click="confirmBulkRevoke"
          class="px-3 py-1.5 text-xs bg-red-600 rounded-lg hover:bg-red-700 transition">Revoke Selected</button>
      </div>
    </div>

    <!-- Keys Table -->
    <div class="bg-white rounded-xl border border-ink-100 overflow-hidden">
      <LoadingSkeleton v-if="loading" type="table" :count="8" wrapper-class="p-4" />

      <table v-else-if="keys.length" class="w-full">
        <thead>
          <tr class="bg-ink-50/60 border-b border-ink-100">
            <th class="px-4 py-2.5 text-left w-8">
              <input type="checkbox" :checked="allSelected" @change="toggleSelectAll"
                class="rounded border-ink-300 text-nest-500 focus:ring-nest-500" />
            </th>
            <th class="px-4 py-2.5 text-left text-[10px] font-semibold text-ink-400 uppercase tracking-widest">Key</th>
            <th class="px-4 py-2.5 text-left text-[10px] font-semibold text-ink-400 uppercase tracking-widest">Status</th>
            <th class="px-4 py-2.5 text-left text-[10px] font-semibold text-ink-400 uppercase tracking-widest">Kids</th>
            <th class="px-4 py-2.5 text-left text-[10px] font-semibold text-ink-400 uppercase tracking-widest">Duration</th>
            <th class="px-4 py-2.5 text-left text-[10px] font-semibold text-ink-400 uppercase tracking-widest">User</th>
            <th class="px-4 py-2.5 text-left text-[10px] font-semibold text-ink-400 uppercase tracking-widest">Expires</th>
            <th class="px-4 py-2.5 text-left text-[10px] font-semibold text-ink-400 uppercase tracking-widest">Note</th>
            <th class="px-4 py-2.5 text-left text-[10px] font-semibold text-ink-400 uppercase tracking-widest">Actions</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-ink-50">
          <tr v-for="k in keys" :key="k._id" class="text-xs hover:bg-ink-50/40 transition"
            :class="{ 'bg-nest-500/5': selectedKeys.includes(k._id) }">
            <td class="px-4 py-2.5">
              <input type="checkbox" :checked="selectedKeys.includes(k._id)" @change="toggleSelect(k._id)"
                class="rounded border-ink-300 text-nest-500 focus:ring-nest-500" />
            </td>
            <td class="px-4 py-2.5 font-mono font-medium text-ink-900">{{ k.key }}</td>
            <td class="px-4 py-2.5">
              <Badge :label="k.status" :variant="k.status === 'active' ? 'green' : k.status === 'expired' ? 'red' : 'gray'" />
            </td>
            <td class="px-4 py-2.5 text-ink-600">{{ k.maxKids }}</td>
            <td class="px-4 py-2.5 text-ink-600">{{ k.durationMonths }}mo</td>
            <td class="px-4 py-2.5 text-ink-600">
              <span v-if="k.activatedBy">{{ k.activatedBy.name }} ({{ k.activatedBy.email }})</span>
              <span v-else class="text-ink-400">&mdash;</span>
            </td>
            <td class="px-4 py-2.5">
              <template v-if="k.expiresAt">
                <span :class="isExpired(k.expiresAt) ? 'text-red-600' : 'text-ink-600'">{{ fmt.formatDate(k.expiresAt) }}</span>
                <div v-if="!isExpired(k.expiresAt)" class="text-[11px] text-ink-400">{{ fmt.timeUntil(k.expiresAt) }}</div>
              </template>
              <span v-else class="text-ink-400">&mdash;</span>
            </td>
            <td class="px-4 py-2.5 text-ink-500 max-w-[120px] truncate">{{ k.note || '—' }}</td>
            <td class="px-4 py-2.5">
              <div class="flex gap-1.5">
                <button v-if="k.status === 'active' || k.status === 'expired'" @click="openExtend(k)"
                  class="px-2 py-1 text-[11px] text-green-700 border border-green-200 rounded-lg hover:bg-green-50 transition">Extend</button>
                <button @click="openEdit(k)"
                  class="px-2 py-1 text-[11px] text-nest-600 border border-nest-500/30 rounded-lg hover:bg-nest-500/5 transition">Edit</button>
                <button v-if="k.status !== 'active'" @click="confirmDelete(k)"
                  class="px-2 py-1 text-[11px] text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition">Delete</button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      <EmptyState v-else title="No keys found" :message="statusFilter || searchQuery ? 'Try adjusting your filters' : 'No subscription keys have been created yet'" />

      <div v-if="totalPages > 1" class="flex items-center justify-between px-5 py-3 border-t border-ink-100 bg-ink-50/40">
        <p class="text-xs text-ink-400">Page {{ page }} of {{ totalPages }} ({{ total }} keys)</p>
        <div class="flex gap-1.5">
          <button :disabled="page <= 1" @click="page--; loadKeys()"
            class="px-3 py-1.5 text-xs border border-ink-200 rounded-lg disabled:opacity-30 hover:bg-white transition text-ink-600">Prev</button>
          <button :disabled="page >= totalPages" @click="page++; loadKeys()"
            class="px-3 py-1.5 text-xs border border-ink-200 rounded-lg disabled:opacity-30 hover:bg-white transition text-ink-600">Next</button>
        </div>
      </div>
    </div>

    <!-- Edit Modal -->
    <Teleport to="body">
      <div v-if="editKey" class="fixed inset-0 bg-ink-900/40 backdrop-blur-sm flex items-center justify-center z-50" @click.self="editKey = null">
        <div class="bg-white rounded-2xl border border-ink-100 p-5 w-full max-w-sm mx-4 shadow-xl">
          <h3 class="font-display font-bold text-base text-ink-900 mb-3">Edit Key: <code class="font-mono text-sm">{{ editKey.key }}</code></h3>
          <div class="space-y-3">
            <div>
              <label for="edit-max-kids" class="block text-[10px] font-medium text-ink-400 uppercase tracking-widest mb-1.5">Max Kids</label>
              <input id="edit-max-kids" v-model.number="editKey.maxKids" type="number" min="1" max="20"
                class="w-full px-3 py-2 border border-ink-200 rounded-lg text-xs outline-none focus:ring-1 focus:ring-nest-500 text-ink-700" />
            </div>
            <div>
              <label for="edit-note" class="block text-[10px] font-medium text-ink-400 uppercase tracking-widest mb-1.5">Note</label>
              <input id="edit-note" v-model="editKey.note" type="text"
                class="w-full px-3 py-2 border border-ink-200 rounded-lg text-xs outline-none focus:ring-1 focus:ring-nest-500 text-ink-700" />
            </div>
          </div>
          <div class="flex gap-2 mt-4">
            <button @click="editKey = null" class="flex-1 px-3 py-2 text-xs border border-ink-200 rounded-lg hover:bg-ink-50 transition text-ink-600">Cancel</button>
            <button @click="handleEdit" class="flex-1 px-3 py-2 text-xs bg-nest-500 text-white rounded-lg hover:bg-nest-600 transition">Save</button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Extend Modal -->
    <Teleport to="body">
      <div v-if="extendData" class="fixed inset-0 bg-ink-900/40 backdrop-blur-sm flex items-center justify-center z-50" @click.self="extendData = null">
        <div class="bg-white rounded-2xl border border-ink-100 p-5 w-full max-w-sm mx-4 shadow-xl">
          <h3 class="font-display font-bold text-base text-ink-900 mb-1">Extend Subscription</h3>
          <p class="text-xs text-ink-400 mb-3">Key: <code class="font-mono font-medium text-ink-700">{{ extendData.key.key }}</code></p>
          <div>
            <label for="extend-months" class="block text-[10px] font-medium text-ink-400 uppercase tracking-widest mb-1.5">Add months</label>
            <select id="extend-months" v-model.number="extendData.months"
              class="w-full px-3 py-2 border border-ink-200 rounded-lg text-xs outline-none bg-white focus:ring-1 focus:ring-nest-500 text-ink-700">
              <option v-for="m in 12" :key="m" :value="m">{{ m }} month{{ m > 1 ? 's' : '' }}</option>
            </select>
          </div>
          <div class="flex gap-2 mt-4">
            <button @click="extendData = null" class="flex-1 px-3 py-2 text-xs border border-ink-200 rounded-lg hover:bg-ink-50 transition text-ink-600">Cancel</button>
            <button @click="handleExtend" class="flex-1 px-3 py-2 text-xs bg-green-600 text-white rounded-lg hover:bg-green-700 transition">Extend</button>
          </div>
        </div>
      </div>
    </Teleport>

    <ConfirmModal :show="showDeleteModal" title="Delete Key" :message="`Delete key ${deleteTarget?.key}? This cannot be undone.`"
      confirm-text="Delete" variant="danger" @confirm="handleDelete" @cancel="showDeleteModal = false" />

    <ConfirmModal :show="showBulkRevokeModal" title="Bulk Revoke Keys"
      :message="`Revoke ${selectedKeys.length} selected key(s)? Active keys will be deactivated and unlinked from users.`"
      confirm-text="Revoke All" variant="danger" @confirm="handleBulkRevoke" @cancel="showBulkRevokeModal = false" />
  </div>
</template>

<script setup lang="ts">
const { getKeys, createKey, updateKey, deleteKey, extendKey, createKeysBatch, exportKeysCSV, bulkRevokeKeys } = useApi();
const fmt = useFormatters();
const toast = useToast();

const keys = ref<any[]>([]);
const loading = ref(true);
const creating = ref(false);
const page = ref(1);
const total = ref(0);
const totalPages = ref(0);
const statusFilter = ref('');
const searchQuery = ref('');
const createdKey = ref('');
const editKey = ref<any>(null);
const newKey = ref({ maxKids: 2, durationMonths: 1, note: '' });
const extendData = ref<{ key: any; months: number } | null>(null);
const showDeleteModal = ref(false);
const deleteTarget = ref<any>(null);
const showSingleCreate = ref(false);
const selectedKeys = ref<string[]>([]);
const showBulkRevokeModal = ref(false);
const batchResult = ref<any[] | null>(null);

const batchForm = ref({
  quantity: 10,
  duration_days: 30,
  prefix: 'PK',
  maxKids: 2,
  note: '',
});

let searchTimeout: ReturnType<typeof setTimeout>;
function debouncedSearch() {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    page.value = 1;
    loadKeys();
  }, 300);
}

const allSelected = computed(() => keys.value.length > 0 && keys.value.every(k => selectedKeys.value.includes(k._id)));

function toggleSelectAll() {
  if (allSelected.value) {
    selectedKeys.value = [];
  } else {
    selectedKeys.value = keys.value.map(k => k._id);
  }
}

function toggleSelect(id: string) {
  const idx = selectedKeys.value.indexOf(id);
  if (idx >= 0) selectedKeys.value.splice(idx, 1);
  else selectedKeys.value.push(id);
}

function isExpired(dateStr: string) {
  return new Date(dateStr) < new Date();
}

async function loadKeys() {
  loading.value = true;
  try {
    const data = await getKeys(page.value, 20, statusFilter.value, searchQuery.value);
    keys.value = data.keys;
    total.value = data.total;
    totalPages.value = data.totalPages;
  } catch { }
  finally { loading.value = false; }
}

async function handleCreate() {
  creating.value = true;
  createdKey.value = '';
  batchResult.value = null;
  try {
    const data = await createKey(newKey.value.maxKids, newKey.value.durationMonths, newKey.value.note);
    createdKey.value = data.key;
    newKey.value.note = '';
    toast.success('Key created successfully');
    loadKeys();
  } catch (e: any) { toast.error(e.message || 'Failed to create key'); }
  finally { creating.value = false; }
}

async function handleBatchCreate() {
  creating.value = true;
  createdKey.value = '';
  batchResult.value = null;
  try {
    const data = await createKeysBatch({
      quantity: batchForm.value.quantity,
      duration_days: batchForm.value.duration_days,
      prefix: batchForm.value.prefix || 'PK',
      maxKids: batchForm.value.maxKids,
      note: batchForm.value.note,
    });
    batchResult.value = data.keys;
    batchForm.value.note = '';
    toast.success(data.message);
    loadKeys();
  } catch (e: any) { toast.error(e.message || 'Failed to create keys'); }
  finally { creating.value = false; }
}

function copyText(text: string) {
  navigator.clipboard.writeText(text);
  toast.success('Copied to clipboard');
}

function copyBatchKeys() {
  if (!batchResult.value) return;
  const text = batchResult.value.map(k => k.key).join('\n');
  navigator.clipboard.writeText(text);
  toast.success(`${batchResult.value.length} keys copied to clipboard`);
}

async function handleExportCSV() {
  try {
    const csv = await exportKeysCSV(statusFilter.value, searchQuery.value);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `subscription-keys-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV exported');
  } catch (e: any) { toast.error(e.message || 'Export failed'); }
}

function confirmBulkRevoke() {
  showBulkRevokeModal.value = true;
}

async function handleBulkRevoke() {
  showBulkRevokeModal.value = false;
  try {
    const data = await bulkRevokeKeys(selectedKeys.value);
    toast.success(data.message);
    selectedKeys.value = [];
    loadKeys();
  } catch (e: any) { toast.error(e.message || 'Failed to revoke keys'); }
}

function openEdit(k: any) { editKey.value = { ...k }; }

async function handleEdit() {
  if (!editKey.value) return;
  try {
    await updateKey(editKey.value._id, { maxKids: editKey.value.maxKids, note: editKey.value.note });
    editKey.value = null;
    toast.success('Key updated');
    loadKeys();
  } catch (e: any) { toast.error(e.message || 'Failed to update key'); }
}

function confirmDelete(k: any) {
  deleteTarget.value = k;
  showDeleteModal.value = true;
}

async function handleDelete() {
  showDeleteModal.value = false;
  if (!deleteTarget.value) return;
  try {
    await deleteKey(deleteTarget.value._id);
    toast.success('Key deleted');
    loadKeys();
  } catch (e: any) { toast.error(e.message || 'Failed to delete key'); }
}

function openExtend(k: any) { extendData.value = { key: k, months: 1 }; }

async function handleExtend() {
  if (!extendData.value) return;
  try {
    await extendKey(extendData.value.key._id, extendData.value.months);
    extendData.value = null;
    toast.success('Subscription extended');
    loadKeys();
  } catch (e: any) { toast.error(e.message || 'Failed to extend key'); }
}

onMounted(loadKeys);
</script>
