const express = require('express');
const router = express.Router();
const passwordController = require('../controllers/passwordController');

// Replace existing routes with these
router.post('/request-reset', passwordController.requestReset);
router.post('/validate-token', passwordController.validateToken);
router.post('/update-password', passwordController.updatePassword);

module.exports = router;