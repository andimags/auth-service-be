import { Router } from 'express';
import policyController from '../controllers/policyController';
import hasAnyPermission from '../middlewares/hasAnyPermission';
import { validationMiddleware } from '../middlewares/validationMiddleware';
import { addValidator } from '../validators/policy/addValidator';
import { deleteValidator } from '../validators/policy/deleteValidator';
import { findValidator } from '../validators/policy/findValidator';
import { updateValidator } from '../validators/policy/updateValidator';

const policyRoutes = Router();

policyRoutes.get(
    '/',
    hasAnyPermission(['view:policy', 'admin:policy'], false),
    policyController.getAll
);

policyRoutes.get(
    '/:policy_id',
    hasAnyPermission(['view:policy', 'admin:policy'], false),
    validationMiddleware(findValidator),
    policyController.find
);

policyRoutes.post(
    '/',
    hasAnyPermission(['add:policy', 'admin:policy'], false),
    validationMiddleware(addValidator),
    policyController.add
);

policyRoutes.put(
    '/:policy_id',
    hasAnyPermission(['update:policy', 'admin:policy'], false),
    validationMiddleware(updateValidator),
    policyController.update
);

policyRoutes.delete(
    '/:policy_id',
    hasAnyPermission(['delete:policy', 'admin:policy'], false),
    validationMiddleware(deleteValidator),
    policyController.destroy
);

export default policyRoutes;
