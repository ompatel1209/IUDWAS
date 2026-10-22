import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { useToast } from '../context/ToastContext';
import { AppleCard } from '../components/ui/AppleCard';
import { AppleInput } from '../components/ui/AppleInput';
import { AppleButton } from '../components/ui/AppleButton';
import { Mail, ArrowLeft, CheckCircle } from 'lucide-react';

export const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const { showToast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      showToast('warning', 'Required', 'Please enter your email');
      return;
    }

    setLoading(true);
    try {
      await api.auth.forgotPassword(email);
      setSubmitted(true);
      showToast('success', 'Reset Request Sent', 'Check your university inbox for reset instructions.');
    } catch (err: any) {
      showToast('error', 'Request Failed', err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-neutral-100 via-neutral-200 to-blue-50 dark:from-black dark:via-[#121214] dark:to-[#1a1c2e]">
      <div className="w-full max-w-md space-y-6 animate-apple-fade-in">
        <div className="text-center space-y-2">
          <div className="inline-flex w-14 h-14 rounded-3xl bg-gradient-to-tr from-apple-blue to-apple-purple items-center justify-center text-white font-black text-2xl shadow-apple-card">
            IU
          </div>
          <h2 className="text-2xl font-bold text-neutral-900 dark:text-white tracking-tight">
            Reset Password
          </h2>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            Enter your university email to receive recovery instructions
          </p>
        </div>

        <AppleCard className="p-8">
          {submitted ? (
            <div className="text-center space-y-4 py-4 animate-apple-fade-in">
              <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-apple-green flex items-center justify-center mx-auto">
                <CheckCircle className="w-6 h-6" />
              </div>
              <h4 className="text-base font-semibold text-neutral-900 dark:text-white">
                Instructions Dispatched
              </h4>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">
                If an account exists for <span className="font-semibold">{email}</span>, a secure recovery code has been generated.
              </p>
              <div className="pt-2">
                <Link to="/reset-password">
                  <AppleButton variant="primary" size="md" className="w-full">
                    Proceed to Enter New Password
                  </AppleButton>
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <AppleInput
                label="University Email"
                type="email"
                placeholder="e.g. student.alex@iudwas.edu"
                icon={<Mail className="w-4 h-4" />}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />

              <AppleButton
                type="submit"
                variant="primary"
                size="lg"
                className="w-full"
                loading={loading}
              >
                Send Reset Link
              </AppleButton>
            </form>
          )}
        </AppleCard>

        <div className="text-center">
          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-apple-blue hover:underline"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
};

export const ResetPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      showToast('error', 'Mismatch', 'Passwords do not match');
      return;
    }
    if (newPassword.length < 6) {
      showToast('warning', 'Weak Password', 'Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      await api.auth.resetPassword(email, newPassword);
      showToast('success', 'Password Updated', 'You can now sign in with your new password.');
      window.location.href = '/login';
    } catch (err: any) {
      showToast('error', 'Reset Failed', err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-neutral-100 via-neutral-200 to-blue-50 dark:from-black dark:via-[#121214] dark:to-[#1a1c2e]">
      <div className="w-full max-w-md space-y-6 animate-apple-fade-in">
        <div className="text-center space-y-2">
          <div className="inline-flex w-14 h-14 rounded-3xl bg-gradient-to-tr from-apple-blue to-apple-purple items-center justify-center text-white font-black text-2xl shadow-apple-card">
            IU
          </div>
          <h2 className="text-2xl font-bold text-neutral-900 dark:text-white tracking-tight">
            Create New Password
          </h2>
        </div>

        <AppleCard className="p-8">
          <form onSubmit={handleReset} className="space-y-4">
            <AppleInput
              label="Email Address"
              type="email"
              placeholder="e.g. student.alex@iudwas.edu"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <AppleInput
              label="New Password"
              type="password"
              placeholder="••••••••"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
            />

            <AppleInput
              label="Confirm New Password"
              type="password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />

            <AppleButton
              type="submit"
              variant="primary"
              size="lg"
              className="w-full mt-2"
              loading={loading}
            >
              Update Password
            </AppleButton>
          </form>
        </AppleCard>

        <div className="text-center">
          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-apple-blue hover:underline"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
};
