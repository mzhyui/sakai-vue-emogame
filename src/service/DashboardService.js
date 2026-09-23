const API_BASE = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');

function toDateParam(value) {
    if (!value) return null;
    if (typeof value === 'string') return value.slice(0, 10);

    const local = new Date(value.getTime() - value.getTimezoneOffset() * 60_000);
    return local.toISOString().slice(0, 10);
}

export const DashboardService = {
    async getOverview(filters = {}, signal) {
        const url = new URL(`${API_BASE}/api/dashboard/overview`, window.location.origin);

        Object.entries(filters).forEach(([key, value]) => {
            if (value === null || value === undefined || value === '' || value === 'all') return;
            url.searchParams.set(key, value instanceof Date ? toDateParam(value) : String(value));
        });

        const response = await fetch(url, {
            headers: { Accept: 'application/json' },
            signal
        });
        if (!response.ok) {
            const body = await response.json().catch(() => ({}));
            throw new Error(body.detail || `数据接口返回 ${response.status}`);
        }
        return response.json();
    }
};
