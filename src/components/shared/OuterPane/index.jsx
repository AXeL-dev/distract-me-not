import React from 'react';
import { Pane, Position } from 'evergreen-ui';

export function OuterPane(props) {
  const flexDirection = props.position === Position.LEFT ? 'row-reverse' : null;

  return (
    <Pane
      display={props.display}
      flexDirection={flexDirection}
      padding={props.padding}
      paddingX={props.paddingX || props.padding}
      paddingY={props.paddingY || props.padding}
      paddingTop={props.paddingTop || props.paddingY}
      paddingBottom={props.paddingBottom || props.paddingY}
      paddingLeft={props.paddingLeft || props.paddingX}
      paddingRight={props.paddingRight || props.paddingX}
      margin={props.margin}
      marginX={props.marginX || props.margin}
      marginY={props.marginY || props.margin}
      marginTop={props.marginTop || props.marginY}
      marginBottom={props.marginBottom || props.marginY}
      marginLeft={props.marginLeft || props.marginX}
      marginRight={props.marginRight || props.marginX}
      gap={props.gap}
    >
      {props.children}
    </Pane>
  );
}
