import { Component } from 'react';
import { Pane, SelectMenu, Button, Paragraph, CaretDownIcon } from 'evergreen-ui';
import { debug } from '../../../helpers/debug';
import TooltipLabel from '../tooltip-label/TooltipLabel';
import RawHTML from '../raw-html/RawHTML';

export default class MultiSelectField extends Component {

  constructor(props) {
    super(props);
    this.state = {
      options: props.options || [],
      selected: props.selected || [],
      selectedLabels: []
    };
    this.setHeight(this.state.options.length);
  }

  componentDidMount() {
    this.setState({
      selectedLabels: this.getSelectedLabels(this.state.selected)
    });
  }

  componentDidUpdate(prevProps, prevState) {
    //debug.log({ props: this.props, prevProps: prevProps, state: this.state, prevState: prevState });
    if (this.props.options && prevProps.options) {
      // check for options change
      if (this.props.options.length !== prevProps.options.length && this.props.options.length !== this.state.options.length) {
        debug.warn('options has changed:', this.props.options);
        this.setState({ options: this.props.options });
        this.setHeight(this.props.options.length);
      }
      // check for selected change
      if (this.props.selected.length !== prevProps.selected.length && this.props.selected.length !== this.state.selected.length) {
        debug.warn('selected has changed:', this.props.selected);
        this.setState({
          selected: this.props.selected,
          selectedLabels: this.getSelectedLabels(this.props.selected)
        });
      }
    }
  }

  setHeight = (optionsCount) => {
    this.height = 33 * optionsCount;
  }

  getSelectedLabels = (selected) => {
    const labels = [];
    for (const option of this.state.options) { // looping on the options state to keep the same elements order
      if (selected.indexOf(option.value) !== -1) {
        labels.push(option.label);
      }
    }
    return labels;
  }

  handleChange = (value) => {
    this.setState({
      selected: value,
      selectedLabels: this.getSelectedLabels(value)
    });
    if (this.props.onChange) {
      this.props.onChange(value);
    }
  }

  render() {
    return (
      <Pane
        padding={this.props.padding}
        paddingX={this.props.paddingX || this.props.padding}
        paddingY={this.props.paddingY || this.props.padding}
        paddingTop={this.props.paddingTop || this.props.paddingY}
        paddingBottom={this.props.paddingBottom || this.props.paddingY}
        paddingLeft={this.props.paddingLeft || this.props.paddingX}
        paddingRight={this.props.paddingRight || this.props.paddingX}
        margin={this.props.margin}
        marginX={this.props.marginX || this.props.margin}
        marginY={this.props.marginY || this.props.margin}
        marginTop={this.props.marginTop || this.props.marginY}
        marginBottom={this.props.marginBottom || this.props.marginY}
        marginLeft={this.props.marginLeft || this.props.marginX}
        marginRight={this.props.marginRight || this.props.marginX}
      >
        <Pane display="flex">
          <Pane display="flex" alignItems="center" flex={1}>
            <TooltipLabel
              text={this.props.label}
              size={this.props.labelSize}
              color={this.props.labelColor}
              className={this.props.labelClassName}
              tooltip={this.props.tooltip}
              tooltipPosition={this.props.tooltipPosition}
            />
          </Pane>
          <Pane display="flex" alignItems="center">
            <SelectMenu
              isMultiSelect={true}
              hasTitle={false}
              hasFilter={false}
              height={this.height}
              position={this.props.position}
              options={this.state.options}
              selected={this.state.selected}
              onSelect={item => {
                const selectedItems = [...this.state.selected, item.value];
                this.handleChange(selectedItems);
              }}
              onDeselect={item => {
                const deselectedItemIndex = this.state.selected.indexOf(item.value);
                const selectedItems = this.state.selected.filter((_item, i) => i !== deselectedItemIndex);
                this.handleChange(selectedItems);
              }}
            >
              <Button iconAfter={CaretDownIcon} disabled={this.props.disabled}>
                {this.state.selectedLabels.join(', ') || this.props.placeholder || '...'}
              </Button>
            </SelectMenu>
          </Pane>
        </Pane>
        {this.props.hint &&
          <Paragraph size={300} color="muted" marginTop={6}>
            <RawHTML>{this.props.hint}</RawHTML>
          </Paragraph>
        }
      </Pane>
    );
  }

}
