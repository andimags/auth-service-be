import bcrypt from 'bcrypt';

export default function hashPassowrd(password: string){
    return bcrypt.hashSync(password, 10)
}