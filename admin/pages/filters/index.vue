<template>
  <div>
    <PageHeader title="Content Filters" subtitle="Manage the domain categorization database" :breadcrumbs="[{ label: 'Filters' }]" />

    <!-- Add Domain -->
    <div class="bg-white rounded-xl border border-ink-100 p-5 mb-6">
      <h2 class="text-sm font-semibold text-ink-800 mb-3">Add Domain</h2>
      <form @submit.prevent="handleAddDomain" class="flex flex-wrap gap-3 items-end">
        <div class="flex-1 min-w-[200px]">
          <label for="new-domain" class="block text-[10px] font-medium text-ink-400 uppercase tracking-widest mb-1.5">Domain</label>
          <input id="new-domain" v-model="newDomain" type="text" placeholder="example.com"
            class="w-full px-3 py-2 border border-ink-200 rounded-lg text-xs focus:ring-1 focus:ring-nest-500 outline-none text-ink-700 placeholder:text-ink-300" />
        </div>
        <div>
          <label for="new-category" class="block text-[10px] font-medium text-ink-400 uppercase tracking-widest mb-1.5">Category</label>
          <select id="new-category" v-model="newCategory"
            class="px-3 py-2 border border-ink-200 rounded-lg text-xs bg-white focus:ring-1 focus:ring-nest-500 outline-none text-ink-700">
            <option value="" disabled>Select category</option>
            <option v-for="cat in categories" :key="cat" :value="cat">{{ formatCategory(cat) }}</option>
          </select>
        </div>
        <button type="submit" :disabled="!newDomain || !newCategory || adding"
          class="px-4 py-2 bg-ink-900 text-white rounded-lg text-xs font-semibold hover:bg-ink-800 disabled:opacity-50 transition">
          {{ adding ? 'Adding...' : 'Add Domain' }}
        </button>
      </form>
    </div>

    <LoadingSkeleton v-if="loading" type="block" :count="3" wrapper-class="space-y-4" />

    <template v-else>
      <div v-for="cat in categories" :key="cat" class="mb-5">
        <div class="flex items-center gap-2 mb-2">
          <h3 class="text-xs font-semibold text-ink-700 uppercase tracking-widest">{{ formatCategory(cat) }}</h3>
          <Badge :label="String(domainsByCategory(cat).length)" variant="gray" />
        </div>

        <div v-if="domainsByCategory(cat).length" class="bg-white rounded-xl border border-ink-100 overflow-hidden">
          <div v-for="(entry, index) in domainsByCategory(cat)" :key="entry.domain"
            class="flex items-center justify-between px-4 py-2.5 text-xs"
            :class="{ 'border-b border-ink-50': index < domainsByCategory(cat).length - 1 }">
            <span class="text-ink-700 font-mono">{{ entry.domain }}</span>
            <button @click="confirmRemove(entry.domain)"
              class="text-red-500 hover:text-red-700 font-medium transition text-[11px]">Remove</button>
          </div>
        </div>
        <p v-else class="text-xs text-ink-400 italic py-1">No domains in this category.</p>
      </div>
    </template>

    <ConfirmModal :show="showRemoveModal" title="Remove Domain" :message="`Remove ${removeDomain} from content filters?`"
      confirm-text="Remove" variant="danger" @confirm="handleRemove" @cancel="showRemoveModal = false" />
  </div>
</template>

<script setup lang="ts">
const { getFilters, updateFilter, deleteFilter } = useApi();
const toast = useToast();

const domains = ref<{ domain: string; category: string }[]>([]);
const categories = ref<string[]>([
  'adult', 'gambling', 'violence', 'drugs', 'weapons',
  'hate', 'malware', 'phishing', 'social_media', 'gaming', 'streaming',
]);
const newDomain = ref('');
const newCategory = ref('');
const adding = ref(false);
const loading = ref(true);
const showRemoveModal = ref(false);
const removeDomain = ref('');

function domainsByCategory(cat: string) {
  return domains.value.filter((d) => d.category === cat);
}

function formatCategory(cat: string) {
  return cat.charAt(0).toUpperCase() + cat.slice(1).replaceAll('_', ' ');
}

async function handleAddDomain() {
  if (!newDomain.value || !newCategory.value) return;
  adding.value = true;
  try {
    await updateFilter(newDomain.value.trim().toLowerCase(), newCategory.value);
    domains.value.push({ domain: newDomain.value.trim().toLowerCase(), category: newCategory.value });
    newDomain.value = '';
    newCategory.value = '';
    toast.success('Domain added');
  } catch (e: any) { toast.error(e.message || 'Failed to add domain'); }
  finally { adding.value = false; }
}

function confirmRemove(domain: string) {
  removeDomain.value = domain;
  showRemoveModal.value = true;
}

async function handleRemove() {
  showRemoveModal.value = false;
  try {
    await deleteFilter(removeDomain.value);
    domains.value = domains.value.filter((d) => d.domain !== removeDomain.value);
    toast.success('Domain removed');
  } catch (e: any) { toast.error(e.message || 'Failed to remove domain'); }
}

onMounted(async () => {
  try {
    const data = await getFilters();
    if (data.domains) domains.value = data.domains;
    if (data.categories) categories.value = data.categories;
  } catch { }
  finally { loading.value = false; }
});
</script>
