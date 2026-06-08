const express = require("express");
const router = express.Router();
const db = require("../db");
const auth = require("../auth");
const xtreamApi = require("../services/xtreamApi");
const syncService = require("../services/syncService");

const XTREAM_AUTH_ENABLED =
  String(process.env.XTREAM_AUTH_ENABLED || "").toLowerCase() === "true";
const XTREAM_PORTAL_URL =
  process.env.XTREAM_PORTAL_URL || "https://xui.streamnet.live";

function getXtreamManagedUsername(username) {
  return `xtream_${String(username || "")
    .trim()
    .toLowerCase()}`;
}

// Configure Passport strategies
auth.configureLocalStrategy(
  async (username) => await db.users.getByUsername(username),
  async (password, hash) => await auth.verifyPassword(password, hash),
);

auth.configureJwtStrategy(async (id) => await db.users.getById(id));

// Configure Passport session serialization (required for OIDC)
auth.configureSessionSerialization(async (id) => await db.users.getById(id));

// Configure OIDC Strategy
auth.configureOidcStrategy(
  async (oidcId) => await db.users.getByOidcId(oidcId),
  async (email) => await db.users.getByEmail(email),
  async (userData) => await db.users.create(userData),
);

/**
 * Start OIDC Login
 * GET /api/auth/oidc/login
 */
router.get("/oidc/login", auth.passport.authenticate("openidconnect"));

/**
 * OIDC Callback
 * GET /api/auth/oidc/callback
 */
router.get(
  "/oidc/callback",
  auth.passport.authenticate("openidconnect", {
    session: false,
    failureRedirect: "/login.html?error=SSO+Failed",
  }),
  (req, res) => {
    // Successful authentication
    const token = auth.generateToken(req.user);

    // Redirect to hompage with token
    res.redirect(`/?token=${token}`);
  },
);

/**
 * Check if initial setup is required
 * GET /api/auth/setup-required
 */
router.get("/setup-required", async (req, res) => {
  try {
    if (XTREAM_AUTH_ENABLED) {
      return res.json({
        setupRequired: false,
        xtreamAuthEnabled: true,
        xtreamPortalUrl: XTREAM_PORTAL_URL,
      });
    }

    const userCount = await db.users.count();
    res.json({ setupRequired: userCount === 0, xtreamAuthEnabled: false });
  } catch (err) {
    console.error("Error in /setup-required:", err);
    res.status(500).json({ error: "Server error" });
  }
});

/**
 * Initial setup - Create admin user
 * POST /api/auth/setup
 */
router.post("/setup", async (req, res) => {
  try {
    if (XTREAM_AUTH_ENABLED) {
      return res
        .status(400)
        .json({ error: "Setup disabled when XTREAM_AUTH_ENABLED=true" });
    }

    const userCount = await db.users.count();

    // Check if setup already done
    if (userCount > 0) {
      return res.status(400).json({ error: "Setup already completed" });
    }

    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: "Username and password required" });
    }

    if (password.length < 6) {
      return res
        .status(400)
        .json({ error: "Password must be at least 6 characters" });
    }

    // Create admin user
    const passwordHash = await auth.hashPassword(password);
    const adminUser = await db.users.create({
      username,
      passwordHash,
      role: "admin",
    });

    // Generate token for immediate login
    const token = auth.generateToken(adminUser);

    res.status(201).json({
      message: "Admin user created successfully",
      token,
      user: adminUser,
    });
  } catch (err) {
    console.error("Error in /setup:", err);
    res.status(500).json({ error: err.message || "Server error" });
  }
});

/**
 * Login with Passport Local Strategy
 * POST /api/auth/login
 */
router.post("/admin-login", (req, res, next) => {
  auth.passport.authenticate("local", { session: false }, (err, user, info) => {
    if (err) {
      console.error("Admin login error:", err);
      return res.status(500).json({ error: "Server error" });
    }

    if (!user) {
      return res
        .status(401)
        .json({ error: info?.message || "Invalid credentials" });
    }

    if (user.role !== "admin") {
      return res.status(403).json({ error: "Admin access required" });
    }

    const token = auth.generateToken(user);

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        authMode: XTREAM_AUTH_ENABLED ? "xtream-admin" : "local",
      },
    });
  })(req, res, next);
});

router.post("/login", (req, res, next) => {
  if (XTREAM_AUTH_ENABLED) {
    return (async () => {
      try {
        const { username, password } = req.body;

        if (!username || !password) {
          return res
            .status(400)
            .json({ error: "Username and password required" });
        }

        await xtreamApi.authenticate(XTREAM_PORTAL_URL, username, password);

        const internalUsername = getXtreamManagedUsername(username);

        let user = await db.users.getByUsername(internalUsername);
        if (!user) {
          const passwordHash = await auth.hashPassword(password);
          user = await db.users.create({
            username: internalUsername,
            passwordHash,
            role: "viewer",
          });
        }

        const userSources = await db.sources.getAll(user.id);
        const existingSource = userSources.find(
          (s) => s.type === "xtream" && s.is_managed_xtream_auth === true,
        );

        const xtreamSourcePayload = {
          type: "xtream",
          name: `${username} Xtream`,
          url: XTREAM_PORTAL_URL,
          username,
          password,
          enabled: true,
          is_managed_xtream_auth: true,
        };

        let source;
        if (existingSource) {
          source = await db.sources.update(
            existingSource.id,
            xtreamSourcePayload,
            user.id,
          );
        } else {
          source = await db.sources.create(xtreamSourcePayload, user.id);
        }

        if (source?.id) {
          syncService.syncSource(source.id).catch(console.error);
        }

        const token = auth.generateToken(user);

        return res.json({
          token,
          user: {
            id: user.id,
            username,
            role: user.role,
            authMode: "xtream",
          },
        });
      } catch (err) {
        console.error("Xtream login error:", err);
        return res.status(401).json({ error: "Invalid Xtream credentials" });
      }
    })();
  }

  auth.passport.authenticate("local", { session: false }, (err, user, info) => {
    if (err) {
      console.error("Login error:", err);
      return res.status(500).json({ error: "Server error" });
    }

    if (!user) {
      return res
        .status(401)
        .json({ error: info?.message || "Invalid credentials" });
    }

    // Generate JWT token
    const token = auth.generateToken(user);

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
      },
    });
  })(req, res, next);
});

/**
 * Logout (client-side handles token removal)
 * POST /api/auth/logout
 */
router.post("/logout", (req, res) => {
  // With JWT, logout is handled client-side by removing the token
  // This endpoint exists for consistency and future server-side token blacklisting
  res.json({ success: true, message: "Logged out successfully" });
});

/**
 * Get current user
 * GET /api/auth/me
 */
router.get("/me", auth.requireAuth, async (req, res) => {
  try {
    const user = await db.users.getById(req.user.id);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const publicUsername =
      XTREAM_AUTH_ENABLED && String(user.username).startsWith("xtream_")
        ? String(user.username).replace(/^xtream_/, "")
        : user.username;

    res.json({
      id: user.id,
      username: publicUsername,
      role: user.role,
      authMode: XTREAM_AUTH_ENABLED ? "xtream" : "local",
    });
  } catch (err) {
    console.error("Error in /me:", err);
    res.status(500).json({ error: "Server error" });
  }
});

/**
 * Get all users (admin only)
 * GET /api/auth/users
 */
router.get("/users", auth.requireAuth, auth.requireAdmin, async (req, res) => {
  try {
    const allUsers = await db.users.getAll();

    // Remove password hashes
    const users = allUsers.map((u) => {
      const { passwordHash, ...userWithoutPassword } = u;
      return userWithoutPassword;
    });

    res.json(users);
  } catch (err) {
    console.error("Error fetching users:", err);
    res.status(500).json({ error: "Server error" });
  }
});

/**
 * Create a new user (admin only)
 * POST /api/auth/users
 */
router.post("/users", auth.requireAuth, auth.requireAdmin, async (req, res) => {
  try {
    const { username, password, role } = req.body;

    if (!username || !password || !role) {
      return res
        .status(400)
        .json({ error: "Username, password, and role are required" });
    }

    if (password.length < 6) {
      return res
        .status(400)
        .json({ error: "Password must be at least 6 characters" });
    }

    if (!["admin", "viewer"].includes(role)) {
      return res
        .status(400)
        .json({ error: 'Role must be either "admin" or "viewer"' });
    }

    const passwordHash = await auth.hashPassword(password);
    const newUser = await db.users.create({
      username,
      passwordHash,
      role,
    });

    res.status(201).json(newUser);
  } catch (err) {
    console.error("Error creating user:", err);
    res.status(500).json({ error: err.message || "Server error" });
  }
});

/**
 * Update a user (admin only)
 * PUT /api/auth/users/:id
 */
router.put(
  "/users/:id",
  auth.requireAuth,
  auth.requireAdmin,
  async (req, res) => {
    try {
      const { id } = req.params;
      const { username, password, role } = req.body;

      const updates = {};

      if (username) {
        updates.username = username;
      }

      if (password) {
        if (password.length < 6) {
          return res
            .status(400)
            .json({ error: "Password must be at least 6 characters" });
        }
        updates.passwordHash = await auth.hashPassword(password);
      }

      if (role) {
        if (!["admin", "viewer"].includes(role)) {
          return res
            .status(400)
            .json({ error: 'Role must be either "admin" or "viewer"' });
        }

        // Prevent removing admin role from the last admin
        const user = await db.users.getById(id);
        if (user && user.role === "admin" && role !== "admin") {
          const allUsers = await db.users.getAll();
          const adminCount = allUsers.filter((u) => u.role === "admin").length;
          if (adminCount <= 1) {
            return res.status(400).json({
              error: "Cannot remove admin role from the last admin user",
            });
          }
        }

        updates.role = role;
      }

      const updatedUser = await db.users.update(id, updates);
      res.json(updatedUser);
    } catch (err) {
      console.error("Error updating user:", err);
      res.status(500).json({ error: err.message || "Server error" });
    }
  },
);

/**
 * Delete a user (admin only)
 * DELETE /api/auth/users/:id
 */
router.delete(
  "/users/:id",
  auth.requireAuth,
  auth.requireAdmin,
  async (req, res) => {
    try {
      const { id } = req.params;

      // Prevent deleting yourself
      if (parseInt(id) === req.user.id) {
        return res
          .status(400)
          .json({ error: "Cannot delete your own account" });
      }

      await db.users.delete(id);
      res.json({ success: true, message: "User deleted successfully" });
    } catch (err) {
      console.error("Error deleting user:", err);
      res.status(500).json({ error: err.message || "Server error" });
    }
  },
);

module.exports = router;
