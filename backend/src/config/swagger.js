const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'Parent Helper (Prime Kids) API',
      version: '1.0.0',
      description: 'REST API for the Parent Helper parental control application. Provides endpoints for user authentication, child management, device pairing, screen-time rules, activity monitoring, alerts, approval workflows, geofencing, subscriptions, and admin operations.',
      contact: {
        name: 'Parent Helper Team',
      },
    },
    servers: [
      {
        url: 'http://139.59.107.13:9093',
        description: 'Production server',
      },
      {
        url: 'http://localhost:5003',
        description: 'Local development server',
      },
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Parent JWT token obtained from /auth/login',
        },
        DeviceAuth: {
          type: 'apiKey',
          in: 'header',
          name: 'x-device-token',
          description: 'Device token obtained during pairing',
        },
        AdminAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Admin JWT token obtained from admin login',
        },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            error: { type: 'string' },
            errors: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  msg: { type: 'string' },
                  param: { type: 'string' },
                  location: { type: 'string' },
                },
              },
            },
          },
        },
        User: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            email: { type: 'string', format: 'email' },
            name: { type: 'string' },
            emailVerified: { type: 'boolean' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        Child: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            name: { type: 'string' },
            age: { type: 'integer', minimum: 1, maximum: 18 },
            parentId: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        Device: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            childId: { type: 'string' },
            deviceName: { type: 'string' },
            platform: { type: 'string', enum: ['android', 'ios'] },
            lastSeen: { type: 'string', format: 'date-time' },
            online: { type: 'boolean' },
          },
        },
        Geofence: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            childId: { type: 'string' },
            name: { type: 'string' },
            latitude: { type: 'number' },
            longitude: { type: 'number' },
            radius: { type: 'number', description: 'Radius in meters' },
            type: { type: 'string', enum: ['safe', 'restricted'] },
            active: { type: 'boolean' },
          },
        },
        Alert: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            parentId: { type: 'string' },
            childId: { type: 'string' },
            type: { type: 'string' },
            message: { type: 'string' },
            read: { type: 'boolean' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        Approval: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            childId: { type: 'string' },
            type: { type: 'string', enum: ['app', 'website'] },
            name: { type: 'string' },
            packageName: { type: 'string' },
            status: { type: 'string', enum: ['pending', 'approved', 'denied'] },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        Subscription: {
          type: 'object',
          properties: {
            key: { type: 'string' },
            maxKids: { type: 'integer' },
            currentKids: { type: 'integer' },
            expiresAt: { type: 'string', format: 'date-time' },
            activatedAt: { type: 'string', format: 'date-time' },
            durationMonths: { type: 'integer' },
            status: { type: 'string', enum: ['unused', 'active', 'expired', 'revoked'] },
          },
        },
        ScreenTimeRules: {
          type: 'object',
          properties: {
            dailyLimitMinutes: { type: 'integer', minimum: 0, maximum: 1440 },
            schedules: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  day: { type: 'string', enum: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] },
                  startTime: { type: 'string', pattern: '^\\d{2}:\\d{2}$' },
                  endTime: { type: 'string', pattern: '^\\d{2}:\\d{2}$' },
                },
              },
            },
            bedtime: {
              type: 'object',
              properties: {
                enabled: { type: 'boolean' },
                startTime: { type: 'string' },
                endTime: { type: 'string' },
              },
            },
          },
        },
        AppRules: {
          type: 'object',
          properties: {
            blocked: {
              type: 'array',
              items: { type: 'string' },
              description: 'List of blocked package names',
            },
            alwaysAllowed: {
              type: 'array',
              items: { type: 'string' },
              description: 'List of always-allowed package names',
            },
          },
        },
        WebFilterRules: {
          type: 'object',
          properties: {
            enabled: { type: 'boolean' },
            blockedCategories: {
              type: 'array',
              items: { type: 'string' },
            },
            customBlocked: {
              type: 'array',
              items: { type: 'string' },
            },
            customAllowed: {
              type: 'array',
              items: { type: 'string' },
            },
          },
        },
        HealthCheck: {
          type: 'object',
          properties: {
            status: { type: 'string', enum: ['ok', 'unhealthy'] },
            timestamp: { type: 'string', format: 'date-time' },
            uptime: { type: 'integer', description: 'Uptime in seconds' },
            db: { type: 'string', enum: ['connected', 'disconnected'] },
          },
        },
      },
    },
  },
  apis: ['./src/docs/*.js'],
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
