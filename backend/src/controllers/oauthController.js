const passport = require("passport");
const { Strategy: GoogleStrategy } = require("passport-google-oauth20");
const { Strategy: GitHubStrategy } = require("passport-github2");

const {
  googleClientId,
  googleClientSecret,
  googleCallbackUrl,
  githubClientId,
  githubClientSecret,
  githubCallbackUrl,
  frontendUrl,
} = require("../config/env");
const { AUTH_PROVIDER } = require("../constants");
const { upsertOAuthUser } = require("../services/authService");
const ApiError = require("../utils/apiError");

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((obj, done) => done(null, obj));

if (googleClientId && googleClientSecret) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: googleClientId,
        clientSecret: googleClientSecret,
        callbackURL: googleCallbackUrl,
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const email = profile.emails?.[0]?.value;
          if (!email) return done(new ApiError(400, "Google email missing"));
          const data = await upsertOAuthUser({
            email,
            name: profile.displayName,
            provider: AUTH_PROVIDER.GOOGLE,
            oauthId: profile.id,
          });
          done(null, data);
        } catch (error) {
          done(error);
        }
      }
    )
  );
}

if (githubClientId && githubClientSecret) {
  passport.use(
    new GitHubStrategy(
      {
        clientID: githubClientId,
        clientSecret: githubClientSecret,
        callbackURL: githubCallbackUrl,
        scope: ["user:email"],
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const primaryEmail =
            profile.emails?.find((item) => item.primary)?.value ||
            profile.emails?.[0]?.value;
          if (!primaryEmail) return done(new ApiError(400, "GitHub email missing"));
          const data = await upsertOAuthUser({
            email: primaryEmail,
            name: profile.displayName || profile.username,
            provider: AUTH_PROVIDER.GITHUB,
            oauthId: profile.id,
          });
          done(null, data);
        } catch (error) {
          done(error);
        }
      }
    )
  );
}

const oauthCallback = (req, res) => {
  const { accessToken, refreshToken, user } = req.user;
  const redirect = `${frontendUrl}/oauth/callback?accessToken=${encodeURIComponent(
    accessToken
  )}&refreshToken=${encodeURIComponent(refreshToken)}&email=${encodeURIComponent(
    user.email
  )}`;
  res.redirect(redirect);
};

module.exports = {
  passport,
  oauthCallback,
};
