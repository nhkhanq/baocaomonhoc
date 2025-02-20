import { APP_NAME } from '@/lib/constants';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className='border-t'>
      <div className='p-5 flex-center'>
        {currentYear} {APP_NAME}. Báo cáo kết thúc môn
      </div>
    </footer>
  );
};

export default Footer;
