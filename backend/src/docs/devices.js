/**
 * @swagger
 * tags:
 *   name: Devices
 *   description: Device pairing and management
 */

/**
 * @swagger
 * /devices/pair:
 *   post:
 *     tags: [Devices]
 *     summary: Generate a pairing code for a child's device
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [childId]
 *             properties:
 *               childId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Pairing code generated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 pairingCode:
 *                   type: string
 *                 expiresAt:
 *                   type: string
 *                   format: date-time
 *       403:
 *         description: Email not verified
 *       404:
 *         description: Child not found
 */

/**
 * @swagger
 * /devices/complete-pairing:
 *   post:
 *     tags: [Devices]
 *     summary: Complete device pairing with a code (called from child device)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [pairingCode, deviceName, platform]
 *             properties:
 *               pairingCode:
 *                 type: string
 *               deviceName:
 *                 type: string
 *               platform:
 *                 type: string
 *                 enum: [android, ios]
 *               deviceModel:
 *                 type: string
 *               osVersion:
 *                 type: string
 *     responses:
 *       200:
 *         description: Pairing complete, device token returned
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 deviceToken:
 *                   type: string
 *                 childId:
 *                   type: string
 *                 deviceId:
 *                   type: string
 *       400:
 *         description: Invalid or expired pairing code
 */

/**
 * @swagger
 * /devices/heartbeat:
 *   post:
 *     tags: [Devices]
 *     summary: Device heartbeat to report online status
 *     security:
 *       - DeviceAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               batteryLevel:
 *                 type: integer
 *               location:
 *                 type: object
 *                 properties:
 *                   latitude:
 *                     type: number
 *                   longitude:
 *                     type: number
 *     responses:
 *       200:
 *         description: Heartbeat acknowledged
 *       401:
 *         description: Invalid device token
 */

/**
 * @swagger
 * /devices/sync-apps:
 *   post:
 *     tags: [Devices]
 *     summary: Sync installed apps list from child device
 *     security:
 *       - DeviceAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [apps]
 *             properties:
 *               apps:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     packageName:
 *                       type: string
 *                     appName:
 *                       type: string
 *                     category:
 *                       type: string
 *     responses:
 *       200:
 *         description: Apps synced
 */

/**
 * @swagger
 * /devices/sos:
 *   post:
 *     tags: [Devices]
 *     summary: Trigger SOS alert from child device
 *     security:
 *       - DeviceAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               location:
 *                 type: object
 *                 properties:
 *                   latitude:
 *                     type: number
 *                   longitude:
 *                     type: number
 *     responses:
 *       200:
 *         description: SOS alert sent to parent
 */

/**
 * @swagger
 * /devices/report-permission:
 *   post:
 *     tags: [Devices]
 *     summary: Report device permission status
 *     security:
 *       - DeviceAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               permissions:
 *                 type: object
 *                 description: Key-value map of permission names to granted status
 *     responses:
 *       200:
 *         description: Permission status recorded
 */

/**
 * @swagger
 * /devices/child/{childId}:
 *   get:
 *     tags: [Devices]
 *     summary: List all devices for a child
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
 *         description: Array of devices
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Device'
 */

/**
 * @swagger
 * /devices/{id}/status:
 *   get:
 *     tags: [Devices]
 *     summary: Get device status
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
 *         description: Device status
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Device'
 *       404:
 *         description: Device not found
 */

/**
 * @swagger
 * /devices/{id}/installed-apps:
 *   get:
 *     tags: [Devices]
 *     summary: Get installed apps on a device
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
 *         description: List of installed apps
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   packageName:
 *                     type: string
 *                   appName:
 *                     type: string
 *                   category:
 *                     type: string
 */

/**
 * @swagger
 * /devices/{id}/command:
 *   post:
 *     tags: [Devices]
 *     summary: Send a command to a child device
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [command]
 *             properties:
 *               command:
 *                 type: string
 *                 enum: [lock, unlock, ring, wipe]
 *               payload:
 *                 type: object
 *     responses:
 *       200:
 *         description: Command sent
 *       404:
 *         description: Device not found or offline
 */

/**
 * @swagger
 * /devices/{id}:
 *   delete:
 *     tags: [Devices]
 *     summary: Unpair a device
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
 *         description: Device unpaired
 *       404:
 *         description: Device not found
 */
