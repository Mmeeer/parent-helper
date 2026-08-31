<template>
  <div>
    <PageHeader :title="$t('settings.title')" :subtitle="$t('settings.subtitle')" :breadcrumbs="[{ label: $t('settings.title') }]" />

    <LoadingSkeleton v-if="loading" type="block" :count="2" wrapper-class="space-y-6" />

    <template v-else>
      <!-- Terms of Service -->
      <div class="bg-white rounded-xl border border-ink-100 p-5 mb-6">
        <h2 class="text-sm font-semibold text-ink-800 mb-4">{{ $t('settings.termsTitle') }}</h2>

        <div class="space-y-5">
          <div v-for="section in termsSections" :key="section.key">
            <label :for="`terms-${section.key}`" class="block text-[10px] font-medium text-ink-400 uppercase tracking-widest mb-1.5">
              {{ $t(section.labelKey) }}
            </label>
            <textarea :id="`terms-${section.key}`" v-model="terms[section.key]" rows="12"
              :placeholder="$t('settings.termsPlaceholder')"
              class="w-full px-3 py-2 border border-ink-200 rounded-lg text-xs leading-relaxed focus:ring-1 focus:ring-nest-500 outline-none text-ink-700 placeholder:text-ink-300 resize-y"></textarea>
            <div class="flex items-center justify-between mt-2">
              <span class="text-[11px] text-ink-400">{{ $t('settings.characters', { count: terms[section.key].length }) }}</span>
              <button :disabled="savingKey === section.key" @click="saveSetting(section.key, terms[section.key])"
                class="px-4 py-2 bg-ink-900 text-white text-xs font-semibold rounded-lg hover:bg-ink-800 disabled:opacity-50 transition">
                {{ savingKey === section.key ? $t('settings.saving') : $t('common.save') }}
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Tutorial Video -->
      <div class="bg-white rounded-xl border border-ink-100 p-5 mb-6">
        <h2 class="text-sm font-semibold text-ink-800 mb-4">{{ $t('settings.tutorialTitle') }}</h2>

        <div class="flex flex-wrap gap-3 items-end">
          <div class="flex-1 min-w-[240px]">
            <label for="tutorial-url" class="block text-[10px] font-medium text-ink-400 uppercase tracking-widest mb-1.5">
              {{ $t('settings.videoUrl') }}
            </label>
            <input id="tutorial-url" v-model="videoUrl" type="text" placeholder="https://www.youtube.com/watch?v=..."
              class="w-full px-3 py-2 border rounded-lg text-xs focus:ring-1 focus:ring-nest-500 outline-none text-ink-700 placeholder:text-ink-300"
              :class="videoValid ? 'border-ink-200' : 'border-red-300'" />
          </div>
          <button :disabled="!videoValid || savingKey === 'tutorial.videoUrl'" @click="saveSetting('tutorial.videoUrl', videoUrl.trim())"
            class="px-4 py-2 bg-ink-900 text-white text-xs font-semibold rounded-lg hover:bg-ink-800 disabled:opacity-50 transition">
            {{ savingKey === 'tutorial.videoUrl' ? $t('settings.saving') : $t('common.save') }}
          </button>
        </div>

        <p v-if="!videoValid" class="text-[11px] text-red-600 mt-2">{{ $t('settings.invalidUrl') }}</p>
        <p v-else class="text-[11px] text-ink-400 mt-2">{{ $t('settings.tutorialHint') }}</p>

        <div v-if="videoId" class="mt-4">
          <p class="text-[10px] font-medium text-ink-400 uppercase tracking-widest mb-1.5">{{ $t('settings.preview') }}</p>
          <a :href="videoUrl.trim()" target="_blank" rel="noopener" class="inline-block">
            <img :src="`https://img.youtube.com/vi/${videoId}/hqdefault.jpg`" :alt="$t('settings.tutorialTitle')"
              class="w-60 rounded-lg border border-ink-100" />
          </a>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
const { getSettings, updateSetting } = useApi();
const toast = useToast();
const { t } = useI18n();

const termsSections = [
  { key: 'terms.parent', labelKey: 'settings.parentTerms' },
  { key: 'terms.child', labelKey: 'settings.childTerms' },
] as const;

const loading = ref(true);
const savingKey = ref('');
const terms = reactive<Record<string, string>>({ 'terms.parent': '', 'terms.child': '' });
const videoUrl = ref('');

function extractYoutubeId(url: string): string | null {
  const patterns = [
    /youtube\.com\/watch\?(?:[^#\s]*&)?v=([A-Za-z0-9_-]{6,20})/,
    /youtu\.be\/([A-Za-z0-9_-]{6,20})/,
    /youtube\.com\/shorts\/([A-Za-z0-9_-]{6,20})/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

const videoId = computed(() => extractYoutubeId(videoUrl.value.trim()));
const videoValid = computed(() => !videoUrl.value.trim() || !!videoId.value);

async function saveSetting(key: string, value: string) {
  savingKey.value = key;
  try {
    await updateSetting(key, value);
    toast.success(t('settings.saved'));
  } catch (e: any) {
    toast.error(e?.data?.error || e.message || t('settings.saveFailed'));
  } finally {
    savingKey.value = '';
  }
}

onMounted(async () => {
  try {
    const data = await getSettings();
    for (const setting of data.settings || []) {
      if (setting.key in terms) terms[setting.key] = setting.value || '';
      if (setting.key === 'tutorial.videoUrl') videoUrl.value = setting.value || '';
    }
  } catch {
    toast.error(t('settings.loadFailed'));
  } finally {
    loading.value = false;
  }
});
</script>
