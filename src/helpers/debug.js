import isDevEnv from './env';

export class debug {

  static log(message, ...params) {
    isDevEnv() && console.log(message, ...params);
  }
  
  static warn(message, ...params) {
    isDevEnv() && console.warn(message, ...params);
  }

}
