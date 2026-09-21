import React from "react";
import { useSearchParams } from 'react-router-dom';

import { confirmSignUp, resendConfirmationCode } from '../lib/auth';
import { describeAuthError } from '../lib/authErrors';
import AuthShell, { AuthField, AuthError, AuthButton } from '../components/AuthShell';

export default function ConfirmationPage() {
  const [email, setEmail] = React.useState('');
  const [username, setUsername] = React.useState('');
  const [code, setCode] = React.useState('');
  const [errors, setErrors] = React.useState('');
  const [codeSent, setCodeSent] = React.useState(false);

  const [searchParams] = useSearchParams();

  // Cognito needs the real username here, not the email alias, pre-confirmation.
  const resend_code = async (event) => {
    setErrors('')
    try {
      await resendConfirmationCode(username);
      setCodeSent(true);
    } catch (error) {
      setErrors(describeAuthError(error))
    }
  }

  const onsubmit = async (event) => {
    event.preventDefault();
    setErrors('')
    try {
      await confirmSignUp(username, code);
      window.location.href = "/signin"
    } catch (error) {
      setErrors(describeAuthError(error))
    }
    return false
  }

  React.useEffect(()=>{
    const email_param = searchParams.get('email');
    if (email_param) {
      setEmail(email_param)
    }
    const username_param = searchParams.get('username');
    if (username_param) {
      setUsername(username_param)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <AuthShell title="Confirm your email">
      <form onSubmit={onsubmit}>
        <AuthField id="email" label="Email" type="text" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <AuthField id="username" label="Username" type="text" autoComplete="username" value={username} onChange={(e) => setUsername(e.target.value)} />
        <AuthField id="code" label="Confirmation Code" type="text" autoComplete="one-time-code" value={code} onChange={(e) => setCode(e.target.value)} />
        <AuthError>{errors}</AuthError>
        <AuthButton type="submit">Confirm Email</AuthButton>
      </form>
      <div className="text-center mt-4">
        {codeSent ? (
          <p className="text-sm text-emerald-400">A new activation code has been sent to your email.</p>
        ) : (
          <button onClick={resend_code} className="text-sm text-emerald-400 hover:text-emerald-300">
            Resend activation code
          </button>
        )}
      </div>
    </AuthShell>
  );
}
