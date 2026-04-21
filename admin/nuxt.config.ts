export default defineNuxtConfig({
  compatibilityDate: '2024-11-01',
  devtools: { enabled: true },
  modules: ['@nuxtjs/tailwindcss', '@nuxtjs/i18n'],

  i18n: {
    locales: [
      { code: 'en', name: 'English', file: 'en.json' },
      { code: 'mn', name: 'Монгол', file: 'mn.json' },
    ],
    defaultLocale: 'en',
    langDir: 'locales',
    strategy: 'no_prefix',
    detectBrowserLanguage: {
      useCookie: true,
      cookieKey: 'i18n_locale',
      fallbackLocale: 'en',
    },
  },

  runtimeConfig: {
    adminSecret: process.env.ADMIN_SECRET || 'admin-secret-key',
    public: {
      apiBaseUrl: process.env.API_BASE_URL || 'http://localhost:3000',
    },
  },

  app: {
    // Served under /parent-helper-admin/ in production via nginx.
    // Set NUXT_APP_BASE_URL=/parent-helper-admin/ in env. Defaults to / for local dev.
    baseURL: process.env.NUXT_APP_BASE_URL || '/',
    head: {
      title: 'Prime Kids Admin',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      ],
      link: [
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,600;0,700;1,600;1,700&family=Commissioner:wght@300;400;500;600&display=swap',
        },
      ],
    },
  },
});
