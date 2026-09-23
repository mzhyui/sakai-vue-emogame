<script setup>
import { useLayout } from '@/layout/composables/layout';
import { DashboardService } from '@/service/DashboardService';
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue';

const { layoutConfig, isDarkTheme } = useLayout();

const payload = ref(null);
const loading = ref(true);
const error = ref('');
const rankingMetric = ref('emotion');
const hasInitializedPeriod = ref(false);
const themeVersion = ref(0);
let requestController = null;

const filters = reactive({
    search: '',
    hero_name: null,
    quality: null,
    emotion_coverage: 'all',
    cash_coverage: 'all',
    period: null
});

const coverageOptions = {
    emotion: [
        { label: '全部评分状态', value: 'all' },
        { label: '已有综合价值分', value: 'scored' },
        { label: '缺少综合价值分', value: 'missing' }
    ],
    cash: [
        { label: '全部现金状态', value: 'all' },
        { label: '已有现金记录', value: 'has_record' },
        { label: '缺少现金记录', value: 'missing' }
    ]
};

const rankingOptions = [
    { label: '综合价值分', value: 'emotion' },
    { label: '估算归因收入', value: 'cash' }
];

function parseDate(value) {
    if (!value) return null;
    const [year, month, day] = value.split('-').map(Number);
    return new Date(year, month - 1, day);
}

function formatDate(value) {
    if (!value) return '—';
    return new Intl.DateTimeFormat('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(parseDate(value));
}

function formatNumber(value, digits = 0) {
    if (value === null || value === undefined) return '—';
    return new Intl.NumberFormat('zh-CN', {
        minimumFractionDigits: digits,
        maximumFractionDigits: digits
    }).format(value);
}

function formatCurrency(value) {
    return value === null || value === undefined ? '—' : `CNY ${formatNumber(value, 2)}`;
}

function formatPercent(value) {
    return value === null || value === undefined ? '—' : `${formatNumber(value * 100, 1)}%`;
}

function queryFilters() {
    return {
        search: filters.search.trim(),
        hero_name: filters.hero_name,
        quality: filters.quality,
        emotion_coverage: filters.emotion_coverage,
        cash_coverage: filters.cash_coverage,
        period_start: filters.period?.[0] || null,
        period_end: filters.period?.[1] || null
    };
}

async function loadDashboard() {
    requestController?.abort();
    requestController = new AbortController();
    loading.value = true;
    error.value = '';

    try {
        const data = await DashboardService.getOverview(queryFilters(), requestController.signal);
        payload.value = data;
        if (!hasInitializedPeriod.value) {
            filters.period = [parseDate(data.scope.period_start), parseDate(data.scope.period_end)];
            hasInitializedPeriod.value = true;
        }
    } catch (reason) {
        if (reason.name !== 'AbortError') error.value = reason.message || '无法加载组合数据';
    } finally {
        loading.value = false;
    }
}

function resetFilters() {
    Object.assign(filters, {
        search: '',
        hero_name: null,
        quality: null,
        emotion_coverage: 'all',
        cash_coverage: 'all',
        period: null
    });
    hasInitializedPeriod.value = false;
    loadDashboard();
}

const metricCards = computed(() => {
    if (!payload.value) return [];
    const { kpis } = payload.value;
    return [
        {
            label: '归因收入合计',
            value: formatCurrency(kpis.cash_total_cny),
            note: `有 CNY 收入 ${kpis.cash_count}/${kpis.skin_count} 个皮肤 · 包含估算归因`,
            icon: 'pi pi-wallet',
            tone: 'blue'
        },
        {
            label: '平均综合价值分',
            value: formatNumber(kpis.score_average, 2),
            note: `有分值 ${kpis.score_count}/${kpis.skin_count} · 满分 100 · 观察值 + 目录估计`,
            icon: 'pi pi-sparkles',
            tone: 'violet'
        },
        {
            label: '有收入皮肤平均收入',
            value: formatCurrency(kpis.cash_average_cny),
            note: `分母：${kpis.cash_count} 个有数值的 CNY 收入皮肤`,
            icon: 'pi pi-chart-line',
            tone: 'amber'
        }
    ];
});

const rankingRows = computed(() => (payload.value?.rankings?.[rankingMetric.value] || []).map((row, index) => ({ ...row, rank: index + 1 })));

const chartPalette = computed(() => {
    themeVersion.value;
    const style = getComputedStyle(document.documentElement);
    return {
        primary: style.getPropertyValue('--p-primary-500').trim() || '#0f8f82',
        primarySoft: style.getPropertyValue('--p-primary-300').trim() || '#5eead4',
        text: style.getPropertyValue('--p-text-muted-color').trim() || '#64748b',
        border: style.getPropertyValue('--p-content-border-color').trim() || '#e2e8f0',
        amber: '#f59e0b'
    };
});

const qualityChartData = computed(() => ({
    labels: (payload.value?.quality_distribution || []).map((row) => row.quality),
    datasets: [
        {
            label: '皮肤数',
            data: (payload.value?.quality_distribution || []).map((row) => row.count),
            backgroundColor: chartPalette.value.primary,
            borderRadius: 6,
            borderSkipped: false,
            barThickness: 18
        }
    ]
}));

const qualityChartOptions = computed(() => ({
    indexAxis: 'y',
    maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: { displayColors: false } },
    scales: {
        x: {
            beginAtZero: true,
            ticks: { color: chartPalette.value.text, precision: 0 },
            grid: { color: chartPalette.value.border, drawBorder: false }
        },
        y: { ticks: { color: chartPalette.value.text }, grid: { display: false, drawBorder: false } }
    }
}));

const scatterChartData = computed(() => ({
    datasets: [
        {
            label: '皮肤',
            data: (payload.value?.scatter || []).map((row) => ({
                x: row.emotion_score,
                y: row.cash_attributed_revenue,
                label: `${row.hero_name} / ${row.skin_name}`,
                method: row.cash_method_label
            })),
            backgroundColor: chartPalette.value.primary,
            borderColor: chartPalette.value.primarySoft,
            pointRadius: 5,
            pointHoverRadius: 7
        }
    ]
}));

const scatterChartOptions = computed(() => ({
    maintainAspectRatio: false,
    plugins: {
        legend: { display: false },
        tooltip: {
            callbacks: {
                title: (items) => items[0]?.raw?.label || '',
                label: (item) => [`综合价值分：${item.raw.x}`, `归因收入：${formatCurrency(item.raw.y)}`, `归因：${item.raw.method || '无'}`]
            }
        }
    },
    scales: {
        x: {
            title: { display: true, text: '综合价值分', color: chartPalette.value.text },
            min: 0,
            max: 100,
            ticks: { color: chartPalette.value.text },
            grid: { color: chartPalette.value.border, drawBorder: false }
        },
        y: {
            title: { display: true, text: '估算归因收入 (CNY)', color: chartPalette.value.text },
            ticks: { color: chartPalette.value.text },
            grid: { color: chartPalette.value.border, drawBorder: false }
        }
    }
}));

function dateSequence(start, end) {
    if (!start || !end) return [];
    const days = [];
    const cursor = parseDate(start);
    const last = parseDate(end);
    while (cursor <= last) {
        const local = new Date(cursor.getTime() - cursor.getTimezoneOffset() * 60_000);
        days.push(local.toISOString().slice(0, 10));
        cursor.setDate(cursor.getDate() + 1);
    }
    return days;
}

const timelineCharts = computed(() => {
    const timeline = payload.value?.timeline || { releases: [], revenue: [] };
    const currencies = [...new Set(timeline.revenue.map((row) => row.currency || '未标注币种'))].sort();
    const groups = currencies.length ? currencies : [null];

    return groups.map((currency) => {
        const selectedRevenue = timeline.revenue.filter((row) => (row.currency || '未标注币种') === currency);
        const revenueByDate = selectedRevenue.reduce((result, row) => {
            result[row.revenue_date] = (result[row.revenue_date] || 0) + row.estimated_revenue;
            return result;
        }, {});
        const releasesByDate = timeline.releases.reduce((result, row) => {
            result[row.date] = (result[row.date] || 0) + 1;
            return result;
        }, {});
        const labels = dateSequence(payload.value.scope.period_start, payload.value.scope.period_end);

        return {
            currency,
            data: {
                labels,
                datasets: [
                    {
                        type: 'line',
                        label: `游戏收入 (${currency || '无收入数据'})`,
                        data: labels.map((date) => revenueByDate[date] ?? null),
                        borderColor: chartPalette.value.primary,
                        backgroundColor: `${chartPalette.value.primary}20`,
                        pointRadius: 0,
                        pointHoverRadius: 4,
                        borderWidth: 2,
                        tension: 0.25,
                        spanGaps: false,
                        yAxisID: 'yRevenue'
                    },
                    {
                        type: 'bar',
                        label: '筛选内上线皮肤',
                        data: labels.map((date) => releasesByDate[date] || 0),
                        backgroundColor: `${chartPalette.value.amber}B3`,
                        borderRadius: 3,
                        yAxisID: 'yRelease'
                    }
                ]
            },
            options: {
                maintainAspectRatio: false,
                interaction: { mode: 'index', intersect: false },
                plugins: {
                    legend: { position: 'bottom', labels: { color: chartPalette.value.text, usePointStyle: true } }
                },
                scales: {
                    x: {
                        ticks: { color: chartPalette.value.text, maxTicksLimit: 8, maxRotation: 0 },
                        grid: { display: false }
                    },
                    yRevenue: {
                        position: 'left',
                        ticks: { color: chartPalette.value.text },
                        grid: { color: chartPalette.value.border, drawBorder: false }
                    },
                    yRelease: {
                        position: 'right',
                        beginAtZero: true,
                        ticks: { color: chartPalette.value.text, precision: 0 },
                        grid: { display: false, drawBorder: false }
                    }
                }
            }
        };
    });
});

function scoreStatusLabel(status) {
    return (
        {
            full_observed: '完整观察',
            full_hybrid: '观察 + 估计',
            full_catalog_estimate: '目录估计'
        }[status] ||
        status ||
        '未标注'
    );
}

function scoreStatusSeverity(status) {
    return status === 'full_observed' ? 'success' : status === 'full_hybrid' ? 'info' : 'warn';
}

function cohortSeverity(status) {
    return status === 'released' ? 'success' : status === 'staged' ? 'warn' : 'secondary';
}

function cohortLabel(status) {
    return { released: '已发布', staged: '暂存', unavailable: '不可用' }[status] || status;
}

function handleGlobalRefresh() {
    loadDashboard();
}

watch([() => layoutConfig.primary, () => layoutConfig.surface, isDarkTheme], () => {
    themeVersion.value += 1;
});

onMounted(() => {
    loadDashboard();
    window.addEventListener('emogame:refresh', handleGlobalRefresh);
});

onBeforeUnmount(() => {
    requestController?.abort();
    window.removeEventListener('emogame:refresh', handleGlobalRefresh);
});
</script>

<template>
    <div class="dashboard-shell">
        <header class="dashboard-heading">
            <div>
                <div class="eyebrow"><span class="eyebrow-dot"></span> PORTFOLIO INTELLIGENCE</div>
                <h1>组合总览</h1>
                <p v-if="payload" class="heading-meta">
                    {{ payload.scope.game }} · {{ formatNumber(payload.kpis.skin_count) }} 个皮肤 · {{ formatNumber(payload.kpis.hero_count) }} 位英雄 · {{ formatDate(payload.scope.period_start) }} 至 {{ formatDate(payload.scope.period_end) }}
                </p>
                <p v-else class="heading-meta">王者荣耀皮肤价值与销售证据</p>
            </div>
            <div class="heading-actions">
                <Tag value="只读数据" severity="secondary" icon="pi pi-lock" rounded />
                <Button label="刷新" icon="pi pi-refresh" severity="secondary" outlined :loading="loading" @click="loadDashboard" />
            </div>
        </header>

        <Message v-if="error" severity="error" :closable="false" class="mb-6">
            <div class="flex items-center justify-between gap-4 w-full">
                <span>{{ error }}。请确认 FastAPI 已在 8000 端口运行。</span>
                <Button label="重试" size="small" severity="danger" outlined @click="loadDashboard" />
            </div>
        </Message>

        <section class="card filter-panel">
            <div class="filter-title">
                <div>
                    <span class="section-kicker">FILTERS</span>
                    <h2>筛选组合范围</h2>
                </div>
                <button type="button" class="text-action" @click="resetFilters">重置筛选</button>
            </div>
            <div class="filter-grid">
                <div class="filter-field filter-search">
                    <label for="skin-search">搜索</label>
                    <IconField>
                        <InputIcon class="pi pi-search" />
                        <InputText id="skin-search" v-model="filters.search" placeholder="英雄、皮肤或 Source key" class="w-full" @keyup.enter="loadDashboard" />
                    </IconField>
                </div>
                <div class="filter-field">
                    <label for="hero-filter">英雄</label>
                    <Select id="hero-filter" v-model="filters.hero_name" :options="payload?.filters.heroes || []" placeholder="全部英雄" filter showClear class="w-full" />
                </div>
                <div class="filter-field">
                    <label for="quality-filter">品质</label>
                    <Select id="quality-filter" v-model="filters.quality" :options="payload?.filters.qualities || []" placeholder="全部品质" filter showClear class="w-full" />
                </div>
                <div class="filter-field filter-period">
                    <label for="period-filter">分析期间</label>
                    <DatePicker id="period-filter" v-model="filters.period" selectionMode="range" dateFormat="yy-mm-dd" placeholder="开始日期 — 结束日期" showIcon showButtonBar class="w-full" />
                </div>
                <div class="filter-field">
                    <label for="score-filter">评分覆盖</label>
                    <Select id="score-filter" v-model="filters.emotion_coverage" :options="coverageOptions.emotion" optionLabel="label" optionValue="value" class="w-full" />
                </div>
                <div class="filter-field">
                    <label for="cash-filter">现金覆盖</label>
                    <Select id="cash-filter" v-model="filters.cash_coverage" :options="coverageOptions.cash" optionLabel="label" optionValue="value" class="w-full" />
                </div>
                <Button label="应用筛选" icon="pi pi-sliders-h" class="filter-submit" :loading="loading" @click="loadDashboard" />
            </div>
        </section>

        <div v-if="loading && !payload" class="grid grid-cols-12 gap-6">
            <div v-for="item in 3" :key="item" class="col-span-12 lg:col-span-4"><Skeleton height="10rem" borderRadius="16px" /></div>
            <div class="col-span-12 lg:col-span-6"><Skeleton height="25rem" borderRadius="16px" /></div>
            <div class="col-span-12 lg:col-span-6"><Skeleton height="25rem" borderRadius="16px" /></div>
        </div>

        <template v-else-if="payload">
            <Message severity="info" :closable="false" class="score-boundary">
                <div class="boundary-copy">
                    <i class="pi pi-info-circle"></i>
                    <div>
                        <strong>运营评分口径</strong><span>{{ payload.scope.score_note }}</span>
                    </div>
                </div>
            </Message>

            <section class="grid grid-cols-12 gap-6 metric-grid" aria-label="组合关键指标">
                <article v-for="metric in metricCards" :key="metric.label" class="col-span-12 lg:col-span-4 card metric-card">
                    <div :class="['metric-icon', `metric-icon--${metric.tone}`]"><i :class="metric.icon"></i></div>
                    <div class="metric-copy">
                        <span>{{ metric.label }}</span>
                        <strong>{{ metric.value }}</strong>
                        <small>{{ metric.note }}</small>
                    </div>
                </article>
            </section>

            <section class="grid grid-cols-12 gap-6">
                <article class="col-span-12 xl:col-span-5 card chart-card">
                    <div class="card-heading">
                        <div>
                            <span class="section-kicker">CATALOG MIX</span>
                            <h2>皮肤品质分布</h2>
                        </div>
                        <Tag :value="`${payload.kpis.skin_count} 个皮肤`" severity="secondary" rounded />
                    </div>
                    <Chart v-if="payload.quality_distribution.length" type="bar" :data="qualityChartData" :options="qualityChartOptions" class="quality-chart" />
                    <div v-else class="empty-state"><i class="pi pi-inbox"></i><span>当前筛选范围没有皮肤。</span></div>
                </article>

                <article class="col-span-12 xl:col-span-7 card chart-card">
                    <div class="card-heading">
                        <div>
                            <span class="section-kicker">VALUE × CASH</span>
                            <h2>综合价值分 × 估算现金价值</h2>
                        </div>
                        <Tag :value="`双值覆盖 ${payload.scatter.length}/${payload.kpis.skin_count}`" severity="info" rounded />
                    </div>
                    <Chart v-if="payload.scatter.length" type="scatter" :data="scatterChartData" :options="scatterChartOptions" class="scatter-chart" />
                    <div v-else class="empty-state"><i class="pi pi-chart-scatter"></i><span>没有同时具有综合价值分与 CNY 收入的皮肤。</span></div>
                </article>
            </section>

            <section id="ranking" class="card ranking-card">
                <div class="card-heading ranking-heading">
                    <div>
                        <span class="section-kicker">TOP 20</span>
                        <h2>皮肤排行</h2>
                        <p>显示评分状态、现金置信度与归因方法，缺失值不参与对应排行。</p>
                    </div>
                    <SelectButton v-model="rankingMetric" :options="rankingOptions" optionLabel="label" optionValue="value" :allowEmpty="false" />
                </div>
                <DataTable :value="rankingRows" dataKey="source_key" stripedRows responsiveLayout="scroll" class="ranking-table">
                    <Column field="rank" header="排名" style="width: 5rem">
                        <template #body="slotProps"
                            ><span :class="['rank-badge', { 'rank-badge--top': slotProps.index < 3 }]">{{ slotProps.index + 1 }}</span></template
                        >
                    </Column>
                    <Column header="皮肤" style="min-width: 13rem">
                        <template #body="slotProps">
                            <div class="skin-name">
                                <strong>{{ slotProps.data.skin_name }}</strong
                                ><span>{{ slotProps.data.hero_name }} · {{ slotProps.data.quality || '未标注品质' }}</span>
                            </div>
                        </template>
                    </Column>
                    <Column field="emotion_score" header="综合价值分" sortable style="min-width: 8rem">
                        <template #body="slotProps"
                            ><strong>{{ formatNumber(slotProps.data.emotion_score) }}</strong></template
                        >
                    </Column>
                    <Column header="评分状态" style="min-width: 9rem">
                        <template #body="slotProps"><Tag :value="scoreStatusLabel(slotProps.data.emotion_score_status)" :severity="scoreStatusSeverity(slotProps.data.emotion_score_status)" rounded /></template>
                    </Column>
                    <Column field="cash_attributed_revenue" header="归因收入 (CNY)" sortable style="min-width: 11rem">
                        <template #body="slotProps">{{ formatCurrency(slotProps.data.cash_attributed_revenue) }}</template>
                    </Column>
                    <Column header="现金置信度" style="min-width: 8rem">
                        <template #body="slotProps">{{ formatPercent(slotProps.data.cash_confidence) }}</template>
                    </Column>
                    <Column field="cash_method_label" header="归因方法" style="min-width: 10rem" />
                    <Column field="source_key" header="Source key" style="min-width: 8rem">
                        <template #body="slotProps"
                            ><code>{{ slotProps.data.source_key }}</code></template
                        >
                    </Column>
                    <template #empty><div class="empty-table">当前筛选指标没有可用数值，排行留空。</div></template>
                </DataTable>
            </section>

            <section id="timeline" class="card timeline-card">
                <div class="card-heading">
                    <div>
                        <span class="section-kicker">RELEASE CONTEXT</span>
                        <h2>上线事件与游戏收入时间线</h2>
                        <p>收入是全游戏背景数据；橙色柱只统计当前筛选范围内的皮肤上线事件。</p>
                    </div>
                    <Tag :value="`${payload.timeline.releases.length} 个上线事件`" severity="secondary" rounded />
                </div>
                <template v-if="payload.timeline.releases.length || payload.timeline.revenue.length">
                    <div v-for="chart in timelineCharts" :key="chart.currency || 'empty'" class="timeline-chart-wrap">
                        <Chart type="line" :data="chart.data" :options="chart.options" class="timeline-chart" />
                    </div>
                </template>
                <div v-else class="empty-state"><i class="pi pi-calendar-times"></i><span>当前分析期间没有收入时间序列或上线事件。</span></div>
            </section>

            <section id="coverage" class="grid grid-cols-12 gap-6">
                <article class="col-span-12 xl:col-span-7 card coverage-card">
                    <div class="card-heading">
                        <div>
                            <span class="section-kicker">DATA COVERAGE</span>
                            <h2>覆盖与缺口</h2>
                        </div>
                        <Tag value="缺失值不填零" severity="secondary" rounded />
                    </div>
                    <div class="coverage-list">
                        <div class="coverage-row">
                            <div>
                                <span>综合价值分覆盖</span><strong>{{ formatPercent(payload.summary.scored_rate) }}</strong>
                            </div>
                            <ProgressBar :value="payload.summary.scored_rate * 100" :showValue="false" />
                            <small>{{ payload.summary.scored_count }}/{{ payload.summary.total_skins }} 个皮肤</small>
                        </div>
                        <div class="coverage-row">
                            <div>
                                <span>现金记录覆盖</span><strong>{{ formatPercent(payload.summary.cash_rate) }}</strong>
                            </div>
                            <ProgressBar :value="payload.summary.cash_rate * 100" :showValue="false" />
                            <small>{{ payload.summary.cash_count }}/{{ payload.summary.total_skins }} 个皮肤</small>
                        </div>
                        <div class="coverage-row">
                            <div>
                                <span>评分与现金同时覆盖</span><strong>{{ formatPercent(payload.summary.evidence_completeness_rate) }}</strong>
                            </div>
                            <ProgressBar :value="payload.summary.evidence_completeness_rate * 100" :showValue="false" />
                            <small>用于双值比较的完整记录比例</small>
                        </div>
                    </div>
                    <div class="gap-grid">
                        <div>
                            <i class="pi pi-wallet"></i><strong>{{ payload.summary.coverage_gaps.missing_cash }}</strong
                            ><span>缺现金记录</span>
                        </div>
                        <div>
                            <i class="pi pi-image"></i><strong>{{ payload.summary.coverage_gaps.missing_image }}</strong
                            ><span>缺主图</span>
                        </div>
                        <div>
                            <i class="pi pi-sparkles"></i><strong>{{ payload.summary.coverage_gaps.missing_emotion }}</strong
                            ><span>缺综合价值分</span>
                        </div>
                        <div>
                            <i class="pi pi-calendar"></i><strong>{{ payload.summary.coverage_gaps.invalid_online_date }}</strong
                            ><span>上线日期无效</span>
                        </div>
                    </div>
                </article>

                <article class="col-span-12 xl:col-span-5 card evidence-card">
                    <div class="card-heading">
                        <div>
                            <span class="section-kicker">EVIDENCE STATE</span>
                            <h2>情绪证据批次</h2>
                        </div>
                        <Tag :value="cohortLabel(payload.summary.emotion_cohort_release_status)" :severity="cohortSeverity(payload.summary.emotion_cohort_release_status)" rounded />
                    </div>
                    <div class="run-id">
                        <span>RUN ID</span><code>{{ payload.summary.emotion_cohort_run_id || 'unavailable' }}</code>
                    </div>
                    <dl class="evidence-facts">
                        <div>
                            <dt>批次评分</dt>
                            <dd>{{ payload.summary.emotion_cohort_scored_count }}/{{ payload.summary.emotion_cohort_size }}</dd>
                        </div>
                        <div>
                            <dt>观察窗口</dt>
                            <dd>{{ formatDate(payload.summary.emotion_observation_start) }} — {{ formatDate(payload.summary.emotion_observation_end) }}</dd>
                        </div>
                        <div>
                            <dt>目录运营评分</dt>
                            <dd>{{ payload.summary.catalog_scored_count }}/{{ payload.summary.catalog_size }}</dd>
                        </div>
                    </dl>
                    <div class="audit-note">
                        <i class="pi pi-shield"></i>
                        <p><strong>证据边界</strong><span>批次状态与运营评分覆盖分别展示。暂存批次不会被界面升级为已发布或外部验证结果。</span></p>
                    </div>
                </article>
            </section>
        </template>
    </div>
</template>

<style scoped>
.dashboard-shell {
    max-width: 1680px;
    margin: 0 auto;
}
.dashboard-heading {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 2rem;
    margin-bottom: 1.75rem;
}
.dashboard-heading h1 {
    margin: 0.35rem 0 0.5rem;
    font-size: clamp(2rem, 3vw, 2.8rem);
    line-height: 1;
    letter-spacing: -0.045em;
    color: var(--p-text-color);
}
.eyebrow,
.section-kicker {
    font-size: 0.7rem;
    font-weight: 800;
    letter-spacing: 0.16em;
    color: var(--p-primary-color);
}
.eyebrow {
    display: flex;
    align-items: center;
    gap: 0.55rem;
}
.eyebrow-dot {
    width: 0.5rem;
    height: 0.5rem;
    border-radius: 999px;
    background: var(--p-primary-color);
    box-shadow: 0 0 0 0.3rem color-mix(in srgb, var(--p-primary-color) 14%, transparent);
}
.heading-meta {
    margin: 0;
    color: var(--p-text-muted-color);
    font-size: 0.95rem;
}
.heading-actions {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    flex-shrink: 0;
}
.filter-panel {
    margin-bottom: 1.5rem;
    padding: 1.35rem 1.5rem;
}
.filter-title,
.card-heading {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 1rem;
}
.filter-title {
    margin-bottom: 1.25rem;
}
.filter-title h2,
.card-heading h2 {
    margin: 0.28rem 0 0;
    font-size: 1.2rem;
    letter-spacing: -0.02em;
}
.card-heading {
    margin-bottom: 1.25rem;
}
.card-heading p {
    margin: 0.4rem 0 0;
    color: var(--p-text-muted-color);
    font-size: 0.86rem;
    line-height: 1.5;
}
.text-action {
    padding: 0.3rem;
    border: 0;
    background: transparent;
    color: var(--p-primary-color);
    font: inherit;
    font-weight: 650;
    cursor: pointer;
}
.filter-grid {
    display: grid;
    grid-template-columns: minmax(14rem, 1.5fr) repeat(2, minmax(10rem, 1fr)) minmax(17rem, 1.35fr);
    gap: 1rem;
    align-items: end;
}
.filter-field {
    display: flex;
    flex-direction: column;
    gap: 0.45rem;
}
.filter-field label {
    font-size: 0.75rem;
    font-weight: 700;
    color: var(--p-text-muted-color);
}
.filter-submit {
    height: 2.75rem;
}
.score-boundary {
    margin-bottom: 1.5rem;
    border-radius: 14px;
}
.boundary-copy {
    display: flex;
    align-items: center;
    gap: 0.85rem;
}
.boundary-copy > i {
    font-size: 1.2rem;
}
.boundary-copy div {
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
}
.boundary-copy span {
    opacity: 0.86;
    font-size: 0.84rem;
}
.metric-grid {
    margin-bottom: 1.5rem;
}
.metric-card {
    display: flex;
    align-items: flex-start;
    gap: 1rem;
    margin-bottom: 0;
    min-height: 10rem;
    padding: 1.5rem;
    position: relative;
    overflow: hidden;
}
.metric-card::after {
    content: '';
    position: absolute;
    inset: auto -2.5rem -3.5rem auto;
    width: 8rem;
    height: 8rem;
    border-radius: 999px;
    background: color-mix(in srgb, var(--p-primary-color) 7%, transparent);
}
.metric-icon {
    width: 3rem;
    height: 3rem;
    border-radius: 12px;
    display: grid;
    place-items: center;
    flex: 0 0 auto;
    font-size: 1.2rem;
}
.metric-icon--blue {
    background: #e0f2fe;
    color: #0284c7;
}
.metric-icon--violet {
    background: #ede9fe;
    color: #7c3aed;
}
.metric-icon--amber {
    background: #fef3c7;
    color: #d97706;
}
:global(.app-dark) .metric-icon--blue {
    background: rgb(14 165 233 / 0.14);
}
:global(.app-dark) .metric-icon--violet {
    background: rgb(139 92 246 / 0.14);
}
:global(.app-dark) .metric-icon--amber {
    background: rgb(245 158 11 / 0.14);
}
.metric-copy {
    display: flex;
    flex-direction: column;
    min-width: 0;
}
.metric-copy > span {
    color: var(--p-text-muted-color);
    font-size: 0.85rem;
    font-weight: 650;
}
.metric-copy strong {
    margin: 0.45rem 0 0.65rem;
    font-size: clamp(1.45rem, 2vw, 2rem);
    letter-spacing: -0.035em;
    white-space: nowrap;
}
.metric-copy small {
    color: var(--p-text-muted-color);
    line-height: 1.45;
}
.chart-card {
    min-height: 29rem;
}
.quality-chart,
.scatter-chart {
    height: 22rem;
}
.ranking-card,
.timeline-card {
    margin-top: 1.5rem;
}
.ranking-heading {
    align-items: center;
}
.skin-name {
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
}
.skin-name span {
    color: var(--p-text-muted-color);
    font-size: 0.78rem;
}
.rank-badge {
    display: inline-grid;
    place-items: center;
    width: 2rem;
    height: 2rem;
    border-radius: 999px;
    background: var(--p-content-hover-background);
    font-weight: 750;
}
.rank-badge--top {
    color: var(--p-primary-contrast-color);
    background: var(--p-primary-color);
    box-shadow: 0 0.3rem 1rem color-mix(in srgb, var(--p-primary-color) 25%, transparent);
}
code {
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 0.78rem;
    color: var(--p-primary-color);
}
.timeline-chart {
    height: 24rem;
}
.timeline-chart-wrap + .timeline-chart-wrap {
    margin-top: 1.5rem;
    padding-top: 1.5rem;
    border-top: 1px solid var(--p-content-border-color);
}
.coverage-card,
.evidence-card {
    margin-top: 1.5rem;
}
.coverage-list {
    display: grid;
    gap: 1.25rem;
}
.coverage-row > div {
    display: flex;
    justify-content: space-between;
    margin-bottom: 0.55rem;
    font-size: 0.88rem;
}
.coverage-row small {
    display: block;
    margin-top: 0.45rem;
    color: var(--p-text-muted-color);
}
.coverage-row :deep(.p-progressbar) {
    height: 0.55rem;
    border-radius: 999px;
}
.gap-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 0.8rem;
    margin-top: 1.5rem;
    padding-top: 1.5rem;
    border-top: 1px solid var(--p-content-border-color);
}
.gap-grid > div {
    padding: 1rem;
    border: 1px solid var(--p-content-border-color);
    border-radius: 12px;
    background: var(--p-content-hover-background);
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 0.25rem 0.65rem;
    align-items: center;
}
.gap-grid i {
    grid-row: span 2;
    color: var(--p-primary-color);
}
.gap-grid strong {
    font-size: 1.2rem;
}
.gap-grid span {
    color: var(--p-text-muted-color);
    font-size: 0.75rem;
}
.run-id {
    padding: 1rem;
    border: 1px dashed var(--p-content-border-color);
    border-radius: 12px;
    background: var(--p-content-hover-background);
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
}
.run-id span {
    font-size: 0.65rem;
    letter-spacing: 0.14em;
    color: var(--p-text-muted-color);
    font-weight: 800;
}
.evidence-facts {
    margin: 1.25rem 0;
    display: grid;
    gap: 0.8rem;
}
.evidence-facts div {
    display: flex;
    justify-content: space-between;
    gap: 1rem;
    padding-bottom: 0.8rem;
    border-bottom: 1px solid var(--p-content-border-color);
}
.evidence-facts dt {
    color: var(--p-text-muted-color);
}
.evidence-facts dd {
    margin: 0;
    font-weight: 650;
    text-align: right;
}
.audit-note {
    padding: 1rem;
    display: flex;
    gap: 0.8rem;
    border-radius: 12px;
    color: #92400e;
    background: #fffbeb;
    border: 1px solid #fde68a;
}
:global(.app-dark) .audit-note {
    color: #fcd34d;
    background: rgb(120 53 15 / 0.16);
    border-color: rgb(217 119 6 / 0.35);
}
.audit-note i {
    margin-top: 0.1rem;
}
.audit-note p {
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
    line-height: 1.45;
}
.audit-note span {
    font-size: 0.82rem;
}
.empty-state {
    height: 20rem;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.8rem;
    color: var(--p-text-muted-color);
    border: 1px dashed var(--p-content-border-color);
    border-radius: 12px;
}
.empty-state i {
    font-size: 2rem;
    opacity: 0.55;
}
.empty-table {
    padding: 2rem;
    color: var(--p-text-muted-color);
    text-align: center;
}

@media (max-width: 1280px) {
    .filter-grid {
        grid-template-columns: repeat(3, minmax(0, 1fr));
    }
    .filter-search,
    .filter-period {
        grid-column: span 2;
    }
}

@media (max-width: 768px) {
    .dashboard-heading,
    .ranking-heading {
        align-items: flex-start;
        flex-direction: column;
    }
    .heading-actions {
        width: 100%;
        justify-content: space-between;
    }
    .filter-grid {
        grid-template-columns: 1fr;
    }
    .filter-search,
    .filter-period {
        grid-column: auto;
    }
    .filter-submit {
        width: 100%;
    }
    .gap-grid {
        grid-template-columns: repeat(2, 1fr);
    }
    .ranking-heading :deep(.p-selectbutton) {
        width: 100%;
        display: flex;
    }
    .ranking-heading :deep(.p-togglebutton) {
        flex: 1;
    }
}
</style>
