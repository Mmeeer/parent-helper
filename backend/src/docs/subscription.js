/**
 * @swagger
 * tags:
 *   name: Subscription
 *   description: Subscription management
 */

/**
 * @swagger
 * /subscription:
 *   get:
 *     tags: [Subscription]
 *     summary: Get current subscription status
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Subscription status
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 active:
 *                   type: boolean
 *                 subscription:
 *                   $ref: '#/components/schemas/Subscription'
 */

/**
 * @swagger
 * /subscription/activate:
 *   post:
 *     tags: [Subscription]
 *     summary: Activate a subscription key
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [key]
 *             properties:
 *               key:
 *                 type: string
 *                 description: Subscription key code
 *     responses:
 *       200:
 *         description: Subscription activated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 subscription:
 *                   $ref: '#/components/schemas/Subscription'
 *       404:
 *         description: Invalid key
 *       409:
 *         description: Key already active or user already has subscription
 *       410:
 *         description: Key expired
 */
