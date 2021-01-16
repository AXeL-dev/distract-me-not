import bcrypt from 'bcryptjs';

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
