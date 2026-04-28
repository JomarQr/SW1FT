"""
AegiSAML / SW1FT — ML Model Server
FastAPI backend: loads trained models, accepts dataset uploads, runs training.
"""

from __future__ import annotations

import base64
import io
import json
import os
import sys
import time
import traceback
import uuid
from dataclasses import dataclass, field
from pathlib import Path
from typing import Dict, List, Optional, Tuple

import joblib
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sklearn.ensemble import IsolationForest
from sklearn.metrics import classification_report, confusion_matrix, roc_auc_score
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler

# ─── Paths ───────────────────────────────────────────────────────────────────

BASE_DIR = Path(__file__).parent.parent
MODELS_DIR = BASE_DIR / "Trained Model (MVP)" / "models"
CHARTS_DIR = BASE_DIR / "Trained Model (MVP)"
UPLOADS_DIR = BASE_DIR / "server" / "uploads"
UPLOADS_DIR.mkdir(exist_ok=True)

# ─── Model class (must live in __main__ so joblib can unpickle .pkl files) ───

CONTAMINATION = 0.05
BASELINE_MIN_SESSIONS = 5
RISK_THRESHOLD = 0.65


@dataclass
class UserBehaviorModel:
    user_id: str
    feature_names: List[str] = field(default_factory=list)
    session_count: int = 0
    is_mature: bool = False

    def __post_init__(self):
        self.scaler = StandardScaler()
        self.model = IsolationForest(
            n_estimators=100, contamination=CONTAMINATION, random_state=42, n_jobs=-1
        )
        self._session_buffer: List[np.ndarray] = []
        self._score_min: Optional[float] = None
        self._score_max: Optional[float] = None
        self._user_threshold: float = RISK_THRESHOLD

    def fit(self, X: np.ndarray, feature_names: List[str] | None = None):
        if feature_names:
            self.feature_names = feature_names
        X_scaled = self.scaler.fit_transform(X)
        self.model.fit(X_scaled)
        self.session_count = len(X)
        self.is_mature = self.session_count >= BASELINE_MIN_SESSIONS
        raw = self.model.score_samples(X_scaled)
        self._score_min = float(raw.min())
        self._score_max = float(raw.max())
        self._session_buffer = list(X)
        risks = [
            float(np.clip(1 - (r - self._score_min) / (self._score_max - self._score_min + 1e-9), 0, 1))
            for r in raw
        ]
        self._user_threshold = float(np.clip(np.mean(risks) + 0.5 * np.std(risks), 0.40, 0.85))
        return self

    def score_session(self, x: np.ndarray) -> dict:
        xs = self.scaler.transform(x.reshape(1, -1))
        raw = self.model.score_samples(xs)[0]
        if self._score_max != self._score_min:
            risk = 1 - (raw - self._score_min) / (self._score_max - self._score_min)
        else:
            risk = 0.5
        risk = float(np.clip(risk, 0, 1))
        return {
            "risk_score": risk,
            "is_anomaly": risk > self._user_threshold,
            "threshold_used": round(self._user_threshold, 3),
            "model_mature": self.is_mature,
            "sessions_trained": self.session_count,
        }

    def partial_fit(self, x: np.ndarray):
        self._session_buffer.append(x)
        if len(self._session_buffer) > 200:
            self._session_buffer = self._session_buffer[-200:]
        X = np.array(self._session_buffer)
        Xs = self.scaler.fit_transform(X)
        self.model.fit(Xs)
        self.session_count += 1
        self.is_mature = self.session_count >= BASELINE_MIN_SESSIONS
        raw = self.model.score_samples(Xs)
        self._score_min = float(raw.min())
        self._score_max = float(raw.max())


# Expose class in __main__ so joblib pickle lookup succeeds
sys.modules[__name__].UserBehaviorModel = UserBehaviorModel  # type: ignore

# ─── App setup ───────────────────────────────────────────────────────────────

app = FastAPI(title="AegiSAML ML Server", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory model cache
_models: Dict[str, UserBehaviorModel] = {}
_models_loaded = False


def _load_models():
    global _models, _models_loaded
    if _models_loaded:
        return
    if not MODELS_DIR.exists():
        _models_loaded = True
        return
    for pkl in sorted(MODELS_DIR.glob("*.pkl")):
        try:
            m = joblib.load(pkl)
            _models[m.user_id] = m
        except Exception as e:
            print(f"[warn] Could not load {pkl.name}: {e}")
    _models_loaded = True
    print(f"[boot] Loaded {len(_models)} models from {MODELS_DIR}")


@app.on_event("startup")
def startup():
    _load_models()


# ─── Helpers ─────────────────────────────────────────────────────────────────

def _fig_to_b64(fig: plt.Figure) -> str:
    buf = io.BytesIO()
    fig.savefig(buf, format="png", dpi=130, bbox_inches="tight",
                facecolor="#111115", edgecolor="none")
    buf.seek(0)
    data = base64.b64encode(buf.read()).decode()
    plt.close(fig)
    return data


def _model_meta(m: UserBehaviorModel) -> dict:
    return {
        "user_id": m.user_id,
        "session_count": m.session_count,
        "is_mature": m.is_mature,
        "threshold": round(m._user_threshold, 3),
        "feature_names": m.feature_names,
        "score_min": round(m._score_min, 4) if m._score_min is not None else None,
        "score_max": round(m._score_max, 4) if m._score_max is not None else None,
    }


def _prepare_user_data(df: pd.DataFrame, user_id: str) -> Tuple[np.ndarray, np.ndarray, List[str]]:
    udf = df[df["user_id"] == user_id].copy()
    exclude = {"user_id", "label", "session_id", "timestamp", "card_info"}
    feat_cols = [c for c in udf.columns
                 if c not in exclude and udf[c].dtype in (np.float64, np.int64, float, int)]
    X = udf[feat_cols].fillna(0).values
    y = udf["label"].values
    return X, y, feat_cols


def _generate_eval_charts(df: pd.DataFrame, models: Dict[str, UserBehaviorModel]) -> dict:
    """Run evaluation and produce chart b64 images + summary metrics."""
    results = []
    for uid, model in models.items():
        if uid not in df["user_id"].values:
            continue
        X, y, _ = _prepare_user_data(df, uid)
        for x, label in zip(X, y):
            r = model.score_session(x)
            results.append({
                "risk_score": r["risk_score"],
                "true_label": int(label),
                "predicted_fraud": int(r["is_anomaly"]),
            })

    if not results:
        return {}

    rdf = pd.DataFrame(results)
    y_true = 1 - rdf["true_label"]
    y_pred = rdf["predicted_fraud"]
    y_score = rdf["risk_score"]

    # ── Chart 1: Risk score distribution ──────────────────────────────────────
    fig1, ax = plt.subplots(figsize=(8, 4))
    fig1.patch.set_facecolor("#111115")
    ax.set_facecolor("#111115")
    for cls, color, label in [(1, "#5B9BD5", "Legitimate"), (0, "#E05C5C", "Fraud")]:
        subset = rdf[rdf["true_label"] == cls]["risk_score"]
        ax.hist(subset, bins=30, alpha=0.72, color=color, label=label, density=True)
    ax.axvline(RISK_THRESHOLD, color="#FFB800", linestyle="--", linewidth=1.4,
               label=f"Threshold ({RISK_THRESHOLD})")
    ax.set_title("Risk Score Distribution", color="#E8E8ED", fontsize=12, pad=8)
    ax.set_xlabel("Risk Score", color="#6B6B7A", fontsize=10)
    ax.set_ylabel("Density", color="#6B6B7A", fontsize=10)
    ax.tick_params(colors="#6B6B7A")
    for spine in ax.spines.values():
        spine.set_edgecolor("#1E1E22")
    ax.legend(facecolor="#1E1E22", edgecolor="#1E1E22", labelcolor="#E8E8ED", fontsize=9)
    ax.grid(alpha=0.15, color="#6B6B7A")
    fig1.tight_layout()
    chart_dist = _fig_to_b64(fig1)

    # ── Chart 2: Confusion matrix ──────────────────────────────────────────────
    cm = confusion_matrix(y_true, y_pred)
    fig2, ax2 = plt.subplots(figsize=(5, 4))
    fig2.patch.set_facecolor("#111115")
    ax2.set_facecolor("#111115")
    im = ax2.imshow(cm, cmap="Blues")
    ax2.set_xticks([0, 1])
    ax2.set_yticks([0, 1])
    ax2.set_xticklabels(["Legitimate", "Fraud"], color="#6B6B7A")
    ax2.set_yticklabels(["Legitimate", "Fraud"], color="#6B6B7A")
    ax2.set_title("Confusion Matrix", color="#E8E8ED", fontsize=12, pad=8)
    ax2.set_xlabel("Predicted", color="#6B6B7A")
    ax2.set_ylabel("True", color="#6B6B7A")
    for i in range(2):
        for j in range(2):
            ax2.text(j, i, str(cm[i, j]), ha="center", va="center",
                     color="#E8E8ED", fontsize=14, fontweight="bold")
    fig2.tight_layout()
    chart_cm = _fig_to_b64(fig2)

    # ── Chart 3: Threshold distribution histogram ──────────────────────────────
    thresholds = [m._user_threshold for m in models.values()]
    fig3, ax3 = plt.subplots(figsize=(7, 4))
    fig3.patch.set_facecolor("#111115")
    ax3.set_facecolor("#111115")
    ax3.hist(thresholds, bins=20, color="#AA55E3", alpha=0.8, edgecolor="#1E1E22")
    ax3.set_title("Per-User Threshold Distribution", color="#E8E8ED", fontsize=12, pad=8)
    ax3.set_xlabel("Threshold Value", color="#6B6B7A")
    ax3.set_ylabel("# Users", color="#6B6B7A")
    ax3.tick_params(colors="#6B6B7A")
    for spine in ax3.spines.values():
        spine.set_edgecolor("#1E1E22")
    ax3.grid(alpha=0.15, color="#6B6B7A")
    fig3.tight_layout()
    chart_thresh = _fig_to_b64(fig3)

    # ── Metrics ───────────────────────────────────────────────────────────────
    report = classification_report(y_true, y_pred, output_dict=True, zero_division=0)
    try:
        auc = round(float(roc_auc_score(y_true, y_score)), 4)
    except Exception:
        auc = None

    return {
        "charts": {
            "risk_distribution": chart_dist,
            "confusion_matrix": chart_cm,
            "threshold_distribution": chart_thresh,
        },
        "metrics": {
            "roc_auc": auc,
            "precision_fraud": round(report.get("1", {}).get("precision", 0), 4),
            "recall_fraud": round(report.get("1", {}).get("recall", 0), 4),
            "f1_fraud": round(report.get("1", {}).get("f1-score", 0), 4),
            "precision_legit": round(report.get("0", {}).get("precision", 0), 4),
            "recall_legit": round(report.get("0", {}).get("recall", 0), 4),
            "accuracy": round(report.get("accuracy", 0), 4),
            "total_sessions": len(rdf),
            "fraud_sessions": int(y_true.sum()),
            "legit_sessions": int((y_true == 0).sum()),
        },
    }


# ─── Routes ──────────────────────────────────────────────────────────────────

@app.get("/api/ml/status")
def status():
    _load_models()
    return {
        "status": "ok",
        "models_loaded": len(_models),
        "models_dir": str(MODELS_DIR),
    }


@app.get("/api/ml/models")
def list_models():
    _load_models()
    models_list = [_model_meta(m) for m in _models.values()]
    models_list.sort(key=lambda x: x["user_id"])
    mature_count = sum(1 for m in _models.values() if m.is_mature)
    avg_sessions = round(np.mean([m.session_count for m in _models.values()]), 1) if _models else 0
    avg_threshold = round(np.mean([m._user_threshold for m in _models.values()]), 3) if _models else 0

    # Session count distribution for bar chart
    sessions = [m.session_count for m in _models.values()]
    bins = [0, 5, 10, 15, 20, 50, 9999]
    labels = ["1–5", "6–10", "11–15", "16–20", "21–50", "50+"]
    session_hist = []
    for i, label in enumerate(labels):
        count = sum(1 for s in sessions if bins[i] < s <= bins[i + 1])
        session_hist.append({"range": label, "count": count})

    # Threshold distribution for chart
    thresholds = sorted([m._user_threshold for m in _models.values()])
    thresh_hist = []
    for i in range(10):
        lo = 0.4 + i * 0.05
        hi = lo + 0.05
        count = sum(1 for t in thresholds if lo <= t < hi)
        thresh_hist.append({"range": f"{lo:.2f}–{hi:.2f}", "count": count})

    return {
        "models": models_list,
        "summary": {
            "total": len(_models),
            "mature": mature_count,
            "immature": len(_models) - mature_count,
            "avg_sessions": avg_sessions,
            "avg_threshold": avg_threshold,
        },
        "session_histogram": session_hist,
        "threshold_histogram": thresh_hist,
    }


@app.get("/api/ml/models/{user_id}")
def get_model(user_id: str):
    _load_models()
    m = _models.get(user_id)
    if not m:
        raise HTTPException(404, f"Model for user {user_id} not found")
    return _model_meta(m)


@app.post("/api/ml/train")
async def train_models(
    file: UploadFile = File(...),
    contamination: float = Form(default=0.05),
    min_sessions: int = Form(default=5),
):
    """
    Accept CSV or XLSX dataset. Required columns:
      user_id, label (1=legit, 0=fraud) + feature columns.
    Supported feature sets:
      - dwell_avg, flight_avg, traj_avg   (XLSX from dataset)
      - any numeric columns
    Trains per-user Isolation Forest models, saves to models dir, returns metrics + charts.
    """
    start_ts = time.time()

    # ── Read file ─────────────────────────────────────────────────────────────
    content = await file.read()
    fname = file.filename or "upload"
    try:
        if fname.endswith(".xlsx") or fname.endswith(".xls"):
            df = pd.read_excel(io.BytesIO(content))
        elif fname.endswith(".json"):
            df = pd.read_json(io.BytesIO(content))
        else:
            df = pd.read_csv(io.BytesIO(content))
    except Exception as e:
        raise HTTPException(400, f"Could not parse file: {e}")

    # Normalise column names
    df.columns = [c.strip().lower().replace(" ", "_") for c in df.columns]

    if "user_id" not in df.columns:
        raise HTTPException(400, "Dataset must contain a 'user_id' column")
    if "label" not in df.columns:
        raise HTTPException(400, "Dataset must contain a 'label' column (1=legit, 0=fraud)")

    exclude = {"user_id", "label", "session_id", "timestamp", "card_info",
               "unnamed:_0", "unnamed: 0"}
    feat_cols = [c for c in df.columns
                 if c not in exclude and pd.api.types.is_numeric_dtype(df[c])]

    if not feat_cols:
        raise HTTPException(400, "No numeric feature columns found in dataset")

    df["user_id"] = df["user_id"].astype(str)
    df[feat_cols] = df[feat_cols].fillna(0)

    # ── Train per-user models ─────────────────────────────────────────────────
    new_models: Dict[str, UserBehaviorModel] = {}
    skipped = []

    for uid in df["user_id"].unique():
        udf = df[df["user_id"] == uid]
        X_legit = udf[udf["label"] == 1][feat_cols].values

        if len(X_legit) < min_sessions:
            skipped.append(uid)
            continue

        m = UserBehaviorModel(user_id=uid)
        m.fit(X_legit, feature_names=feat_cols)
        new_models[uid] = m

        MODELS_DIR.mkdir(parents=True, exist_ok=True)
        joblib.dump(m, MODELS_DIR / f"user_{uid}.pkl")

    # Update in-memory cache
    _models.update(new_models)

    # ── Evaluate ──────────────────────────────────────────────────────────────
    eval_data = _generate_eval_charts(df, new_models) if new_models else {}

    elapsed = round(time.time() - start_ts, 2)

    return {
        "status": "ok",
        "trained": len(new_models),
        "skipped": len(skipped),
        "skipped_users": skipped[:20],
        "feature_columns": feat_cols,
        "elapsed_seconds": elapsed,
        "total_sessions": len(df),
        "unique_users": int(df["user_id"].nunique()),
        **eval_data,
    }


@app.get("/api/ml/charts/eval")
def get_eval_charts():
    """Return pre-generated evaluation charts from training run."""
    charts = {}
    for name, fname in [
        ("evaluation_results", "evaluation_results.png"),
        ("feature_importance", "feature_importance.png"),
    ]:
        path = CHARTS_DIR / fname
        if path.exists():
            data = base64.b64encode(path.read_bytes()).decode()
            charts[name] = data
    return charts


@app.get("/api/ml/score")
def score_session(user_id: str, dwell_avg: float = 0, flight_avg: float = 0, traj_avg: float = 0):
    _load_models()
    m = _models.get(user_id)
    if not m:
        raise HTTPException(404, f"No model for user {user_id}")
    x = np.array([dwell_avg, flight_avg, traj_avg])
    if len(m.feature_names) != len(x):
        x = np.zeros(len(m.feature_names))
    return m.score_session(x)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
