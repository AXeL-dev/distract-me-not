import { Component, Fragment } from 'react';
import { Tooltip, IconButton } from 'evergreen-ui';
import { debug } from '../../../helpers/debug';
import './AnimatedIconButton.scss';

export default class AnimatedIconButton extends Component {

  constructor(props) {
    super(props);
    this.state = {
      isVisible: this.props.isVisible ? this.props.isVisible : true, // do not use || operator with boolean values that takes "true" by default
      className: '',
      icon: this.props.icon,
      hideOnClick: this.props.hideOnClick,
    };
  }

  componentDidUpdate(prevProps, prevState) {
    //debug.log({ props: this.props, prevProps: prevProps, state: this.state, prevState: prevState });
    if (this.props.isVisible !== prevProps.isVisible && this.props.isVisible !== this.state.isVisible) {
      debug.warn('isVisible prop has changed:', this.props.isVisible);
      if (this.props.isVisible) {
        this.show();
      } else {
        this.hide();
      }
    }
  }

  setVisibilityProp = (value) => {
    if (this.props.onVisibilityChange) {
      this.props.onVisibilityChange(value);
    }
  }

  show = () => {
    this.setState({
      ...this.state,
      isVisible: true,
      className: '', // reset class
      icon: this.props.icon, // reset icon
    });
    this.setVisibilityProp(true);
  }

  hide = () => {
    this.setState({ ...this.state, isVisible: false });
    this.setVisibilityProp(false);
  }

  playHideAnimation = () => {
    // hide animation
    setTimeout(() => {
      this.setState({ ...this.state, className: 'scale-0' }); // scale to 0
      setTimeout(() => {
        if (this.props.hideAnimationIcon) {
          this.setState({ ...this.state, className: '', icon: this.props.hideAnimationIcon }); // change icon
          setTimeout(() => {
            this.setState({ ...this.state, className: 'scale-0' }); // rescale to 0
            setTimeout(() => {
              this.hide();
            }, 200);
          }, 500);
        } else {
          this.hide();
        }
      }, 200);
    }, 100);
  }

  handleClick = (event) => {
    if (this.props.onClick) {
      this.props.onClick(event);
      if (this.state.hideOnClick) {
        this.playHideAnimation();
      }
    }
  }

  render() {
    return (
      <Fragment>
        {this.state.isVisible &&
          <Tooltip content={this.props.tooltip} position={this.props.tooltipPosition}>
            <IconButton
              className={`animated-icon-button ${this.props.className} ${this.state.className}`}
              appearance="minimal"
              icon={this.state.icon}
              iconSize={this.props.iconSize || 22}
              onClick={this.handleClick}
            />
          </Tooltip>
        }
      </Fragment>
    );
  }
}
