"""
FastAPI Application Entry Point for AI Traffic Signal Optimization System.
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .api.routes import router, engine


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Automatically start the simulation engine in paused or running mode
    engine.start()
    yield
    engine.stop()


app = FastAPI(
    title="AI Adaptive Traffic Signal Optimization API",
    description="Fuzzy Logic and Genetic Algorithm based Intelligent Signal Control System",
    version="1.0.0",
    lifespan=lifespan,
)

# Enable CORS for local Vite development and testing
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="127.0.0.1", port=8000, reload=True)
