import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type AnimatedGradientTextProps = {
  children: ReactNode;
  className?: string;
};

export function AnimatedGradientText({ children, className }: AnimatedGradientTextProps) {
  return (
    <span className={cn('text-gradient-animate inline-block', className)} aria-hidden={false}>
      {children}
    </span>
  );
}

export function renderHighlightedText(text: string, highlight: string) {
  if (!highlight) return text;

  const index = text.toLowerCase().indexOf(highlight.toLowerCase());
  if (index === -1) return text;

  const before = text.slice(0, index);
  const match = text.slice(index, index + highlight.length);
  const after = text.slice(index + highlight.length);

  return (
    <>
      {before}
      <AnimatedGradientText>{match}</AnimatedGradientText>
      {after}
    </>
  );
}
