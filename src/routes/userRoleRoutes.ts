import { Router } from 'express';
import userRoleController from '../controllers/userRoleController';

const userRoleRoutes = Router();

userRoleRoutes.get('/user/:user_id', userRoleController.getUserRoles);
userRoleRoutes.post('/user/:user_id', userRoleController.addUserRoles);
userRoleRoutes.put('/user/:user_id', userRoleController.replaceUserRoles);
userRoleRoutes.delete('/user/:user_id/role/:role_id', userRoleController.destroyUserRole);

export default userRoleRoutes;
