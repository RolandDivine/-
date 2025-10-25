const swaggerJSDoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Pandora Intel API',
      version: '1.0.0',
      description: 'AI-powered cryptocurrency trading platform API',
      contact: {
        name: 'Pandora Intel Team',
        email: 'support@pandora-intel.com'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: process.env.API_URL || 'http://localhost:5000',
        description: 'Development server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            username: { type: 'string' },
            email: { type: 'string', format: 'email' },
            firstName: { type: 'string' },
            lastName: { type: 'string' },
            role: { type: 'string', enum: ['user', 'admin'] },
            createdAt: { type: 'string', format: 'date-time' },
            lastLogin: { type: 'string', format: 'date-time' }
          }
        },
        TradingSignal: {
          type: 'object',
          properties: {
            signalId: { type: 'string' },
            type: { type: 'string', enum: ['quick', 'spot', 'hodl', 'degen'] },
            asset: {
              type: 'object',
              properties: {
                symbol: { type: 'string' },
                name: { type: 'string' },
                price: { type: 'number' }
              }
            },
            signal: {
              type: 'object',
              properties: {
                action: { type: 'string', enum: ['buy', 'sell', 'hold'] },
                confidence: { type: 'number', minimum: 0, maximum: 100 },
                expectedROI: {
                  type: 'object',
                  properties: {
                    min: { type: 'number' },
                    max: { type: 'number' }
                  }
                }
              }
            },
            status: { type: 'string', enum: ['active', 'executed', 'expired', 'cancelled'] },
            createdAt: { type: 'string', format: 'date-time' },
            expiresAt: { type: 'string', format: 'date-time' }
          }
        },
        Error: {
          type: 'object',
          properties: {
            error: { type: 'string' },
            message: { type: 'string' }
          }
        }
      }
    },
    security: [
      {
        bearerAuth: []
      }
    ]
  },
  apis: ['./routes/*.js', './index.js']
};

const specs = swaggerJSDoc(options);

module.exports = {
  swaggerUi,
  specs
};
