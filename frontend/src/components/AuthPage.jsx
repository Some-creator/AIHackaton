import { useState, useEffect } from 'react';
import { Mail, Lock, Loader2, X } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';

export default function AuthPage({ onSuccess, onClose }) {
  const { theme } = useTheme();
  const { configured, signInWithEmail, signUpWithEmail, signInWithGoogle, signInMock } = useAuth();
  const isDark = theme === 'dark';

  const handleMockBypass = () => {
    signInMock();
    onSuccess?.();
  };

  const [mode, setMode] = useState('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && !loading) onClose?.();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [loading, onClose]);

  const inputClass = `w-full pl-11 pr-4 py-3.5 rounded-2xl border font-medium outline-none transition focus:ring-2 focus:ring-[#0071e3]/40 ${
    isDark
      ? 'bg-zinc-900 border-zinc-600 text-white placeholder:text-zinc-400'
      : 'bg-white border-gray-300 text-gray-900 placeholder:text-gray-400'
  }`;

  const cardClass = `relative w-full max-w-md rounded-[2rem] border p-8 sm:p-10 shadow-2xl transition-colors ${
    isDark
      ? 'bg-zinc-900 border-zinc-700'
      : 'bg-white border-gray-200'
  }`;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (mode === 'signin') {
        await signInWithEmail(email, password);
      } else {
        await signUpWithEmail(email, password);
      }
      onSuccess?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setError(null);
    setLoading(true);
    try {
      await signInWithGoogle();
      onSuccess?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const cardContent = !configured ? (
    <>
      <h1 className={`text-2xl font-bold mb-3 pr-8 ${isDark ? 'text-white' : 'text-gray-900'}`}>
        Firebase setup required
      </h1>
      <p className={`text-sm font-medium leading-relaxed mb-4 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
        Add your Firebase web app credentials to <code className="text-[#2997ff]">frontend/.env</code> using the
        variables in <code className="text-[#2997ff]">frontend/.env.example</code>, then restart the dev server.
      </p>
      <ol className={`text-sm space-y-2 list-decimal list-inside font-medium mb-6 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
        <li>Create a project at console.firebase.google.com</li>
        <li>Enable Email/Password and Google in Authentication</li>
        <li>Add a Web app and copy the config values</li>
      </ol>
      <button
        type="button"
        onClick={handleMockBypass}
        className="w-full py-3.5 bg-[#0071e3] hover:bg-[#0077ed] text-white font-bold rounded-full transition flex items-center justify-center gap-2"
      >
        Bypass Auth (Mock Mode)
      </button>
    </>
  ) : (
    <>
      <div className="text-center mb-8 pr-6">
        <h1 className={`text-3xl font-extrabold tracking-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>
          {mode === 'signin' ? 'Welcome back' : 'Create your account'}
        </h1>
        <p className={`mt-2 font-semibold ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
          {mode === 'signin'
            ? 'Sign in to start analyzing your business.'
            : 'Sign up to unlock HookLine insights.'}
        </p>
      </div>

      {error && (
        <div className="mb-5 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm font-semibold">
          {error}
        </div>
      )}

      <button
        type="button"
        onClick={handleGoogle}
        disabled={loading}
        className={`w-full flex items-center justify-center gap-3 py-3.5 rounded-full border font-bold transition mb-6 disabled:opacity-50 ${
          isDark
            ? 'bg-zinc-800 text-white border-zinc-600 hover:bg-zinc-700'
            : 'bg-white text-gray-900 border-gray-300 hover:bg-gray-50 shadow-sm'
        }`}
      >
        {loading ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <>
            <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Continue with Google
          </>
        )}
      </button>

      <div className="relative mb-6">
        <div className={`absolute inset-0 flex items-center`}>
          <div className={`w-full border-t ${isDark ? 'border-zinc-600' : 'border-gray-200'}`} />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className={`px-3 font-bold ${isDark ? 'bg-zinc-900 text-zinc-400' : 'bg-white text-gray-400'}`}>
            or
          </span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="relative">
          <Mail className={`absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 ${isDark ? 'text-zinc-400' : 'text-gray-400'}`} />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email address"
            required
            disabled={loading}
            className={inputClass}
          />
        </div>

        <div className="relative">
          <Lock className={`absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 ${isDark ? 'text-zinc-400' : 'text-gray-400'}`} />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            required
            minLength={6}
            disabled={loading}
            className={inputClass}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3.5 bg-[#0071e3] hover:bg-[#0077ed] text-white font-bold rounded-full transition disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading && <Loader2 className="w-4 h-4 animate-spin" />}
          {mode === 'signin' ? 'Sign In' : 'Create Account'}
        </button>
      </form>

      <p className={`mt-6 text-center text-sm font-semibold ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
        {mode === 'signin' ? "Don't have an account?" : 'Already have an account?'}{' '}
        <button
          type="button"
          onClick={() => {
            setMode(mode === 'signin' ? 'signup' : 'signin');
            setError(null);
          }}
          className={`font-bold hover:underline ${isDark ? 'text-[#2997ff]' : 'text-[#0071e3]'}`}
        >
          {mode === 'signin' ? 'Sign up' : 'Sign in'}
        </button>
      </p>

      <div className="mt-4 pt-4 border-t border-zinc-800/20 text-center">
        <button
          type="button"
          onClick={handleMockBypass}
          className={`text-xs font-bold transition hover:underline ${isDark ? 'text-zinc-500 hover:text-zinc-300' : 'text-gray-500 hover:text-gray-700'}`}
        >
          Bypass with Mock User (Local Test)
        </button>
      </div>
    </>
  );

  return (
    <div
      className={`fixed inset-0 z-[100] flex items-center justify-center p-4 transition-colors ${
        isDark ? 'bg-black/85 backdrop-blur-md' : 'bg-gray-900/50 backdrop-blur-sm'
      }`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-dialog-title"
    >
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="Close sign in dialog"
        onClick={() => !loading && onClose?.()}
      />

      <div className={cardClass}>
        <button
          type="button"
          onClick={() => !loading && onClose?.()}
          disabled={loading}
          aria-label="Close"
          className={`absolute top-4 right-4 w-9 h-9 rounded-full flex items-center justify-center transition disabled:opacity-40 ${
            isDark
              ? 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-white border border-zinc-600'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-200'
          }`}
        >
          <X className="w-5 h-5" />
        </button>

        <div id="auth-dialog-title">{cardContent}</div>
      </div>
    </div>
  );
}
