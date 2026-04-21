/**
 * @swagger
 * tags:
 *   name: Geofences
 *   description: Location-based geofence zones
 */

/**
 * @swagger
 * /geofences/{childId}:
 *   get:
 *     tags: [Geofences]
 *     summary: List geofences for a child
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
 *         description: Array of geofences
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Geofence'
 *   post:
 *     tags: [Geofences]
 *     summary: Create a geofence for a child
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
 *             type: object
 *             required: [name, latitude, longitude, radius]
 *             properties:
 *               name:
 *                 type: string
 *               latitude:
 *                 type: number
 *               longitude:
 *                 type: number
 *               radius:
 *                 type: number
 *                 description: Radius in meters
 *               type:
 *                 type: string
 *                 enum: [safe, restricted]
 *                 default: safe
 *     responses:
 *       201:
 *         description: Geofence created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Geofence'
 *       400:
 *         description: Validation error
 */

/**
 * @swagger
 * /geofences/{id}:
 *   put:
 *     tags: [Geofences]
 *     summary: Update a geofence
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
 *             properties:
 *               name:
 *                 type: string
 *               latitude:
 *                 type: number
 *               longitude:
 *                 type: number
 *               radius:
 *                 type: number
 *               type:
 *                 type: string
 *                 enum: [safe, restricted]
 *               active:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Geofence updated
 *       404:
 *         description: Geofence not found
 *   delete:
 *     tags: [Geofences]
 *     summary: Delete a geofence
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
 *         description: Geofence deleted
 *       404:
 *         description: Geofence not found
 */
