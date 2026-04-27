import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import {
    AnalyticsQueryDto,
    TimePeriod,
    TopProductsQueryDto,
    TopCustomersQueryDto,
} from './dto/analytics.dto';

@Injectable()
export class AnalyticsService {
    constructor(private prisma: PrismaService) { }

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
     * Get dashboard metrics
     */
    async getDashboardMetrics(query: AnalyticsQueryDto) {
        const { startDate, endDate } = this.getDateRange(
            query.period || TimePeriod.LAST_30_DAYS,
            query.startDate,
            query.endDate,
        );

        const [totalRevenue, totalOrders, totalCustomers, totalProducts, pendingOrders] =
            await Promise.all([
                this.prisma.order.aggregate({
                    _sum: { totalAmount: true },
                    where: {
                        createdAt: { gte: startDate, lte: endDate },
                        status: { in: ['completed', 'paid'] },
                    },
                }),
                this.prisma.order.count({
                    where: { createdAt: { gte: startDate, lte: endDate } },
                }),
                this.prisma.customer.count({
                    where: { createdAt: { gte: startDate, lte: endDate } },
                }),
                this.prisma.product.count(),
                this.prisma.order.count({
                    where: { status: 'pending' },
                }),
            ]);

        const averageOrderValue =
            totalOrders > 0
                ? (totalRevenue._sum.totalAmount || 0) / totalOrders
                : 0;

        return {
            totalRevenue: totalRevenue._sum.totalAmount || 0,
            totalOrders,
            averageOrderValue,
            totalCustomers,
            totalProducts,
            pendingOrders,
            period: {
                startDate,
                endDate,
            },
        };
    }

    /**
     * Get revenue analytics
     */
    async getRevenueAnalytics(query: AnalyticsQueryDto) {
        const { startDate, endDate } = this.getDateRange(
            query.period || TimePeriod.LAST_30_DAYS,
            query.startDate,
            query.endDate,
        );

        const [totalRevenue, revenueByStatus, dailyRevenue] = await Promise.all([
            this.prisma.order.aggregate({
                _sum: { totalAmount: true },
                _avg: { totalAmount: true },
                where: {
                    createdAt: { gte: startDate, lte: endDate },
                    status: { in: ['completed', 'paid'] },
                },
            }),
            this.prisma.order.groupBy({
                by: ['status'],
                _sum: { totalAmount: true },
                _count: true,
                where: {
                    createdAt: { gte: startDate, lte: endDate },
                },
            }),
            this.prisma.$queryRaw`
                SELECT 
                    DATE(created_at) as date,
                    SUM(total_amount) as revenue,
                    COUNT(*) as orders
                FROM orders
                WHERE created_at >= ${startDate} AND created_at <= ${endDate}
                    AND status IN ('completed', 'paid')
                GROUP BY DATE(created_at)
                ORDER BY date ASC
            `,
        ]);

        return {
            total: totalRevenue._sum.totalAmount || 0,
            average: totalRevenue._avg.totalAmount || 0,
            byStatus: revenueByStatus,
            daily: dailyRevenue,
        };
    }

    /**
     * Get order analytics
     */
    async getOrderAnalytics(query: AnalyticsQueryDto) {
        const { startDate, endDate } = this.getDateRange(
            query.period || TimePeriod.LAST_30_DAYS,
            query.startDate,
            query.endDate,
        );

        const [totalOrders, ordersByStatus, dailyOrders, topStatus] = await Promise.all([
            this.prisma.order.count({
                where: { createdAt: { gte: startDate, lte: endDate } },
            }),
            this.prisma.order.groupBy({
                by: ['status'],
                _count: true,
                _sum: { totalAmount: true },
                where: {
                    createdAt: { gte: startDate, lte: endDate },
                },
            }),
            this.prisma.$queryRaw`
                SELECT 
                    DATE(created_at) as date,
                    COUNT(*) as orders,
                    SUM(total_amount) as revenue
                FROM orders
                WHERE created_at >= ${startDate} AND created_at <= ${endDate}
                GROUP BY DATE(created_at)
                ORDER BY date ASC
            `,
            this.prisma.order.groupBy({
                by: ['status'],
                _count: true,
                orderBy: { _count: { status: 'desc' } },
                take: 1,
                where: {
                    createdAt: { gte: startDate, lte: endDate },
                },
            }),
        ]);

        return {
            total: totalOrders,
            byStatus: ordersByStatus,
            daily: dailyOrders,
            mostCommonStatus: topStatus[0]?.status || null,
        };
    }

    /**
     * Get product analytics
     */
    async getProductAnalytics(query: AnalyticsQueryDto) {
        const { startDate, endDate } = this.getDateRange(
            query.period || TimePeriod.LAST_30_DAYS,
            query.startDate,
            query.endDate,
        );

        const [totalProducts, lowStock, outOfStock, topSelling] = await Promise.all([
            this.prisma.product.count(),
            this.prisma.inventory.count({ where: { isLowStock: true } }),
            this.prisma.inventory.count({ where: { stockLevel: 0 } }),
            this.prisma.orderItem.groupBy({
                by: ['productId'],
                _sum: { quantity: true },
                orderBy: { _sum: { quantity: 'desc' } },
                take: 10,
                where: {
                    order: {
                        createdAt: { gte: startDate, lte: endDate },
                        status: { in: ['completed', 'paid'] },
                    },
                },
            }),
        ]);

        // Get product details for top selling
        const topProductIds = topSelling.map((item) => item.productId);
        const topProducts = await this.prisma.product.findMany({
            where: { id: { in: topProductIds } },
            select: {
                id: true,
                name: true,
                sku: true,
                price: true,
            },
        });

        const topSellingWithDetails = topSelling.map((item) => ({
            ...item,
            product: topProducts.find((p) => p.id === item.productId),
        }));

        return {
            totalProducts,
            lowStock,
            outOfStock,
            topSelling: topSellingWithDetails,
        };
    }

    /**
     * Get customer analytics
     */
    async getCustomerAnalytics(query: AnalyticsQueryDto) {
        const { startDate, endDate } = this.getDateRange(
            query.period || TimePeriod.LAST_30_DAYS,
            query.startDate,
            query.endDate,
        );

        const [totalCustomers, newCustomers, activeCustomers, highValueCustomers] =
            await Promise.all([
                this.prisma.customer.count(),
                this.prisma.customer.count({
                    where: { createdAt: { gte: startDate, lte: endDate } },
                }),
                this.prisma.customer.count({
                    where: {
                        totalOrders: { gt: 0 },
                    },
                }),
                this.prisma.customer.count({
                    where: {
                        totalSpent: { gte: 1000 },
                    },
                }),
            ]);

        return {
            totalCustomers,
            newCustomers,
            activeCustomers,
            highValueCustomers,
        };
    }

    /**
     * Get top products
     */
    async getTopProducts(query: TopProductsQueryDto) {
        const limit = query.limit || 10;
        const startDate = query.startDate ? new Date(query.startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const endDate = query.endDate ? new Date(query.endDate) : new Date();

        const topProducts = await this.prisma.orderItem.groupBy({
            by: ['productId'],
            _sum: { quantity: true, price: true },
            orderBy: { _sum: { quantity: 'desc' } },
            take: limit,
            where: {
                order: {
                    createdAt: { gte: startDate, lte: endDate },
                    status: { in: ['completed', 'paid'] },
                },
            },
        });

        const productIds = topProducts.map((item) => item.productId);
        const products = await this.prisma.product.findMany({
            where: { id: { in: productIds } },
            select: {
                id: true,
                name: true,
                sku: true,
                category: true,
                price: true,
                images: true,
            },
        });

        return topProducts.map((item) => ({
            ...item,
            product: products.find((p) => p.id === item.productId),
        }));
    }

    /**
     * Get top customers
     */
    async getTopCustomers(query: TopCustomersQueryDto) {
        const limit = query.limit || 10;
        const startDate = query.startDate ? new Date(query.startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const endDate = query.endDate ? new Date(query.endDate) : new Date();

        const topCustomers = await this.prisma.customer.findMany({
            orderBy: { totalSpent: 'desc' },
            take: limit,
            where: {
                createdAt: { gte: startDate, lte: endDate },
            },
            select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                totalOrders: true,
                totalSpent: true,
                createdAt: true,
            },
        });

        return topCustomers;
    }

    /**
     * Get comprehensive analytics
     */
    async getComprehensiveAnalytics(query: AnalyticsQueryDto) {
        const { startDate, endDate } = this.getDateRange(
            query.period || TimePeriod.LAST_30_DAYS,
            query.startDate,
            query.endDate,
        );

        const [revenue, orders, products, customers] = await Promise.all([
            this.getRevenueAnalytics(query),
            this.getOrderAnalytics(query),
            this.getProductAnalytics(query),
            this.getCustomerAnalytics(query),
        ]);

        return {
            period: { startDate, endDate },
            revenue,
            orders,
            products,
            customers,
        };
    }
}