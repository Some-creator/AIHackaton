import * as React from 'react';
import { useEffect, useState, type ReactNode } from 'react';
import { ArrowUpRight, Menu, Moon, Sun, X, Zap } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Toggle } from '@/components/ui/toggle';
import { cn } from '@/lib/utils';

const navLinks = [
  { name: 'How it works', href: '#how-it-works' },
  { name: 'Features', href: '#features' },
];

type HeaderUser = {
  email?: string | null;
  displayName?: string | null;
};

type HeaderProps = {
  onLogoClick?: () => void;
  onSignIn?: () => void;
  onGetStarted?: () => void;
  onSignOut?: () => void;
  user?: HeaderUser | null;
  showAuthButtons?: boolean;
  showGetStarted?: boolean;
  centerContent?: ReactNode;
};

export function Header({
  onLogoClick,
  onSignIn,
  onGetStarted,
  onSignOut,
  user,
  showAuthButtons = false,
  showGetStarted = false,
  centerContent,
}: HeaderProps) {
  const [isOpen, setIsOpen] = useState(false);
  const showHomeNav = !centerContent;

  return (
    <header className="fixed top-0 left-0 z-50 w-full border-b border-border/50 bg-background/60 backdrop-blur-md">
      <div className="mx-auto max-w-6xl px-3 sm:px-6">
        <div className="flex h-16 items-center justify-between gap-3 md:h-20">
          <button
            type="button"
            onClick={onLogoClick}
            aria-label="HookLine home"
            className="flex h-12 items-center gap-2 rounded-lg border border-primary/20 bg-primary px-3 transition hover:opacity-90 md:h-14 md:px-4"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary-foreground/15 md:h-9 md:w-9">
              <Zap className="h-4 w-4 text-primary-foreground md:h-5 md:w-5" aria-hidden="true" />
            </div>
            <span className="hidden pr-1 font-heading text-lg font-bold text-primary-foreground sm:inline md:text-xl">
              HookLine
            </span>
          </button>

          {centerContent ? (
            <div className="hidden flex-1 justify-center md:flex">{centerContent}</div>
          ) : (
            <nav className="hidden flex-1 items-center justify-center gap-1 lg:flex">
              {navLinks.map((item) => (
                <a
                  key={item.name}
                  href={item.href}
                  className="rounded-lg px-4 py-2 font-body text-sm font-medium text-muted-foreground transition hover:bg-accent hover:text-foreground"
                >
                  {item.name}
                </a>
              ))}
            </nav>
          )}

          <div className="hidden items-center gap-2 lg:flex">
            <ModeToggle />
            {user ? (
              <>
                <span
                  className="max-w-[140px] truncate font-body text-xs font-medium text-muted-foreground"
                  title={user.email || user.displayName || undefined}
                >
                  {user.displayName || user.email}
                </span>
                <Button variant="outline" size="sm" onClick={onSignOut}>
                  Sign out
                </Button>
              </>
            ) : (
              <>
                {showAuthButtons && (
                  <Button variant="outline" size="lg" className="h-11 rounded-full px-5" onClick={onSignIn}>
                    Sign In
                  </Button>
                )}
                {showGetStarted && (
                  <Button size="lg" className="h-11 rounded-full px-6" onClick={onGetStarted}>
                    Get Started
                    <ArrowUpRight className="ml-1 h-4 w-4" />
                  </Button>
                )}
              </>
            )}
          </div>

          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild className="lg:hidden">
              <Button variant="ghost" size="icon" aria-label={isOpen ? 'Close menu' : 'Open menu'}>
                {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-full overflow-y-auto border-border bg-background p-6 sm:max-w-md">
              <div className="flex h-full flex-col">
                <div className="mb-6 flex items-center gap-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary">
                    <Zap className="h-5 w-5 text-primary-foreground" />
                  </div>
                  <span className="font-heading text-lg font-bold">HookLine</span>
                </div>

                {showHomeNav && (
                  <nav className="flex flex-col gap-1 border-b border-border pb-6">
                    {navLinks.map((item) => (
                      <a
                        key={item.name}
                        href={item.href}
                        className="rounded-lg px-3 py-3 font-body text-base font-medium text-muted-foreground transition hover:bg-accent hover:text-foreground"
                        onClick={() => setIsOpen(false)}
                      >
                        {item.name}
                      </a>
                    ))}
                  </nav>
                )}

                {centerContent && <div className="border-b border-border py-4">{centerContent}</div>}

                <div className="mt-auto space-y-4 pt-8">
                  <div className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
                    <span className="font-body text-sm font-medium">Theme</span>
                    <ModeToggle compact />
                  </div>

                  {user ? (
                    <div className="space-y-3">
                      <p className="truncate font-body text-sm font-medium text-muted-foreground">
                        {user.displayName || user.email}
                      </p>
                      <Button variant="outline" className="w-full" onClick={() => { onSignOut?.(); setIsOpen(false); }}>
                        Sign out
                      </Button>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-3">
                      {showAuthButtons && (
                        <Button
                          variant="outline"
                          className="w-full"
                          onClick={() => {
                            onSignIn?.();
                            setIsOpen(false);
                          }}
                        >
                          Sign In
                        </Button>
                      )}
                      {showGetStarted && (
                        <Button
                          className="w-full"
                          onClick={() => {
                            onGetStarted?.();
                            setIsOpen(false);
                          }}
                        >
                          Get Started
                          <ArrowUpRight className="ml-1 h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}

export function ModeToggle({ compact = false }: { compact?: boolean }) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const isDark = theme === 'dark';

  return (
    <Toggle
      pressed={isDark}
      onPressedChange={(pressed) => setTheme(pressed ? 'dark' : 'light')}
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
      className={cn(
        'group relative cursor-pointer data-[state=on]:bg-transparent',
        compact ? 'h-10 w-10' : 'h-11 w-11 bg-secondary dark:bg-secondary',
      )}
    >
      <Moon
        className="absolute h-4 w-4 shrink-0 scale-0 opacity-0 transition-all group-data-[state=on]:scale-100 group-data-[state=on]:opacity-100"
        aria-hidden="true"
      />
      <Sun
        className="absolute h-4 w-4 shrink-0 scale-100 opacity-100 transition-all group-data-[state=on]:scale-0 group-data-[state=on]:opacity-0"
        aria-hidden="true"
      />
    </Toggle>
  );
}
