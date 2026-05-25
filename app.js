const express = require('express');
const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('./swagger.json');

const driverRoutes = require('./routes/driverRoutes');
const { rateLimiter } = require('./middlewares/middlewares');
require('./subscriber');

const app = express();
app.use(express.json());

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.use(rateLimiter);

app.use('/api/drivers', driverRoutes);

module.exports = app;

/* istanbul ignore next */
if (require.main === module) {
    app.listen(3000, () => {
        console.log('Сервер запущено на порту 3000');
        console.log('http://localhost:3000/api-docs');
    });
}