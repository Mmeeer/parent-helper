/**
 * @swagger
 * tags:
 *   name: Approvals
 *   description: App and content approval requests
 */

/**
 * @swagger
 * /approvals/pending:
 *   get:
 *     tags: [Approvals]
 *     summary: Get pending approval requests
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: List of pending approvals
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Approval'
 */

/**
 * @swagger
 * /approvals/{id}:
 *   put:
 *     tags: [Approvals]
 *     summary: Approve or deny a request
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
 *             required: [decision]
 *             properties:
 *               decision:
 *                 type: string
 *                 enum: [approved, denied]
 *     responses:
 *       200:
 *         description: Decision recorded
 *       404:
 *         description: Approval request not found
 */
