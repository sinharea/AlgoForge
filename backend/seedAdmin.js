const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const connectDb = require("./src/config/db");
const User = require("./src/models/User");
const { USER_ROLES, AUTH_PROVIDER } = require("./src/constants");

const ADMIN_EMAIL = "admin@algoforge.com";
const ADMIN_PASSWORD = "Admin@123";

async function seedAdmin() {
  try {
    await connectDb();

    const normalizedEmail = ADMIN_EMAIL.toLowerCase();
    const existingAdmin = await User.findOne({ email: normalizedEmail })
      .select("_id email role status")
      .lean();

    if (existingAdmin) {
      console.log(`Admin already exists for email: ${normalizedEmail}`);
      return;
    }

    const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 12);

    await User.create({
      name: "Admin",
      email: normalizedEmail,
      password: hashedPassword,
      role: USER_ROLES.ADMIN,
      status: "active",
      provider: AUTH_PROVIDER.LOCAL,
      isEmailVerified: true,
    });

    console.log("Admin user created successfully.");
    console.log(`Email: ${ADMIN_EMAIL}`);
    console.log(`Password: ${ADMIN_PASSWORD}`);
  } catch (error) {
    console.error("Failed to seed admin user:", error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.connection.close();
  }
}

seedAdmin();