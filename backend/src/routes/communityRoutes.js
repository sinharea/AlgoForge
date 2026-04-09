const express = require("express");
const auth = require("../middleware/auth");
const validate = require("../middleware/validate");
const {
  createPostSchema,
  listPostsQuerySchema,
  postParamsSchema,
  postDetailQuerySchema,
  createCommentSchema,
  createVoteSchema,
  createReportSchema,
} = require("../validators/communityValidator");
const {
  createPost,
  listPosts,
  getPostById,
  postComment,
  postVote,
  postReport,
} = require("../controllers/communityController");

const router = express.Router();

router.post("/posts", auth, validate(createPostSchema), createPost);
router.get("/posts", validate(listPostsQuerySchema, "query"), listPosts);
router.get("/posts/:id", validate(postParamsSchema, "params"), validate(postDetailQuerySchema, "query"), getPostById);
router.post("/comments", auth, validate(createCommentSchema), postComment);
router.post("/vote", auth, validate(createVoteSchema), postVote);
router.post("/report", auth, validate(createReportSchema), postReport);

module.exports = router;
