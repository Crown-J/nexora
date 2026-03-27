'use client';

import { useEffect, useState } from 'react';
import { AlertCircle } from 'lucide-react';

export type GreetingSectionProps = {
  displayName: string;
};

export function GreetingSection({ displayName }: GreetingSectionProps) {
  const [greeting, setGreeting] = useState('您好');

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) {
      setGreeting('早安');
    } else if (hour >= 12 && hour < 18) {
      setGreeting('午安');
    } else {
      setGreeting('晚安');
    }
  }, []);

  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h2 className="text-2xl lg:text-3xl font-semibold text-foreground">
          {greeting}，<span className="text-primary">{displayName}</span>
        </h2>
        <p className="text-muted-foreground mt-1 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-primary" />
          今天還有 <span className="text-primary font-medium">3 筆</span> 訂單未完成。
        </p>
      </div>
    </div>
  );
}
