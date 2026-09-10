import React from "react";
import { Link, useSearchParams } from "react-router-dom";

import { signUp } from '../lib/auth';
import { describeAuthError } from '../lib/authErrors';
import AuthLayout from '../components/auth/AuthLayout';
import AuthField from '../components/auth/AuthField';
import AuthError from '../components/auth/AuthError';

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

  const name_onchange = (event) => {
    setName(event.target.value);
  }
  const email_onchange = (event) => {
    setEmail(event.target.value);
  }
  const username_onchange = (event) => {
    setUsername(event.target.value);
  }
  const password_onchange = (event) => {
    setPassword(event.target.value);
  }

  return (
    <AuthLayout
      title="Sign up to create a Blinkr account"
      footer={
        <span>
          Already have an account? <Link to="/signin" className="text-primary hover:underline">Sign in</Link>
        </span>
      }
    >
      <form onSubmit={onsubmit} className="flex flex-col gap-space-md">
        <AuthField label="Name" type="text" value={name} onChange={name_onchange} autoComplete="name" />
        <AuthField label="Email" type="text" value={email} onChange={email_onchange} autoComplete="email" />
        <AuthField label="Username" type="text" value={username} onChange={username_onchange} autoComplete="username" />
        <AuthField label="Password" type="password" value={password} onChange={password_onchange} autoComplete="new-password" />
        <AuthError>{errors}</AuthError>
        <button
          type="submit"
          className="mt-space-xs px-space-lg py-space-sm bg-primary-container hover:bg-inverse-primary text-on-primary-container hover:text-on-surface font-label-md text-label-md font-semibold rounded-full transition-all"
        >
          Sign Up
        </button>
      </form>
    </AuthLayout>
  );
}
