import { Injectable, Logger } from '@nestjs/common';
import { CacheService } from '../../infrastructure/cache/cache.service';
import { EventPublisherService } from '../../events/event-publisher.service';
import {
    DashboardKPIsDto,
    SalesTrendsDto,
    RevenueTrendsDto,
    KPIResponse,
    SalesTrendsResponse,
    AlertSummary,
    TrendDataPoint,
    TimePeriod,
} from './dto/dashboard.dto';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class DashboardService {
    private readonly logger = new Logger(DashboardService.name);

    // Cache TTL configuration (in seconds)
    private readonly CACHE_TTL = {
        KPIS: 300, // 5 minutes
        TRENDS: 600, // 10 minutes
        ALERTS: 60, // 1 minute
    };

    // Microservice URLs from environment
    private readonly ORDER_SERVICE = process.env.ORDER_SERVICE_URL || 'http://localhost:8003';
    private readonly PRODUCT_SERVICE = process.env.PRODUCT_SERVICE_URL || 'http://localhost:8002';
    private readonly CUSTOMER_SERVICE = process.env.CUSTOMER_SERVICE_URL || 'http://localhost:8006';
    private readonly INVENTORY_SERVICE = process.env.INVENTORY_SERVICE_URL || 'http://localhost:8004';
    private readonly PAYMENT_SERVICE = process.env.PAYMENT_SERVICE_URL || 'http://localhost:8005';

    constructor(
        private readonly cacheService: CacheService,
        private readonly eventPublisher: EventPublisherService,
        private readonly httpService: HttpService,
        private readonly auditService: AuditService,
    ) { }

    /**
     * Get comprehensive KPIs for dashboard
     */
    async getKPIs(dto: DashboardKPIsDto, adminId: string): Promise<KPIResponse> {
        this.logger.log(`Fetching KPIs for period: ${dto.period}`);
        const { startDate, endDate } = this.getDateRange(dto.period, dto.startDate, dto.endDate);
        const cacheKey = `dashboard:kpi:${dto.period}:${startDate}:${endDate}`;

        // Try cache first
        const cached = await this.cacheService.get(cacheKey);
        if (cached) {
            this.logger.debug(`KPIs cache hit for key: ${cacheKey}`);
            return JSON.parse(cached as string);
        }

        // Aggregate KPIs from multiple sources
        const [orders, products, customers, inventory] = await Promise.allSettled([
            this.getOrderKPIS(startDate, endDate),
            this.getProductKPIS(),
            this.getCustomerKPIS(startDate, endDate),
            this.getInventoryKPIS(),
        ]);

        const orderData = orders.status === 'fulfilled' ? orders.value : this.getDefaultOrderKPI();
        const productData = products.status === 'fulfilled' ? products.value : this.getDefaultProductKPI();
        const customerData = customers.status === 'fulfilled' ? customers.value : this.getDefaultCustomerKPI();
        const inventoryData = inventory.status === 'fulfilled' ? inventory.value : this.getDefaultInventoryKPI();

        const kpis: KPIResponse = {
            totalOrders: orderData.totalOrders,
            totalRevenue: orderData.totalRevenue,
            averageOrderValue: orderData.averageOrderValue,
            activeCustomers: customerData.activeCustomers,
            activeProducts: productData.activeProducts,
            pendingApprovals: productData.pendingApprovals,
            lowStockAlerts: inventoryData.lowStockAlerts,
            ordersByStatus: orderData.ordersByStatus,
            revenueByCategory: orderData.revenueByCategory,
            topProducts: orderData.topProducts,
            growth: await this.calculateGrowth(orderData, customerData, startDate, endDate),
        };

        // Cache with proper options
        await this.cacheService.set(cacheKey, JSON.stringify(kpis), { ttl: this.CACHE_TTL.KPIS });

        // Log audit
        await this.auditService.createLog({
            adminId,
            action: 'dashboard.kpi.viewed',
            resourceType: 'dashboard',
            resourceId: 'kpi',
            metadata: { period: dto.period, startDate, endDate },
        });

        return kpis;
    }

    /**
     * Get sales trends over time
     */
    async getSalesTrends(dto: SalesTrendsDto, adminId: string): Promise<SalesTrendsResponse> {
        this.logger.log(`Fetching sales trends for period: ${dto.period}`);
        const { startDate, endDate } = this.getDateRange(dto.period, dto.startDate, dto.endDate);
        const cacheKey = `dashboard:trends:sales:${dto.period}:${startDate}:${endDate}`;

        // Try cache first
        const cached = await this.cacheService.get(cacheKey);
        if (cached) {
            this.logger.debug(`Sales trends cache hit for key: ${cacheKey}`);
            return JSON.parse(cached as string);
        }

        // Fetch from Order Service
        const trendData = await this.fetchOrderTrends(startDate, endDate);

        const response: SalesTrendsResponse = {
            data: trendData,
            totalOrders: trendData.reduce((sum, point) => sum + point.orders, 0),
            totalRevenue: trendData.reduce((sum, point) => sum + point.revenue, 0),
            growthRate: await this.calculateTrendGrowth(trendData, startDate, endDate),
        };

        // Cache with proper options
        await this.cacheService.set(cacheKey, JSON.stringify(response), { ttl: this.CACHE_TTL.TRENDS });

        // Log audit
        await this.auditService.createLog({
            adminId,
            action: 'dashboard.trends.viewed',
            resourceType: 'dashboard',
            resourceId: 'trends',
            metadata: { period: dto.period, startDate, endDate },
        });

        return response;
    }

    /**
     * Get revenue trends
     */
    async getRevenueTrends(dto: RevenueTrendsDto, adminId: string): Promise<SalesTrendsResponse> {
        this.logger.log(`Fetching revenue trends for period: ${dto.period}`);
        const { startDate, endDate } = this.getDateRange(dto.period, dto.startDate, dto.endDate);
        const cacheKey = `dashboard:trends:revenue:${dto.period}:${dto.groupBy || 'daily'}:${startDate}:${endDate}`;

        // Try cache first
        const cached = await this.cacheService.get(cacheKey);
        if (cached) {
            this.logger.debug(`Revenue trends cache hit for key: ${cacheKey}`);
            return JSON.parse(cached as string);
        }

        // Fetch from Order Service with grouping
        const trendData = await this.fetchRevenueTrends(startDate, endDate, dto.groupBy || 'daily');

        const response: SalesTrendsResponse = {
            data: trendData,
            totalOrders: trendData.reduce((sum, point) => sum + point.orders, 0),
            totalRevenue: trendData.reduce((sum, point) => sum + point.revenue, 0),
            growthRate: await this.calculateTrendGrowth(trendData, startDate, endDate),
        };

        // Cache with proper options
        await this.cacheService.set(cacheKey, JSON.stringify(response), { ttl: this.CACHE_TTL.TRENDS });

        // Log audit
        await this.auditService.createLog({
            adminId,
            action: 'dashboard.revenue.viewed',
            resourceType: 'dashboard',
            resourceId: 'revenue',
            metadata: { period: dto.period, groupBy: dto.groupBy, startDate, endDate },
        });

        return response;
    }

    /**
     * Get alert summary
     */
    async getAlertSummary(adminId: string): Promise<AlertSummary> {
        this.logger.log('Fetching alert summary');
        const cacheKey = 'dashboard:alerts:summary';

        // Try cache first
        const cached = await this.cacheService.get(cacheKey);
        if (cached) {
            this.logger.debug('Alerts cache hit');
            return JSON.parse(cached as string);
        }

        // Fetch alerts from multiple sources
        const [lowStock, pendingApprovals, paymentFailures, orderIssues] = await Promise.allSettled([
            this.getLowStockAlerts(),
            this.getPendingApprovalAlerts(),
            this.getPaymentFailureAlerts(),
            this.getOrderIssueAlerts(),
        ]);

        const summary: AlertSummary = {
            total: (lowStock.status === 'fulfilled' ? lowStock.value : 0) +
                (pendingApprovals.status === 'fulfilled' ? pendingApprovals.value : 0) +
                (paymentFailures.status === 'fulfilled' ? paymentFailures.value : 0) +
                (orderIssues.status === 'fulfilled' ? orderIssues.value : 0),
            lowStock: lowStock.status === 'fulfilled' ? lowStock.value : 0,
            pendingApprovals: pendingApprovals.status === 'fulfilled' ? pendingApprovals.value : 0,
            paymentFailures: paymentFailures.status === 'fulfilled' ? paymentFailures.value : 0,
            orderIssues: orderIssues.status === 'fulfilled' ? orderIssues.value : 0,
            critical: await this.getCriticalAlertCount(),
        };

        // Cache with proper options
        await this.cacheService.set(cacheKey, JSON.stringify(summary), { ttl: this.CACHE_TTL.ALERTS });

        return summary;
    }

    // ========== Private Helper Methods ==========

    /**
     * Get date range based on period
     */
    private getDateRange(period: TimePeriod, startDate?: string, endDate?: string): { startDate: string; endDate: string } {
        const now = new Date();
        const end = endDate ? new Date(endDate) : now;
        let start: Date;

        switch (period) {
            case TimePeriod.TODAY:
                start = new Date(now.setHours(0, 0, 0, 0));
                break;
            case TimePeriod.YESTERDAY:
                start = new Date(now.setDate(now.getDate() - 1));
                start.setHours(0, 0, 0, 0);
                end.setHours(23, 59, 59, 999);
                break;
            case TimePeriod.LAST_7_DAYS:
                start = new Date(now.setDate(now.getDate() - 7));
                break;
            case TimePeriod.LAST_30_DAYS:
                start = new Date(now.setDate(now.getDate() - 30));
                break;
            case TimePeriod.THIS_MONTH:
                start = new Date(now.getFullYear(), now.getMonth(), 1);
                break;
            case TimePeriod.LAST_MONTH:
                start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                break;
            case TimePeriod.THIS_YEAR:
                start = new Date(now.getFullYear(), 0, 1);
                break;
            case TimePeriod.CUSTOM:
                if (!startDate) {
                    throw new Error('startDate is required when period is custom');
                }
                start = new Date(startDate);
                break;
            default:
                start = new Date(now.setDate(now.getDate() - 7));
        }

        return {
            startDate: start.toISOString(),
            endDate: end.toISOString(),
        };
    }

    /**
     * Fetch order KPIs from Order Service via HTTP
     */
    private async getOrderKPIS(startDate: string, endDate: string): Promise<any> {
        try {
            const response = await firstValueFrom(
                this.httpService.get(`${this.ORDER_SERVICE}/api/v1/admin/orders/kpis`, {
                    params: { startDate, endDate },
                    timeout: 5000,
                }),
            );

            const data = response.data.data || {};
            return {
                totalOrders: data.totalOrders || 0,
                totalRevenue: data.totalRevenue || 0,
                averageOrderValue: data.averageOrderValue || 0,
                ordersByStatus: data.ordersByStatus || {},
                revenueByCategory: data.revenueByCategory || {},
                topProducts: data.topProducts || [],
            };
        } catch (error) {
            this.logger.error('Error fetching order KPIs:', error);
            return this.getDefaultOrderKPI();
        }
    }

    /**
     * Fetch product KPIs from Product Service via HTTP
     */
    private async getProductKPIS(): Promise<any> {
        try {
            const response = await firstValueFrom(
                this.httpService.get(`${this.PRODUCT_SERVICE}/api/v1/products`, {
                    timeout: 5000,
                }),
            );

            const products = response.data.data || [];
            const activeProducts = products.filter((p: any) => p.status === 'ACTIVE').length;
            const pendingApprovals = products.filter((p: any) => p.status === 'PENDING').length;

            return { activeProducts, pendingApprovals };
        } catch (error) {
            this.logger.error('Error fetching product KPIs:', error);
            return this.getDefaultProductKPI();
        }
    }

    /**
     * Fetch customer KPIs from Customer Service via HTTP
     */
    private async getCustomerKPIS(startDate: string, endDate: string): Promise<any> {
        try {
            const response = await firstValueFrom(
                this.httpService.get(`${this.CUSTOMER_SERVICE}/api/v1/customers`, {
                    params: { startDate, endDate },
                    timeout: 5000,
                }),
            );

            const customers = response.data.data || [];
            const activeCustomers = customers.length;

            return { activeCustomers };
        } catch (error) {
            this.logger.error('Error fetching customer KPIs:', error);
            return this.getDefaultCustomerKPI();
        }
    }

    /**
     * Fetch inventory KPIs from Inventory Service via HTTP
     */
    private async getInventoryKPIS(): Promise<any> {
        try {
            const response = await firstValueFrom(
                this.httpService.get(`${this.INVENTORY_SERVICE}/api/v1/inventory/alerts`, {
                    timeout: 5000,
                }),
            );

            const alerts = response.data.data || [];
            const lowStockAlerts = alerts.filter((a: any) => a.type === 'LOW_STOCK').length;

            return { lowStockAlerts };
        } catch (error) {
            this.logger.error('Error fetching inventory KPIs:', error);
            return this.getDefaultInventoryKPI();
        }
    }

    /**
     * Fetch order trends from Order Service via HTTP
     */
    private async fetchOrderTrends(startDate: string, endDate: string): Promise<TrendDataPoint[]> {
        try {
            const response = await firstValueFrom(
                this.httpService.get(`${this.ORDER_SERVICE}/api/v1/admin/orders/trends`, {
                    params: { startDate, endDate },
                    timeout: 5000,
                }),
            );

            return response.data.data || [];
        } catch (error) {
            this.logger.error('Error fetching order trends:', error);
            return [];
        }
    }

    /**
     * Fetch revenue trends with grouping via HTTP
     */
    private async fetchRevenueTrends(startDate: string, endDate: string, groupBy: string): Promise<TrendDataPoint[]> {
        try {
            const response = await firstValueFrom(
                this.httpService.get(`${this.ORDER_SERVICE}/api/v1/admin/orders/revenue-trends`, {
                    params: { startDate, endDate, groupBy },
                    timeout: 5000,
                }),
            );

            return response.data.data || [];
        } catch (error) {
            this.logger.error('Error fetching revenue trends:', error);
            return [];
        }
    }

    /**
     * Calculate growth metrics
     */
    private async calculateGrowth(orderData: any, customerData: any, startDate: string, endDate: string): Promise<{
        ordersGrowth: number;
        revenueGrowth: number;
        customersGrowth: number;
    }> {
        // Compare with previous period
        const start = new Date(startDate);
        const end = new Date(endDate);
        const periodLength = end.getTime() - start.getTime();

        const prevStartDate = new Date(start.getTime() - periodLength);
        const prevEndDate = start;

        try {
            const prevOrders = await this.getOrderKPIS(prevStartDate.toISOString(), prevEndDate.toISOString());
            const prevCustomers = await this.getCustomerKPIS(prevStartDate.toISOString(), prevEndDate.toISOString());

            const ordersGrowth = prevOrders.totalOrders > 0
                ? ((orderData.totalOrders - prevOrders.totalOrders) / prevOrders.totalOrders) * 100
                : 0;

            const revenueGrowth = prevOrders.totalRevenue > 0
                ? ((orderData.totalRevenue - prevOrders.totalRevenue) / prevOrders.totalRevenue) * 100
                : 0;

            const customersGrowth = prevCustomers.activeCustomers > 0
                ? ((customerData.activeCustomers - prevCustomers.activeCustomers) / prevCustomers.activeCustomers) * 100
                : 0;

            return { ordersGrowth, revenueGrowth, customersGrowth };
        } catch (error) {
            this.logger.error('Error calculating growth:', error);
            return { ordersGrowth: 0, revenueGrowth: 0, customersGrowth: 0 };
        }
    }

    /**
     * Calculate trend growth
     */
    private async calculateTrendGrowth(trendData: TrendDataPoint[], startDate: string, endDate: string): Promise<number> {
        if (trendData.length < 2) return 0;

        const first = trendData[0];
        const last = trendData[trendData.length - 1];

        return last.revenue > 0 ? ((last.revenue - first.revenue) / first.revenue) * 100 : 0;
    }

    /**
     * Get low stock alerts
     */
    private async getLowStockAlerts(): Promise<number> {
        try {
            const response = await firstValueFrom(
                this.httpService.get(`${this.INVENTORY_SERVICE}/api/v1/inventory/alerts?type=LOW_STOCK`, {
                    timeout: 5000,
                }),
            );
            return response.data.data?.length || 0;
        } catch (error) {
            return 0;
        }
    }

    /**
     * Get pending approval alerts
     */
    private async getPendingApprovalAlerts(): Promise<number> {
        try {
            const response = await firstValueFrom(
                this.httpService.get(`${this.PRODUCT_SERVICE}/api/v1/products?status=PENDING`, {
                    timeout: 5000,
                }),
            );
            return response.data.data?.length || 0;
        } catch (error) {
            return 0;
        }
    }

    /**
     * Get payment failure alerts
     */
    private async getPaymentFailureAlerts(): Promise<number> {
        try {
            const response = await firstValueFrom(
                this.httpService.get(`${this.PAYMENT_SERVICE}/api/v1/payments?status=FAILED`, {
                    timeout: 5000,
                }),
            );
            return response.data.data?.length || 0;
        } catch (error) {
            return 0;
        }
    }

    /**
     * Get order issue alerts
     */
    private async getOrderIssueAlerts(): Promise<number> {
        try {
            const response = await firstValueFrom(
                this.httpService.get(`${this.ORDER_SERVICE}/api/v1/orders?status=ISSUE`, {
                    timeout: 5000,
                }),
            );
            return response.data.data?.length || 0;
        } catch (error) {
            return 0;
        }
    }

    /**
     * Get critical alert count
     */
    private async getCriticalAlertCount(): Promise<number> {
        // Count critical alerts (e.g., severely low stock, payment failures > threshold)
        try {
            const [lowStock, paymentFailures] = await Promise.allSettled([
                this.getLowStockAlerts(),
                this.getPaymentFailureAlerts(),
            ]);

            const criticalCount = (lowStock.status === 'fulfilled' && lowStock.value > 10 ? lowStock.value : 0) +
                (paymentFailures.status === 'fulfilled' && paymentFailures.value > 5 ? paymentFailures.value : 0);

            return criticalCount;
        } catch (error) {
            return 0;
        }
    }

    // ========== Default Methods ==========

    private getDefaultOrderKPI() {
        return {
            totalOrders: 0,
            totalRevenue: 0,
            averageOrderValue: 0,
            ordersByStatus: {},
            revenueByCategory: {},
            topProducts: [],
        };
    }

    private getDefaultProductKPI() {
        return {
            activeProducts: 0,
            pendingApprovals: 0,
        };
    }

    private getDefaultCustomerKPI() {
        return {
            activeCustomers: 0,
        };
    }

    private getDefaultInventoryKPI() {
        return {
            lowStockAlerts: 0,
        };
    }
}