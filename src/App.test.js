import { render, screen } from '@testing-library/react';
import App from './App';

test('renders appName header', () => {
  render(<App />);
  const headerElement = screen.getByText(/appName/i);
  expect(headerElement).toBeInTheDocument();
});
