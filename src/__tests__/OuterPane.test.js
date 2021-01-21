import { render } from "@testing-library/react";
import { OuterPane } from "../components";

it('renders correctly', () => {
  const { asFragment } = render(
    <OuterPane>
      <span>Children</span>
    </OuterPane>
  );
  expect(asFragment()).toMatchSnapshot();
});
