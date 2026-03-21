const nodemailer = require("nodemailer");
const {
  smtpHost,
  smtpPort,
  smtpUser,
  smtpPass,
  smtpFrom,
} = require("../config/env");
const logger = require("../utils/logger");

const hasSmtpConfig = Boolean(smtpHost && smtpUser && smtpPass);

const transporter = hasSmtpConfig
  ? nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    })
  : null;

const sendEmail = async ({ to, subject, html }) => {
  if (!transporter) {
    logger.info("Email preview", { to, subject, html });
    return;
  }

  await transporter.sendMail({
    from: smtpFrom,
    to,
    subject,
    html,
  });
};

module.exports = { sendEmail };
