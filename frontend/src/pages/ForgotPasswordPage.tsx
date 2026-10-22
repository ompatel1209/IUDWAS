import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { api } from '../services/api';
import { useToast } from '../context/ToastContext';
import { AppleCard } from '../components/ui/AppleCard';
import { AppleInput } from '../components/ui/AppleInput';
import { AppleButton } from '../components/ui/AppleButton';
import { Mail, ArrowLeft, CheckCircle, KeyRound } from 'lucide-react';

export const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  // `submitted` covers both outcomes: an issued code exists only when the
  // account matched, otherwise we show the neutral response message.
  const [submitted, setSubmitted] = useState(false);
  const [issuedToken, setIssuedToken] = useState<string | null>(null);
  const { showToast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      showToast('warning', 'Required', 'Please enter your email');
      return;
    }

    setLoading(true);
    try {
      const res: any = await api.auth.forgotPassword(email);
      setIssuedToken(res.data?.reset_token ?? null);
      setSubmitted(true);
      showToast('success', 'Reset Request Sent', 'Follow the instructions below to set a new password.');
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

              {issuedToken && (
                <div className="text-left space-y-2 rounded-2xl bg-apple-blue/5 border border-apple-blue/20 p-4">
                  <p className="flex items-center gap-1.5 text-[11px] font-semibold text-apple-blue">
                    <KeyRound className="w-4 h-4" />
                    Your recovery code (valid 15 minutes)
                  </p>
                  <p className="font-mono text-xs text-neutral-800 dark:text-neutral-200 break-all select-all bg-white/60 dark:bg-black/40 rounded-lg px-3 py-2">
                    {issuedToken}
                  </p>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">
                    Email delivery is not configured in this build, so the code is
                    shown here. In production it is sent to the account's inbox
                    instead. Use it on the next screen to verify your identity.
                  </p>
                </div>
              )}

              {issuedToken ? (
                <div className="pt-2">
                  <AppleButton
                    variant="primary"
                    size="md"
                    className="w-full"
                    onClick={() =>
                      navigate('/reset-password', {
                        state: { email, reset_token: issuedToken },
                      })
                    }
                  >
                    Proceed to Enter New Password
                  </AppleButton>
                </div>
              ) : (
                <p className="text-[11px] text-neutral-400 italic pt-1">
                  You may close this page or try again with a different email.
                </p>
              )}
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <AppleInput
                label="University Email"
                type="email"
                placeholder="e.g. student.alex@iudwas.edu"
                icon={<Mail className="w-5 h-5" />}
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
            <ArrowLeft className="w-4 h-4" />
            Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
};

interface ResetLocationState {
  email?: string;
  reset_token?: string;
}

export const ResetPasswordPage: React.FC = () => {
  const location = useLocation();
  const state = (location.state as ResetLocationState | null) ?? null;
  const [email, setEmail] = useState(state?.email ?? '');
  const [resetToken, setResetToken] = useState(state?.reset_token ?? '');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [mismatch, setMismatch] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setMismatch('Passwords do not match');
      showToast('error', 'Mismatch', 'Passwords do not match');
      return;
    }
    setMismatch(null);
    if (newPassword.length < 6) {
      showToast('warning', 'Weak Password', 'Password must be at least 6 characters');
      return;
    }
    if (!resetToken.trim()) {
      showToast('warning', 'Verification Required', 'Paste the recovery code you received when requesting the reset.');
      return;
    }
    if (!email.trim()) {
      showToast('warning', 'Required', 'Please enter the email for the account you are recovering');
      return;
    }

    setLoading(true);
    try {
      await api.auth.resetPassword(email.trim(), newPassword, resetToken.trim());
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
              label="Recovery Code"
              type="text"
              placeholder="Paste the code from the reset request"
              icon={<KeyRound className="w-5 h-5" />}
              value={resetToken}
              onChange={(e) => setResetToken(e.target.value)}
              required
              autoFocus={!resetToken}
            />

            <AppleInput
              label="New Password"
              type="password"
              placeholder="••••••••"
              value={newPassword}
              onChange={(e) => { setNewPassword(e.target.value); setMismatch(null); }}
              error={mismatch ?? undefined}
              required
            />

            <AppleInput
              label="Confirm New Password"
              type="password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => { setConfirmPassword(e.target.value); setMismatch(null); }}
              error={mismatch ?? undefined}
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

        <div className="text-center space-y-1.5">
          <p className="text-[10px] text-neutral-400">
            No code yet? Request one first — it is required to verify your identity.
          </p>
          <Link
            to="/forgot-password"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-apple-blue hover:underline"
          >
            <Mail className="w-4 h-4" />
            Request a Recovery Code
          </Link>
        </div>

        <div className="text-center">
          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-apple-blue hover:underline"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
};
