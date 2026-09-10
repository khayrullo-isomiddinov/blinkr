import React from "react";
import { Link } from "react-router-dom";

import { signIn } from '../lib/auth';
import { describeAuthError } from '../lib/authErrors';
import AuthLayout from '../components/auth/AuthLayout';
import AuthField from '../components/auth/AuthField';
import AuthError from '../components/auth/AuthError';

export default function SigninPage() {

  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [errors, setErrors] = React.useState('');

  const onsubmit = async (event) => {
    event.preventDefault();
    setErrors('')
    try {
      const cognito_user = await signIn(email, password);
      localStorage.setItem('access_token', cognito_user.signInUserSession.accessToken.jwtToken);
      window.location.href = "/"
    } catch (error) {
      if (error.code === 'UserNotConfirmedException') {
        window.location.href = `/confirm?email=${email}`
      } else {
        setErrors(describeAuthError(error))
      }
    }
    return false
  }

  const email_onchange = (event) => {
    setEmail(event.target.value);
  }
  const password_onchange = (event) => {
    setPassword(event.target.value);
  }

  return (
    <AuthLayout
      title="Sign into your Blinkr account"
      footer={
        <span>
          Don't have an account? <Link to="/signup" className="text-primary hover:underline">Sign up</Link>
        </span>
      }
    >
      <form onSubmit={onsubmit} className="flex flex-col gap-space-md">
        <AuthField label="Email" type="text" value={email} onChange={email_onchange} autoComplete="email" />
        <AuthField label="Password" type="password" value={password} onChange={password_onchange} autoComplete="current-password" />
        <AuthError>{errors}</AuthError>
        <div className="flex items-center justify-between pt-space-xs">
          <Link to="/forgot" className="font-label-sm text-label-sm text-primary hover:underline">Forgot password?</Link>
          <button
            type="submit"
            className="px-space-lg py-space-sm bg-primary-container hover:bg-inverse-primary text-on-primary-container hover:text-on-surface font-label-md text-label-md font-semibold rounded-full transition-all"
          >
            Sign In
          </button>
        </div>
      </form>
    </AuthLayout>
  );
}
