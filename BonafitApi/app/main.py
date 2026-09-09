from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.containers import Container
from app.errors import register_exception_handlers
from app.routers import auth, calendar, clients, forms, services


class BonafitAPI(FastAPI):
    container: Container


def create_app() -> BonafitAPI:
    container = Container()
    container.wire()
    settings = container.settings()

    app = BonafitAPI(title="Bonafit API")
    app.container = container
    register_exception_handlers(app)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.include_router(auth.router)
    app.include_router(clients.router)
    app.include_router(services.router)
    app.include_router(calendar.router)
    app.include_router(forms.router)

    @app.get("/health")
    def health() -> dict[str, str]:
        return {"status": "ok"}

    return app


app = create_app()
