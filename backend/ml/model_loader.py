"""Safe model artifact loader for SOLARIS ML service.

Implements guarded deserialization of .joblib files with path traversal checks,
size bounds verification, and strict failure handling. Never attempts to generate
synthetic training data or automatically retrain models upon load failure.
"""

import os
from pathlib import Path
from typing import Any, Optional, Tuple
import joblib


MAX_MODEL_FILE_BYTES = 100 * 1024 * 1024  # 100 MB max allowed model size
ALLOWED_EXTENSIONS = {".joblib"}


def safe_load_joblib(
    model_path: str,
    allowed_dir: Optional[str] = None,
) -> Tuple[Optional[Any], Optional[str]]:
    """Safely loads a .joblib model artifact from disk.

    Performs security and integrity checks before deserialization:
    - Path traversal validation against allowed directory
    - File existence and regularity
    - File extension (.joblib only)
    - File size sanity check (>0 and <= MAX_MODEL_FILE_BYTES)
    - Clean exception handling without triggering retraining

    Returns:
        (model_object, None) if successful.
        (None, error_message_str) if failed.
    """
    try:
        resolved_path = Path(model_path).resolve()

        # 1. Allowed directory verification if supplied
        if allowed_dir is not None:
            resolved_allowed = Path(allowed_dir).resolve()
            try:
                resolved_path.relative_to(resolved_allowed)
            except ValueError:
                return (
                    None,
                    f"Security violation: Model path '{resolved_path}' is outside allowed directory '{resolved_allowed}'",
                )

        # 2. Check existence
        if not resolved_path.exists():
            return None, f"Artifact file not found: {resolved_path}"

        # 3. Check regular file
        if not resolved_path.is_file():
            return None, f"Path is not a regular file: {resolved_path}"

        # 4. Check extension
        if resolved_path.suffix.lower() not in ALLOWED_EXTENSIONS:
            return (
                None,
                f"Unsupported model file extension '{resolved_path.suffix}'. Allowed: {ALLOWED_EXTENSIONS}",
            )

        # 5. Check file size
        file_size = resolved_path.stat().st_size
        if file_size == 0:
            return None, f"Model file is empty (0 bytes): {resolved_path}"
        if file_size > MAX_MODEL_FILE_BYTES:
            return (
                None,
                f"Model file size ({file_size} bytes) exceeds safety maximum ({MAX_MODEL_FILE_BYTES} bytes)",
            )

        # 6. Deserialization attempt
        model = joblib.load(str(resolved_path))
        return model, None

    except PermissionError as e:
        return None, f"Permission denied accessing model file: {e}"
    except (EOFError, ValueError) as e:
        return None, f"Model file corrupted or invalid format: {e}"
    except Exception as e:
        return None, f"Unexpected error during model artifact loading: {type(e).__name__}: {e}"
