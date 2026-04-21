/**
 * @swagger
 * tags:
 *   name: Children
 *   description: Child profile management
 */

/**
 * @swagger
 * /children:
 *   post:
 *     tags: [Children]
 *     summary: Create a child profile
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, age]
 *             properties:
 *               name:
 *                 type: string
 *               age:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 18
 *     responses:
 *       201:
 *         description: Child created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Child'
 *       400:
 *         description: Validation error
 *       403:
 *         description: Email not verified or subscription limit reached
 *   get:
 *     tags: [Children]
 *     summary: List all children for current parent
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Array of children
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Child'
 */

/**
 * @swagger
 * /children/{id}:
 *   put:
 *     tags: [Children]
 *     summary: Update a child profile
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
 *               age:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 18
 *     responses:
 *       200:
 *         description: Child updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Child'
 *       404:
 *         description: Child not found
 *   delete:
 *     tags: [Children]
 *     summary: Delete a child profile
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
 *         description: Child deleted
 *       404:
 *         description: Child not found
 */
