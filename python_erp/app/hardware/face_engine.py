import math
from typing import List, Dict, Any, Optional

def compare_face_vectors(v1: List[float], v2: List[float]) -> float:
    """
    Computes strict Zero-Mean Pearson correlation and Euclidean structural distance.
    Returns matching score (0.0 to 100.0).
    """
    if not v1 or not v2 or len(v1) < 32 or len(v2) < 32:
        return 0.0

    min_len = min(len(v1), len(v2))
    vec1 = [float(x) for x in v1[:min_len]]
    vec2 = [float(x) for x in v2[:min_len]]

    mean1 = sum(vec1) / float(min_len)
    mean2 = sum(vec2) / float(min_len)

    dot_zm = sum((a - mean1) * (b - mean2) for a, b in zip(vec1, vec2))
    norm_a = math.sqrt(sum((a - mean1) ** 2 for a, b in zip(vec1, vec2)))
    norm_b = math.sqrt(sum((b - mean2) ** 2 for a, b in zip(vec1, vec2)))

    if norm_a == 0.0 or norm_b == 0.0:
        return 0.0

    pearson_corr = dot_zm / (norm_a * norm_b)
    if pearson_corr <= 0.0:
        return 0.0

    avg_diff = sum(abs(a - b) for a, b in zip(vec1, vec2)) / float(min_len)
    dist_penalty = max(0.0, 1.0 - avg_diff * 4.0)

    final_score = (pearson_corr * 0.75 + dist_penalty * 0.25) * 100.0
    return round(min(100.0, max(0.0, final_score)), 2)

def verify_face(probe_vec: List[float], gallery_vec: List[float]) -> Dict[str, Any]:
    """
    High-level 1:1 face verification function with twin-discrimination threshold.
    """
    score = compare_face_vectors(probe_vec, gallery_vec)
    is_match = score >= 70.0
    return {
        "matched": is_match,
        "score": score,
        "reason": "Face verified successfully" if is_match else "Face does not match enrolled record"
    }
