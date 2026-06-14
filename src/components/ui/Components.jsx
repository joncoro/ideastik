import React from 'react';
import { cn } from '../../lib/utils';
import SafeIcon from '../../common/SafeIcon';

export const Button = React.forwardRef(({ className, variant = 'primary', size = 'md', isLoading, children, ...props }, ref) => {
  const variants = {
    primary: 'bg-gradient-to-br from-primary to-[#8B5CF6] text-white shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5',
    secondary: 'bg-white/70 backdrop-blur border border-white/60 text-gray-800 hover:bg-white shadow-sm',
    outline: 'border border-primary/20 bg-white/50 backdrop-blur text-gray-700 hover:bg-white/80 hover:border-primary/40',
    ghost: 'bg-transparent hover:bg-primary/5 text-gray-700',
    danger: 'bg-gradient-to-br from-red-500 to-rose-500 text-white shadow-lg shadow-red-500/20 hover:-translate-y-0.5',
    success: 'bg-gradient-to-br from-success to-[#37C77E] text-white shadow-lg shadow-success/25 hover:shadow-xl hover:-translate-y-0.5'
  };

  const sizes = {
    sm: 'h-9 px-3.5 text-xs',
    md: 'h-11 px-5 py-2 text-sm font-medium',
    lg: 'h-14 px-8 text-base font-medium',
    icon: 'h-10 w-10 flex items-center justify-center'
  };

  return (
    <button
      ref={ref}
      disabled={isLoading || props.disabled}
      className={cn(
        'inline-flex items-center justify-center rounded-2xl font-medium transition-all duration-200 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-1 disabled:pointer-events-none disabled:opacity-50',
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
  <div className={cn("bg-white/70 backdrop-blur-xl rounded-3xl border border-white/60 shadow-[0_8px_32px_-10px_rgba(31,31,31,0.12)] overflow-hidden", className)} {...props} />
);

export const Input = React.forwardRef(({ className, type, ...props }, ref) => {
  return (
    <input
      type={type}
      className={cn(
        "flex h-12 w-full rounded-2xl border border-white/70 bg-white/60 backdrop-blur px-4 py-2 text-sm placeholder:text-gray-400 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:bg-white disabled:cursor-not-allowed disabled:opacity-50",
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
        "flex min-h-[100px] w-full rounded-2xl border border-white/70 bg-white/60 backdrop-blur px-4 py-3 text-sm placeholder:text-gray-400 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:bg-white disabled:cursor-not-allowed disabled:opacity-50 resize-none",
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
    default: "border-transparent bg-gray-100/80 text-gray-700",
    primary: "border-primary/15 bg-primary/10 text-primary",
    success: "border-success/15 bg-success/10 text-success",
    alert: "border-alert/15 bg-alert/10 text-alert",
    outline: "border-gray-200 bg-white/50 text-gray-600"
  };

  return (
    <div className={cn("inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors", variants[variant], className)} {...props} />
  );
}

export const Skeleton = ({ className, ...props }) => {
  return (
    <div
      className={cn("animate-pulse rounded-2xl bg-white/50", className)}
      {...props}
    />
  )
}
