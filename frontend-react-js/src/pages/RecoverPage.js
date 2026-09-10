import React from "react";
import { Link } from "react-router-dom";

import { forgotPassword, forgotPasswordSubmit } from '../lib/auth';
import { describeAuthError } from '../lib/authErrors';
import AuthLayout from '../components/auth/AuthLayout';
import AuthField from '../components/auth/AuthField';
import AuthError from '../components/auth/AuthError';

export default function RecoverPage() {
  // username here is the email
  const [username, setUsername] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [passwordAgain, setPasswordAgain] = React.useState('');
  const [code, setCode] = React.useState('');
  const [errors, setErrors] = React.useState('');
  const [formState, setFormState] = React.useState('send_code');

  const onsubmit_send_code = async (event) => {
    event.preventDefault();
    setErrors('')
    try {
      await forgotPassword(username);
      setFormState('confirm_code');
    } catch (error) {
      setErrors(describeAuthError(error))
    }
    return false
  }
  const onsubmit_confirm_code = async (event) => {
    event.preventDefault();
    setErrors('')
    if (password !== passwordAgain) {
      setErrors('Passwords do not match')
      return false
    }
    try {
      await forgotPasswordSubmit(username, code, password);
      setFormState('success');
    } catch (error) {
      setErrors(describeAuthError(error))
    }
    return false
  }

  const username_onchange = (event) => {
    setUsername(event.target.value);
  }
  const password_onchange = (event) => {
    setPassword(event.target.value);
  }
  const password_again_onchange = (event) => {
    setPasswordAgain(event.target.value);
  }
  const code_onchange = (event) => {
    setCode(event.target.value);
  }

  const titles = {
    send_code: 'Recover your password',
    confirm_code: 'Recover your password',
    success: 'Password reset',
  };

  return (
    <AuthLayout title={titles[formState]}>
      {formState === 'send_code' && (
        <form onSubmit={onsubmit_send_code} className="flex flex-col gap-space-md">
          <AuthField label="Email" type="text" value={username} onChange={username_onchange} autoComplete="email" />
          <AuthError>{errors}</AuthError>
          <button
            type="submit"
            className="px-space-lg py-space-sm bg-primary-container hover:bg-inverse-primary text-on-primary-container hover:text-on-surface font-label-md text-label-md font-semibold rounded-full transition-all"
          >
            Send Recovery Code
          </button>
        </form>
      )}

      {formState === 'confirm_code' && (
        <form onSubmit={onsubmit_confirm_code} className="flex flex-col gap-space-md">
          <AuthField label="Reset Password Code" type="text" value={code} onChange={code_onchange} autoComplete="one-time-code" />
          <AuthField label="New Password" type="password" value={password} onChange={password_onchange} autoComplete="new-password" />
          <AuthField label="New Password Again" type="password" value={passwordAgain} onChange={password_again_onchange} autoComplete="new-password" />
          <AuthError>{errors}</AuthError>
          <button
            type="submit"
            className="px-space-lg py-space-sm bg-primary-container hover:bg-inverse-primary text-on-primary-container hover:text-on-surface font-label-md text-label-md font-semibold rounded-full transition-all"
          >
            Reset Password
          </button>
        </form>
      )}

      {formState === 'success' && (
        <div className="flex flex-col items-center gap-space-md text-center">
          <p className="font-body-md text-body-md text-on-surface">Your password has been successfully reset!</p>
          <Link
            to="/signin"
            className="px-space-lg py-space-sm bg-primary-container hover:bg-inverse-primary text-on-primary-container hover:text-on-surface font-label-md text-label-md font-semibold rounded-full transition-all"
          >
            Proceed to Sign In
          </Link>
        </div>
      )}
    </AuthLayout>
  );
}
