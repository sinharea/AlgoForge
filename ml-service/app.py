"""
Flask microservice for ML-based recommendation scoring.
Serves P_solve(u,p) predictions via HTTP.
"""

import os
import numpy as np
import joblib
from flask import Flask, request, jsonify

app = Flask(__name__)

MODEL_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "models")

# Feature order must match training
FEATURE_ORDER = [
    "user_global_accuracy",
    "user_topic_accuracy",
    "difficulty_gap",
    "difficulty_score",
    "user_total_solved_log",
    "user_recent_accuracy",
    "topic_familiarity",
    "attempt_count",
]

DIFF_NUMERIC = {"Easy": 1, "Medium": 2, "Hard": 3}

model = None
scaler = None


def load_model():
    global model, scaler
    model_path = os.path.join(MODEL_DIR, "p_solve_model.joblib")
    scaler_path = os.path.join(MODEL_DIR, "scaler.joblib")

    if not os.path.exists(model_path) or not os.path.exists(scaler_path):
        raise FileNotFoundError(
            f"Model files not found in {MODEL_DIR}. Run train.py first."
        )

    model = joblib.load(model_path)
    scaler = joblib.load(scaler_path)
    print(f"Model loaded from {model_path}")


@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok", "model_loaded": model is not None})


@app.route("/predict", methods=["POST"])
def predict():
    """
    Predict P_solve for a batch of (user, problem) pairs.

    Request body:
    {
      "user": {
        "global_accuracy": 0.65,         # 0-1
        "topic_accuracies": {"Arrays": 0.8, "DP": 0.3, ...},
        "total_solved": 25,
        "recent_accuracy": 0.7,          # 0-1
        "comfort_level": "Medium"        # Easy/Medium/Hard
      },
      "problems": [
        {
          "problem_id": "...",
          "difficulty": "Medium",
          "difficulty_score": 5.5,        # 1-10
          "tags": ["Arrays", "DP"]
        },
        ...
      ]
    }

    Response:
    {
      "predictions": [
        {"problem_id": "...", "p_solve": 0.72},
        ...
      ]
    }
    """
    if model is None or scaler is None:
        return jsonify({"error": "Model not loaded"}), 503

    data = request.get_json()
    if not data or "user" not in data or "problems" not in data:
        return jsonify({"error": "Missing user or problems in request body"}), 400

    user = data["user"]
    problems = data["problems"]

    if not problems:
        return jsonify({"predictions": []})

    user_global_acc = float(user.get("global_accuracy", 0.5))
    topic_accs = user.get("topic_accuracies", {})
    total_solved = int(user.get("total_solved", 0))
    recent_acc = float(user.get("recent_accuracy", 0.5))
    comfort = user.get("comfort_level", "Medium")
    comfort_num = DIFF_NUMERIC.get(comfort, 2)

    import math
    total_solved_log = math.log1p(total_solved)

    feature_rows = []
    problem_ids = []

    for prob in problems:
        prob_id = prob.get("problem_id", "")
        difficulty = prob.get("difficulty", "Medium")
        diff_score = float(prob.get("difficulty_score", 5)) / 10.0
        tags = prob.get("tags", [])

        # Average topic accuracy for this problem's tags
        if tags and topic_accs:
            tag_accs = [topic_accs.get(t, 0.5) for t in tags]
            avg_topic_acc = sum(tag_accs) / len(tag_accs)
        else:
            avg_topic_acc = user_global_acc

        # Difficulty gap
        prob_diff_num = DIFF_NUMERIC.get(difficulty, 2)
        diff_gap = comfort_num - prob_diff_num

        # Topic familiarity
        if tags:
            familiar = sum(1 for t in tags if topic_accs.get(t, 0) > 0.1)
            topic_fam = familiar / len(tags)
        else:
            topic_fam = 0.5

        attempt_count = int(prob.get("attempt_count", 0))

        feature_rows.append([
            user_global_acc,
            avg_topic_acc,
            diff_gap,
            diff_score,
            total_solved_log,
            recent_acc,
            topic_fam,
            attempt_count,
        ])
        problem_ids.append(prob_id)

    X = np.array(feature_rows)
    X_scaled = scaler.transform(X)
    probabilities = model.predict_proba(X_scaled)[:, 1]

    predictions = []
    for pid, p_solve in zip(problem_ids, probabilities):
        predictions.append({
            "problem_id": pid,
            "p_solve": round(float(p_solve), 4),
        })

    return jsonify({"predictions": predictions})


if __name__ == "__main__":
    load_model()
    port = int(os.environ.get("ML_SERVICE_PORT", 5050))
    print(f"Starting ML service on port {port}")
    app.run(host="0.0.0.0", port=port, debug=False)
