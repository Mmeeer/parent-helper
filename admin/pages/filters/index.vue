<template>
  <div class="p-8">
    <div class="flex justify-between items-center mb-6">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">Content Filters</h1>
        <p class="text-sm text-gray-500 mt-1">Manage the domain categorization database</p>
      </div>
    </div>

    <!-- Add Domain -->
    <div class="bg-white rounded-xl border border-gray-200 p-6 mb-6">
      <h2 class="text-lg font-semibold text-gray-900 mb-4">Add Domain</h2>
      <form @submit.prevent="handleAddDomain" class="flex gap-3">
        <input
          v-model="newDomain"
          type="text"
          placeholder="example.com"
          class="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
        />
        <select
          v-model="newCategory"
          class="px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none bg-white"
        >
          <option value="" disabled>Select category</option>
          <option v-for="cat in categories" :key="cat" :value="cat" class="capitalize">
            {{ formatCategory(cat) }}
          </option>
        </select>
        <button
          type="submit"
          :disabled="!newDomain || !newCategory || adding"
          class="px-6 py-2.5 bg-primary-600 text-white rounded-lg text-sm font-semibold hover:bg-primary-700 disabled:opacity-50 transition-colors"
        >
          {{ adding ? 'Adding...' : 'Add' }}
        </button>
      </form>
    </div>

    <!-- Filters by Category -->
    <div v-for="cat in categories" :key="cat" class="mb-6">
      <div class="flex items-center gap-2 mb-3">
        <h3 class="text-lg font-semibold text-gray-900 capitalize">{{ formatCategory(cat) }}</h3>
        <span class="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
          {{ domainsByCategory(cat).length }}
        </span>
      </div>

      <div v-if="domainsByCategory(cat).length === 0" class="text-sm text-gray-400 py-3">
        No domains in this category.
      </div>

      <div class="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div
          v-for="(entry, index) in domainsByCategory(cat)"
          :key="entry.domain"
          class="flex items-center justify-between px-6 py-3"
          :class="{ 'border-b border-gray-100': index < domainsByCategory(cat).length - 1 }"
        >
          <span class="text-sm text-gray-700 font-mono">{{ entry.domain }}</span>
          <button
            class="text-xs text-red-500 hover:text-red-700 font-medium"
            @click="handleRemove(entry.domain)"
          >
            Remove
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const { getFilters, updateFilter, deleteFilter } = useApi();

const domains = ref<{ domain: string; category: string }[]>([]);
const categories = ref<string[]>([
  'adult', 'gambling', 'violence', 'drugs', 'weapons',
  'hate', 'malware', 'phishing', 'social_media', 'gaming', 'streaming',
]);
const newDomain = ref('');
const newCategory = ref('');
const adding = ref(false);
const loading = ref(true);

function domainsByCategory(cat: string) {
  return domains.value.filter((d) => d.category === cat);
}

function formatCategory(cat: string) {
  return cat.charAt(0).toUpperCase() + cat.slice(1).replace(/_/g, ' ');
}

async function handleAddDomain() {
  if (!newDomain.value || !newCategory.value) return;
  adding.value = true;
  try {
    await updateFilter(newDomain.value.trim().toLowerCase(), newCategory.value);
    domains.value.push({ domain: newDomain.value.trim().toLowerCase(), category: newCategory.value });
    newDomain.value = '';
    newCategory.value = '';
  } catch (e: any) {
    alert(e.message || 'Failed to add domain.');
  } finally {
    adding.value = false;
  }
}

async function handleRemove(domain: string) {
  if (!confirm(`Remove ${domain} from content filters?`)) return;
  try {
    await deleteFilter(domain);
    domains.value = domains.value.filter((d) => d.domain !== domain);
  } catch (e: any) {
    alert(e.message || 'Failed to remove domain.');
  }
}

onMounted(async () => {
  try {
    const data = await getFilters();
    if (data.domains) domains.value = data.domains;
    if (data.categories) categories.value = data.categories;
  } catch {
    // Use defaults
  } finally {
    loading.value = false;
  }
});
</script>
