import re
from fastapi import Request, HTTPException
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response

class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        
        csp_directives = [
            "default-src 'self' data: blob: https: http:",
            "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.tailwindcss.com blob: data:",
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.tailwindcss.com",
            "font-src 'self' data: https://fonts.gstatic.com",
            "img-src 'self' blob: data: https: http: https://res.cloudinary.com",
            "media-src 'self' blob: data: https: http: https://res.cloudinary.com",
            "connect-src 'self' ws: wss: http: https: http://localhost:5000 http://127.0.0.1:5000",
            "worker-src 'self' blob: data:"
        ]
        response.headers["Content-Security-Policy"] = "; ".join(csp_directives)
        return response


class InputValidationMiddleware(BaseHTTPMiddleware):
    def __init__(self, app):
        super().__init__(app)
        # Patterns for common injection attacks
        self.sql_injection_pattern = re.compile(r"(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|ALTER)\b)", re.IGNORECASE)
        self.xss_pattern = re.compile(r"(<script.*?>|javascript:|<\s*img.*?\bonerror\b)", re.IGNORECASE)

    async def dispatch(self, request: Request, call_next):
        # We only check bodies for POST/PUT/PATCH
        if request.method in ["POST", "PUT", "PATCH"]:
            try:
                body = await request.body()
                body_str = body.decode("utf-8")
                
                if self.sql_injection_pattern.search(body_str) or self.xss_pattern.search(body_str):
                    raise HTTPException(status_code=400, detail="Potential malicious input detected.")
            except Exception:
                # If body can't be decoded or read, we let it pass to standard Pydantic validation
                pass
                
        return await call_next(request)
