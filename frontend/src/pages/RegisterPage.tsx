import React, { useState, useEffect } from 'react';
import { useNavigate, Link, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { api } from '../services/api';
import { Department } from '../types';
import { AppleCard } from '../components/ui/AppleCard';
import { AppleInput } from '../components/ui/AppleInput';
import { AppleSelect } from '../components/ui/AppleSelect';
import { AppleButton } from '../components/ui/AppleButton';
import { User, Mail, Lock, IdCard } from 'lucide-react';

export const RegisterPage: React.FC = () => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('STUDENT');
  const [departmentId, setDepartmentId] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(false);

  const { register, user } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  // Authenticated users don't need the registration page
  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  useEffect(() => {
    api.departments.list().then((res) => setDepartments(res.data)).catch(() => {});
  }, []);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !email || !password) {
      showToast('warning', 'Missing Fields', 'Please complete all required fields');
      return;
    }
    if (password.length < 6) {
      showToast('warning', 'Weak Password', 'Password must be at least 6 characters');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      showToast('warning', 'Invalid Email', 'Enter a valid email address');
      return;
    }

    setLoading(true);
    try {
      await register({
        full_name: fullName,
        email,
        password,
        role,
        department_id: departmentId || undefined,
        employee_id: employeeId || undefined,
      });
      showToast('success', 'Registration Successful', 'Welcome to IUDWAS!');
      navigate('/dashboard');
    } catch (err: any) {
      showToast('error', 'Registration Failed', err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-neutral-100 via-neutral-200 to-blue-50 dark:from-black dark:via-[#121214] dark:to-[#1a1c2e]">
      <div className="w-full max-w-lg space-y-6 animate-apple-fade-in">
        <div className="text-center space-y-2">
          <div className="inline-flex w-14 h-14 rounded-3xl bg-gradient-to-tr from-apple-blue to-apple-purple items-center justify-center text-white font-black text-2xl shadow-apple-card">
            IU
          </div>
          <h2 className="text-2xl font-bold text-neutral-900 dark:text-white tracking-tight">
            Create University Account
          </h2>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            Join the Intelligent University Document & Workflow Automation System
          </p>
        </div>

        <AppleCard className="p-8 space-y-6">
          <form onSubmit={handleRegister} className="space-y-4">
            <AppleInput
              label="Full Name *"
              placeholder="e.g. Jane Doe"
              icon={<User className="w-5 h-5" />}
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />

            <AppleInput
              label="University Email *"
              type="email"
              placeholder="e.g. j.doe@iudwas.edu"
              icon={<Mail className="w-5 h-5" />}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <AppleInput
              label="Password (at least 6 characters) *"
              type="password"
              placeholder="••••••••"
              icon={<Lock className="w-5 h-5" />}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <AppleSelect
                label="Role *"
                value={role}
                onChange={(e) => setRole(e.target.value)}
              >
                <option value="STUDENT">Student</option>
                <option value="FACULTY">Faculty Member</option>
              </AppleSelect>

              <AppleSelect
                label="Department"
                value={departmentId}
                onChange={(e) => setDepartmentId(e.target.value)}
              >
                <option value="">Select Department (Optional)</option>
                {departments.map((d) => (
                  <option key={d.department_id} value={d.department_id}>
                    {d.name} ({d.code})
                  </option>
                ))}
              </AppleSelect>
            </div>

            <AppleInput
              label="Student / Employee ID"
              placeholder="e.g. STU-2026-0099"
              icon={<IdCard className="w-5 h-5" />}
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
            />

            <AppleButton
              type="submit"
              variant="primary"
              size="lg"
              className="w-full mt-2"
              loading={loading}
            >
              Create Account
            </AppleButton>
          </form>
        </AppleCard>

        <div className="text-center text-xs text-neutral-500 dark:text-neutral-400">
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-apple-blue hover:underline">
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
};
