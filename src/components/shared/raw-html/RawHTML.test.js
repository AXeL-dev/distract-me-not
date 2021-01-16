import { render } from "@testing-library/react";
import RawHTML from "./RawHTML";

it('renders correctly', () => {
  const html = '<span>Hello world!</span>';
  const { asFragment } = render(<RawHTML>{html}</RawHTML>);
  expect(asFragment()).toMatchSnapshot();
});
