import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { CacheService } from '../../infrastructure/cache/cache.service';
import {
    AnalyticsQueryDto,
    TimePeriod,
    TopProductsQueryDto,
    TopCustomersQueryDto,
} from './dto/analytics.dto';

@Injectable()
export class AnalyticsService {
    private readonly CACHE_TTL = 300; // 5 minutes

    constructor(
        private prisma: PrismaService,
        private cache: CacheService,
    ) { }

    /**
     * Get date range based on period
     */
    private getDateRange(period: TimePeriod, customStart?: string, customEnd?: string) {
        const now = new Date();
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        switch (period) {
            case TimePeriod.TODAY:
                return { startDate: startOfDay, endDate: new Date() };
            case TimePeriod.YESTERDAY:
                const yesterday = new Date(startOfDay);
                yesterday.setDate(yesterday.getDate() - 1);
                return { startDate: yesterday, endDate: startOfDay };
            case TimePeriod.LAST_7_DAYS:
                const sevenDaysAgo = new Date(startOfDay);
                sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
                return { startDate: sevenDaysAgo, endDate: new Date() };
            case TimePeriod.LAST_30_DAYS:
                const thirtyDaysAgo = new Date(startOfDay);
                thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
                return { startDate: thirtyDaysAgo, endDate: new Date() };
            case TimePeriod.LAST_90_DAYS:
                const ninetyDaysAgo = new Date(startOfDay);
                ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
                return { startDate: ninetyDaysAgo, endDate: new Date() };
            case TimePeriod.THIS_MONTH:
                const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
                return { startDate: firstDayOfMonth, endDate: new Date() };
            case TimePeriod.LAST_MONTH:
                const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
                return { startDate: lastMonthStart, endDate: lastMonthEnd };
            case TimePeriod.THIS_YEAR:
                const firstDayOfYear = new Date(now.getFullYear(), 0, 1);
                return { startDate: firstDayOfYear, endDate: new Date() };
            case TimePeriod.CUSTOM:
                if (!customStart || !customEnd) {
                    throw new Error('Custom period requires startDate and endDate');
                }
                return {
                    startDate: new Date(customStart),
                    endDate: new Date(customEnd),
                };
            default:
                const defaultStart = new Date(startOfDay);
                defaultStart.setDate(defaultStart.getDate() - 30);
                return { startDate: defaultStart, endDate: new Date() };
        }
    }

    /**
     * Get cached dashboard metric by name and period
     */
    private async getCachedMetric(
        metricName: string,
        startDate: Date,
        endDate: Date,
    ) {
        const cacheKey = `analytics:${metricName}:${startDate.getTime()}-${endDate.getTime()}`;
        const cached = await this.cache.get(cacheKey);

        if (cached) {
            return JSON.parse(cached);
        }

        // Try to get from DashboardMetric table
        const metric = await this.prisma.dashboardMetric.findFirst({
            where: {
                metricName,
                periodStart: { lte: startDate },
                periodEnd: { gte: endDate },
            },
            orderBy: {
                generatedAt: 'desc',
            },
        });

        if (metric) {
            // Cache the result
            await this.cache.set(cacheKey, metric.metricData, { ttl: this.CACHE_TTL });
            return metric.metricData;
        }

        return null;
    }

    /**
     * Get dashboard metrics from cached data
     */
    async getDashboardMetrics(query: AnalyticsQueryDto) {
        const { startDate, endDate } = this.getDateRange(
            query.period || TimePeriod.LAST_30_DAYS,
            query.startDate,
            query.endDate,
        );

        const cacheKey = `dashboard:metrics:${startDate.getTime()}-${endDate.getTime()}`;
        const cached = await this.cache.get(cacheKey);

        if (cached) {
            return JSON.parse(cached);
        }

        // Get metrics from DashboardMetric table or return empty structure
        const metricData = await this.getCachedMetric('dashboard_metrics', startDate, endDate);

        const result = {
            totalRevenue: metricData?.totalRevenue || 0,
            totalOrders: metricData?.totalOrders || 0,
            averageOrderValue: metricData?.averageOrderValue || 0,
            totalCustomers: metricData?.totalCustomers || 0,
            totalProducts: metricData?.totalProducts || 0,
            pendingOrders: metricData?.pendingOrders || 0,
            period: {
                startDate,
                endDate,
            },
            note: 'Data is aggregated from cached metrics. For real-time data, please check individual services.',
        };

        await this.cache.set(cacheKey, result, { ttl: this.CACHE_TTL });
        return result;
    }

    /**
     * Get revenue analytics from cached data
     */
    async getRevenueAnalytics(query: AnalyticsQueryDto) {
        const { startDate, endDate } = this.getDateRange(
            query.period || TimePeriod.LAST_30_DAYS,
            query.startDate,
            query.endDate,
        );

        const cacheKey = `analytics:revenue:${startDate.getTime()}-${endDate.getTime()}`;
        const cached = await this.cache.get(cacheKey);

        if (cached) {
            return JSON.parse(cached);
        }

        const metricData = await this.getCachedMetric('revenue_analytics', startDate, endDate);

        const result = {
            total: metricData?.total || 0,
            average: metricData?.average || 0,
            byStatus: metricData?.byStatus || [],
            daily: metricData?.daily || [],
            note: 'Data is aggregated from cached metrics.',
        };

        await this.cache.set(cacheKey, result, { ttl: this.CACHE_TTL });
        return result;
    }

    /**
     * Get order analytics from cached data
     */
    async getOrderAnalytics(query: AnalyticsQueryDto) {
        const { startDate, endDate } = this.getDateRange(
            query.period || TimePeriod.LAST_30_DAYS,
            query.startDate,
            query.endDate,
        );

        const cacheKey = `analytics:orders:${startDate.getTime()}-${endDate.getTime()}`;
        const cached = await this.cache.get(cacheKey);

        if (cached) {
            return JSON.parse(cached);
        }

        const metricData = await this.getCachedMetric('order_analytics', startDate, endDate);

        const result = {
            total: metricData?.total || 0,
            byStatus: metricData?.byStatus || [],
            daily: metricData?.daily || [],
            mostCommonStatus: metricData?.mostCommonStatus || null,
            note: 'Data is aggregated from cached metrics.',
        };

        await this.cache.set(cacheKey, result, { ttl: this.CACHE_TTL });
        return result;
    }

    /**
     * Get product analytics from cached data
     */
    async getProductAnalytics(query: AnalyticsQueryDto) {
        const cacheKey = `analytics:products:${Date.now()}`;
        const cached = await this.cache.get(cacheKey);

        if (cached) {
            return JSON.parse(cached);
        }

        const metricData = await this.getCachedMetric('product_analytics', new Date(0), new Date());

        const result = {
            totalProducts: metricData?.totalProducts || 0,
            lowStock: metricData?.lowStock || 0,
            outOfStock: metricData?.outOfStock || 0,
            topSelling: metricData?.topSelling || [],
            note: 'Data is aggregated from cached metrics.',
        };

        await this.cache.set(cacheKey, result, { ttl: this.CACHE_TTL });
        return result;
    }

    /**
     * Get customer analytics from cached data
     */
    async getCustomerAnalytics(query: AnalyticsQueryDto) {
        const cacheKey = `analytics:customers:${Date.now()}`;
        const cached = await this.cache.get(cacheKey);

        if (cached) {
            return JSON.parse(cached);
        }

        const metricData = await this.getCachedMetric('customer_analytics', new Date(0), new Date());

        const result = {
            totalCustomers: metricData?.totalCustomers || 0,
            newCustomers: metricData?.newCustomers || 0,
            activeCustomers: metricData?.activeCustomers || 0,
            highValueCustomers: metricData?.highValueCustomers || 0,
            note: 'Data is aggregated from cached metrics.',
        };

        await this.cache.set(cacheKey, result, { ttl: this.CACHE_TTL });
        return result;
    }

    /**
     * Get top products from cached data
     */
    async getTopProducts(query: TopProductsQueryDto) {
        const cacheKey = `analytics:top-products:${query.limit || 10}`;
        const cached = await this.cache.get(cacheKey);

        if (cached) {
            return JSON.parse(cached);
        }

        const metricData = await this.getCachedMetric('top_products', new Date(0), new Date());

        const result = {
            products: metricData?.products || [],
            limit: query.limit || 10,
            note: 'Data is aggregated from cached metrics.',
        };

        await this.cache.set(cacheKey, result, { ttl: this.CACHE_TTL });
        return result.products;
    }

    /**
     * Get top customers from cached data
     */
    async getTopCustomers(query: TopCustomersQueryDto) {
        const cacheKey = `analytics:top-customers:${query.limit || 10}`;
        const cached = await this.cache.get(cacheKey);

        if (cached) {
            return JSON.parse(cached);
        }

        const metricData = await this.getCachedMetric('top_customers', new Date(0), new Date());

        const result = {
            customers: metricData?.customers || [],
            limit: query.limit || 10,
            note: 'Data is aggregated from cached metrics.',
        };

        await this.cache.set(cacheKey, result, { ttl: this.CACHE_TTL });
        return result.customers;
    }

    /**
     * Get admin-specific analytics (local data only)
     */
    async getAdminAnalytics() {
        const cacheKey = 'analytics:admin:overview';
        const cached = await this.cache.get(cacheKey);

        if (cached) {
            return JSON.parse(cached);
        }

        const [totalVendors, pendingApprovals, totalSettlements, pendingSettlements, totalBanners] =
            await Promise.all([
                this.prisma.vendor.count(),
                this.prisma.productApproval.count({ where: { status: 'PENDING' } }),
                this.prisma.vendorSettlement.count(),
                this.prisma.vendorSettlement.count({ where: { status: 'PENDING' } }),
                this.prisma.banner.count({ where: { status: 'ACTIVE' } }),
            ]);

        const result = {
            vendors: {
                total: totalVendors,
                pendingApprovals,
            },
            settlements: {
                total: totalSettlements,
                pending: pendingSettlements,
            },
            content: {
                activeBanners: totalBanners,
            },
        };

        await this.cache.set(cacheKey, result, { ttl: this.CACHE_TTL });
        return result;
    }

    /**
     * Get comprehensive analytics combining cached and local data
     */
    async getComprehensiveAnalytics(query: AnalyticsQueryDto) {
        const { startDate, endDate } = this.getDateRange(
            query.period || TimePeriod.LAST_30_DAYS,
            query.startDate,
            query.endDate,
        );

        const [revenue, orders, products, customers, adminAnalytics] = await Promise.all([
            this.getRevenueAnalytics(query),
            this.getOrderAnalytics(query),
            this.getProductAnalytics(query),
            this.getCustomerAnalytics(query),
            this.getAdminAnalytics(),
        ]);

        return {
            period: { startDate, endDate },
            revenue,
            orders,
            products,
            customers,
            admin: adminAnalytics,
        };
    }

    /**
     * Refresh dashboard metrics (called by scheduled job or event consumer)
     */
    async refreshDashboardMetrics(metricName: string, periodStart: Date, periodEnd: Date, data: any) {
        try {
            // Check if metric exists
            const existingMetric = await this.prisma.dashboardMetric.findFirst({
                where: {
                    metricName,
                    periodStart: { lte: periodStart },
                    periodEnd: { gte: periodEnd },
                },
            });

            if (existingMetric) {
                // Update existing metric
                await this.prisma.dashboardMetric.update({
                    where: { id: existingMetric.id },
                    data: {
                        metricData: data,
                        generatedAt: new Date(),
                    },
                });
            } else {
                // Create new metric
                await this.prisma.dashboardMetric.create({
                    data: {
                        metricName,
                        periodStart,
                        periodEnd,
                        metricData: data,
                        generatedAt: new Date(),
                    },
                });
            }

            // Invalidate cache
            const cacheKey = `analytics:${metricName}:${periodStart.getTime()}-${periodEnd.getTime()}`;
            await this.cache.invalidatePattern(cacheKey);

            return { success: true };
        } catch (error) {
            console.error(`Failed to refresh dashboard metric ${metricName}:`, error);
            return { success: false, error: error.message };
        }
    }
}