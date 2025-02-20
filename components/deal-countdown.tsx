'use client';

import Link from 'next/link';
import { Button } from './ui/button';
import Image from 'next/image';
import { useEffect, useState } from 'react';

// Static target date (replace with desired date)
const TARGET_DATE = new Date('2025-01-20T00:00:00');

// Function to calculate the time remaining
const calculateTimeRemaining = (targetDate: Date) => {
  const currentTime = new Date();
  const timeDifference = Math.max(Number(targetDate) - Number(currentTime), 0);
  return {
    days: Math.floor(timeDifference / (1000 * 60 * 60 * 24)),
    hours: Math.floor(
      (timeDifference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
    ),
    minutes: Math.floor((timeDifference % (1000 * 60 * 60)) / (1000 * 60)),
    seconds: Math.floor((timeDifference % (1000 * 60)) / 1000),
  };
};

const DealCountdown = () => {
  const [time, setTime] = useState<ReturnType<typeof calculateTimeRemaining>>();

  useEffect(() => {
    // Calculate initial time on client
    setTime(calculateTimeRemaining(TARGET_DATE));

    const timerInterval = setInterval(() => {
      const newTime = calculateTimeRemaining(TARGET_DATE);
      setTime(newTime);

      if (
        newTime.days === 0 &&
        newTime.hours === 0 &&
        newTime.minutes === 0 &&
        newTime.seconds === 0
      ) {
        clearInterval(timerInterval);
      }

      return () => clearInterval(timerInterval);
    }, 1000);
  }, []);

  if (!time) {
    return (
      <section className='grid grid-cols-1 md:grid-cols-2 my-20'>
        <div className='flex flex-col gap-2 justify-center'>
          <h3 className='text-3xl font-bold'>Loading Countdown...</h3>
        </div>
      </section>
    );
  }

  if (
    time.days === 0 &&
    time.hours === 0 &&
    time.minutes === 0 &&
    time.seconds === 0
  ) {
    return (
      <section className='grid grid-cols-1 md:grid-cols-2 my-20'>
        <div className='flex flex-col gap-2 justify-center'>
          <h3 className='text-3xl font-bold'>Flash Sale đã kết thúc</h3>
          <p>Flash Sale đã kết thúc, hãy đón chờ những đợt Flash Sale khác</p>

          <div className='text-center'>
            <Button asChild>
              <Link href='/search'>Xem sản phẩm</Link>
            </Button>
          </div>
        </div>
        <div className='flex justify-center'>
          <Image
            src='/images/promo.jpg'
            alt='promotion'
            width={300}
            height={200}
          />
        </div>
      </section>
    );
  }

  return (
    <section className='grid grid-cols-1 md:grid-cols-2 my-20'>
      <div className='flex flex-col gap-2 justify-center'>
        <h3 className='text-3xl font-bold'>Deal Of The Month</h3>
        <p>Don&apos;t miss out! 🎁🛒</p>
        <ul className='grid grid-cols-4'>
          <StatBox label='Days' value={time.days} />
          <StatBox label='Hours' value={time.hours} />
          <StatBox label='Minutes' value={time.minutes} />
          <StatBox label='Seconds' value={time.seconds} />
        </ul>
        <div className='text-center'>
          <Button asChild>
            <Link href='/search'>Xem Sản Phẩm</Link>
          </Button>
        </div>
      </div>
      <div className='flex justify-center'>
        <Image
          src='/images/promo.jpg'
          alt='promotion'
          width={300}
          height={200}
        />
      </div>
    </section>
  );
};

const StatBox = ({ label, value }: { label: string; value: number }) => (
  <li className='p-4 w-full text-center'>
    <p className='text-3xl font-bold'>{value}</p>
    <p>{label}</p>
  </li>
);

export default DealCountdown;
