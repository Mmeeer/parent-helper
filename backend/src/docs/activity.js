/**
 * @swagger
 * tags:
 *   name: Activity
 *   description: Activity tracking and monitoring
 */

/**
 * @swagger
 * /activity/sync:
 *   post:
 *     tags: [Activity]
 *     summary: Upload activity data from child device
 *     security:
 *       - DeviceAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               apps:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     packageName:
 *                       type: string
 *                     durationMinutes:
 *                       type: number
 *                     timestamp:
 *                       type: string
 *                       format: date-time
 *               web:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     url:
 *                       type: string
 *                     title:
 *                       type: string
 *                     timestamp:
 *                       type: string
 *                       format: date-time
 *               location:
 *                 type: object
 *                 properties:
 *                   latitude:
 *                     type: number
 *                   longitude:
 *                     type: number
 *                   timestamp:
 *                     type: string
 *                     format: date-time
 *     responses:
 *       200:
 *         description: Activity synced
 *       429:
 *         description: Rate limited
 */

/**
 * @swagger
 * /activity/{childId}/summary:
 *   get:
 *     tags: [Activity]
 *     summary: Get activity summary for a child
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: childId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: date
 *         schema:
 *           type: string
 *           format: date
 *         description: Date for summary (defaults to today)
 *     responses:
 *       200:
 *         description: Activity summary
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 totalScreenTimeMinutes:
 *                   type: number
 *                 topApps:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       packageName:
 *                         type: string
 *                       appName:
 *                         type: string
 *                       durationMinutes:
 *                         type: number
 *                 webVisits:
 *                   type: integer
 *                 lastLocation:
 *                   type: object
 *                   properties:
 *                     latitude:
 *                       type: number
 *                     longitude:
 *                       type: number
 *                     timestamp:
 *                       type: string
 *                       format: date-time
 */

/**
 * @swagger
 * /activity/{childId}/apps:
 *   get:
 *     tags: [Activity]
 *     summary: Get app usage history for a child
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: childId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: date
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: days
 *         schema:
 *           type: integer
 *         description: Number of days to look back
 *     responses:
 *       200:
 *         description: App usage data
 */

/**
 * @swagger
 * /activity/{childId}/web:
 *   get:
 *     tags: [Activity]
 *     summary: Get web browsing history for a child
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: childId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: date
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Web browsing history
 */

/**
 * @swagger
 * /activity/{childId}/location:
 *   get:
 *     tags: [Activity]
 *     summary: Get location history for a child
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: childId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: date
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Location history
 */

/**
 * @swagger
 * /activity/{childId}/daily-breakdown:
 *   get:
 *     tags: [Activity]
 *     summary: Get daily breakdown of activity
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: childId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: date
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Hourly breakdown of screen time
 */
