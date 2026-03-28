<template>
  <div>
    <PageHeader title="Subscription Keys" subtitle="Create and manage subscription keys for clients" :breadcrumbs="[{ label: 'Subscriptions' }]">
      <template #actions>
        <select v-model="statusFilter" @change="page = 1; loadKeys()"
          class="px-3 py-2 border border-ink-200 rounded-lg text-xs bg-white focus:ring-1 focus:ring-ac-500 outline-none text-ink-700">
          <option value="">All statuses</option>
          <option value="unused">Unused</option>
          <option value="active">Active</option>
          <option value="expired">Expired</option>
        </select>
      </template>
    </PageHeader>

    <!-- Create Key Form -->
    <div class="bg-white rounded-xl border border-ink-100 p-5 mb-6">
      <h2 class="text-sm font-semibold text-ink-800 mb-3">Create New Key</h2>
      <div class="flex flex-wrap gap-3 items-end">
        <div>
          <label for="new-max-kids" class="block text-[10px] font-medium text-ink-400 uppercase tracking-widest mb-1.5">Max Kids</label>
          <input id="new-max-kids" v-model.number="newKey.maxKids" type="number" min="1" max="20"
            class="w-20 px-3 py-2 border border-ink-200 rounded-lg text-xs focus:ring-1 focus:ring-ac-500 outline-none text-ink-700" />
        </div>
        <div>
          <label for="new-duration" class="block text-[10px] font-medium text-ink-400 uppercase tracking-widest mb-1.5">Duration</label>
          <select id="new-duration" v-model.number="newKey.durationMonths"
            class="px-3 py-2 border border-ink-200 rounded-lg text-xs bg-white focus:ring-1 focus:ring-ac-500 outline-none text-ink-700">
            <option v-for="m in 12" :key="m" :value="m">{{ m }} month{{ m > 1 ? 's' : '' }}</option>
          </select>
        </div>
        <div class="flex-1 min-w-[180px]">
          <label for="new-note" class="block text-[10px] font-medium text-ink-400 uppercase tracking-widest mb-1.5">Note (optional)</label>
          <input id="new-note" v-model="newKey.note" type="text" placeholder="Client name, purpose..."
            class="w-full px-3 py-2 border border-ink-200 rounded-lg text-xs focus:ring-1 focus:ring-ac-500 outline-none text-ink-700 placeholder:text-ink-300" />
        </div>
        <button :disabled="creating" @click="handleCreate"
          class="px-4 py-2 bg-ink-900 text-white text-xs font-semibold rounded-lg hover:bg-ink-800 disabled:opacity-50 transition">
          {{ creating ? 'Creating...' : 'Generate Key' }}
        </button>
      </div>

      <div v-if="createdKey" class="mt-3 p-3 bg-ac-500/5 border border-ac-500/20 rounded-lg flex items-center gap-3">
        <div class="text-xs text-ac-600">
          <span class="font-medium">Key created!</span> Share this with the client:
        </div>
        <code class="text-sm font-mono font-bold text-ink-900 tracking-wider flex-1">{{ createdKey }}</code>
        <button @click="copyKey" class="px-2.5 py-1 text-[11px] bg-ink-900 text-white rounded-lg hover:bg-ink-800 transition">Copy</button>
      </div>
    </div>

    <!-- Keys Table -->
    <div class="bg-white rounded-xl border border-ink-100 overflow-hidden">
      <LoadingSkeleton v-if="loading" type="table" :count="8" wrapper-class="p-4" />

      <table v-else-if="keys.length" class="w-full">
        <thead>
          <tr class="bg-ink-50/60 border-b border-ink-100">
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
          <tr v-for="k in keys" :key="k._id" class="text-xs hover:bg-ink-50/40 transition">
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
                  class="px-2 py-1 text-[11px] text-ac-600 border border-ac-500/30 rounded-lg hover:bg-ac-500/5 transition">Edit</button>
                <button v-if="k.status !== 'active'" @click="confirmDelete(k)"
                  class="px-2 py-1 text-[11px] text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition">Delete</button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      <EmptyState v-else title="No keys found" :message="statusFilter ? 'Try a different status filter' : 'No subscription keys have been created yet'" />

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
          <h3 class="font-serif italic text-lg font-semibold text-ink-900 mb-3">Edit Key: <code class="font-mono text-sm">{{ editKey.key }}</code></h3>
          <div class="space-y-3">
            <div>
              <label for="edit-max-kids" class="block text-[10px] font-medium text-ink-400 uppercase tracking-widest mb-1.5">Max Kids</label>
              <input id="edit-max-kids" v-model.number="editKey.maxKids" type="number" min="1" max="20"
                class="w-full px-3 py-2 border border-ink-200 rounded-lg text-xs outline-none focus:ring-1 focus:ring-ac-500 text-ink-700" />
            </div>
            <div>
              <label for="edit-note" class="block text-[10px] font-medium text-ink-400 uppercase tracking-widest mb-1.5">Note</label>
              <input id="edit-note" v-model="editKey.note" type="text"
                class="w-full px-3 py-2 border border-ink-200 rounded-lg text-xs outline-none focus:ring-1 focus:ring-ac-500 text-ink-700" />
            </div>
          </div>
          <div class="flex gap-2 mt-4">
            <button @click="editKey = null" class="flex-1 px-3 py-2 text-xs border border-ink-200 rounded-lg hover:bg-ink-50 transition text-ink-600">Cancel</button>
            <button @click="handleEdit" class="flex-1 px-3 py-2 text-xs bg-ink-900 text-white rounded-lg hover:bg-ink-800 transition">Save</button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Extend Modal -->
    <Teleport to="body">
      <div v-if="extendData" class="fixed inset-0 bg-ink-900/40 backdrop-blur-sm flex items-center justify-center z-50" @click.self="extendData = null">
        <div class="bg-white rounded-2xl border border-ink-100 p-5 w-full max-w-sm mx-4 shadow-xl">
          <h3 class="font-serif italic text-lg font-semibold text-ink-900 mb-1">Extend Subscription</h3>
          <p class="text-xs text-ink-400 mb-3">Key: <code class="font-mono font-medium text-ink-700">{{ extendData.key.key }}</code></p>
          <div>
            <label for="extend-months" class="block text-[10px] font-medium text-ink-400 uppercase tracking-widest mb-1.5">Add months</label>
            <select id="extend-months" v-model.number="extendData.months"
              class="w-full px-3 py-2 border border-ink-200 rounded-lg text-xs outline-none bg-white focus:ring-1 focus:ring-ac-500 text-ink-700">
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
  </div>
</template>

<script setup lang="ts">
const { getKeys, createKey, updateKey, deleteKey, extendKey } = useApi();
const fmt = useFormatters();
const toast = useToast();

const keys = ref<any[]>([]);
const loading = ref(true);
const creating = ref(false);
const page = ref(1);
const total = ref(0);
const totalPages = ref(0);
const statusFilter = ref('');
const createdKey = ref('');
const editKey = ref<any>(null);
const newKey = ref({ maxKids: 2, durationMonths: 1, note: '' });
const extendData = ref<{ key: any; months: number } | null>(null);
const showDeleteModal = ref(false);
const deleteTarget = ref<any>(null);

function isExpired(dateStr: string) {
  return new Date(dateStr) < new Date();
}

async function loadKeys() {
  loading.value = true;
  try {
    const data = await getKeys(page.value, 20, statusFilter.value);
    keys.value = data.keys;
    total.value = data.total;
    totalPages.value = data.totalPages;
  } catch { }
  finally { loading.value = false; }
}

async function handleCreate() {
  creating.value = true;
  createdKey.value = '';
  try {
    const data = await createKey(newKey.value.maxKids, newKey.value.durationMonths, newKey.value.note);
    createdKey.value = data.key;
    newKey.value.note = '';
    toast.success('Key created successfully');
    loadKeys();
  } catch (e: any) { toast.error(e.message || 'Failed to create key'); }
  finally { creating.value = false; }
}

function copyKey() {
  navigator.clipboard.writeText(createdKey.value);
  toast.success('Key copied to clipboard');
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
