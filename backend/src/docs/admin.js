/**
 * @swagger
 * tags:
 *   name: Admin
 *   description: Admin dashboard and management
 */

/**
 * @swagger
 * /admin/seed:
 *   post:
 *     tags: [Admin]
 *     summary: Create the first admin account (only if none exists)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password, name]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *               name:
 *                 type: string
 *     responses:
 *       201:
 *         description: Admin account created
 *       409:
 *         description: Admin already exists
 *       429:
 *         description: Rate limited
 */

/**
 * @swagger
 * /admin/dashboard:
 *   get:
 *     tags: [Admin]
 *     summary: Get admin dashboard stats
 *     security:
 *       - AdminAuth: []
 *     responses:
 *       200:
 *         description: Dashboard statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 totalUsers:
 *                   type: integer
 *                 totalChildren:
 *                   type: integer
 *                 totalDevices:
 *                   type: integer
 *                 activeSubscriptions:
 *                   type: integer
 */

/**
 * @swagger
 * /admin/users:
 *   get:
 *     tags: [Admin]
 *     summary: List all users with pagination
 *     security:
 *       - AdminAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Paginated user list
 */

/**
 * @swagger
 * /admin/users/{id}:
 *   get:
 *     tags: [Admin]
 *     summary: Get user detail
 *     security:
 *       - AdminAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User details with children and devices
 *       404:
 *         description: User not found
 */

/**
 * @swagger
 * /admin/users/{id}/rules:
 *   get:
 *     tags: [Admin]
 *     summary: Get rules for a user's children
 *     security:
 *       - AdminAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Rules data
 */

/**
 * @swagger
 * /admin/users/{id}/activity:
 *   get:
 *     tags: [Admin]
 *     summary: Get activity data for a user's children
 *     security:
 *       - AdminAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Activity data
 */

/**
 * @swagger
 * /admin/users/{id}/alerts:
 *   get:
 *     tags: [Admin]
 *     summary: Get alerts for a user
 *     security:
 *       - AdminAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Alerts data
 */

/**
 * @swagger
 * /admin/users/{id}/suspend:
 *   put:
 *     tags: [Admin]
 *     summary: Suspend a user account
 *     security:
 *       - AdminAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User suspended
 */

/**
 * @swagger
 * /admin/users/{id}/unsuspend:
 *   put:
 *     tags: [Admin]
 *     summary: Unsuspend a user account
 *     security:
 *       - AdminAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User unsuspended
 */

/**
 * @swagger
 * /admin/users/{id}/verify-email:
 *   put:
 *     tags: [Admin]
 *     summary: Manually verify a user's email
 *     security:
 *       - AdminAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Email verified
 */

/**
 * @swagger
 * /admin/analytics:
 *   get:
 *     tags: [Admin]
 *     summary: Get platform analytics
 *     security:
 *       - AdminAuth: []
 *     responses:
 *       200:
 *         description: Analytics data
 */

/**
 * @swagger
 * /admin/health:
 *   get:
 *     tags: [Admin]
 *     summary: Get system health status
 *     security:
 *       - AdminAuth: []
 *     responses:
 *       200:
 *         description: System health metrics
 */

/**
 * @swagger
 * /admin/activity/summary:
 *   get:
 *     tags: [Admin]
 *     summary: Get platform-wide activity summary
 *     security:
 *       - AdminAuth: []
 *     responses:
 *       200:
 *         description: Activity summary
 */

/**
 * @swagger
 * /admin/alerts/summary:
 *   get:
 *     tags: [Admin]
 *     summary: Get platform-wide alerts summary
 *     security:
 *       - AdminAuth: []
 *     responses:
 *       200:
 *         description: Alerts summary
 */

/**
 * @swagger
 * /admin/alerts:
 *   get:
 *     tags: [Admin]
 *     summary: List all alerts platform-wide
 *     security:
 *       - AdminAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Paginated alerts
 */

/**
 * @swagger
 * /admin/deletions:
 *   get:
 *     tags: [Admin]
 *     summary: Get pending account deletions
 *     security:
 *       - AdminAuth: []
 *     responses:
 *       200:
 *         description: Pending deletions list
 */

/**
 * @swagger
 * /admin/deletions/{id}/cancel:
 *   put:
 *     tags: [Admin]
 *     summary: Cancel a pending account deletion
 *     security:
 *       - AdminAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Deletion cancelled
 */

/**
 * @swagger
 * /admin/deletions/purge:
 *   post:
 *     tags: [Admin]
 *     summary: Purge expired deletion requests
 *     security:
 *       - AdminAuth: []
 *     responses:
 *       200:
 *         description: Purge complete
 */

/**
 * @swagger
 * /admin/filters:
 *   get:
 *     tags: [Admin]
 *     summary: List content filter domains
 *     security:
 *       - AdminAuth: []
 *     responses:
 *       200:
 *         description: Content filters
 *   put:
 *     tags: [Admin]
 *     summary: Add or update a content filter domain
 *     security:
 *       - AdminAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [domain, category]
 *             properties:
 *               domain:
 *                 type: string
 *               category:
 *                 type: string
 *     responses:
 *       200:
 *         description: Filter updated
 */

/**
 * @swagger
 * /admin/filters/{domain}:
 *   delete:
 *     tags: [Admin]
 *     summary: Delete a content filter domain
 *     security:
 *       - AdminAuth: []
 *     parameters:
 *       - in: path
 *         name: domain
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Filter deleted
 */

/**
 * @swagger
 * /admin/subscription-keys:
 *   post:
 *     tags: [Admin]
 *     summary: Create a batch of subscription keys
 *     security:
 *       - AdminAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [count, durationMonths, maxKids]
 *             properties:
 *               count:
 *                 type: integer
 *               durationMonths:
 *                 type: integer
 *               maxKids:
 *                 type: integer
 *               label:
 *                 type: string
 *     responses:
 *       201:
 *         description: Keys created
 */

/**
 * @swagger
 * /admin/keys:
 *   post:
 *     tags: [Admin]
 *     summary: Create a single subscription key
 *     security:
 *       - AdminAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [durationMonths, maxKids]
 *             properties:
 *               durationMonths:
 *                 type: integer
 *               maxKids:
 *                 type: integer
 *               label:
 *                 type: string
 *     responses:
 *       201:
 *         description: Key created
 *   get:
 *     tags: [Admin]
 *     summary: List subscription keys
 *     security:
 *       - AdminAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [unused, active, expired, revoked]
 *     responses:
 *       200:
 *         description: Paginated key list
 */

/**
 * @swagger
 * /admin/keys/export:
 *   get:
 *     tags: [Admin]
 *     summary: Export subscription keys as CSV
 *     security:
 *       - AdminAuth: []
 *     responses:
 *       200:
 *         description: CSV file download
 *         content:
 *           text/csv:
 *             schema:
 *               type: string
 */

/**
 * @swagger
 * /admin/keys/bulk-revoke:
 *   put:
 *     tags: [Admin]
 *     summary: Bulk revoke subscription keys
 *     security:
 *       - AdminAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [ids]
 *             properties:
 *               ids:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Keys revoked
 */

/**
 * @swagger
 * /admin/keys/{id}:
 *   put:
 *     tags: [Admin]
 *     summary: Update a subscription key
 *     security:
 *       - AdminAuth: []
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
 *               label:
 *                 type: string
 *               maxKids:
 *                 type: integer
 *               status:
 *                 type: string
 *     responses:
 *       200:
 *         description: Key updated
 *   delete:
 *     tags: [Admin]
 *     summary: Delete a subscription key
 *     security:
 *       - AdminAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Key deleted
 */

/**
 * @swagger
 * /admin/keys/{id}/extend:
 *   put:
 *     tags: [Admin]
 *     summary: Extend a subscription key's expiry
 *     security:
 *       - AdminAuth: []
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
 *             required: [months]
 *             properties:
 *               months:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Key extended
 */
