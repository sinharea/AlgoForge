const express = require("express");
const auth = require("../middleware/auth");
const validate = require("../middleware/validate");
const {
  createPostSchema,
  listPostsQuerySchema,
  postParamsSchema,
  postDetailQuerySchema,
  createCommentSchema,
  editCommentSchema,
  commentParamsSchema,
  createVoteSchema,
  createReportSchema,
  pinCommentSchema,
  acceptCommentSchema,
  searchCommentsQuerySchema,
} = require("../validators/communityValidator");
const {
  createPost,
  listPosts,
  getPostById,
  postComment,
  editComment,
  deleteComment,
  pinComment,
  acceptComment,
  searchComments,
  userCommentHistory,
  postVote,
  postReport,
} = require("../controllers/communityController");

const router = express.Router();

router.post("/posts", auth, validate(createPostSchema), createPost);
router.get("/posts", validate(listPostsQuerySchema, "query"), listPosts);
router.get("/posts/:id", validate(postParamsSchema, "params"), validate(postDetailQuerySchema, "query"), getPostById);
router.post("/posts/:id/pin", auth, validate(postParamsSchema, "params"), validate(pinCommentSchema), pinComment);
router.post("/posts/:id/accept", auth, validate(postParamsSchema, "params"), validate(acceptCommentSchema), acceptComment);
router.post("/comments", auth, validate(createCommentSchema), postComment);
router.put("/comments/:id", auth, validate(commentParamsSchema, "params"), validate(editCommentSchema), editComment);
router.delete("/comments/:id", auth, validate(commentParamsSchema, "params"), deleteComment);
router.get("/comments/search", validate(searchCommentsQuerySchema, "query"), searchComments);
router.get("/comments/history", auth, userCommentHistory);
router.post("/vote", auth, validate(createVoteSchema), postVote);
router.post("/report", auth, validate(createReportSchema), postReport);

module.exports = router;
