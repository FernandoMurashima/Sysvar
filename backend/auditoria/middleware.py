import uuid
from django.utils.deprecation import MiddlewareMixin

class RequestIDMiddleware(MiddlewareMixin):
    """
    Garante que cada request tenha um X-Request-ID (para correlação).
    - Se já vier do proxy, mantém.
    - Caso contrário, gera um UUID4.
    """
    def process_request(self, request):
        rid = request.META.get("HTTP_X_REQUEST_ID") or str(uuid.uuid4())
        request.META["HTTP_X_REQUEST_ID"] = rid
        # também expõe como atributo
        setattr(request, "request_id", rid)

    def process_response(self, request, response):
        try:
            rid = request.META.get("HTTP_X_REQUEST_ID")
            if rid:
                response["X-Request-ID"] = rid
        except Exception:
            pass
        return response
