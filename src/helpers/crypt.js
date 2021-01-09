import bcrypt from 'bcryptjs';

export function hash(password) {
  if (!password || password.length === 0) {
    return '';
  }
  return bcrypt.hashSync(password, 10);
}

export function compare(password, hash) {
  return bcrypt.compareSync(password, hash);
}
