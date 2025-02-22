'use server';

import { z } from 'zod';
import { insertReviewSchema } from '../validators';
import { formatError } from '../utils';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';
import { revalidatePath } from 'next/cache';

// Tạo & Cập nhật đánh giá
export async function createUpdateReview(
  data: z.infer<typeof insertReviewSchema>
) {
  try {
    const session = await auth();
    if (!session) throw new Error('Người dùng chưa được xác thực');

    // Validate và lưu đánh giá
    const review = insertReviewSchema.parse({
      ...data,
      userId: session?.user?.id,
    });

    // Lấy sản phẩm đang được đánh giá
    const product = await prisma.product.findFirst({
      where: { id: review.productId },
    });

    if (!product) throw new Error('Không tìm thấy sản phẩm');

    // Kiểm tra xem người dùng đã đánh giá chưa
    const reviewExists = await prisma.review.findFirst({
      where: {
        productId: review.productId,
        userId: review.userId,
      },
    });

    await prisma.$transaction(async (tx) => {
      if (reviewExists) {
        // Cập nhật đánh giá
        await tx.review.update({
          where: { id: reviewExists.id },
          data: {
            title: review.title,
            description: review.description,
            rating: review.rating,
          },
        });
      } else {
        // Tạo đánh giá mới
        await tx.review.create({ data: review });
      }

      // Tính điểm trung bình đánh giá
      const averageRating = await tx.review.aggregate({
        _avg: { rating: true },
        where: { productId: review.productId },
      });

      // Lấy số lượng đánh giá
      const numReviews = await tx.review.count({
        where: { productId: review.productId },
      });

      // Cập nhật điểm đánh giá và số lượng đánh giá trong bảng sản phẩm
      await tx.product.update({
        where: { id: review.productId },
        data: {
          rating: averageRating._avg.rating || 0,
          numReviews,
        },
      });
    });

    revalidatePath(`/product/${product.slug}`);

    return {
      success: true,
      message: 'Đánh giá đã được cập nhật thành công',
    };
  } catch (error) {
    return { success: false, message: formatError(error) };
  }
}

// Lấy tất cả đánh giá của một sản phẩm
export async function getReviews({ productId }: { productId: string }) {
  const data = await prisma.review.findMany({
    where: {
      productId: productId,
    },
    include: {
      user: {
        select: {
          name: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  return { data };
}

// Lấy đánh giá của người dùng hiện tại cho một sản phẩm
export async function getReviewByProductId({
  productId,
}: {
  productId: string;
}) {
  const session = await auth();

  if (!session) throw new Error('Người dùng chưa được xác thực');

  return await prisma.review.findFirst({
    where: {
      productId,
      userId: session?.user?.id,
    },
  });
}
