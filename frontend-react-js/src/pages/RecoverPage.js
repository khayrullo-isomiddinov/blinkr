import React from "react";
import { Link } from "react-router-dom";

import { forgotPassword, forgotPasswordSubmit } from '../lib/auth';
import { describeAuthError } from '../lib/authErrors';
import AuthShell, { AuthField, AuthError, AuthButton } from '../components/AuthShell';

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

  const titles = {
    send_code: 'Recover your password',
    confirm_code: 'Recover your password',
    success: 'Password reset',
  };

  return (
    <AuthShell title={titles[formState]}>
      {formState === 'send_code' && (
        <form onSubmit={onsubmit_send_code}>
          <AuthField id="username" label="Email" type="text" autoComplete="email" value={username} onChange={(e) => setUsername(e.target.value)} />
          <AuthError>{errors}</AuthError>
          <AuthButton type="submit">Send Recovery Code</AuthButton>
        </form>
      )}

      {formState === 'confirm_code' && (
        <form onSubmit={onsubmit_confirm_code}>
          <AuthField id="code" label="Reset Password Code" type="text" autoComplete="one-time-code" value={code} onChange={(e) => setCode(e.target.value)} />
          <AuthField id="password" label="New Password" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
          <AuthField id="passwordAgain" label="New Password Again" type="password" autoComplete="new-password" value={passwordAgain} onChange={(e) => setPasswordAgain(e.target.value)} />
          <AuthError>{errors}</AuthError>
          <AuthButton type="submit">Reset Password</AuthButton>
        </form>
      )}

      {formState === 'success' && (
        <div className="text-center">
          <p className="text-gray-300 mb-4">Your password has been successfully reset!</p>
          <Link to="/signin" className="text-emerald-400 hover:text-emerald-300 font-semibold">Proceed to Sign In</Link>
        </div>
      )}
    </AuthShell>
  );
}
