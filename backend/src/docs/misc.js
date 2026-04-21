/**
 * @swagger
 * tags:
 *   name: Geocode
 *   description: Geocoding utilities
 */

/**
 * @swagger
 * /geocode/reverse:
 *   post:
 *     tags: [Geocode]
 *     summary: Reverse geocode coordinates to address
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [latitude, longitude]
 *             properties:
 *               latitude:
 *                 type: number
 *               longitude:
 *                 type: number
 *     responses:
 *       200:
 *         description: Address result
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 address:
 *                   type: string
 *                 cached:
 *                   type: boolean
 */

/**
 * @swagger
 * tags:
 *   name: System
 *   description: System and health endpoints
 */

/**
 * @swagger
 * /health:
 *   get:
 *     tags: [System]
 *     summary: Health check endpoint
 *     responses:
 *       200:
 *         description: Service healthy
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/HealthCheck'
 *       503:
 *         description: Service unhealthy (database disconnected)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/HealthCheck'
 */

/**
 * @swagger
 * /filters:
 *   get:
 *     tags: [System]
 *     summary: Get content filter domains (device endpoint)
 *     security:
 *       - DeviceAuth: []
 *     parameters:
 *       - in: query
 *         name: categories
 *         schema:
 *           type: array
 *           items:
 *             type: string
 *         description: Filter by categories
 *     responses:
 *       200:
 *         description: List of filtered domains
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   domain:
 *                     type: string
 *                   category:
 *                     type: string
 */
