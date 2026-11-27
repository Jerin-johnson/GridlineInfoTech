import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, Types } from 'mongoose';
import { Order, OrderDocument } from '../orders/schemas/order.schema';
import { AdminCustomerQueryDto } from './dto/admin-customer-query.dto';
import { UpdateCustomerStatusDto } from './dto/update-customer-status.dto';
import { User, UserDocument } from './schemas/user.schema';

@Injectable()
export class AdminCustomersService {
  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
    @InjectModel(Order.name)
    private readonly orderModel: Model<OrderDocument>,
  ) {}

  async findAllCustomers(query: AdminCustomerQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 15;
    const skip = (page - 1) * limit;

    const filter: FilterQuery<UserDocument> = {
      role: 'customer',
    };

    if (query.status === 'active') {
      filter.isActive = true;
    } else if (query.status === 'inactive') {
      filter.isActive = false;
    }

    if (query.search?.trim()) {
      const escaped = query.search
        .trim()
        .replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escaped, 'i');
      filter.$or = [
        { firstName: regex },
        { lastName: regex },
        { email: regex },
      ];
    }

    const sortOrder = query.sortOrder === 'asc' ? 1 : -1;
    const sortBy = query.sortBy ?? 'createdAt';

    const [total, users] = await Promise.all([
      this.userModel.countDocuments(filter).exec(),
      this.userModel
        .find(filter)
        .select(
          'firstName lastName email phone avatar isActive isEmailVerified authProvider role lastLoginAt createdAt updatedAt',
        )
        .sort({ [sortBy]: sortOrder, _id: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
    ]);

    const userIds = users.map((u) => u._id);
    const orderStatsMap = new Map<
      string,
      { orderCount: number; totalSpending: number }
    >();

    if (userIds.length > 0) {
      const agg = await this.orderModel
        .aggregate<{
          _id: Types.ObjectId;
          orderCount: number;
          totalSpending: number;
        }>([
          { $match: { user: { $in: userIds } } },
          {
            $group: {
              _id: '$user',
              orderCount: { $sum: 1 },
              totalSpending: {
                $sum: {
                  $cond: [
                    { $ne: ['$fulfilmentStatus', 'cancelled'] },
                    '$totalAmount',
                    0,
                  ],
                },
              },
            },
          },
        ])
        .exec();

      for (const row of agg) {
        orderStatsMap.set(row._id.toString(), {
          orderCount: row.orderCount,
          totalSpending: row.totalSpending,
        });
      }
    }

    const data = users.map((u) => {
      const id = u._id.toString();
      const stats = orderStatsMap.get(id) ?? {
        orderCount: 0,
        totalSpending: 0,
      };
      return {
        ...this.formatCustomer(u),
        orderCount: stats.orderCount,
        totalSpending: stats.totalSpending,
      };
    });

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: total === 0 ? 0 : Math.ceil(total / limit),
      },
    };
  }

  async findCustomerById(customerId: string) {
    if (!Types.ObjectId.isValid(customerId)) {
      throw new BadRequestException('Invalid customer ID format');
    }

    const customer = await this.userModel
      .findOne({ _id: new Types.ObjectId(customerId), role: 'customer' })
      .select(
        'firstName lastName email phone avatar isActive isEmailVerified authProvider role addresses lastLoginAt createdAt updatedAt',
      )
      .exec();

    if (!customer) {
      throw new NotFoundException(`Customer with ID '${customerId}' not found`);
    }

    const orders = await this.orderModel
      .find({ user: customer._id })
      .select(
        'orderNumber fulfilmentStatus paymentStatus paymentMethod totalAmount currency items createdAt',
      )
      .sort({ createdAt: -1 })
      .exec();

    let completedOrders = 0;
    let cancelledOrders = 0;
    let pendingOrders = 0;
    let totalSpending = 0;

    for (const order of orders) {
      if (order.fulfilmentStatus === 'delivered') {
        completedOrders += 1;
      } else if (order.fulfilmentStatus === 'cancelled') {
        cancelledOrders += 1;
      } else {
        pendingOrders += 1;
      }
      if (order.fulfilmentStatus !== 'cancelled') {
        totalSpending += order.totalAmount ?? 0;
      }
    }

    return {
      customer: {
        ...this.formatCustomer(customer),
        addresses: customer.addresses ?? [],
      },
      orderStats: {
        totalOrders: orders.length,
        completedOrders,
        cancelledOrders,
        pendingOrders,
        totalSpending,
        mostRecentOrderAt: orders[0]?.createdAt ?? null,
      },
      orders: orders.map((order) => ({
        _id: order._id.toString(),
        orderNumber: order.orderNumber,
        fulfilmentStatus: order.fulfilmentStatus,
        paymentStatus: order.paymentStatus,
        paymentMethod: order.paymentMethod,
        totalAmount: order.totalAmount,
        currency: order.currency,
        itemCount:
          order.items?.reduce((sum, item) => sum + item.quantity, 0) ?? 0,
        createdAt: order.createdAt,
      })),
    };
  }

  async updateCustomerStatus(customerId: string, dto: UpdateCustomerStatusDto) {
    if (!Types.ObjectId.isValid(customerId)) {
      throw new BadRequestException('Invalid customer ID format');
    }

    const updated = await this.userModel
      .findOneAndUpdate(
        { _id: new Types.ObjectId(customerId), role: 'customer' },
        { $set: { isActive: dto.isActive } },
        { new: true },
      )
      .select(
        'firstName lastName email phone avatar isActive isEmailVerified authProvider role lastLoginAt createdAt updatedAt',
      )
      .exec();

    if (!updated) {
      throw new NotFoundException(`Customer with ID '${customerId}' not found`);
    }

    return this.formatCustomer(updated);
  }

  private formatCustomer(user: UserDocument) {
    return {
      _id: user._id.toString(),
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone,
      avatar: user.avatar,
      authProvider: user.authProvider,
      role: user.role,
      isActive: user.isActive,
      isEmailVerified: user.isEmailVerified,
      lastLoginAt: user.lastLoginAt ?? null,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
