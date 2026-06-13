import React from 'react';
import { cn } from '../../lib/utils';

export default function Spinner({ className }) {
  return (
    <div className={cn("flex items-center justify-center p-4", className)}>
      <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
    </div>
  );
}