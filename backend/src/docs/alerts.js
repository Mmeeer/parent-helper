/**
 * @swagger
 * tags:
 *   name: Alerts
 *   description: Alert notifications management
 */

/**
 * @swagger
 * /alerts:
 *   get:
 *     tags: [Alerts]
 *     summary: List alerts for the current parent
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *       - in: query
 *         name: unreadOnly
 *         schema:
 *           type: boolean
 *     responses:
 *       200:
 *         description: Paginated list of alerts
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 alerts:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Alert'
 *                 total:
 *                   type: integer
 *                 page:
 *                   type: integer
 *                 pages:
 *                   type: integer
 */

/**
 * @swagger
 * /alerts/settings:
 *   get:
 *     tags: [Alerts]
 *     summary: Get alert type settings
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Alert settings
 *   post:
 *     tags: [Alerts]
 *     summary: Update alert type settings
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Settings updated
 */

/**
 * @swagger
 * /alerts/{id}/read:
 *   put:
 *     tags: [Alerts]
 *     summary: Mark a single alert as read
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Alert marked as read
 *       404:
 *         description: Alert not found
 */

/**
 * @swagger
 * /alerts/read-all:
 *   put:
 *     tags: [Alerts]
 *     summary: Mark all alerts as read
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: All alerts marked as read
 */
