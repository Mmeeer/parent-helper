<template>
  <div class="p-8">
    <h1 class="text-2xl font-bold text-gray-900 mb-2">Subscription Keys</h1>
    <p class="text-gray-500 mb-8">Create and manage subscription keys for clients.</p>

    <!-- Create Key Form -->
    <div class="bg-white rounded-xl border border-gray-200 p-6 mb-8">
      <h2 class="text-lg font-semibold text-gray-900 mb-4">Create New Key</h2>
      <div class="flex flex-wrap gap-4 items-end">
        <div>
          <label class="block text-xs font-medium text-gray-500 mb-1">Max Kids</label>
          <input
            v-model.number="newKey.maxKids"
            type="number"
            min="1"
            max="20"
            class="w-24 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
          />
        </div>
        <div>
          <label class="block text-xs font-medium text-gray-500 mb-1">Duration</label>
          <select
            v-model.number="newKey.durationMonths"
            class="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
          >
            <option v-for="m in 12" :key="m" :value="m">{{ m }} month{{ m > 1 ? 's' : '' }}</option>
          </select>
        </div>
        <div class="flex-1 min-w-[200px]">
          <label class="block text-xs font-medium text-gray-500 mb-1">Note (optional)</label>
          <input
            v-model="newKey.note"
            type="text"
            placeholder="Client name, purpose..."
            class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
          />
        </div>
        <button
          class="px-5 py-2 bg-primary-600 text-white text-sm font-semibold rounded-lg hover:bg-primary-700 transition-colors"
          :disabled="creating"
          @click="handleCreate"
        >
          {{ creating ? 'Creating...' : 'Generate Key' }}
        </button>
      </div>

      <!-- Show newly created key -->
      <div v-if="createdKey" class="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
        <p class="text-sm text-green-700 font-medium mb-1">Key created! Share this with the client:</p>
        <div class="flex items-center gap-3">
          <code class="text-lg font-mono font-bold text-green-900 tracking-wider">{{ createdKey }}</code>
          <button
            class="px-3 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700"
            @click="copyKey"
          >
            Copy
          </button>
        </div>
      </div>
    </div>

    <!-- Filter -->
    <div class="flex gap-3 mb-6">
      <select
        v-model="statusFilter"
        class="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
        @change="page = 1; loadKeys()"
      >
        <option value="">All statuses</option>
        <option value="unused">Unused</option>
        <option value="active">Active</option>
        <option value="expired">Expired</option>
      </select>
    </div>

    <!-- Keys Table -->
    <div class="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div v-if="loading" class="p-12 text-center text-gray-400">Loading...</div>
      <table v-else class="w-full">
        <thead>
          <tr class="border-b border-gray-200 bg-gray-50">
            <th class="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Key</th>
            <th class="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
            <th class="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Kids</th>
            <th class="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Duration</th>
            <th class="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">User</th>
            <th class="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Expires</th>
            <th class="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Note</th>
            <th class="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="k in keys"
            :key="k._id"
            class="border-b border-gray-100 hover:bg-gray-50 transition-colors"
          >
            <td class="px-6 py-4 font-mono text-sm font-medium text-gray-900">{{ k.key }}</td>
            <td class="px-6 py-4">
              <span
                class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize"
                :class="statusBadge(k.status)"
              >
                {{ k.status }}
              </span>
            </td>
            <td class="px-6 py-4 text-sm text-gray-600">{{ k.maxKids }}</td>
            <td class="px-6 py-4 text-sm text-gray-600">{{ k.durationMonths }}mo</td>
            <td class="px-6 py-4 text-sm text-gray-600">
              <span v-if="k.activatedBy">{{ k.activatedBy.name }} ({{ k.activatedBy.email }})</span>
              <span v-else class="text-gray-400">—</span>
            </td>
            <td class="px-6 py-4 text-sm">
              <template v-if="k.expiresAt">
                <span :class="isExpired(k.expiresAt) ? 'text-red-600' : 'text-gray-600'">
                  {{ formatDate(k.expiresAt) }}
                </span>
                <div v-if="!isExpired(k.expiresAt)" class="text-xs text-gray-400">
                  {{ timeUntil(k.expiresAt) }}
                </div>
              </template>
              <span v-else class="text-gray-400">—</span>
            </td>
            <td class="px-6 py-4 text-sm text-gray-500 max-w-[150px] truncate">{{ k.note || '—' }}</td>
            <td class="px-6 py-4">
              <div class="flex gap-2">
                <button
                  v-if="k.status === 'active' || k.status === 'expired'"
                  class="px-2 py-1 text-xs text-green-600 border border-green-200 rounded hover:bg-green-50"
                  @click="openExtend(k)"
                >
                  Extend
                </button>
                <button
                  class="px-2 py-1 text-xs text-blue-600 border border-blue-200 rounded hover:bg-blue-50"
                  @click="openEdit(k)"
                >
                  Edit
                </button>
                <button
                  v-if="k.status !== 'active'"
                  class="px-2 py-1 text-xs text-red-600 border border-red-200 rounded hover:bg-red-50"
                  @click="handleDelete(k)"
                >
                  Delete
                </button>
              </div>
            </td>
          </tr>
          <tr v-if="keys.length === 0">
            <td colspan="8" class="px-6 py-12 text-center text-gray-400">
              No subscription keys found.
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Pagination -->
    <div v-if="totalPages > 1" class="flex items-center justify-between mt-6">
      <p class="text-sm text-gray-500">Page {{ page }} of {{ totalPages }} ({{ total }} keys)</p>
      <div class="flex gap-2">
        <button
          :disabled="page <= 1"
          class="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40"
          @click="page--; loadKeys()"
        >
          Previous
        </button>
        <button
          :disabled="page >= totalPages"
          class="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40"
          @click="page++; loadKeys()"
        >
          Next
        </button>
      </div>
    </div>

    <!-- Edit Modal -->
    <div v-if="editKey" class="fixed inset-0 bg-black/40 flex items-center justify-center z-50" @click.self="editKey = null">
      <div class="bg-white rounded-xl p-6 w-full max-w-md mx-4">
        <h3 class="text-lg font-semibold text-gray-900 mb-4">Edit Key: {{ editKey.key }}</h3>
        <div class="space-y-4">
          <div>
            <label class="block text-xs font-medium text-gray-500 mb-1">Max Kids</label>
            <input
              v-model.number="editKey.maxKids"
              type="number"
              min="1"
              max="20"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none"
            />
          </div>
          <div>
            <label class="block text-xs font-medium text-gray-500 mb-1">Note</label>
            <input
              v-model="editKey.note"
              type="text"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none"
            />
          </div>
        </div>
        <div class="flex gap-3 mt-6">
          <button
            class="flex-1 px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
            @click="editKey = null"
          >
            Cancel
          </button>
          <button
            class="flex-1 px-4 py-2 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700"
            @click="handleEdit"
          >
            Save
          </button>
        </div>
      </div>
    </div>
    <!-- Extend Modal -->
    <div v-if="extendData" class="fixed inset-0 bg-black/40 flex items-center justify-center z-50" @click.self="extendData = null">
      <div class="bg-white rounded-xl p-6 w-full max-w-sm mx-4">
        <h3 class="text-lg font-semibold text-gray-900 mb-2">Extend Subscription</h3>
        <p class="text-sm text-gray-500 mb-4">Key: <code class="font-mono font-medium">{{ extendData.key.key }}</code></p>
        <div>
          <label class="block text-xs font-medium text-gray-500 mb-1">Add months</label>
          <select
            v-model.number="extendData.months"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none"
          >
            <option v-for="m in 12" :key="m" :value="m">{{ m }} month{{ m > 1 ? 's' : '' }}</option>
          </select>
        </div>
        <div class="flex gap-3 mt-6">
          <button
            class="flex-1 px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
            @click="extendData = null"
          >
            Cancel
          </button>
          <button
            class="flex-1 px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700"
            @click="handleExtend"
          >
            Extend
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const { getKeys, createKey, updateKey, deleteKey, extendKey } = useApi();

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

function statusBadge(status: string) {
  switch (status) {
    case 'active': return 'bg-green-100 text-green-700';
    case 'expired': return 'bg-red-100 text-red-700';
    default: return 'bg-gray-100 text-gray-700';
  }
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}

function isExpired(dateStr: string) {
  return new Date(dateStr) < new Date();
}

function timeUntil(dateStr: string) {
  const diff = new Date(dateStr).getTime() - Date.now();
  if (diff <= 0) return 'Expired';
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days > 0) return `${days} day${days > 1 ? 's' : ''} left`;
  const hours = Math.floor(diff / (1000 * 60 * 60));
  return `${hours} hour${hours > 1 ? 's' : ''} left`;
}

async function loadKeys() {
  loading.value = true;
  try {
    const data = await getKeys(page.value, 20, statusFilter.value);
    keys.value = data.keys;
    total.value = data.total;
    totalPages.value = data.totalPages;
  } catch {
    // Handle error
  } finally {
    loading.value = false;
  }
}

async function handleCreate() {
  creating.value = true;
  createdKey.value = '';
  try {
    const data = await createKey(newKey.value.maxKids, newKey.value.durationMonths, newKey.value.note);
    createdKey.value = data.key;
    newKey.value.note = '';
    loadKeys();
  } catch {
    // Handle error
  } finally {
    creating.value = false;
  }
}

function copyKey() {
  navigator.clipboard.writeText(createdKey.value);
}

function openEdit(k: any) {
  editKey.value = { ...k };
}

async function handleEdit() {
  if (!editKey.value) return;
  try {
    await updateKey(editKey.value._id, { maxKids: editKey.value.maxKids, note: editKey.value.note });
    editKey.value = null;
    loadKeys();
  } catch {
    // Handle error
  }
}

async function handleDelete(k: any) {
  if (!confirm(`Delete key ${k.key}?`)) return;
  try {
    await deleteKey(k._id);
    loadKeys();
  } catch {
    // Handle error
  }
}

function openExtend(k: any) {
  extendData.value = { key: k, months: 1 };
}

async function handleExtend() {
  if (!extendData.value) return;
  try {
    await extendKey(extendData.value.key._id, extendData.value.months);
    extendData.value = null;
    loadKeys();
  } catch {
    // Handle error
  }
}

onMounted(() => {
  loadKeys();
});
</script>
