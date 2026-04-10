const UserTopicAnalytics = require("../models/UserTopicAnalytics");
const TopicStat = require("../models/TopicStat");

const normalizeTags = (tags = []) =>
  [...new Set(tags.map((tag) => String(tag || "").trim()).filter(Boolean))];

const updateUserTopicAnalytics = async ({ userId, tags = [], solved, runtime = 0 }) => {
  let analytics = await UserTopicAnalytics.findOne({ user: userId });
  if (!analytics) analytics = await UserTopicAnalytics.create({ user: userId, topics: [] });

  const normalizedTags = normalizeTags(tags);

  analytics.totalAttempts += 1;
  if (solved) analytics.totalSolved += 1;

  for (const topic of normalizedTags) {
    let stat = analytics.topics.find((entry) => entry.topic === topic);
    if (!stat) {
      analytics.topics.push({
        topic,
        attempts: 0,
        solved: 0,
        accuracy: 0,
        avgRuntime: 0,
        totalRuntime: 0,
      });
      stat = analytics.topics[analytics.topics.length - 1];
    }

    stat.attempts += 1;
    if (solved) stat.solved += 1;
    stat.totalRuntime += runtime;
    stat.accuracy = stat.attempts ? Number(((stat.solved / stat.attempts) * 100).toFixed(2)) : 0;
    stat.avgRuntime = stat.attempts ? Number((stat.totalRuntime / stat.attempts).toFixed(2)) : 0;
  }

  await analytics.save();
  return analytics;
};

const updateUserTopicStats = async ({ userId, tags = [], solved }) => {
  const normalizedTags = normalizeTags(tags);
  if (!normalizedTags.length) return [];

  const updates = [];

  for (const topic of normalizedTags) {
    const existing = await TopicStat.findOne({ userId, topic });

    if (!existing) {
      const attempts = 1;
      const correct = solved ? 1 : 0;
      updates.push(
        await TopicStat.create({
          userId,
          topic,
          attempts,
          correct,
          accuracy: Number((correct / attempts).toFixed(4)),
        })
      );
      continue;
    }

    existing.attempts += 1;
    if (solved) existing.correct += 1;
    existing.accuracy = existing.attempts
      ? Number((existing.correct / existing.attempts).toFixed(4))
      : 0;
    updates.push(await existing.save());
  }

  return updates;
};

module.exports = { updateUserTopicAnalytics, updateUserTopicStats };
