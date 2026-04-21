/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: Authentication and user account management
 */

/**
 * @swagger
 * /auth/register:
 *   post:
 *     tags: [Auth]
 *     summary: Register a new parent account
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
 *                 minLength: 8
 *                 description: Must contain at least one letter and one number
 *               name:
 *                 type: string
 *                 maxLength: 100
 *     responses:
 *       201:
 *         description: Account created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *                 refreshToken:
 *                   type: string
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *       400:
 *         description: Validation error
 *       409:
 *         description: Email already registered
 *       429:
 *         description: Too many requests
 */

/**
 * @swagger
 * /auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Log in with email and password
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *                 refreshToken:
 *                   type: string
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *       401:
 *         description: Invalid credentials
 *       429:
 *         description: Too many requests
 */

/**
 * @swagger
 * /auth/refresh:
 *   post:
 *     tags: [Auth]
 *     summary: Refresh access token using refresh token
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [refreshToken]
 *             properties:
 *               refreshToken:
 *                 type: string
 *     responses:
 *       200:
 *         description: New tokens issued
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *                 refreshToken:
 *                   type: string
 *       401:
 *         description: Invalid or expired refresh token
 */

/**
 * @swagger
 * /auth/forgot-password:
 *   post:
 *     tags: [Auth]
 *     summary: Request password reset email
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *     responses:
 *       200:
 *         description: Reset email sent (always returns 200 to prevent email enumeration)
 *       429:
 *         description: Too many requests
 */

/**
 * @swagger
 * /auth/reset-password:
 *   post:
 *     tags: [Auth]
 *     summary: Reset password using token from email
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [token, password]
 *             properties:
 *               token:
 *                 type: string
 *               password:
 *                 type: string
 *                 minLength: 8
 *     responses:
 *       200:
 *         description: Password reset successfully
 *       400:
 *         description: Invalid or expired token
 *       429:
 *         description: Too many requests
 */

/**
 * @swagger
 * /auth/me:
 *   get:
 *     tags: [Auth]
 *     summary: Get current user profile
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Current user info
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       401:
 *         description: Unauthorized
 */

/**
 * @swagger
 * /auth/verify-email:
 *   post:
 *     tags: [Auth]
 *     summary: Verify email with code
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [code]
 *             properties:
 *               code:
 *                 type: string
 *     responses:
 *       200:
 *         description: Email verified
 *       400:
 *         description: Invalid or expired code
 */

/**
 * @swagger
 * /auth/resend-verification:
 *   post:
 *     tags: [Auth]
 *     summary: Resend email verification code
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Verification email sent
 *       429:
 *         description: Too many requests
 */

/**
 * @swagger
 * /auth/profile:
 *   put:
 *     tags: [Auth]
 *     summary: Update user profile name
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name:
 *                 type: string
 *                 maxLength: 100
 *     responses:
 *       200:
 *         description: Profile updated
 *       401:
 *         description: Unauthorized
 */

/**
 * @swagger
 * /auth/password:
 *   put:
 *     tags: [Auth]
 *     summary: Change password
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [currentPassword, newPassword]
 *             properties:
 *               currentPassword:
 *                 type: string
 *               newPassword:
 *                 type: string
 *                 minLength: 8
 *     responses:
 *       200:
 *         description: Password changed
 *       400:
 *         description: Current password incorrect
 */

/**
 * @swagger
 * /auth/alert-settings:
 *   get:
 *     tags: [Auth]
 *     summary: Get notification/alert settings
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Alert settings
 *   put:
 *     tags: [Auth]
 *     summary: Update notification/alert settings
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               pushEnabled:
 *                 type: boolean
 *               emailEnabled:
 *                 type: boolean
 *               alertTypes:
 *                 type: object
 *     responses:
 *       200:
 *         description: Settings updated
 */

/**
 * @swagger
 * /auth/account:
 *   delete:
 *     tags: [Auth]
 *     summary: Request account deletion (scheduled)
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Account deletion scheduled
 *       401:
 *         description: Unauthorized
 */

/**
 * @swagger
 * /auth/cancel-deletion:
 *   post:
 *     tags: [Auth]
 *     summary: Cancel pending account deletion
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Deletion cancelled
 *       400:
 *         description: No pending deletion
 */

/**
 * @swagger
 * /auth/fcm-token:
 *   post:
 *     tags: [Auth]
 *     summary: Register FCM push notification token
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [token]
 *             properties:
 *               token:
 *                 type: string
 *                 description: FCM registration token
 *               deviceId:
 *                 type: string
 *               platform:
 *                 type: string
 *                 enum: [ios, android]
 *     responses:
 *       200:
 *         description: Token registered
 *   delete:
 *     tags: [Auth]
 *     summary: Remove FCM push notification token
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Token removed
 */
