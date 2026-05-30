from pathlib import Path
import mimetypes

from django.conf import settings
from django.http import FileResponse, Http404


def serve_frontend(request, requested_path: str = ""):
    frontend_root = Path(settings.FRONTEND_OUT_DIR)

    if not frontend_root.exists():
        raise Http404("Frontend build output was not found.")

    relative_path = requested_path.strip("/")
    candidate_paths = []

    if not relative_path:
        candidate_paths.append(frontend_root / "index.html")
    else:
        candidate = frontend_root / relative_path
        candidate_paths.append(candidate)

        if candidate.suffix:
            pass
        else:
            candidate_paths.append(candidate / "index.html")
            candidate_paths.append(frontend_root / f"{relative_path}.html")

    for candidate_path in candidate_paths:
        try:
            resolved_path = candidate_path.resolve()
        except FileNotFoundError:
            continue

        if not resolved_path.exists() or not resolved_path.is_file():
            continue

        if frontend_root.resolve() not in resolved_path.parents and resolved_path != frontend_root / "index.html":
            continue

        content_type, _ = mimetypes.guess_type(str(resolved_path))
        return FileResponse(resolved_path.open("rb"), content_type=content_type or "application/octet-stream")

    raise Http404("Frontend page not found.")