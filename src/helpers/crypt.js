/* global dcodeIO */
// https://github.com/AXeL-dev/distract-me-not/issues/20#issuecomment-774486659
// import bcrypt from 'bcryptjs'; // @see https://github.com/dcodeIO/bcrypt.js/issues/70
const bcrypt = dcodeIO.bcrypt;

export function hash(password) {
  if (!password || password.length === 0) {
    return '';
  }
  return bcrypt.hashSync(password, 10);
}

export function compare(password, hash) {
  if (!hash) {
    return false;
  }
  return bcrypt.compareSync(password, hash);
}
