<script setup>
import { ref } from 'vue';
import AppMenuItem from './AppMenuItem.vue';

function scrollTo(id) {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

const model = ref([
    {
        label: '分析看板',
        items: [
            { label: '组合总览', icon: 'pi pi-fw pi-chart-bar', to: '/' },
            { label: '皮肤排行', icon: 'pi pi-fw pi-list', command: () => scrollTo('ranking') },
            { label: '收入时间线', icon: 'pi pi-fw pi-chart-line', command: () => scrollTo('timeline') },
            { label: '证据覆盖', icon: 'pi pi-fw pi-shield', command: () => scrollTo('coverage') }
        ]
    },
    {
        label: '数据口径',
        items: [
            { label: '只读 SQLite', icon: 'pi pi-fw pi-lock', disabled: true },
            { label: '王者荣耀', icon: 'pi pi-fw pi-compass', disabled: true }
        ]
    }
]);
</script>

<template>
    <ul class="layout-menu">
        <template v-for="(item, i) in model" :key="item">
            <AppMenuItem v-if="!item.separator" :item="item" :index="i" />
            <li v-if="item.separator" class="menu-separator"></li>
        </template>
    </ul>
    <div class="sidebar-note">
        <i class="pi pi-info-circle"></i>
        <p><strong>证据优先</strong><span>缺失值保持为空，暂存批次不标为已发布。</span></p>
    </div>
</template>

<style scoped>
.sidebar-note {
    margin: 1.25rem 0.75rem 0.5rem;
    padding: 0.9rem;
    border: 1px solid var(--p-content-border-color);
    border-radius: 12px;
    background: var(--p-content-hover-background);
    display: flex;
    gap: 0.7rem;
    color: var(--p-text-muted-color);
}
.sidebar-note i {
    margin-top: 0.1rem;
    color: var(--p-primary-color);
}
.sidebar-note p {
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    font-size: 0.75rem;
    line-height: 1.4;
}
.sidebar-note strong {
    color: var(--p-text-color);
}
</style>
