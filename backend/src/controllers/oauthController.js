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
            avatarUrl: profile.photos?.[0]?.value,
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
            avatarUrl: profile.photos?.[0]?.value,
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
  const { accessToken, refreshToken, user } = req.user || {};

  if (!accessToken || !refreshToken || !user) {
    const redirect = `${frontendUrl}/oauth/callback?error=${encodeURIComponent("OAuth callback failed")}`;
    return res.redirect(redirect);
  }

  const redirect = `${frontendUrl}/oauth/callback?accessToken=${encodeURIComponent(
    accessToken
  )}&refreshToken=${encodeURIComponent(refreshToken)}&email=${encodeURIComponent(
    user.email || ""
  )}&name=${encodeURIComponent(user.name || "")}&id=${encodeURIComponent(
    user.id || ""
  )}&role=${encodeURIComponent(user.role || "user")}&avatarUrl=${encodeURIComponent(
    user.avatarUrl || ""
  )}`;

  return res.redirect(redirect);
};

const isStrategyEnabled = (provider) => {
  try {
    return Boolean(passport._strategy(provider));
  } catch {
    return false;
  }
};

const oauthErrorRedirect = (res, message) => {
  const redirect = `${frontendUrl}/oauth/callback?error=${encodeURIComponent(message)}`;
  return res.redirect(redirect);
};

const startOAuth = (provider, options = {}) => (req, res, next) => {
  if (!isStrategyEnabled(provider)) {
    return oauthErrorRedirect(res, `${provider} OAuth is not configured`);
  }

  return passport.authenticate(provider, options)(req, res, next);
};

const finishOAuth = (provider) => (req, res, next) => {
  if (!isStrategyEnabled(provider)) {
    return oauthErrorRedirect(res, `${provider} OAuth is not configured`);
  }

  return passport.authenticate(provider, { session: false }, (err, userPayload) => {
    if (err || !userPayload) {
      return oauthErrorRedirect(res, err?.message || "OAuth authentication failed");
    }
    req.user = userPayload;
    return oauthCallback(req, res);
  })(req, res, next);
};

module.exports = {
  passport,
  oauthCallback,
  startOAuth,
  finishOAuth,
  isStrategyEnabled,
};
