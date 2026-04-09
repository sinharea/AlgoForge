const mongoose = require("mongoose");
const ApiError = require("../utils/apiError");
const Problem = require("../models/Problem");
const Post = require("../models/Post");
const Comment = require("../models/Comment");
const Vote = require("../models/Vote");
const Report = require("../models/Report");

const DEFAULT_POST_LIMIT = 10;
const DEFAULT_COMMENTS_LIMIT = 200;

const normalizeTags = (tags = []) =>
  [...new Set(tags.map((tag) => String(tag).trim().toLowerCase()).filter(Boolean))];

const toObjectId = (value, fieldName) => {
  if (!mongoose.isValidObjectId(value)) {
    throw ApiError.badRequest(`Invalid ${fieldName}`);
  }
  return new mongoose.Types.ObjectId(value);
};

const buildVoteMap = (voteRows) => {
  const voteMap = new Map();
  for (const row of voteRows) {
    voteMap.set(String(row._id), {
      upvotes: row.upvotes,
      downvotes: row.downvotes,
      score: row.score,
    });
  }
  return voteMap;
};

const aggregateVotesForTargets = async ({ targetType, targetIds }) => {
  if (!targetIds.length) return new Map();

  const rows = await Vote.aggregate([
    {
      $match: {
        targetType,
        targetId: {
          $in: targetIds.map((id) => toObjectId(id, "targetId")),
        },
      },
    },
    {
      $group: {
        _id: "$targetId",
        upvotes: {
          $sum: {
            $cond: [{ $eq: ["$voteType", 1] }, 1, 0],
          },
        },
        downvotes: {
          $sum: {
            $cond: [{ $eq: ["$voteType", -1] }, 1, 0],
          },
        },
        score: { $sum: "$voteType" },
      },
    },
  ]);

  return buildVoteMap(rows);
};

const aggregateCommentCounts = async (postIds) => {
  if (!postIds.length) return new Map();

  const rows = await Comment.aggregate([
    {
      $match: {
        postId: {
          $in: postIds.map((id) => toObjectId(id, "postId")),
        },
      },
    },
    {
      $group: {
        _id: "$postId",
        count: { $sum: 1 },
      },
    },
  ]);

  const map = new Map();
  for (const row of rows) map.set(String(row._id), row.count);
  return map;
};

const buildNestedComments = (comments) => {
  const map = new Map();
  const roots = [];

  for (const comment of comments) {
    map.set(String(comment._id), { ...comment, replies: [] });
  }

  for (const comment of comments) {
    const node = map.get(String(comment._id));
    const parentId = comment.parentId ? String(comment.parentId) : null;
    if (!parentId || !map.has(parentId)) {
      roots.push(node);
      continue;
    }
    map.get(parentId).replies.push(node);
  }

  return roots;
};

const ensureProblemExists = async (problemId) => {
  const exists = await Problem.exists({ _id: problemId });
  if (!exists) throw ApiError.notFound("Problem not found");
};

const createPost = async ({ problemId, userId, title, content, tags = [] }) => {
  await ensureProblemExists(problemId);

  return Post.create({
    problemId,
    userId,
    title,
    content,
    tags: normalizeTags(tags),
  });
};

const listPosts = async ({ problemId, page = 1, limit = DEFAULT_POST_LIMIT, sort = "newest" }) => {
  await ensureProblemExists(problemId);

  const safePage = Math.max(1, Number(page) || 1);
  const safeLimit = Math.min(50, Math.max(1, Number(limit) || DEFAULT_POST_LIMIT));
  const safeSort = sort === "most_votes" ? "most_votes" : "newest";
  const skip = (safePage - 1) * safeLimit;
  const sortBy = safeSort === "most_votes" ? { score: -1, createdAt: -1 } : { createdAt: -1 };

  const filter = { problemId };

  const [posts, total] = await Promise.all([
    Post.find(filter)
      .populate("userId", "name reputation")
      .sort(sortBy)
      .skip(skip)
      .limit(safeLimit)
      .lean(),
    Post.countDocuments(filter),
  ]);

  const postIds = posts.map((post) => String(post._id));

  const [postVoteMap, commentCountMap] = await Promise.all([
    aggregateVotesForTargets({ targetType: "post", targetIds: postIds }),
    aggregateCommentCounts(postIds),
  ]);

  const items = posts.map((post) => {
    const id = String(post._id);
    const voteSummary = postVoteMap.get(id) || {
      upvotes: post.upvotes || 0,
      downvotes: post.downvotes || 0,
      score: post.score || 0,
    };

    return {
      ...post,
      author: post.userId
        ? {
            _id: post.userId._id,
            name: post.userId.name,
            reputation: post.userId.reputation || 0,
          }
        : null,
      upvotes: voteSummary.upvotes,
      downvotes: voteSummary.downvotes,
      score: voteSummary.score,
      commentCount: commentCountMap.get(id) || 0,
      userId: post.userId?._id || post.userId,
    };
  });

  const pages = Math.max(1, Math.ceil(total / safeLimit));

  return {
    items,
    page: safePage,
    limit: safeLimit,
    total,
    pages,
    hasMore: safePage < pages,
    sort: safeSort,
  };
};

const getPostById = async ({ postId, commentsLimit = DEFAULT_COMMENTS_LIMIT }) => {
  const post = await Post.findById(postId).populate("userId", "name reputation").lean();
  if (!post) throw ApiError.notFound("Post not found");

  const safeCommentsLimit = Math.min(500, Math.max(1, Number(commentsLimit) || DEFAULT_COMMENTS_LIMIT));

  const comments = await Comment.find({ postId })
    .populate("userId", "name reputation")
    .sort({ createdAt: 1 })
    .limit(safeCommentsLimit)
    .lean();

  const commentIds = comments.map((comment) => String(comment._id));

  const [postVoteMap, commentVoteMap, totalComments] = await Promise.all([
    aggregateVotesForTargets({ targetType: "post", targetIds: [String(post._id)] }),
    aggregateVotesForTargets({ targetType: "comment", targetIds: commentIds }),
    Comment.countDocuments({ postId }),
  ]);

  const enrichedComments = comments.map((comment) => {
    const id = String(comment._id);
    const voteSummary = commentVoteMap.get(id) || {
      upvotes: comment.upvotes || 0,
      downvotes: comment.downvotes || 0,
      score: comment.score || 0,
    };

    return {
      ...comment,
      author: comment.userId
        ? {
            _id: comment.userId._id,
            name: comment.userId.name,
            reputation: comment.userId.reputation || 0,
          }
        : null,
      upvotes: voteSummary.upvotes,
      downvotes: voteSummary.downvotes,
      score: voteSummary.score,
      userId: comment.userId?._id || comment.userId,
    };
  });

  const postVoteSummary = postVoteMap.get(String(post._id)) || {
    upvotes: post.upvotes || 0,
    downvotes: post.downvotes || 0,
    score: post.score || 0,
  };

  return {
    post: {
      ...post,
      author: post.userId
        ? {
            _id: post.userId._id,
            name: post.userId.name,
            reputation: post.userId.reputation || 0,
          }
        : null,
      upvotes: postVoteSummary.upvotes,
      downvotes: postVoteSummary.downvotes,
      score: postVoteSummary.score,
      userId: post.userId?._id || post.userId,
    },
    comments: buildNestedComments(enrichedComments),
    totalComments,
    loadedComments: enrichedComments.length,
  };
};

const createComment = async ({ postId, userId, parentId, content }) => {
  const post = await Post.findById(postId).select("_id");
  if (!post) throw ApiError.notFound("Post not found");

  if (parentId) {
    const parentComment = await Comment.findById(parentId).select("_id postId");
    if (!parentComment) throw ApiError.notFound("Parent comment not found");

    if (String(parentComment.postId) !== String(postId)) {
      throw ApiError.badRequest("Parent comment must belong to the same post");
    }
  }

  return Comment.create({
    postId,
    userId,
    parentId: parentId || null,
    content,
  });
};

const getVoteTarget = async (targetType, targetId) => {
  if (targetType === "post") {
    const post = await Post.findById(targetId).select("_id problemId");
    if (!post) throw ApiError.notFound("Post not found");

    return {
      postId: post._id,
      problemId: post.problemId,
    };
  }

  const comment = await Comment.findById(targetId).select("_id postId");
  if (!comment) throw ApiError.notFound("Comment not found");

  const post = await Post.findById(comment.postId).select("_id problemId");
  if (!post) throw ApiError.notFound("Post not found");

  return {
    postId: post._id,
    problemId: post.problemId,
  };
};

const updateTargetVoteCounter = async ({ targetType, targetId, oldVoteType, newVoteType }) => {
  const Model = targetType === "post" ? Post : Comment;

  const inc = {
    upvotes: 0,
    downvotes: 0,
    score: 0,
  };

  if (oldVoteType === 1) {
    inc.upvotes -= 1;
    inc.score -= 1;
  }
  if (oldVoteType === -1) {
    inc.downvotes -= 1;
    inc.score += 1;
  }
  if (newVoteType === 1) {
    inc.upvotes += 1;
    inc.score += 1;
  }
  if (newVoteType === -1) {
    inc.downvotes += 1;
    inc.score -= 1;
  }

  const updated = await Model.findByIdAndUpdate(targetId, { $inc: inc }, { new: true }).select(
    "_id upvotes downvotes score"
  );

  if (!updated) {
    throw ApiError.notFound(targetType === "post" ? "Post not found" : "Comment not found");
  }

  return updated;
};

const castVote = async ({ userId, targetType, targetId, voteType }) => {
  const { problemId } = await getVoteTarget(targetType, targetId);

  const existingVote = await Vote.findOne({ userId, targetId }).select("_id targetType voteType");

  let oldVoteType = null;
  let voteDocument;

  if (existingVote) {
    if (existingVote.targetType !== targetType) {
      throw ApiError.conflict("Vote target type mismatch");
    }

    if (existingVote.voteType === voteType) {
      throw ApiError.conflict("Duplicate vote is not allowed");
    }

    oldVoteType = existingVote.voteType;
    existingVote.voteType = voteType;
    voteDocument = await existingVote.save();
  } else {
    voteDocument = await Vote.create({ userId, targetType, targetId, voteType });
  }

  const updatedTarget = await updateTargetVoteCounter({
    targetType,
    targetId,
    oldVoteType,
    newVoteType: voteType,
  });

  return {
    vote: voteDocument,
    upvotes: updatedTarget.upvotes,
    downvotes: updatedTarget.downvotes,
    score: updatedTarget.score,
    problemId,
  };
};

const createReport = async ({ userId, targetId, reason }) => {
  const [post, comment] = await Promise.all([
    Post.findById(targetId).select("_id"),
    Comment.findById(targetId).select("_id"),
  ]);

  if (!post && !comment) {
    throw ApiError.notFound("Report target not found");
  }

  return Report.create({
    userId,
    targetId,
    targetType: post ? "post" : "comment",
    reason,
    status: "pending",
  });
};

module.exports = {
  createPost,
  listPosts,
  getPostById,
  createComment,
  castVote,
  createReport,
};
