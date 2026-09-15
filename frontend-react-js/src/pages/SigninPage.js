import React from "react";
import { Link } from "react-router-dom";

import { signIn } from '../lib/auth';
import { describeAuthError } from '../lib/authErrors';

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
    <div>
      <h1>Sign into your Blinkr account</h1>
      <form onSubmit={onsubmit}>
        <div>
          <label htmlFor="email">Email</label>
          <input id="email" type="text" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div>
          <label htmlFor="password">Password</label>
          <input id="password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        {errors && <div>{errors}</div>}
        <p><Link to="/forgot">Forgot password?</Link></p>
        <button type="submit">Sign In</button>
      </form>
      <p>Don't have an account? <Link to="/signup">Sign up</Link></p>
    </div>
  );
}
