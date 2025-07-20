import bcrypt from 'bcrypt';

export default function hashPassword(password: string) {
    return bcrypt.hashSync(password, 10);
}
