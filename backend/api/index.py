from app.main import app as fastapi_app


class ApiPrefixAdapter:
	def __init__(self, application):
		self.application = application

	async def __call__(self, scope, receive, send):
		if scope["type"] in {"http", "websocket"} and not scope["path"].startswith("/api"):
			scope = dict(scope)
			scope["path"] = "/api" + scope["path"]
			scope["raw_path"] = scope["path"].encode("utf-8")
		await self.application(scope, receive, send)


app = ApiPrefixAdapter(fastapi_app)

__all__ = ["app"]