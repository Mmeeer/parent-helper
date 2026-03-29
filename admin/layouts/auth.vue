<template>
  <div class="min-h-screen bg-ink-50 flex items-center justify-center font-sans relative overflow-hidden">
    <div class="absolute -top-48 -right-48 w-96 h-96 bg-nest-500/5 rounded-full blur-3xl pointer-events-none"></div>
    <div class="absolute -bottom-48 -left-48 w-96 h-96 bg-nest-200/20 rounded-full blur-3xl pointer-events-none"></div>
    <div class="relative w-full max-w-sm px-4">
      <div class="text-center mb-8">
        <div class="w-12 h-12 rounded-2xl bg-nest-500 flex items-center justify-center mx-auto mb-4 shadow-lg">
          <svg class="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5L12 1zm-2 16l-3.5-3.5 1.41-1.41L10 14.17l5.59-5.59L17 10l-7 7z"/></svg>
        </div>
        <h1 class="font-display font-bold text-2xl text-ink-900">Prime Kids</h1>
        <p class="text-[10px] text-ink-400 tracking-widest uppercase mt-1">Admin Console</p>
      </div>
      <slot />
    </div>
  </div>
</template>
