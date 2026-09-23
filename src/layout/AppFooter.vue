<template>
    <div class="layout-footer">
        <span>EmoGame · 皮肤价值与销售证据工作台</span>
        <span class="footer-separator">·</span>
        <span class="footer-muted">Vue 3 + PrimeVue / Sakai</span>
    </div>
</template>

<style scoped>
.footer-muted {
    color: var(--p-text-muted-color);
}
@media (max-width: 640px) {
    .layout-footer {
        flex-direction: column;
        text-align: center;
    }
    .footer-separator {
        display: none;
    }
}
</style>
