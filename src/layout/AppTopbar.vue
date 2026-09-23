<script setup>
import { useLayout } from '@/layout/composables/layout';
import AppConfigurator from './AppConfigurator.vue';

const { toggleMenu, toggleDarkMode, isDarkTheme } = useLayout();

function refreshDashboard() {
    window.dispatchEvent(new Event('emogame:refresh'));
}
</script>

<template>
    <div class="layout-topbar">
        <div class="layout-topbar-logo-container">
            <button class="layout-menu-button layout-topbar-action" aria-label="切换导航" @click="toggleMenu">
                <i class="pi pi-bars"></i>
            </button>
            <router-link to="/" class="layout-topbar-logo" aria-label="EmoGame 首页">
                <span class="brand-mark"><i class="pi pi-bolt"></i></span>
                <span class="brand-copy"><strong>EMOGAME</strong><small>VALUE INTELLIGENCE</small></span>
            </router-link>
        </div>

        <div class="layout-topbar-actions">
            <div class="topbar-status"><span></span> LOCAL DATA</div>
            <button type="button" class="layout-topbar-action" aria-label="刷新数据" title="刷新数据" @click="refreshDashboard">
                <i class="pi pi-refresh"></i>
            </button>
            <button type="button" class="layout-topbar-action" :aria-label="isDarkTheme ? '切换浅色主题' : '切换深色主题'" @click="toggleDarkMode">
                <i :class="['pi', { 'pi-moon': isDarkTheme, 'pi-sun': !isDarkTheme }]"></i>
            </button>
            <div class="relative">
                <button
                    v-styleclass="{ selector: '@next', enterFromClass: 'hidden', enterActiveClass: 'p-anchored-overlay-enter-active', leaveToClass: 'hidden', leaveActiveClass: 'p-anchored-overlay-leave-active', hideOnOutsideClick: true }"
                    type="button"
                    class="layout-topbar-action layout-topbar-action-highlight"
                    aria-label="主题设置"
                >
                    <i class="pi pi-palette"></i>
                </button>
                <AppConfigurator />
            </div>
        </div>
    </div>
</template>

<style scoped>
.brand-mark {
    width: 2.5rem;
    height: 2.5rem;
    border-radius: 11px;
    display: grid;
    place-items: center;
    color: var(--p-primary-contrast-color);
    background: linear-gradient(145deg, var(--p-primary-400), var(--p-primary-700));
    box-shadow: 0 0.45rem 1rem color-mix(in srgb, var(--p-primary-color) 22%, transparent);
}
.brand-copy {
    display: flex;
    flex-direction: column;
    line-height: 1;
    gap: 0.25rem;
}
.brand-copy strong {
    font-size: 1.08rem;
    letter-spacing: 0.08em;
}
.brand-copy small {
    color: var(--p-text-muted-color);
    font-size: 0.52rem;
    letter-spacing: 0.12em;
    font-weight: 700;
}
.topbar-status {
    display: flex;
    align-items: center;
    gap: 0.45rem;
    padding: 0.45rem 0.7rem;
    border: 1px solid var(--p-content-border-color);
    border-radius: 999px;
    color: var(--p-text-muted-color);
    font-size: 0.65rem;
    letter-spacing: 0.1em;
    font-weight: 750;
}
.topbar-status span {
    width: 0.45rem;
    height: 0.45rem;
    border-radius: 999px;
    background: #22c55e;
    box-shadow: 0 0 0 0.2rem rgb(34 197 94 / 0.14);
}
@media (max-width: 640px) {
    .brand-copy small,
    .topbar-status {
        display: none;
    }
}
</style>
