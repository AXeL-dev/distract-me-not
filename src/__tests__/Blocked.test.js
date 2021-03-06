import React from 'react';
import { render, screen } from "@testing-library/react";
import { Blocked } from "components";

it('renders nothing when isBlank prop is true', () => {
  const { container } = render(<Blocked isBlank={true} />);
  expect(container).toBeEmptyDOMElement();
});

it('renders the provided message prop', () => {
  render(<Blocked message="Hello world!" isBlank={false} />);
  const message = screen.getByText('Hello world!', { selector: '.distract-overlay-top-text' });
  expect(message).toBeInTheDocument();
});
