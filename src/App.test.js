import { render, screen } from '@testing-library/react';
import App from './App';

test('renders appName header when access is allowed', () => {
  render(<App accessAllowed={true} />);
  const headerElement = screen.getByText(/appName/i);
  expect(headerElement).toBeInTheDocument();
});

test('renders password prompt when access is not allowed', () => {
  render(<App accessAllowed={false} />);
  const passwordInput = screen.getByPlaceholderText('password');
  expect(passwordInput).toBeInTheDocument();
});

test('renders nothing when accessAllowed prop is not defined', () => {
  const { container } = render(<App />);
  expect(container).toBeEmptyDOMElement();
});
