from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.errors import register_exception_handlers
from app.routers import auth, calendar, clients, forms, services

app = FastAPI(title="Bonafit API")
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
