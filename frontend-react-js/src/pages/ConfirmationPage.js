import React from "react";
import { useSearchParams } from 'react-router-dom';

import { Auth } from 'aws-amplify';
import AuthLayout from '../components/auth/AuthLayout';
import AuthField from '../components/auth/AuthField';
import AuthError from '../components/auth/AuthError';

export default function ConfirmationPage() {
  const [email, setEmail] = React.useState('');
  const [username, setUsername] = React.useState('');
  const [code, setCode] = React.useState('');
  const [errors, setErrors] = React.useState('');
  const [codeSent, setCodeSent] = React.useState(false);

  const [searchParams] = useSearchParams();

  const code_onchange = (event) => {
    setCode(event.target.value);
  }
  const email_onchange = (event) => {
    setEmail(event.target.value);
  }
  const username_onchange = (event) => {
    setUsername(event.target.value);
  }

  // Cognito's email alias only resolves to the account's real username
  // *after* confirmation, so ConfirmSignUp/ResendSignUp must be called
  // with the username -- passing email here fails with
  // "Username/client id combination not found" on unconfirmed accounts.
  const resend_code = async (event) => {
    setErrors('')
    try {
      await Auth.resendSignUp(username);
      setCodeSent(true);
    } catch (error) {
      setErrors(error.message)
    }
  }

  const onsubmit = async (event) => {
    event.preventDefault();
    setErrors('')
    try {
      await Auth.confirmSignUp(username, code);
      window.location.href = "/signin"
    } catch (error) {
      setErrors(error.message)
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
  }, [])

  return (
    <AuthLayout title="Confirm your email">
      <form onSubmit={onsubmit} className="flex flex-col gap-space-md">
        <AuthField label="Email" type="text" value={email} onChange={email_onchange} autoComplete="email" />
        <AuthField label="Username" type="text" value={username} onChange={username_onchange} autoComplete="username" />
        <AuthField label="Confirmation Code" type="text" value={code} onChange={code_onchange} autoComplete="one-time-code" />
        <AuthError>{errors}</AuthError>
        <button
          type="submit"
          className="px-space-lg py-space-sm bg-primary-container hover:bg-inverse-primary text-on-primary-container hover:text-on-surface font-label-md text-label-md font-semibold rounded-full transition-all"
        >
          Confirm Email
        </button>
      </form>
      {codeSent ? (
        <div className="font-body-sm text-body-sm text-secondary text-center">
          A new activation code has been sent to your email.
        </div>
      ) : (
        <button onClick={resend_code} className="font-label-sm text-label-sm text-primary hover:underline">
          Resend activation code
        </button>
      )}
    </AuthLayout>
  );
}
