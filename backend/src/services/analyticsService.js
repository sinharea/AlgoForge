const UserTopicAnalytics = require("../models/UserTopicAnalytics");

const updateUserTopicAnalytics = async ({ userId, tags = [], solved, runtime = 0 }) => {
  let analytics = await UserTopicAnalytics.findOne({ user: userId });
  if (!analytics) analytics = await UserTopicAnalytics.create({ user: userId, topics: [] });

  analytics.totalAttempts += 1;
  if (solved) analytics.totalSolved += 1;

  for (const topic of tags) {
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

module.exports = { updateUserTopicAnalytics };
