import { generateToken } from './generateToken';
import { refreshToken } from './refreshToken';
import { destroyToken } from './destroyToken';
import { verifyToken } from './verifyToken';
import { me } from './me';
import { hasAnyPermission } from './hasAnyPermission';

export default {
    generateToken,
    refreshToken,
    destroyToken,
    verifyToken,
    me,
    hasAnyPermission
};
