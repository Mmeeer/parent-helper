/**
 * @swagger
 * tags:
 *   name: Rules
 *   description: Screen time, app, and web filter rules management
 */

/**
 * @swagger
 * /rules/{childId}:
 *   get:
 *     tags: [Rules]
 *     summary: Get rules for a child (device endpoint)
 *     security:
 *       - DeviceAuth: []
 *     parameters:
 *       - in: path
 *         name: childId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: All rules for the child
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 screenTime:
 *                   $ref: '#/components/schemas/ScreenTimeRules'
 *                 apps:
 *                   $ref: '#/components/schemas/AppRules'
 *                 webFilter:
 *                   $ref: '#/components/schemas/WebFilterRules'
 *       404:
 *         description: Rules not found
 */

/**
 * @swagger
 * /rules/{childId}/view:
 *   get:
 *     tags: [Rules]
 *     summary: Get rules for a child (parent endpoint)
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: childId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: All rules for the child
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 screenTime:
 *                   $ref: '#/components/schemas/ScreenTimeRules'
 *                 apps:
 *                   $ref: '#/components/schemas/AppRules'
 *                 webFilter:
 *                   $ref: '#/components/schemas/WebFilterRules'
 */

/**
 * @swagger
 * /rules/{childId}/screen-time:
 *   put:
 *     tags: [Rules]
 *     summary: Set screen time rules for a child
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: childId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ScreenTimeRules'
 *     responses:
 *       200:
 *         description: Screen time rules updated
 *       403:
 *         description: Email not verified
 */

/**
 * @swagger
 * /rules/{childId}/apps:
 *   put:
 *     tags: [Rules]
 *     summary: Set app restriction rules for a child
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: childId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AppRules'
 *     responses:
 *       200:
 *         description: App rules updated
 *       403:
 *         description: Email not verified
 */

/**
 * @swagger
 * /rules/{childId}/web-filter:
 *   put:
 *     tags: [Rules]
 *     summary: Set web filter rules for a child
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: childId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/WebFilterRules'
 *     responses:
 *       200:
 *         description: Web filter rules updated
 *       403:
 *         description: Email not verified
 */
