const mongoose = require("mongoose");
const ApiError = require("../utils/apiError");
const Problem = require("../models/Problem");
const Post = require("../models/Post");
const Comment = require("../models/Comment");
const Vote = require("../models/Vote");
const Report = require("../models/Report");

const DEFAULT_POST_LIMIT = 10;
const DEFAULT_COMMENTS_LIMIT = 200;
const MAX_DEPTH = 5;

const normalizeTags = (tags = []) =>
  [...new Set(tags.map((tag) => String(tag).trim().toLowerCase()).filter(Boolean))];

const escapeRegex = (value = "") => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const extractMentions = (content) => {
  const matches = content.match(/@(\w+)/g);
  if (!matches) return [];
  return [...new Set(matches.map((m) => m.slice(1).toLowerCase()))];
};

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

const listPosts = async ({ problemId, page = 1, limit = DEFAULT_POST_LIMIT, sort = "newest", search }) => {
  await ensureProblemExists(problemId);

  const safePage = Math.max(1, Number(page) || 1);
  const safeLimit = Math.min(50, Math.max(1, Number(limit) || DEFAULT_POST_LIMIT));
  const validSorts = ["newest", "most_votes", "hot"];
  const safeSort = validSorts.includes(sort) ? sort : "newest";
  const skip = (safePage - 1) * safeLimit;

  let sortBy;
  if (safeSort === "most_votes") {
    sortBy = { score: -1, createdAt: -1 };
  } else if (safeSort === "hot") {
    sortBy = { score: -1, commentCount: -1, createdAt: -1 };
  } else {
    sortBy = { createdAt: -1 };
  }

  const filter = { problemId, isDeleted: { $ne: true } };
  const searchTerm = typeof search === "string" ? search.trim() : "";
  if (searchTerm) {
    const regex = new RegExp(escapeRegex(searchTerm), "i");
    filter.$or = [
      { title: regex },
      { content: regex },
      { tags: regex },
    ];
  }

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

const getPostById = async ({ postId, commentsLimit = DEFAULT_COMMENTS_LIMIT, commentSort = "oldest" }) => {
  const post = await Post.findById(postId).populate("userId", "name reputation").lean();
  if (!post) throw ApiError.notFound("Post not found");
  if (post.isDeleted) throw ApiError.notFound("Post has been deleted");

  // Increment view count (non-critical; never crash request flow)
  try {
    await Post.updateOne({ _id: postId }, { $inc: { viewCount: 1 } }).exec();
  } catch {
    // Ignore view-count update failures for read endpoint stability.
  }

  const safeCommentsLimit = Math.min(500, Math.max(1, Number(commentsLimit) || DEFAULT_COMMENTS_LIMIT));

  let commentSortBy;
  if (commentSort === "newest") {
    commentSortBy = { createdAt: -1 };
  } else if (commentSort === "top") {
    commentSortBy = { isPinned: -1, isAccepted: -1, score: -1, createdAt: 1 };
  } else {
    commentSortBy = { createdAt: 1 };
  }

  const comments = await Comment.find({ postId, isDeleted: { $ne: true } })
    .populate("userId", "name reputation")
    .sort(commentSortBy)
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

  let depth = 0;
  if (parentId) {
    const parentComment = await Comment.findById(parentId).select("_id postId depth");
    if (!parentComment) throw ApiError.notFound("Parent comment not found");

    if (String(parentComment.postId) !== String(postId)) {
      throw ApiError.badRequest("Parent comment must belong to the same post");
    }

    depth = Math.min((parentComment.depth || 0) + 1, MAX_DEPTH);

    // Increment reply count on parent
    Comment.updateOne({ _id: parentId }, { $inc: { replyCount: 1 } }).exec();
  }

  const mentions = extractMentions(content);

  const comment = await Comment.create({
    postId,
    userId,
    parentId: parentId || null,
    content,
    depth,
    mentions,
  });

  // Increment comment count on post
  Post.updateOne({ _id: postId }, { $inc: { commentCount: 1 } }).exec();

  return comment;
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
  editComment,
  deleteComment,
  pinComment,
  acceptComment,
  searchComments,
  getUserCommentHistory,
  castVote,
  createReport,
};

async function editComment({ commentId, userId, content }) {
  const comment = await Comment.findById(commentId);
  if (!comment) throw ApiError.notFound("Comment not found");
  if (comment.isDeleted) throw ApiError.badRequest("Cannot edit deleted comment");
  if (String(comment.userId) !== String(userId)) {
    throw ApiError.forbidden("You can only edit your own comments");
  }

  comment.editHistory.push({ content: comment.content });
  comment.content = content;
  comment.isEdited = true;
  comment.mentions = extractMentions(content);
  await comment.save();

  return comment;
}

async function deleteComment({ commentId, userId, isAdmin = false }) {
  const comment = await Comment.findById(commentId);
  if (!comment) throw ApiError.notFound("Comment not found");

  if (!isAdmin && String(comment.userId) !== String(userId)) {
    throw ApiError.forbidden("You can only delete your own comments");
  }

  comment.isDeleted = true;
  comment.content = "[deleted]";
  await comment.save();

  // Decrement counts
  Post.updateOne({ _id: comment.postId }, { $inc: { commentCount: -1 } }).exec();
  if (comment.parentId) {
    Comment.updateOne({ _id: comment.parentId }, { $inc: { replyCount: -1 } }).exec();
  }

  return { success: true };
}

async function pinComment({ postId, userId, commentId }) {
  const post = await Post.findById(postId).select("_id userId pinnedCommentId");
  if (!post) throw ApiError.notFound("Post not found");
  if (String(post.userId) !== String(userId)) {
    throw ApiError.forbidden("Only the post author can pin comments");
  }

  const comment = await Comment.findById(commentId).select("_id postId");
  if (!comment || String(comment.postId) !== String(postId)) {
    throw ApiError.notFound("Comment not found in this post");
  }

  // Unpin previous
  if (post.pinnedCommentId) {
    await Comment.updateOne({ _id: post.pinnedCommentId }, { isPinned: false });
  }

  // Toggle pin
  const isAlreadyPinned = String(post.pinnedCommentId) === String(commentId);
  if (isAlreadyPinned) {
    post.pinnedCommentId = null;
    await Comment.updateOne({ _id: commentId }, { isPinned: false });
  } else {
    post.pinnedCommentId = commentId;
    await Comment.updateOne({ _id: commentId }, { isPinned: true });
  }

  await post.save();
  return { pinned: !isAlreadyPinned };
}

async function acceptComment({ postId, userId, commentId }) {
  const post = await Post.findById(postId).select("_id userId acceptedCommentId");
  if (!post) throw ApiError.notFound("Post not found");
  if (String(post.userId) !== String(userId)) {
    throw ApiError.forbidden("Only the post author can accept answers");
  }

  const comment = await Comment.findById(commentId).select("_id postId");
  if (!comment || String(comment.postId) !== String(postId)) {
    throw ApiError.notFound("Comment not found in this post");
  }

  // Remove previous accepted
  if (post.acceptedCommentId) {
    await Comment.updateOne({ _id: post.acceptedCommentId }, { isAccepted: false });
  }

  const isAlreadyAccepted = String(post.acceptedCommentId) === String(commentId);
  if (isAlreadyAccepted) {
    post.acceptedCommentId = null;
    await Comment.updateOne({ _id: commentId }, { isAccepted: false });
  } else {
    post.acceptedCommentId = commentId;
    await Comment.updateOne({ _id: commentId }, { isAccepted: true });
  }

  await post.save();
  return { accepted: !isAlreadyAccepted };
}

async function searchComments({ postId, q, page = 1, limit = 20 }) {
  const safePage = Math.max(1, Number(page) || 1);
  const safeLimit = Math.min(50, Math.max(1, Number(limit) || 20));
  const skip = (safePage - 1) * safeLimit;

  const filter = {
    postId: toObjectId(postId, "postId"),
    isDeleted: { $ne: true },
    $text: { $search: q },
  };

  const [comments, total] = await Promise.all([
    Comment.find(filter)
      .populate("userId", "name reputation")
      .sort({ score: { $meta: "textScore" } })
      .skip(skip)
      .limit(safeLimit)
      .lean(),
    Comment.countDocuments(filter),
  ]);

  return {
    items: comments.map((c) => ({
      ...c,
      author: c.userId ? { _id: c.userId._id, name: c.userId.name, reputation: c.userId.reputation || 0 } : null,
      userId: c.userId?._id || c.userId,
    })),
    total,
    page: safePage,
    pages: Math.max(1, Math.ceil(total / safeLimit)),
  };
}

async function getUserCommentHistory({ userId, page = 1, limit = 20 }) {
  const safePage = Math.max(1, Number(page) || 1);
  const safeLimit = Math.min(50, Math.max(1, Number(limit) || 20));
  const skip = (safePage - 1) * safeLimit;

  const [comments, total] = await Promise.all([
    Comment.find({ userId, isDeleted: { $ne: true } })
      .populate("postId", "title")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(safeLimit)
      .lean(),
    Comment.countDocuments({ userId, isDeleted: { $ne: true } }),
  ]);

  return {
    items: comments,
    total,
    page: safePage,
    pages: Math.max(1, Math.ceil(total / safeLimit)),
  };
}
