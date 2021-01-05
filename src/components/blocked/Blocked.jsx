import { Component, Fragment } from 'react';
import { translate } from '../../helpers/i18n';
import { storage } from '../../helpers/webext';
import './Blocked.scss';

export default class Blocked extends Component {

  constructor(props) {
    super(props);
    this.state = {
      message: translate('defaultBlockingMessage'),
      displayBlankPage: false
    };
  }

  componentDidMount() {
    storage.get({
      message: this.state.message,
      displayBlankPage: this.state.displayBlankPage
    }).then((items) => {
      if (items) {
        this.setState({
          message: items.message.length ? items.message : this.state.message,
          displayBlankPage: items.displayBlankPage
        });
      }
    });
  }

  render() {
    return (
      <Fragment>
        {!this.state.displayBlankPage &&
          <div class="distract-cursor distract-select distract-overlay-container">
            <div class="distract-cursor distract-select distract-overlay">
              <div class="distract-cursor distract-select distract-info-container">
                <span class="distract-cursor distract-select distract-overlay-top-text">
                  {this.state.message}
                </span>
                <div class="distract-cursor distract-select distract-overlay-img"></div>
              </div>
            </div>
          </div>
        }
      </Fragment>
    );
  }
}
