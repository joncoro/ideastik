import React from 'react';
import { cn } from '../../lib/utils';
import SafeIcon from '../../common/SafeIcon';

export const Button = React.forwardRef(({ className, variant = 'primary', size = 'md', isLoading, children, ...props }, ref) => {
  const variants = {
    primary: 'bg-primary text-white hover:bg-primary/90',
    secondary: 'bg-gray-100 text-gray-900 hover:bg-gray-200',
    outline: 'border border-gray-300 bg-transparent hover:bg-gray-50',
    ghost: 'bg-transparent hover:bg-gray-100 text-gray-700',
    danger: 'bg-red-50 text-red-600 hover:bg-red-100',
    success: 'bg-success text-white hover:bg-success/90'
  };
  
  const sizes = {
    sm: 'h-8 px-3 text-xs',
    md: 'h-11 px-4 py-2 text-sm font-medium',
    lg: 'h-14 px-8 text-base font-medium',
    icon: 'h-10 w-10 flex items-center justify-center'
  };

  return (
    <button
      ref={ref}
      disabled={isLoading || props.disabled}
      className={cn(
        'inline-flex items-center justify-center rounded-xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:pointer-events-none disabled:opacity-50',
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {isLoading ? <SafeIcon name="Loader" className="mr-2 h-4 w-4 animate-spin" /> : null}
      {children}
    </button>
  );
});

export const Card = ({ className, ...props }) => (
  <div className={cn("bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden", className)} {...props} />
);

export const Input = React.forwardRef(({ className, type, ...props }, ref) => {
  return (
    <input
      type={type}
      className={cn(
        "flex h-12 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      ref={ref}
      {...props}
    />
  );
});

export const Textarea = React.forwardRef(({ className, ...props }, ref) => {
  return (
    <textarea
      className={cn(
        "flex min-h-[100px] w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-50 resize-none",
        className
      )}
      ref={ref}
      {...props}
    />
  );
});

export const Label = React.forwardRef(({ className, ...props }, ref) => (
  <label
    ref={ref}
    className={cn("text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-gray-700", className)}
    {...props}
  />
));

export const Badge = ({ className, variant = "default", ...props }) => {
  const variants = {
    default: "border-transparent bg-gray-100 text-gray-900",
    primary: "border-transparent bg-primary/10 text-primary",
    success: "border-transparent bg-success/10 text-success",
    alert: "border-transparent bg-alert/10 text-alert",
    outline: "text-gray-950"
  };
  
  return (
    <div className={cn("inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2", variants[variant], className)} {...props} />
  );
}

export const Skeleton = ({ className, ...props }) => {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-gray-200", className)}
      {...props}
    />
  )
}