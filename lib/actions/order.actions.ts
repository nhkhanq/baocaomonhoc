'use server';

import { isRedirectError } from 'next/dist/client/components/redirect';
import { convertToPlainObject, formatError } from '../utils';
import { auth } from '@/auth';
import { getMyCart } from './cart.actions';
import { getUserById } from './user.actions';
import { insertOrderSchema } from '../validators';
import { prisma } from '@/db/prisma';
import { CartItem, PaymentResult, ShippingAddress } from '@/types';
import { paypal } from '../paypal';
import { revalidatePath } from 'next/cache';
import { PAGE_SIZE } from '../constants';
import { Prisma } from '@prisma/client';
import { sendPurchaseReceipt } from '@/email';

// Tạo đơn hàng và tạo các mục đơn hàng
export async function createOrder() {
  try {
    const session = await auth();
    if (!session) throw new Error('Người dùng chưa được xác thực');

    const cart = await getMyCart();
    const userId = session?.user?.id;
    if (!userId) throw new Error('Không tìm thấy người dùng');

    const user = await getUserById(userId);

    if (!cart || cart.items.length === 0) {
      return {
        success: false,
        message: 'Giỏ hàng của bạn đang trống',
        redirectTo: '/cart',
      };
    }

    if (!user.address) {
      return {
        success: false,
        message: 'Không có địa chỉ giao hàng',
        redirectTo: '/shipping-address',
      };
    }

    if (!user.paymentMethod) {
      return {
        success: false,
        message: 'Không có phương thức thanh toán',
        redirectTo: '/payment-method',
      };
    }

    // Tạo đối tượng đơn hàng
    const order = insertOrderSchema.parse({
      userId: user.id,
      shippingAddress: user.address,
      paymentMethod: user.paymentMethod,
      itemsPrice: cart.itemsPrice,
      shippingPrice: cart.shippingPrice,
      taxPrice: cart.taxPrice,
      totalPrice: cart.totalPrice,
    });

    // Thực hiện giao dịch để tạo đơn hàng và các mục đơn hàng trong cơ sở dữ liệu
    const insertedOrderId = await prisma.$transaction(async (tx) => {
      // Tạo đơn hàng
      const insertedOrder = await tx.order.create({ data: order });
      // Tạo các mục đơn hàng từ các mục trong giỏ hàng
      for (const item of cart.items as CartItem[]) {
        await tx.orderItem.create({
          data: {
            ...item,
            price: item.price,
            orderId: insertedOrder.id,
          },
        });
      }
      // Xóa giỏ hàng
      await tx.cart.update({
        where: { id: cart.id },
        data: {
          items: [],
          totalPrice: 0,
          taxPrice: 0,
          shippingPrice: 0,
          itemsPrice: 0,
        },
      });

      return insertedOrder.id;
    });

    if (!insertedOrderId) throw new Error('Không tạo được đơn hàng');

    return {
      success: true,
      message: 'Đơn hàng đã được tạo thành công',
      redirectTo: `/order/${insertedOrderId}`,
    };
  } catch (error) {
    if (isRedirectError(error)) throw error;
    return { success: false, message: formatError(error) };
  }
}

// Lấy đơn hàng theo ID
export async function getOrderById(orderId: string) {
  const data = await prisma.order.findFirst({
    where: {
      id: orderId,
    },
    include: {
      orderitems: true,
      user: { select: { name: true, email: true } },
    },
  });

  return convertToPlainObject(data);
}

// Tạo đơn hàng PayPal mới
export async function createPayPalOrder(orderId: string) {
  try {
    // Lấy đơn hàng từ cơ sở dữ liệu
    const order = await prisma.order.findFirst({
      where: {
        id: orderId,
      },
    });

    if (order) {
      // Tạo đơn hàng PayPal
      const paypalOrder = await paypal.createOrder(Number(order.totalPrice));

      // Cập nhật đơn hàng với ID đơn hàng PayPal
      await prisma.order.update({
        where: { id: orderId },
        data: {
          paymentResult: {
            id: paypalOrder.id,
            email_address: '',
            status: '',
            pricePaid: 0,
          },
        },
      });

      return {
        success: true,
        message: 'Đơn hàng được tạo thành công',
        data: paypalOrder.id,
      };
    } else {
      throw new Error('Không tìm thấy đơn hàng');
    }
  } catch (error) {
    return { success: false, message: formatError(error) };
  }
}

// Phê duyệt đơn hàng PayPal và cập nhật đơn hàng thành đã thanh toán
export async function approvePayPalOrder(
  orderId: string,
  data: { orderID: string }
) {
  try {
    // Lấy đơn hàng từ cơ sở dữ liệu
    const order = await prisma.order.findFirst({
      where: {
        id: orderId,
      },
    });

    if (!order) throw new Error('Không tìm thấy đơn hàng');

    const captureData = await paypal.capturePayment(data.orderID);

    if (
      !captureData ||
      captureData.id !== (order.paymentResult as PaymentResult)?.id ||
      captureData.status !== 'COMPLETED'
    ) {
      throw new Error('Lỗi trong thanh toán PayPal');
    }

    // Cập nhật đơn hàng thành đã thanh toán
    await updateOrderToPaid({
      orderId,
      paymentResult: {
        id: captureData.id,
        status: captureData.status,
        email_address: captureData.payer.email_address,
        pricePaid:
          captureData.purchase_units[0]?.payments?.captures[0]?.amount?.value,
      },
    });

    revalidatePath(`/order/${orderId}`);

    return {
      success: true,
      message: 'Đơn hàng của bạn đã được thanh toán',
    };
  } catch (error) {
    return { success: false, message: formatError(error) };
  }
}

// Cập nhật đơn hàng thành đã thanh toán
export async function updateOrderToPaid({
  orderId,
  paymentResult,
}: {
  orderId: string;
  paymentResult?: PaymentResult;
}) {
  // Lấy đơn hàng từ cơ sở dữ liệu
  const order = await prisma.order.findFirst({
    where: {
      id: orderId,
    },
    include: {
      orderitems: true,
    },
  });

  if (!order) throw new Error('Không tìm thấy đơn hàng');

  if (order.isPaid) throw new Error('Đơn hàng đã được thanh toán rồi');

  // Thực hiện giao dịch để cập nhật đơn hàng và điều chỉnh tồn kho sản phẩm
  await prisma.$transaction(async (tx) => {
    // Duyệt qua các sản phẩm và cập nhật tồn kho
    for (const item of order.orderitems) {
      await tx.product.update({
        where: { id: item.productId },
        data: { stock: { increment: -item.qty } },
      });
    }

    // Đánh dấu đơn hàng là đã thanh toán
    await tx.order.update({
      where: { id: orderId },
      data: {
        isPaid: true,
        paidAt: new Date(),
        paymentResult,
      },
    });
  });

  // Lấy lại đơn hàng đã cập nhật sau giao dịch
  const updatedOrder = await prisma.order.findFirst({
    where: { id: orderId },
    include: {
      orderitems: true,
      user: { select: { name: true, email: true } },
    },
  });

  if (!updatedOrder) throw new Error('Không tìm thấy đơn hàng');

  sendPurchaseReceipt({
    order: {
      ...updatedOrder,
      shippingAddress: updatedOrder.shippingAddress as ShippingAddress,
      paymentResult: updatedOrder.paymentResult as PaymentResult,
    },
  });
}

// Lấy đơn hàng của người dùng
export async function getMyOrders({
  limit = PAGE_SIZE,
  page,
}: {
  limit?: number;
  page: number;
}) {
  const session = await auth();
  if (!session) throw new Error('Người dùng chưa được ủy quyền');

  const data = await prisma.order.findMany({
    where: { userId: session?.user?.id },
    orderBy: { createdAt: 'desc' },
    take: limit,
    skip: (page - 1) * limit,
  });

  const dataCount = await prisma.order.count({
    where: { userId: session?.user?.id },
  });

  return {
    data,
    totalPages: Math.ceil(dataCount / limit),
  };
}

type SalesDataType = {
  month: string;
  totalSales: number;
}[];

// Lấy dữ liệu doanh số và tổng hợp đơn hàng
export async function getOrderSummary() {
  // Lấy số lượng cho từng tài nguyên
  const ordersCount = await prisma.order.count();
  const productsCount = await prisma.product.count();
  const usersCount = await prisma.user.count();

  // Tính tổng doanh số
  const totalSales = await prisma.order.aggregate({
    _sum: { totalPrice: true },
  });

  // Lấy doanh số theo tháng
  const salesDataRaw = await prisma.$queryRaw<
    Array<{ month: string; totalSales: Prisma.Decimal }>
  >`SELECT to_char("createdAt", 'MM/YY') as "month", sum("totalPrice") as "totalSales" FROM "Order" GROUP BY to_char("createdAt", 'MM/YY')`;

  const salesData: SalesDataType = salesDataRaw.map((entry) => ({
    month: entry.month,
    totalSales: Number(entry.totalSales),
  }));

  // Lấy các đơn hàng mới nhất
  const latestSales = await prisma.order.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      user: { select: { name: true } },
    },
    take: 6,
  });

  return {
    ordersCount,
    productsCount,
    usersCount,
    totalSales,
    latestSales,
    salesData,
  };
}

// Lấy tất cả các đơn hàng
export async function getAllOrders({
  limit = PAGE_SIZE,
  page,
  query,
}: {
  limit?: number;
  page: number;
  query: string;
}) {
  const queryFilter: Prisma.OrderWhereInput =
    query && query !== 'all'
      ? {
          user: {
            name: {
              contains: query,
              mode: 'insensitive',
            } as Prisma.StringFilter,
          },
        }
      : {};

  const data = await prisma.order.findMany({
    where: {
      ...queryFilter,
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
    skip: (page - 1) * limit,
    include: { user: { select: { name: true } } },
  });

  const dataCount = await prisma.order.count();

  return {
    data,
    totalPages: Math.ceil(dataCount / limit),
  };
}

// Xóa đơn hàng
export async function deleteOrder(id: string) {
  try {
    await prisma.order.delete({ where: { id } });

    revalidatePath('/admin/orders');

    return {
      success: true,
      message: 'Đơn hàng đã được xóa thành công',
    };
  } catch (error) {
    return { success: false, message: formatError(error) };
  }
}

// Cập nhật đơn hàng COD thành đã thanh toán
export async function updateOrderToPaidCOD(orderId: string) {
  try {
    await updateOrderToPaid({ orderId });

    revalidatePath(`/order/${orderId}`);

    return {
      success: true,
      message: 'Đơn hàng đã được đánh dấu là đã thanh toán',
    };
  } catch (error) {
    return { success: false, message: formatError(error) };
  }
}

// Cập nhật đơn hàng COD thành đã giao
export async function deliverOrder(orderId: string) {
  try {
    const order = await prisma.order.findFirst({
      where: {
        id: orderId,
      },
    });

    if (!order) throw new Error('Không tìm thấy đơn hàng');
    if (!order.isPaid) throw new Error('Đơn hàng chưa được thanh toán');

    await prisma.order.update({
      where: { id: orderId },
      data: {
        isDelivered: true,
        deliveredAt: new Date(),
      },
    });

    revalidatePath(`/order/${orderId}`);

    return {
      success: true,
      message: 'Đơn hàng đã được đánh dấu là đã giao',
    };
  } catch (error) {
    return { success: false, message: formatError(error) };
  }
}
