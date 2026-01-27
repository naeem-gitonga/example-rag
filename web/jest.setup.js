import '@testing-library/jest-dom';

// Mock next/link
jest.mock('next/link', () => {
  return ({ children, href, className }) => {
    return <a href={href} className={className}>{children}</a>;
  };
});
