import { Pane, Position } from 'evergreen-ui';

export function OuterPane({
  children, display, position, 
  padding, paddingX, paddingY, paddingTop, paddingBottom, paddingLeft, paddingRight,
  margin, marginX, marginY, marginTop, marginBottom, marginLeft, marginRight
}) {
  const flexDirection = position === Position.LEFT ? 'row-reverse' : null;
  return (
    <Pane
      display={display}
      flexDirection={flexDirection}
      padding={padding}
      paddingX={paddingX || padding}
      paddingY={paddingY || padding}
      paddingTop={paddingTop || paddingY}
      paddingBottom={paddingBottom || paddingY}
      paddingLeft={paddingLeft || paddingX}
      paddingRight={paddingRight || paddingX}
      margin={margin}
      marginX={marginX || margin}
      marginY={marginY || margin}
      marginTop={marginTop || marginY}
      marginBottom={marginBottom || marginY}
      marginLeft={marginLeft || marginX}
      marginRight={marginRight || marginX}
    >
      {children}
    </Pane>
  );
};
