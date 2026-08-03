import time
import json
import uuid
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response, JSONResponse

class RequestLoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        correlation_id = str(uuid.uuid4())
        request.state.correlation_id = correlation_id
        
        start_time = time.time()
        
        # Log request
        print(json.dumps({
            "event": "request_started",
            "correlation_id": correlation_id,
            "method": request.method,
            "path": request.url.path,
            "client_ip": request.client.host
        }))
        
        try:
            response = await call_next(request)
        except Exception as e:
            process_time = time.time() - start_time
            print(json.dumps({
                "event": "request_failed",
                "correlation_id": correlation_id,
                "error": type(e).__name__,
                "detail": str(e),
                "duration_ms": round(process_time * 1000, 2)
            }))
            
            # Create an error response if not already handled
            response = JSONResponse(
                status_code=500,
                content={
                    "detail": "Internal Server Error",
                    "correlation_id": correlation_id,
                    "type": type(e).__name__
                }
            )
        
        process_time = time.time() - start_time
        
        # Log response
        print(json.dumps({
            "event": "request_finished",
            "correlation_id": correlation_id,
            "status_code": response.status_code,
            "duration_ms": round(process_time * 1000, 2)
        }))
        
        response.headers["X-Correlation-ID"] = correlation_id
        return response
