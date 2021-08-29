
export const isDevEnv = !process.env.NODE_ENV || process.env.NODE_ENV === 'development';

export class debug {

  static log(message, ...params) {
    isDevEnv && console.log(message, ...params);
  }
  
  static warn(message, ...params) {
    isDevEnv && console.warn(message, ...params);
  }

}
export class report {

  static error(message, ...params) {
    !isDevEnv && console.error(message, ...params);
  }

}
