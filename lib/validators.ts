import { z } from 'zod';
import { formatNumberWithDecimal } from './utils';
import { PAYMENT_METHODS } from './constants';

const currency = z
  .string()
  .refine(
    (value) => /^\d+(\.\d{2})?$/.test(formatNumberWithDecimal(Number(value))),
    'Giá phải có đúng hai chữ số thập phân'
  );

// Schema để thêm sản phẩm
export const insertProductSchema = z.object({
  name: z.string().min(3, 'Tên phải có ít nhất 3 ký tự'),
  slug: z.string().min(3, 'Slug phải có ít nhất 3 ký tự'),
  category: z.string().min(3, 'Danh mục phải có ít nhất 3 ký tự'),
  brand: z.string().min(3, 'Thương hiệu phải có ít nhất 3 ký tự'),
  description: z.string().min(3, 'Mô tả phải có ít nhất 3 ký tự'),
  stock: z.coerce.number(),
  images: z.array(z.string()).min(1, 'Sản phẩm phải có ít nhất một hình ảnh'),
  isFeatured: z.boolean(),
  banner: z.string().nullable(),
  price: currency,
});

// Schema để cập nhật sản phẩm
export const updateProductSchema = insertProductSchema.extend({
  id: z.string().min(1, 'ID là bắt buộc'),
});

// Schema để đăng nhập người dùng
export const signInFormSchema = z.object({
  email: z.string().email('Địa chỉ email không hợp lệ'),
  password: z.string().min(6, 'Mật khẩu phải có ít nhất 6 ký tự'),
});

// Schema để đăng ký người dùng
export const signUpFormSchema = z
  .object({
    name: z.string().min(3, 'Tên phải có ít nhất 3 ký tự'),
    email: z.string().email('Địa chỉ email không hợp lệ'),
    password: z.string().min(6, 'Mật khẩu phải có ít nhất 6 ký tự'),
    confirmPassword: z
      .string()
      .min(6, 'Xác nhận mật khẩu phải có ít nhất 6 ký tự'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Mật khẩu không khớp',
    path: ['confirmPassword'],
  });

// Schema giỏ hàng
export const cartItemSchema = z.object({
  productId: z.string().min(1, 'Sản phẩm là bắt buộc'),
  name: z.string().min(1, 'Tên là bắt buộc'),
  slug: z.string().min(1, 'Slug là bắt buộc'),
  qty: z.number().int().nonnegative('Số lượng phải là số dương'),
  image: z.string().min(1, 'Hình ảnh là bắt buộc'),
  price: currency,
});

export const insertCartSchema = z.object({
  items: z.array(cartItemSchema),
  itemsPrice: currency,
  totalPrice: currency,
  shippingPrice: currency,
  taxPrice: currency,
  sessionCartId: z.string().min(1, 'ID giỏ hàng là bắt buộc'),
  userId: z.string().optional().nullable(),
});

// Schema địa chỉ giao hàng
export const shippingAddressSchema = z.object({
  fullName: z.string().min(3, 'Tên phải có ít nhất 3 ký tự'),
  streetAddress: z.string().min(3, 'Địa chỉ phải có ít nhất 3 ký tự'),
  city: z.string().min(3, 'Thành phố phải có ít nhất 3 ký tự'),
  postalCode: z.string().min(3, 'Mã bưu điện phải có ít nhất 3 ký tự'),
  country: z.string().min(3, 'Quốc gia phải có ít nhất 3 ký tự'),
  lat: z.number().optional(),
  lng: z.number().optional(),
});

// Schema phương thức thanh toán
export const paymentMethodSchema = z
  .object({
    type: z.string().min(1, 'Phương thức thanh toán là bắt buộc'),
  })
  .refine((data) => PAYMENT_METHODS.includes(data.type), {
    path: ['type'],
    message: 'Phương thức thanh toán không hợp lệ',
  });

// Schema để thêm đơn hàng
export const insertOrderSchema = z.object({
  userId: z.string().min(1, 'Người dùng là bắt buộc'),
  itemsPrice: currency,
  shippingPrice: currency,
  taxPrice: currency,
  totalPrice: currency,
  paymentMethod: z.string().refine((data) => PAYMENT_METHODS.includes(data), {
    message: 'Phương thức thanh toán không hợp lệ',
  }),
  shippingAddress: shippingAddressSchema,
});

// Schema để thêm mục đơn hàng
export const insertOrderItemSchema = z.object({
  productId: z.string(),
  slug: z.string(),
  image: z.string(),
  name: z.string(),
  price: currency,
  qty: z.number(),
});

// Schema kết quả thanh toán PayPal
export const paymentResultSchema = z.object({
  id: z.string(),
  status: z.string(),
  email_address: z.string(),
  pricePaid: z.string(),
});

// Schema để cập nhật hồ sơ người dùng
export const updateProfileSchema = z.object({
  name: z.string().min(3, 'Tên phải có ít nhất 3 ký tự'),
  email: z.string().min(3, 'Email phải có ít nhất 3 ký tự'),
});

// Schema để cập nhật người dùng
export const updateUserSchema = updateProfileSchema.extend({
  id: z.string().min(1, 'ID là bắt buộc'),
  role: z.string().min(1, 'Vai trò là bắt buộc'),
});

// Schema để thêm đánh giá
export const insertReviewSchema = z.object({
  title: z.string().min(3, 'Tiêu đề phải có ít nhất 3 ký tự'),
  description: z.string().min(3, 'Mô tả phải có ít nhất 3 ký tự'),
  productId: z.string().min(1, 'Sản phẩm là bắt buộc'),
  userId: z.string().min(1, 'Người dùng là bắt buộc'),
  rating: z.coerce
    .number()
    .int()
    .min(1, 'Đánh giá phải ít nhất là 1')
    .max(5, 'Đánh giá tối đa là 5'),
});
