'use client';

import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { useTransition } from 'react';
import { ShippingAddress } from '@/types';
import { shippingAddressSchema } from '@/lib/validators';
import { zodResolver } from '@hookform/resolvers/zod';
import { ControllerRenderProps, useForm, SubmitHandler } from 'react-hook-form';
import { z } from 'zod';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ArrowRight, Loader } from 'lucide-react';
import { updateUserAddress } from '@/lib/actions/user.actions';
import { shippingAddressDefaultValues } from '@/lib/constants';

const ShippingAddressForm = ({ address }: { address: ShippingAddress }) => {
  const router = useRouter();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof shippingAddressSchema>>({
    resolver: zodResolver(shippingAddressSchema),
    defaultValues: address || shippingAddressDefaultValues,
  });

  const [isPending, startTransition] = useTransition();

  const onSubmit: SubmitHandler<z.infer<typeof shippingAddressSchema>> = async (
    values
  ) => {
    startTransition(async () => {
      const res = await updateUserAddress(values);

      if (!res.success) {
        toast({
          variant: 'destructive',
          description: res.message,
        });
        return;
      }

      router.push('/payment-method');
    });
  };

  return (
    <>
      <div className='max-w-md mx-auto space-y-4'>
        <h1 className='h2-bold mt-4'>Địa Chỉ Giao Hàng</h1>
        <p className='text-sm text-muted-foreground'>
          Vui lòng nhập địa chỉ để gửi đến
        </p>
        <Form {...form}>
          <form
            method='post'
            className='space-y-4'
            onSubmit={form.handleSubmit(onSubmit)}
          >
            <div className='flex flex-col md:flex-row gap-5'>
              <FormField
                control={form.control}
                name='fullName'
                render={({
                  field,
                }: {
                  field: ControllerRenderProps<
                    z.infer<typeof shippingAddressSchema>,
                    'fullName'
                  >;
                }) => (
                  <FormItem className='w-full'>
                    <FormLabel>Họ tên đầy đủ</FormLabel>
                    <FormControl>
                      <Input placeholder='Nhập họ tên' {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className='flex flex-col md:flex-row gap-5'>
              <FormField
                control={form.control}
                name='streetAddress'
                render={({
                  field,
                }: {
                  field: ControllerRenderProps<
                    z.infer<typeof shippingAddressSchema>,
                    'streetAddress'
                  >;
                }) => (
                  <FormItem className='w-full'>
                    <FormLabel>Địa chỉ</FormLabel>
                    <FormControl>
                      <Input placeholder='Nhập địa chỉ' {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className='flex flex-col md:flex-row gap-5'>
              <FormField
                control={form.control}
                name='city'
                render={({
                  field,
                }: {
                  field: ControllerRenderProps<
                    z.infer<typeof shippingAddressSchema>,
                    'city'
                  >;
                }) => (
                  <FormItem className='w-full'>
                    <FormLabel>Thành Phố</FormLabel>
                    <FormControl>
                      <Input placeholder='Nhập thành phố' {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className='flex flex-col md:flex-row gap-5'>
              <FormField
                control={form.control}
                name='postalCode'
                render={({
                  field,
                }: {
                  field: ControllerRenderProps<
                    z.infer<typeof shippingAddressSchema>,
                    'postalCode'
                  >;
                }) => (
                  <FormItem className='w-full'>
                    <FormLabel>Mã bưu điện</FormLabel>
                    <FormControl>
                      <Input placeholder='Nhập mã bưu điện' {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className='flex flex-col md:flex-row gap-5'>
              <FormField
                control={form.control}
                name='country'
                render={({
                  field,
                }: {
                  field: ControllerRenderProps<
                    z.infer<typeof shippingAddressSchema>,
                    'country'
                  >;
                }) => (
                  <FormItem className='w-full'>
                    <FormLabel>Quốc gia</FormLabel>
                    <FormControl>
                      <Input placeholder='Nhập quốc gia' {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className='flex gap-2'>
              <Button type='submit' disabled={isPending}>
                {isPending ? (
                  <Loader className='w-4 h-4 animate-spin' />
                ) : (
                  <ArrowRight className='w-4 h-4' />
                )}{' '}
                Tiếp tục
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </>
  );
};

export default ShippingAddressForm;
