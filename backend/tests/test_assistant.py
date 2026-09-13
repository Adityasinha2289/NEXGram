"""The in-app assistant.

Google is never actually called. The tests drive the request the service
builds, the SSE frames it parses, and the way it behaves when Google refuses -
the three places a bug would reach a user.
"""

import json

import httpx
import pytest
from fastapi.testclient import TestClient

from app.api.deps import get_current_user
from app.core.config import settings
from app.main import app
from app.models.profiles import RetailerProfile
from app.models.users import User
from app.modules.assistant import service
from app.modules.inventory import service as inventory_service

client = TestClient(app)


@pytest.fixture
def api_key():
    """A configured assistant, restored afterwards."""
    original = settings.GEMINI_API_KEY
    settings.GEMINI_API_KEY = "test-key"
    yield
    settings.GEMINI_API_KEY = original


@pytest.fixture
def no_api_key():
    """An unconfigured assistant, restored afterwards.

    The two tests below used to assume the developer running them had no key in
    their .env, which held right up until somebody configured the assistant they
    were testing - and then the suite failed on the machines that had it
    working. A test about the unconfigured state has to create that state.
    """
    original = settings.GEMINI_API_KEY
    settings.GEMINI_API_KEY = ""
    yield
    settings.GEMINI_API_KEY = original


@pytest.fixture
def as_retailer(db, seed_data):
    app.dependency_overrides[get_current_user] = (
        lambda: db.query(User).filter_by(id="usr_ret_1").first()
    )
    yield


def sse(*frames: str) -> bytes:
    return "".join(frames).encode()


def gemini_chunk(text: str) -> str:
    body = {"candidates": [{"content": {"parts": [{"text": text}]}}]}
    return f"data: {json.dumps(body)}\n\n"


@pytest.fixture(autouse=True)
def restore_client():
    """Puts the process-wide HTTP client back after a test swaps it out.

    It is module state shared by every test in the run, so a mock left in place
    would quietly answer somebody else's request.
    """
    original = service._client
    yield
    service._client = original


def mock_transport(handler):
    """Points the shared client at a fake Google."""
    service._client = httpx.AsyncClient(transport=httpx.MockTransport(handler))
    return service._client


class TestConfiguration:
    def test_reports_itself_unconfigured_without_a_key(self, no_api_key):
        assert service.is_configured() is False

    def test_reports_itself_configured_with_one(self, api_key):
        assert service.is_configured() is True

    def test_the_status_endpoint_lets_the_ui_hide(self, db, as_retailer, no_api_key):
        response = client.get("/api/assistant/status")

        assert response.status_code == 200
        assert response.json()["configured"] is False
        assert response.json()["model"] is None

    def test_the_status_endpoint_names_the_model_when_usable(self, db, as_retailer, api_key):
        assert client.get("/api/assistant/status").json()["model"] == settings.GEMINI_MODEL

    def test_status_needs_a_signed_in_user(self, db):
        app.dependency_overrides.pop(get_current_user, None)
        assert client.get("/api/assistant/status").status_code == 401


class TestRequestShape:
    def test_history_is_mapped_to_gemini_roles(self):
        payload = service._payload(
            [
                {"role": "user", "text": "kitna doodh hai"},
                {"role": "assistant", "text": "chaar packet"},
                {"role": "user", "text": "aur paneer"},
            ],
            "Shop: Test",
        )

        assert [c["role"] for c in payload["contents"]] == ["user", "model", "user"]
        assert payload["contents"][0]["parts"][0]["text"] == "kitna doodh hai"

    def test_the_context_rides_in_the_system_instruction(self):
        payload = service._payload([{"role": "user", "text": "hi"}], "Shop: Gupta Kirana")

        instruction = payload["system_instruction"]["parts"][0]["text"]
        assert "Shop: Gupta Kirana" in instruction
        assert "NEXGram" in instruction

    def test_output_is_capped_so_a_reply_is_not_a_wait(self):
        payload = service._payload([{"role": "user", "text": "hi"}], "")
        assert payload["generationConfig"]["maxOutputTokens"] == settings.GEMINI_MAX_OUTPUT_TOKENS

    def test_an_empty_turn_is_dropped_rather_than_sent(self):
        payload = service._payload(
            [{"role": "user", "text": "  "}, {"role": "user", "text": "real"}], "",
        )
        assert len(payload["contents"]) == 1


class TestParsingTheStream:
    def test_text_is_pulled_out_of_a_chunk(self):
        chunk = {"candidates": [{"content": {"parts": [{"text": "hello"}]}}]}
        assert service._extract_text(chunk) == "hello"

    def test_a_chunk_with_no_text_part_is_not_a_crash(self):
        """Gemini emits chunks carrying only a finishReason or safety data."""
        assert service._extract_text({"candidates": [{"finishReason": "STOP"}]}) == ""
        assert service._extract_text({}) == ""
        assert service._extract_text({"candidates": [{"content": {}}]}) == ""


class TestStreaming:
    @pytest.mark.asyncio
    async def test_chunks_arrive_one_at_a_time(self, api_key):
        def handler(_request):
            return httpx.Response(200, content=sse(
                gemini_chunk("Doodh "), gemini_chunk("chaar "), gemini_chunk("packet hai."),
            ))

        mock_transport(handler)
        parts = [c async for c in service.stream_reply([{"role": "user", "text": "q"}], "")]

        assert parts == ["Doodh ", "chaar ", "packet hai."]

    @pytest.mark.asyncio
    async def test_a_malformed_frame_is_skipped_not_fatal(self, api_key):
        def handler(_request):
            return httpx.Response(200, content=sse(
                gemini_chunk("ok "), "data: {not json\n\n", gemini_chunk("still here"),
            ))

        mock_transport(handler)
        parts = [c async for c in service.stream_reply([{"role": "user", "text": "q"}], "")]

        assert parts == ["ok ", "still here"]

    @pytest.mark.asyncio
    async def test_no_key_refuses_with_something_actionable(self, no_api_key):
        # This used to clear the key inline and never put it back, so every
        # test after it in the run saw an unconfigured assistant.
        with pytest.raises(service.AssistantUnavailable) as exc:
            [c async for c in service.stream_reply([{"role": "user", "text": "q"}], "")]

        assert "GEMINI_API_KEY" in str(exc.value)

    @pytest.mark.asyncio
    async def test_a_bad_key_says_so_rather_than_failing_opaquely(self, api_key):
        def handler(_request):
            return httpx.Response(403, json={"error": {"message": "API key not valid"}})

        mock_transport(handler)
        with pytest.raises(service.AssistantUnavailable) as exc:
            [c async for c in service.stream_reply([{"role": "user", "text": "q"}], "")]

        assert "GEMINI_API_KEY" in str(exc.value)

    @pytest.mark.asyncio
    async def test_an_unknown_model_names_the_setting_to_change(self, api_key):
        def handler(_request):
            return httpx.Response(404, json={"error": {"message": "model not found"}})

        mock_transport(handler)
        with pytest.raises(service.AssistantUnavailable) as exc:
            [c async for c in service.stream_reply([{"role": "user", "text": "q"}], "")]

        assert "GEMINI_MODEL" in str(exc.value)

    @pytest.mark.asyncio
    async def test_a_rate_limit_is_reported_as_temporary(self, api_key):
        def handler(_request):
            return httpx.Response(429, json={"error": {"message": "quota"}})

        mock_transport(handler)
        with pytest.raises(service.AssistantUnavailable) as exc:
            [c async for c in service.stream_reply([{"role": "user", "text": "q"}], "")]

        assert "limit" in str(exc.value).lower()

    @pytest.mark.asyncio
    async def test_a_timeout_is_reported_rather_than_hanging(self, api_key):
        def handler(_request):
            raise httpx.TimeoutException("too slow")

        mock_transport(handler)
        with pytest.raises(service.AssistantUnavailable) as exc:
            [c async for c in service.stream_reply([{"role": "user", "text": "q"}], "")]

        assert "der" in str(exc.value)


class TestShopContext:
    def test_a_retailer_sees_their_own_shelf(self, db, seed_data):
        retailer = db.query(RetailerProfile).filter_by(id="ret_ramesh").first()
        inventory_service.add_stock(
            db, retailer, product_variant_id="var_milk_500ml",
            quantity=4, selling_price=28.0, reorder_level=10,
        )
        user = db.query(User).filter_by(id="usr_ret_1").first()

        context = service.build_context(db, user)

        assert "Ramesh Kirana" in context
        assert "Milk" in context
        assert "LOW" in context  # 4 on hand against a reorder level of 10

    def test_the_context_says_who_is_asking(self, db, seed_data):
        user = db.query(User).filter_by(id="usr_ret_1").first()
        assert "retailer" in service.build_context(db, user)

    def test_a_distributor_sees_their_own_figures_not_a_shelf(self, db, seed_data):
        user = db.query(User).filter_by(id="usr_dist_1").first()

        context = service.build_context(db, user)

        assert "Sharma Distributors" in context
        assert "Shelf" not in context


class TestChatEndpoint:
    def test_a_reply_streams_back_as_sse(self, db, as_retailer, api_key):
        def handler(_request):
            return httpx.Response(200, content=sse(gemini_chunk("Namaste!")))

        mock_transport(handler)
        response = client.post("/api/assistant/chat", json={
            "messages": [{"role": "user", "text": "hello"}],
        })

        assert response.status_code == 200
        assert response.headers["content-type"].startswith("text/event-stream")
        assert "Namaste!" in response.text
        assert "event: done" in response.text

    def test_a_refusal_arrives_inside_the_stream(self, db, as_retailer, api_key):
        """By the time Google refuses, the status line is long gone."""
        def handler(_request):
            return httpx.Response(403, json={"error": {"message": "API key not valid"}})

        mock_transport(handler)
        response = client.post("/api/assistant/chat", json={
            "messages": [{"role": "user", "text": "hello"}],
        })

        assert response.status_code == 200
        assert "event: error" in response.text
        assert "GEMINI_API_KEY" in response.text

    def test_an_empty_conversation_is_rejected_by_validation(self, db, as_retailer, api_key):
        assert client.post("/api/assistant/chat", json={"messages": []}).status_code == 422

    def test_a_signed_out_user_cannot_chat(self, db):
        app.dependency_overrides.pop(get_current_user, None)
        response = client.post("/api/assistant/chat", json={
            "messages": [{"role": "user", "text": "hello"}],
        })
        assert response.status_code == 401

    def test_context_can_be_left_out_for_a_general_question(self, db, as_retailer, api_key):
        seen = {}

        def handler(request):
            seen["body"] = json.loads(request.content)
            return httpx.Response(200, content=sse(gemini_chunk("ok")))

        mock_transport(handler)
        client.post("/api/assistant/chat", json={
            "messages": [{"role": "user", "text": "capital of France?"}],
            "include_context": False,
        })

        instruction = seen["body"]["system_instruction"]["parts"][0]["text"]
        assert "Ramesh Kirana" not in instruction
