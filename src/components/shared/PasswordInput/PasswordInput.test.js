import { render, screen, fireEvent } from "@testing-library/react";
import { PasswordInput } from ".";

const password = {
  value: 'p@ssword',
  replacement: 'test1234'
};

it('renders correctly', () => {
  const { asFragment } = render(<PasswordInput value={password.value} />);
  expect(asFragment()).toMatchSnapshot();
});

it('handles value change', () => {
  const handleChange = jest.fn();
  const { container } = render(<PasswordInput value={password.value} onChange={handleChange} />);
  const passwordInput = container.querySelector('input[type="password"]');
  expect(passwordInput.value).toBe(password.value);
  fireEvent.change(passwordInput, { target: { value: password.replacement } });
  expect(handleChange).toHaveBeenCalledTimes(1);
  expect(passwordInput.value).toBe(password.replacement);
});

it('toggles password visibility', () => {
  const { container } = render(<PasswordInput value={password.value} />);
  const passwordInput = container.querySelector('input[type="password"]');
  expect(passwordInput.getAttribute('type')).toBe('password');
  const toggleButton = screen.getByRole('button', { selector: '.password-toggle' });
  fireEvent.click(toggleButton);
  expect(passwordInput.getAttribute('type')).toBe('text');
});
