import React from "react";
import { Link, useSearchParams } from "react-router-dom";

import { signUp } from '../lib/auth';
import { describeAuthError } from '../lib/authErrors';
import AuthShell, { AuthField, AuthError, AuthButton } from '../components/AuthShell';

export default function SignupPage() {
  const [name, setName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [username, setUsername] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [errors, setErrors] = React.useState('');

  const [searchParams] = useSearchParams();

  React.useEffect(() => {
    const email_param = searchParams.get('email');
    if (email_param) {
      setEmail(email_param)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const onsubmit = async (event) => {
    event.preventDefault();
    setErrors('')
    try {
      await signUp({ name, email, username, password });
      window.location.href = `/confirm?email=${email}&username=${username}`
    } catch (error) {
      setErrors(describeAuthError(error))
    }
    return false
  }

  return (
    <AuthShell
      title="Sign up to create a Blinkr account"
      footer={<>Already have an account? <Link to="/signin" className="text-emerald-400 hover:text-emerald-300">Sign in</Link></>}
    >
      <form onSubmit={onsubmit}>
        <AuthField id="name" label="Name" type="text" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} />
        <AuthField id="email" label="Email" type="text" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <AuthField id="username" label="Username" type="text" autoComplete="username" value={username} onChange={(e) => setUsername(e.target.value)} />
        <AuthField id="password" label="Password" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        <AuthError>{errors}</AuthError>
        <AuthButton type="submit">Sign Up</AuthButton>
      </form>
    </AuthShell>
  );
}
