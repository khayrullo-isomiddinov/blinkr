import React from "react";
import { Link } from "react-router-dom";

import { signIn } from '../lib/auth';
import { describeAuthError } from '../lib/authErrors';
import AuthShell, { AuthField, AuthError, AuthButton } from '../components/AuthShell';

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

  return (
    <AuthShell
      title="Sign into your Blinkr account"
      footer={<>Don't have an account? <Link to="/signup" className="text-emerald-400 hover:text-emerald-300">Sign up</Link></>}
    >
      <form onSubmit={onsubmit}>
        <AuthField id="email" label="Email" type="text" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <AuthField id="password" label="Password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        <AuthError>{errors}</AuthError>
        <p className="text-right mb-4 -mt-2">
          <Link to="/forgot" className="text-sm text-emerald-400 hover:text-emerald-300">Forgot password?</Link>
        </p>
        <AuthButton type="submit">Sign In</AuthButton>
      </form>
    </AuthShell>
  );
}
