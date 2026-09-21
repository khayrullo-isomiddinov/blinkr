// Maps Cognito error codes to plain-language messages.
const MESSAGES = {
  // Same text for both so the sign-in form doesn't reveal whether an account exists.
  UserNotFoundException: 'Incorrect username or password.',
  NotAuthorizedException: 'Incorrect username or password.',
  UserNotConfirmedException: 'This account has not been confirmed yet.',
  PasswordResetRequiredException: 'A password reset is required for this account.',
  UsernameExistsException: 'That username is already taken.',
  CodeMismatchException: 'That code is incorrect.',
  ExpiredCodeException: 'That code has expired -- request a new one.',
  LimitExceededException: 'Too many attempts. Try again in a few minutes.',
  TooManyRequestsException: 'Too many attempts. Try again in a few minutes.',
};

export function describeAuthError(error) {
  return MESSAGES[error.code] || error.message || 'Something went wrong.';
}
