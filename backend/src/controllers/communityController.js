const asyncHandler = require("../utils/asyncHandler");
const {
  createPost,
  listPosts,
  getPostById,
  createComment,
  castVote,
  createReport,
} = require("../services/communityService");

const createPostHandler = asyncHandler(async (req, res) => {
  const post = await createPost({
    problemId: req.body.problemId,
    userId: req.user._id,
    title: req.body.title,
    content: req.body.content,
    tags: req.body.tags,
  });

  res.status(201).json(post);
});

const listPostsHandler = asyncHandler(async (req, res) => {
  const payload = await listPosts({
    problemId: req.query.problemId,
    page: req.query.page,
    limit: req.query.limit,
    sort: req.query.sort,
  });

  res.json(payload);
});

const getPostByIdHandler = asyncHandler(async (req, res) => {
  const payload = await getPostById({
    postId: req.params.id,
    commentsLimit: req.query.commentsLimit,
  });

  res.json(payload);
});

const postComment = asyncHandler(async (req, res) => {
  const comment = await createComment({
    postId: req.body.postId,
    userId: req.user._id,
    parentId: req.body.parentId,
    content: req.body.content,
  });

  res.status(201).json(comment);
});

const postVote = asyncHandler(async (req, res) => {
  const payload = await castVote({
    userId: req.user._id,
    targetType: req.body.targetType,
    targetId: req.body.targetId,
    voteType: req.body.voteType,
  });

  res.json(payload);
});

const postReport = asyncHandler(async (req, res) => {
  const report = await createReport({
    userId: req.user._id,
    targetId: req.body.targetId,
    reason: req.body.reason,
  });

  res.status(201).json(report);
});

module.exports = {
  createPost: createPostHandler,
  listPosts: listPostsHandler,
  getPostById: getPostByIdHandler,
  postComment,
  postVote,
  postReport,
};
