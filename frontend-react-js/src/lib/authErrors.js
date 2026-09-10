// Maps Cognito error codes to plain-language messages.
const MESSAGES = {
  UserNotFoundException: 'No account with that email.',
  NotAuthorizedException: 'Incorrect email or password.',
  UsernameExistsException: 'That username is already taken.',
  CodeMismatchException: 'That code is incorrect.',
  ExpiredCodeException: 'That code has expired -- request a new one.',
  LimitExceededException: 'Too many attempts. Try again in a few minutes.',
};

export function describeAuthError(error) {
  return MESSAGES[error.code] || error.message || 'Something went wrong.';
}
