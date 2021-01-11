import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import Settings from "./Settings";

it('renders all tabs', () => {
  render(<Settings />);
  const blocking = screen.getByRole('tab', { name: /blocking/i });
  const schedule = screen.getByRole('tab', { name: /schedule/i });
  const password = screen.getByRole('tab', { name: /password/i });
  const blacklist = screen.getByRole('tab', { name: /blacklist/i });
  const whitelist = screen.getByRole('tab', { name: /whitelist/i });
  const miscellaneous = screen.getByRole('tab', { name: /miscellaneous/i });
  expect(blocking).toBeInTheDocument();
  expect(schedule).toBeInTheDocument();
  expect(password).toBeInTheDocument();
  expect(blacklist).toBeInTheDocument();
  expect(whitelist).toBeInTheDocument();
  expect(miscellaneous).toBeInTheDocument();
});

it('renders save button', () => {
  render(<Settings />);
  const saveButton = screen.getByRole('button', { name: 'save' });
  expect(saveButton).toBeInTheDocument();
});

// it('saves settings on save button click', async () => {
//   const { container } = render(<Settings />);
//   const saveButton = screen.getByRole('button', { name: 'save' });
//   fireEvent.click(saveButton);
//   const saveSuccessText = await waitFor(() => screen.getByText(/settingsSaved/i), { container });
//   expect(saveSuccessText).toBeInTheDocument();
// });
