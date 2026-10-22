import React, { useState } from 'react';
import { useNavigate, Link, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { AppleCard } from '../components/ui/AppleCard';
import { AppleInput } from '../components/ui/AppleInput';
import { AppleButton } from '../components/ui/AppleButton';
import { Lock, Mail, ShieldCheck, UserCheck, GraduationCap, Briefcase } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, user } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  // Authenticated users have no reason to sit on the login screen
  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      showToast('warning', 'Missing Fields', 'Please enter your email and password');
      return;
    }

    setLoading(true);
    try {
      await login({ email, password });
      showToast('success', 'Welcome Back!', 'You have successfully signed in.');
      navigate('/dashboard');
    } catch (err: any) {
      showToast('error', 'Login Failed', err.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemo = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword('Password@123');
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-neutral-100 via-neutral-200 to-blue-50 dark:from-black dark:via-[#121214] dark:to-[#1a1c2e]">
      <div className="w-full max-w-md space-y-6 animate-apple-fade-in">
        {/* Logo & Title */}
        <div className="text-center space-y-2">
          <div className="inline-flex w-14 h-14 rounded-3xl bg-gradient-to-tr from-apple-blue to-apple-purple items-center justify-center text-white font-black text-2xl shadow-apple-card">
            IU
          </div>
          <h2 className="text-2xl font-bold text-neutral-900 dark:text-white tracking-tight">
            IUDWAS University Portal
          </h2>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            Intelligent University Document & Workflow Automation System
          </p>
        </div>

        {/* Login Card */}
        <AppleCard className="p-8 space-y-6">
          <form onSubmit={handleLogin} className="space-y-4">
            <AppleInput
              label="University Email"
              type="email"
              placeholder="e.g. student.alex@iudwas.edu"
              icon={<Mail className="w-5 h-5" />}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <div className="space-y-1">
              <AppleInput
                label="Password"
                type="password"
                placeholder="••••••••"
                icon={<Lock className="w-5 h-5" />}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <div className="text-right">
                <Link
                  to="/forgot-password"
                  className="text-[11px] font-medium text-apple-blue hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
            </div>

            <AppleButton
              type="submit"
              variant="primary"
              size="lg"
              className="w-full"
              loading={loading}
            >
              Sign In
            </AppleButton>
          </form>

          {/* Quick Demo Account Switcher (Development Only) */}
          {(!import.meta.env.PROD || import.meta.env.VITE_ENABLE_DEMO_ACCOUNTS === 'true') && (
            <div className="pt-4 border-t border-black/5 dark:border-white/10 space-y-2.5">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400 text-center">
                Quick One-Click Demo Logins
              </p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleQuickDemo('admin@iudwas.edu')}
                  className="flex items-center gap-2 p-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-apple-red text-xs font-semibold transition-colors apple-press"
                >
                  <ShieldCheck className="w-5 h-5" />
                  <span>Super Admin</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickDemo('deptadmin.cs@iudwas.edu')}
                  className="flex items-center gap-2 p-2 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 text-apple-purple text-xs font-semibold transition-colors apple-press"
                >
                  <Briefcase className="w-5 h-5" />
                  <span>Dept Admin</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickDemo('faculty.smith@iudwas.edu')}
                  className="flex items-center gap-2 p-2 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-apple-blue text-xs font-semibold transition-colors apple-press"
                >
                  <UserCheck className="w-5 h-5" />
                  <span>Faculty</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickDemo('student.alex@iudwas.edu')}
                  className="flex items-center gap-2 p-2 rounded-xl bg-teal-500/10 hover:bg-teal-500/20 text-apple-teal text-xs font-semibold transition-colors apple-press"
                >
                  <GraduationCap className="w-5 h-5" />
                  <span>Student</span>
                </button>
              </div>
            </div>
          )}
        </AppleCard>

        {/* Footer */}
        <div className="text-center text-xs text-neutral-500 dark:text-neutral-400">
          Don't have an account?{' '}
          <Link to="/register" className="font-semibold text-apple-blue hover:underline">
            Register New Account
          </Link>
        </div>
      </div>
    </div>
  );
};
