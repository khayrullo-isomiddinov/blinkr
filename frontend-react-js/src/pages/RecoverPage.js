import React from "react";
import { Link } from "react-router-dom";

import { forgotPassword, forgotPasswordSubmit } from '../lib/auth';
import { describeAuthError } from '../lib/authErrors';

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
    <div>
      <h1>{titles[formState]}</h1>

      {formState === 'send_code' && (
        <form onSubmit={onsubmit_send_code}>
          <div>
            <label htmlFor="username">Email</label>
            <input id="username" type="text" autoComplete="email" value={username} onChange={(e) => setUsername(e.target.value)} />
          </div>
          {errors && <div>{errors}</div>}
          <button type="submit">Send Recovery Code</button>
        </form>
      )}

      {formState === 'confirm_code' && (
        <form onSubmit={onsubmit_confirm_code}>
          <div>
            <label htmlFor="code">Reset Password Code</label>
            <input id="code" type="text" autoComplete="one-time-code" value={code} onChange={(e) => setCode(e.target.value)} />
          </div>
          <div>
            <label htmlFor="password">New Password</label>
            <input id="password" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <div>
            <label htmlFor="passwordAgain">New Password Again</label>
            <input id="passwordAgain" type="password" autoComplete="new-password" value={passwordAgain} onChange={(e) => setPasswordAgain(e.target.value)} />
          </div>
          {errors && <div>{errors}</div>}
          <button type="submit">Reset Password</button>
        </form>
      )}

      {formState === 'success' && (
        <div>
          <p>Your password has been successfully reset!</p>
          <Link to="/signin">Proceed to Sign In</Link>
        </div>
      )}
    </div>
  );
}
