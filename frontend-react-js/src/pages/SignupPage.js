import React from "react";
import { Link, useSearchParams } from "react-router-dom";

import { signUp } from '../lib/auth';
import { describeAuthError } from '../lib/authErrors';

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
    <div>
      <h1>Sign up to create a Blinkr account</h1>
      <form onSubmit={onsubmit}>
        <div>
          <label htmlFor="name">Name</label>
          <input id="name" type="text" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <label htmlFor="email">Email</label>
          <input id="email" type="text" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div>
          <label htmlFor="username">Username</label>
          <input id="username" type="text" autoComplete="username" value={username} onChange={(e) => setUsername(e.target.value)} />
        </div>
        <div>
          <label htmlFor="password">Password</label>
          <input id="password" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        {errors && <div>{errors}</div>}
        <button type="submit">Sign Up</button>
      </form>
      <p>Already have an account? <Link to="/signin">Sign in</Link></p>
    </div>
  );
}
