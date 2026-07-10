import bcrypt from 'bcrypt';
import { BCRYPT_SALT_ROUNDS } from '../constants/auth';

export default function hashPassword(password: string) {
    return bcrypt.hashSync(password, BCRYPT_SALT_ROUNDS);
}
