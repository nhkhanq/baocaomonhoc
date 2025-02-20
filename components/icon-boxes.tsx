import { DollarSign, Headset, ShoppingBag, WalletCards } from 'lucide-react';
import { Card, CardContent } from './ui/card';

const IconBoxes = () => {
  return (
    <div>
      <Card>
        <CardContent className='grid md:grid-cols-4 gap-4 p-4'>
          <div className='space-y-2'>
            <ShoppingBag />
            <div className='text-sm font-bold'>Miễn phí vận chuyển</div>
            <div className='text-sm text-muted-foreground'>
              Miễn phí vận chuyển cho đơn hàng trên $100
            </div>
          </div>
          <div className='space-y-2'>
            <DollarSign />
            <div className='text-sm font-bold'>Đảm bảo hoàn tiền</div>
            <div className='text-sm text-muted-foreground'>
              Trong vòng 3 ngày kể từ ngày mua
            </div>
          </div>
          <div className='space-y-2'>
            <WalletCards />
            <div className='text-sm font-bold'>Thanh toán linh hoạt</div>
            <div className='text-sm text-muted-foreground'>
              Thanh toán bằng thẻ tín dụng, PayPal hoặc tiền mặt
            </div>
          </div>
          <div className='space-y-2'>
            <Headset />
            <div className='text-sm font-bold'>Hỗ trợ 24/7</div>
            <div className='text-sm text-muted-foreground'>
              Sẵn sàng hỗ trợ mọi lúc!
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default IconBoxes;
