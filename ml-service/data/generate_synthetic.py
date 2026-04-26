"""
Synthetic data generator for AlgoForge recommendation ML model.
Generates realistic user-problem interaction data for training P_solve(u,p).
"""

import csv
import os
import random
import math

random.seed(42)

TAGS = [
    "Arrays", "Strings", "Dynamic Programming", "Graphs", "Trees",
    "BFS/DFS", "Sorting", "Binary Search", "Hash Table", "Linked List",
    "Stack", "Queue", "Greedy", "Recursion", "Math"
]

DIFFICULTIES = ["Easy", "Medium", "Hard"]
DIFF_WEIGHTS = [0.40, 0.40, 0.20]
DIFF_NUMERIC = {"Easy": 1, "Medium": 2, "Hard": 3}

NUM_PROBLEMS = 300
NUM_USERS = 1000
SUBMISSIONS_PER_USER = 100

OUT_DIR = os.path.dirname(os.path.abspath(__file__))


def generate_problems():
    problems = []
    for i in range(1, NUM_PROBLEMS + 1):
        diff = random.choices(DIFFICULTIES, weights=DIFF_WEIGHTS, k=1)[0]
        if diff == "Easy":
            diff_score = random.uniform(1, 4)
        elif diff == "Medium":
            diff_score = random.uniform(3.5, 7)
        else:
            diff_score = random.uniform(6.5, 10)

        num_tags = random.choices([1, 2, 3], weights=[0.3, 0.5, 0.2], k=1)[0]
        tags = random.sample(TAGS, num_tags)

        problems.append({
            "problem_id": f"p{i:04d}",
            "difficulty": diff,
            "difficulty_score": round(diff_score, 1),
            "tags": "|".join(tags),
        })
    return problems


def generate_users():
    users = []
    for i in range(1, NUM_USERS + 1):
        global_acc = max(5, min(95, random.gauss(50, 20)))

        topic_acc = {}
        for tag in TAGS:
            noise = random.gauss(0, 15)
            topic_acc[tag] = max(0, min(100, global_acc + noise))

        # comfort level correlates with skill
        if global_acc < 35:
            comfort = "Easy"
        elif global_acc < 65:
            comfort = random.choice(["Easy", "Medium"])
        else:
            comfort = random.choice(["Medium", "Hard"])

        total_solved = max(5, int(global_acc * 1.5 + random.gauss(0, 15)))

        # recent results — correlated with global accuracy
        recent = [random.random() < (global_acc / 100) for _ in range(20)]
        recent_acc = sum(recent) / len(recent) * 100

        streak = max(0, int(global_acc / 10 + random.gauss(0, 3)))

        users.append({
            "user_id": f"u{i:04d}",
            "global_accuracy": round(global_acc, 2),
            "topic_accuracies": topic_acc,
            "comfort_level": comfort,
            "total_solved": total_solved,
            "recent_accuracy": round(recent_acc, 2),
            "streak": streak,
        })
    return users


def compute_solve_probability(user, problem):
    """Compute realistic solve probability based on user skill vs problem features."""
    tags = problem["tags"].split("|")
    tag_accs = [user["topic_accuracies"].get(t, 50) for t in tags]
    avg_topic_acc = sum(tag_accs) / len(tag_accs) if tag_accs else 50

    user_comfort_num = DIFF_NUMERIC[user["comfort_level"]]
    prob_diff_num = DIFF_NUMERIC[problem["difficulty"]]
    diff_gap = user_comfort_num - prob_diff_num  # positive = easier for user

    # Base probability from topic accuracy (0-1 range)
    base_p = avg_topic_acc / 100.0

    # Difficulty adjustment
    diff_adj = diff_gap * 0.15  # +/- 0.15 per level of gap

    # Difficulty score penalty (1-10 normalized)
    score_penalty = (problem["difficulty_score"] - 5) / 20.0  # -0.2 to +0.25

    # Experience bonus
    exp_bonus = min(math.log1p(user["total_solved"]) / 15.0, 0.1)

    # Recent form
    recent_bonus = (user["recent_accuracy"] / 100 - 0.5) * 0.1

    raw_p = base_p + diff_adj - score_penalty + exp_bonus + recent_bonus

    # Add noise for realism
    raw_p += random.gauss(0, 0.08)

    return max(0.02, min(0.98, raw_p))


def generate_submissions(users, problems):
    submissions = []
    for user in users:
        sampled_problems = random.sample(problems, min(SUBMISSIONS_PER_USER, len(problems)))

        for prob in sampled_problems:
            p_solve = compute_solve_probability(user, prob)
            solved = 1 if random.random() < p_solve else 0
            attempts = 1 if solved else random.choices([1, 2, 3, 4], weights=[0.4, 0.3, 0.2, 0.1], k=1)[0]

            tags = prob["tags"].split("|")
            tag_accs = [user["topic_accuracies"].get(t, 50) for t in tags]
            avg_topic_acc = sum(tag_accs) / len(tag_accs) if tag_accs else 50

            user_comfort_num = DIFF_NUMERIC[user["comfort_level"]]
            prob_diff_num = DIFF_NUMERIC[prob["difficulty"]]
            diff_gap = user_comfort_num - prob_diff_num

            # Fraction of problem tags user has experience with (non-zero accuracy)
            familiar_tags = sum(1 for t in tags if user["topic_accuracies"].get(t, 0) > 10)
            topic_familiarity = familiar_tags / len(tags) if tags else 0

            submissions.append({
                "user_id": user["user_id"],
                "problem_id": prob["problem_id"],
                "solved": solved,
                "user_global_accuracy": round(user["global_accuracy"] / 100, 4),
                "user_topic_accuracy": round(avg_topic_acc / 100, 4),
                "difficulty_gap": diff_gap,
                "difficulty_score": round(prob["difficulty_score"] / 10, 4),
                "user_total_solved_log": round(math.log1p(user["total_solved"]), 4),
                "user_recent_accuracy": round(user["recent_accuracy"] / 100, 4),
                "topic_familiarity": round(topic_familiarity, 4),
                "attempt_count": attempts,
            })
    return submissions


def save_csv(data, filename, fieldnames):
    filepath = os.path.join(OUT_DIR, filename)
    with open(filepath, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(data)
    print(f"Saved {len(data)} rows to {filepath}")


def main():
    print("Generating synthetic problems...")
    problems = generate_problems()

    print("Generating synthetic users...")
    users = generate_users()

    print("Generating synthetic submissions...")
    submissions = generate_submissions(users, problems)

    # Save problems
    save_csv(problems, "synthetic_problems.csv",
             ["problem_id", "difficulty", "difficulty_score", "tags"])

    # Save users (flatten topic_accuracies)
    user_rows = []
    for u in users:
        row = {
            "user_id": u["user_id"],
            "global_accuracy": u["global_accuracy"],
            "comfort_level": u["comfort_level"],
            "total_solved": u["total_solved"],
            "recent_accuracy": u["recent_accuracy"],
            "streak": u["streak"],
        }
        for tag in TAGS:
            row[f"topic_{tag.replace('/', '_').replace(' ', '_')}"] = round(u["topic_accuracies"][tag], 2)
        user_rows.append(row)

    user_fields = ["user_id", "global_accuracy", "comfort_level", "total_solved", "recent_accuracy", "streak"]
    user_fields += [f"topic_{t.replace('/', '_').replace(' ', '_')}" for t in TAGS]
    save_csv(user_rows, "synthetic_users.csv", user_fields)

    # Save submissions
    sub_fields = [
        "user_id", "problem_id", "solved",
        "user_global_accuracy", "user_topic_accuracy", "difficulty_gap",
        "difficulty_score", "user_total_solved_log", "user_recent_accuracy",
        "topic_familiarity", "attempt_count",
    ]
    save_csv(submissions, "synthetic_submissions.csv", sub_fields)

    print(f"\nDone! Generated {len(problems)} problems, {len(users)} users, {len(submissions)} submissions.")


if __name__ == "__main__":
    main()
