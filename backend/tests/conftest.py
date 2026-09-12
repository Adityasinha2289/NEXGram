import os
import pathlib
import tempfile

import pytest
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.database import Base
from app.models import Category  # noqa: F401 - ensures all models are registered

# A scratch database in the OS temp directory, unique to this process.
#
# It used to be a fixed ./test.db in the repo, so an interrupted run left a
# half-built file behind and every later run failed with errors that had nothing
# to do with the code. A per-process path also lets `pytest -n` shard safely and
# keeps stray files out of the working tree.
#
# A file rather than :memory: because TestClient dispatches sync endpoints on a
# worker thread, and an in-memory SQLite database is not reliably shared across
# threads even behind StaticPool.
_DB_PATH = pathlib.Path(tempfile.gettempdir()) / f"nexgram-test-{os.getpid()}.db"
_DB_PATH.unlink(missing_ok=True)

engine = create_engine(
    f"sqlite:///{_DB_PATH}",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)


def pytest_sessionfinish(session, exitstatus):
    """Removes the scratch database, even when the run failed.

    The pool holds the connection open, so it has to be disposed before Windows
    will release the file handle.
    """
    engine.dispose()
    try:
        _DB_PATH.unlink(missing_ok=True)
    except OSError:
        # A leftover scratch file in the temp directory is harmless; the next
        # run uses a different pid and deletes its own on startup.
        pass


@event.listens_for(engine, "connect")
def _enforce_foreign_keys(dbapi_connection, _record):
    """SQLite ignores foreign keys unless asked.

    Production runs on Postgres, which always enforces them. Without this the
    tests would happily accept rows Postgres would reject.
    """
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.close()


TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(scope="function")
def db():
    Base.metadata.create_all(bind=engine)
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=engine)


@pytest.fixture(autouse=True)
def use_test_database(db):
    """Points the app at the test session, for every test.

    This used to be set at module scope in two test files, which meant it
    leaked across modules and whether a third file's tests passed depended on
    import order. Overrides are also cleared afterwards so an auth mock from one
    test cannot silently authenticate another.
    """
    from app.core.database import get_db
    from app.main import app

    app.dependency_overrides[get_db] = lambda: db
    yield
    app.dependency_overrides.clear()


@pytest.fixture
def seed_data(db):
    from seed.initial_seed import (
        seed_catalogue,
        seed_categories,
        seed_products_and_variants,
        seed_users_and_profiles,
    )

    cats = seed_categories(db)
    variants = seed_products_and_variants(db, cats)
    profiles = seed_users_and_profiles(db)
    catalogue = seed_catalogue(db, profiles, variants)
    return {"cats": cats, "vars": variants, "profs": profiles, "catalogue": catalogue}
