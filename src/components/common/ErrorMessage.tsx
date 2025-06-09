import type { FC } from 'react';

interface ErrorMessageProps { message: string; }

const ErrorMessage: FC<ErrorMessageProps> = ({ message }) => (
  <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-md border border-red-200 dark:border-red-800 mt-4">
    <p>{message}</p>
  </div>
);

export default ErrorMessage;
