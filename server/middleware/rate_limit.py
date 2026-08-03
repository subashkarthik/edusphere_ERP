import time
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse
from collections import defaultdict
import threading

class RateLimitMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, general_limit: int = 100, auth_limit: int = 5, window_seconds: int = 60):
        super().__init__(app)
        self.general_limit = general_limit
        self.auth_limit = auth_limit
        self.window_seconds = window_seconds
        
        # In-memory storage: {ip: {"general": [timestamps], "auth": [timestamps]}}
        self.requests = defaultdict(lambda: {"general": [], "auth": []})
        self.lock = threading.Lock()

    async def dispatch(self, request: Request, call_next):
        client_ip = request.client.host
        path = request.url.path
        
        # Skip rate limiting for streaming
        if "/api/videos/stream" in path:
            return await call_next(request)

        # Determine bucket and limit
        is_auth = "/auth" in path
        bucket_key = "auth" if is_auth else "general"
        limit = self.auth_limit if is_auth else self.general_limit
        
        now = time.time()
        
        with self.lock:
            # Clean up old entries in the relevant bucket
            self.requests[client_ip][bucket_key] = [
                t for t in self.requests[client_ip][bucket_key] 
                if now - t < self.window_seconds
            ]
            
            current_count = len(self.requests[client_ip][bucket_key])
            
            if current_count >= limit:
                # Return JSONResponse directly to avoid BaseHTTPMiddleware exception handling issues
                return JSONResponse(
                    status_code=429,
                    content={
                        "detail": "Too many requests. Please try again later.",
                        "retry_after": self.window_seconds,
                        "type": "rate_limit_exceeded"
                    },
                    headers={
                        "X-RateLimit-Limit": str(limit),
                        "X-RateLimit-Remaining": "0",
                        "Retry-After": str(self.window_seconds)
                    }
                )
            
            # Record current request
            self.requests[client_ip][bucket_key].append(now)

        try:
            response = await call_next(request)
            
            # Add rate limit headers to successful response
            response.headers["X-RateLimit-Limit"] = str(limit)
            response.headers["X-RateLimit-Remaining"] = str(max(0, limit - current_count - 1))
            return response
        except Exception as e:
            # Re-raise to let logging middleware or global handler catch it
            raise e
