import { Component, Fragment } from 'react';
import { translate } from '../../helpers/i18n';
import { storage } from '../../helpers/webext';
import './Blocked.scss';

export default class Blocked extends Component {

  constructor(props) {
    super(props);
    this.state = {
      message: props.message || translate('defaultBlockingMessage'),
      isBlank: props.isBlank || false
    };
  }

  componentDidMount() {
    storage.get({
      message: this.state.message,
      displayBlankPage: this.state.isBlank
    }).then((items) => {
      if (items) {
        this.setState({
          message: items.message.length ? items.message : this.state.message,
          isBlank: items.displayBlankPage
        });
      }
    });
  }

  render() {
    return (
      <Fragment>
        {!this.state.isBlank &&
          <div className="distract-cursor distract-select distract-overlay-container">
            <div className="distract-cursor distract-select distract-overlay">
              <div className="distract-cursor distract-select distract-info-container">
                <span className="distract-cursor distract-select distract-overlay-top-text">
                  {this.state.message}
                </span>
                <div className="distract-cursor distract-select distract-overlay-img"></div>
              </div>
            </div>
          </div>
        }
      </Fragment>
    );
  }
}
