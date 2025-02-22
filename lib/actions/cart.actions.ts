'use server';

import { cookies } from 'next/headers';
import { CartItem } from '@/types';
import { convertToPlainObject, formatError, round2 } from '../utils';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';
import { cartItemSchema, insertCartSchema } from '../validators';
import { revalidatePath } from 'next/cache';
import { Prisma } from '@prisma/client';

// Tính toán giá giỏ hàng
const calcPrice = (items: CartItem[]) => {
  const itemsPrice = round2(
      items.reduce((acc, item) => acc + Number(item.price) * item.qty, 0)
    ),
    shippingPrice = round2(itemsPrice > 50 ? 0 : 2),
    taxPrice = round2(0.15 * itemsPrice),
    totalPrice = round2(itemsPrice + taxPrice + shippingPrice);

  return {
    itemsPrice: itemsPrice.toFixed(2),
    shippingPrice: shippingPrice.toFixed(2),
    taxPrice: taxPrice.toFixed(2),
    totalPrice: totalPrice.toFixed(2),
  };
};

export async function addItemToCart(data: CartItem) {
  try {
    // Kiểm tra cookie giỏ hàng
    const sessionCartId = (await cookies()).get('sessionCartId')?.value;
    if (!sessionCartId) throw new Error('Không tìm thấy phiên giỏ hàng');

    // Lấy phiên và ID người dùng
    const session = await auth();
    const userId = session?.user?.id ? (session.user.id as string) : undefined;

    // Lấy giỏ hàng
    const cart = await getMyCart();

    // Phân tích và xác thực sản phẩm
    const item = cartItemSchema.parse(data);

    // Tìm sản phẩm trong cơ sở dữ liệu
    const product = await prisma.product.findFirst({
      where: { id: item.productId },
    });
    if (!product) throw new Error('Không tìm thấy sản phẩm');

    if (!cart) {
      // Tạo giỏ hàng mới
      const newCart = insertCartSchema.parse({
        userId: userId,
        items: [item],
        sessionCartId: sessionCartId,
        ...calcPrice([item]),
      });

      // Thêm vào cơ sở dữ liệu
      await prisma.cart.create({
        data: newCart,
      });

      // Cập nhật trang sản phẩm
      revalidatePath(`/product/${product.slug}`);

      return {
        success: true,
        message: `${product.name} đã thêm vào giỏ hàng`,
      };
    } else {
      // Kiểm tra sản phẩm có trong giỏ hàng không
      const existItem = (cart.items as CartItem[]).find(
        (x) => x.productId === item.productId
      );

      if (existItem) {
        // Kiểm tra tồn kho
        if (product.stock < existItem.qty + 1) {
          throw new Error('Không đủ hàng trong kho');
        }

        // Tăng số lượng
        (cart.items as CartItem[]).find(
          (x) => x.productId === item.productId
        )!.qty = existItem.qty + 1;
      } else {
        // Nếu sản phẩm chưa có trong giỏ hàng
        // Kiểm tra tồn kho
        if (product.stock < 1) throw new Error('Không đủ hàng trong kho');

        // Thêm sản phẩm vào giỏ hàng
        cart.items.push(item);
      }

      // Lưu vào cơ sở dữ liệu
      await prisma.cart.update({
        where: { id: cart.id },
        data: {
          items: cart.items as Prisma.CartUpdateitemsInput[],
          ...calcPrice(cart.items as CartItem[]),
        },
      });

      revalidatePath(`/product/${product.slug}`);

      return {
        success: true,
        message: `${product.name} ${
          existItem ? 'đã cập nhật trong' : 'đã thêm vào'
        } giỏ hàng`,
      };
    }
  } catch (error) {
    return {
      success: false,
      message: formatError(error),
    };
  }
}

export async function getMyCart() {
  // Kiểm tra cookie giỏ hàng
  const sessionCartId = (await cookies()).get('sessionCartId')?.value;
  if (!sessionCartId) throw new Error('Không tìm thấy phiên giỏ hàng');

  // Lấy phiên và ID người dùng
  const session = await auth();
  const userId = session?.user?.id ? (session.user.id as string) : undefined;

  // Lấy giỏ hàng của người dùng từ cơ sở dữ liệu
  const cart = await prisma.cart.findFirst({
    where: userId ? { userId: userId } : { sessionCartId: sessionCartId },
  });

  if (!cart) return undefined;

  // Chuyển đổi dữ liệu và trả về
  return convertToPlainObject({
    ...cart,
    items: cart.items as CartItem[],
    itemsPrice: cart.itemsPrice.toString(),
    totalPrice: cart.totalPrice.toString(),
    shippingPrice: cart.shippingPrice.toString(),
    taxPrice: cart.taxPrice.toString(),
  });
}

export async function removeItemFromCart(productId: string) {
  try {
    // Kiểm tra cookie giỏ hàng
    const sessionCartId = (await cookies()).get('sessionCartId')?.value;
    if (!sessionCartId) throw new Error('Không tìm thấy phiên giỏ hàng');

    // Lấy sản phẩm
    const product = await prisma.product.findFirst({
      where: { id: productId },
    });
    if (!product) throw new Error('Không tìm thấy sản phẩm');

    // Lấy giỏ hàng của người dùng
    const cart = await getMyCart();
    if (!cart) throw new Error('Không tìm thấy giỏ hàng');

    // Kiểm tra sản phẩm có trong giỏ hàng không
    const exist = (cart.items as CartItem[]).find(
      (x) => x.productId === productId
    );
    if (!exist) throw new Error('Không tìm thấy sản phẩm trong giỏ hàng');

    // Kiểm tra số lượng sản phẩm
    if (exist.qty === 1) {
      // Xóa sản phẩm khỏi giỏ hàng
      cart.items = (cart.items as CartItem[]).filter(
        (x) => x.productId !== exist.productId
      );
    } else {
      // Giảm số lượng sản phẩm
      (cart.items as CartItem[]).find((x) => x.productId === productId)!.qty =
        exist.qty - 1;
    }

    // Cập nhật giỏ hàng trong cơ sở dữ liệu
    await prisma.cart.update({
      where: { id: cart.id },
      data: {
        items: cart.items as Prisma.CartUpdateitemsInput[],
        ...calcPrice(cart.items as CartItem[]),
      },
    });

    revalidatePath(`/product/${product.slug}`);

    return {
      success: true,
      message: `${product.name} đã xóa khỏi giỏ hàng`,
    };
  } catch (error) {
    return { success: false, message: formatError(error) };
  }
}
