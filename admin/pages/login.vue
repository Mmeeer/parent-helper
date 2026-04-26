<template>
  <div class="bg-white border border-ink-200 rounded-2xl p-8 shadow-sm">
    <h2 class="text-sm font-bold text-ink-800 mb-1">{{ $t('auth.signIn') }}</h2>
    <p class="text-xs text-ink-400 mb-6">{{ $t('auth.signInDesc') }}</p>

    <form @submit.prevent="handleLogin" class="space-y-4">
      <div>
        <label for="email" class="block text-[10px] font-semibold text-ink-400 uppercase tracking-widest mb-1.5">{{ $t('auth.email') }}</label>
        <input id="email" v-model="email" type="email" required placeholder="admin@example.com"
          class="w-full px-3.5 py-2.5 bg-ink-50 border border-ink-200 rounded-xl text-sm text-ink-800 placeholder:text-ink-300 focus:outline-none focus:border-nest-400 focus:ring-1 focus:ring-nest-300 transition" />
      </div>
      <div>
        <label for="password" class="block text-[10px] font-semibold text-ink-400 uppercase tracking-widest mb-1.5">{{ $t('auth.password') }}</label>
        <input id="password" v-model="password" type="password" required placeholder="••••••••"
          class="w-full px-3.5 py-2.5 bg-ink-50 border border-ink-200 rounded-xl text-sm text-ink-800 placeholder:text-ink-300 focus:outline-none focus:border-nest-400 focus:ring-1 focus:ring-nest-300 transition" />
      </div>
      <button type="submit" :disabled="loading"
        class="w-full bg-nest-500 text-white py-2.5 rounded-xl text-sm font-bold hover:bg-nest-600 disabled:opacity-50 transition mt-1">
        {{ loading ? $t('auth.signingIn') : $t('auth.signInBtn') }}
      </button>
    </form>

    <div class="mt-5 pt-4 border-t border-ink-100">
      <p class="text-[11px] text-ink-400 text-center mb-2">{{ $t('auth.firstTimeSetup') }}</p>
      <button :disabled="seeding" @click="handleSeed"
        class="w-full text-xs text-ink-500 border border-ink-200 py-2 rounded-xl hover:bg-ink-50 disabled:opacity-50 transition">
        {{ seeding ? $t('auth.creating') : $t('auth.createAdmin') }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'auth' });

const { t } = useI18n();
const { login } = useApi();
const config = useRuntimeConfig();
const toast = useToast();

const email = ref('');
const password = ref('');
const loading = ref(false);
const seeding = ref(false);

async function handleLogin() {
  loading.value = true;
  try {
    const data = await login(email.value, password.value);
    if (data.user?.role !== 'admin') {
      const token = useCookie('admin_token');
      token.value = null;
      toast.error(t('auth.accessDenied'));
      return;
    }
    navigateTo('/');
  } catch (e: any) {
    toast.error(e?.data?.error || e.message || t('auth.invalidCredentials'));
  } finally {
    loading.value = false;
  }
}

async function handleSeed() {
  seeding.value = true;
  try {
    const res = await $fetch<{ message: string; email: string }>(`${config.public.apiBaseUrl}/admin/seed`, {
      method: 'POST',
    });
    toast.success(`Admin account created: ${res.email}. Default password: admin123456`);
    email.value = res.email;
  } catch (e: any) {
    const msg = e?.data?.error || e.message || t('auth.createFailed');
    if (msg.includes('already exists')) {
      toast.error(t('auth.adminExists'));
    } else {
      toast.error(msg);
    }
  } finally {
    seeding.value = false;
  }
}
</script>
