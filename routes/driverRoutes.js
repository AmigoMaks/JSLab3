const express = require('express');
const driverController = require('../controllers/driverController');
const { statsCollector } = require('../middlewares/middlewares');
const router = express.Router();

router.use(statsCollector);

router.get('/', driverController.getAllDrivers);
router.get('/:id', driverController.getDriverById);
router.post('/', driverController.createDriver);
router.delete('/:id', driverController.deleteDriver);

module.exports = router;