# The in-app assistant (Google Gemini)

A general-purpose chatbot on every signed-in screen. It answers anything —
general knowledge, arithmetic, business advice — and it can also answer
questions about the user's *own* shop, because the app already knows what is on
their shelf.

## Switching it on

```bash
# backend/.env
GEMINI_API_KEY=<key from https://aistudio.google.com/apikey>
```

Restart the API. That is the whole setup.

Leave the key blank and nothing breaks: `/api/assistant/status` reports
`configured: false`, the chat panel explains how to switch it on, and the
endpoint returns a sentence naming the setting rather than a 500.

```
$ curl .../api/assistant/status
{"configured":false,"model":null}

$ curl .../api/assistant/chat -d '{"messages":[{"role":"user","text":"hi"}]}'
event: error
data: {"message": "Assistant abhi set nahi hua hai. GEMINI_API_KEY backend ke .env mein daalein."}
```

| Setting | Default | |
|---|---|---|
| `GEMINI_API_KEY` | *(blank)* | Server-side only — never reaches the browser |
| `GEMINI_MODEL` | `gemini-3.5-flash-lite` | Picked on measured time-to-first-token: ~1.1s, against ~4.7s for `gemini-3.6-flash` and ~11s for `gemini-3.8-flash` |
| `GEMINI_MAX_OUTPUT_TOKENS` | `800` | Nobody scrolls past this on a phone |
| `GEMINI_TIMEOUT_SECONDS` | `30` | |

Google retires models on its own schedule — `gemini-2.0-flash`, the original
default here, stopped answering. When that happens the API returns 404 naming
the replacement, and the error the user sees carries that name through, so the
fix is to put it in `GEMINI_MODEL` and restart. The process reads the key and
the model name once at startup; editing `.env` does nothing until it does.

---

## Built for time-to-first-token

The thing users actually judge is not "the answer took 3 seconds", it is
"nothing happened when I pressed send". Four choices follow from that, in
descending order of how much they matter.

**1. It streams.** Tokens are painted as Google emits them, so text starts
appearing in a few hundred milliseconds instead of after the whole reply. This
is the single largest win available and everything else is secondary.

`POST /api/assistant/chat` returns `text/event-stream`:

```
event: chunk
data: {"text": "Doodh "}

event: chunk
data: {"text": "chaar packet hai."}

event: done
data: {}
```

**2. One HTTP client, kept warm.** A fresh connection per message pays DNS, TCP
and a TLS handshake every time — easily 200 ms on a slow link, before Google
has read a word. The client is opened once in the app's lifespan and reused.

**3. A short system prompt.** Every input token is latency. The prompt is terse
and the shop snapshot is a few lines, not a catalogue dump.

**4. No server-side history.** The client sends the turns it already has, so a
reply costs no database round trip to rebuild a conversation — and there is no
chat log sitting in the database for someone to read later.

---

## What it knows about the user

A chatbot in a shopkeeper's app that cannot answer *"kitna doodh bacha hai"* is
a search box. A compact snapshot rides in the system instruction:

- **Retailer** — shop name and area, the shelf (product, quantity, price, and a `LOW` marker), wholesale orders awaiting a supplier, home-delivery orders awaiting acceptance.
- **Distributor** — business name, active opportunity signals, orders awaiting a response.
- **Customer** — name and role only.

Send `include_context: false` to leave it out — a question about the capital of
France does not need a shelf listing, and skipping it is marginally faster.

The prompt forbids inventing a price, a stock figure or an order number, and
tells the model to say it cannot see something rather than guess. It also
refuses to rule on loan eligibility and points at the Loan screen instead,
which is the same line the rest of the product holds.

---

## Failure, in a sentence someone can act on

Google's errors are translated rather than forwarded:

| Cause | What the user sees |
|---|---|
| No key | "GEMINI_API_KEY backend ke .env mein daalein." |
| 401 / 403 | "Gemini API key galat ya expired hai." |
| 404 | "Model '…' nahi mila. GEMINI_MODEL .env mein badlein" |
| 429 | "Gemini ki limit lag gayi hai." |
| Timeout | "Jawab aane mein bahut der lagi." |

A refusal that arrives **after** the response has begun is sent as an `error`
frame inside the stream, because by then the HTTP status line is long gone. The
client renders both the same way.

---

## The widget

A floating button on every signed-in screen rather than a page of its own — a
question arrives while the shopkeeper is looking at something else, and making
them navigate away to ask it means they mostly will not.

- Streams the reply into the bubble as it arrives.
- A **stop** control while it runs (`AbortController`), because a long answer on a metered connection is the user's to cancel.
- Role-aware openers, so the empty state is not a blank box.
- Enter sends, Shift+Enter is a newline.
- Replies in whatever language the question used.

`EventSource` is not used: it is GET-only and cannot carry an `Authorization`
header, so the client reads SSE frames off a `fetch` body itself. Frames split
across a read boundary are buffered rather than parsed truncated — which is the
bug that would otherwise drop a word out of the middle of an answer with
nothing logged.

---

## Verification

| Check | Result |
|---|---|
| Backend tests | **308 passed** (26 new) |
| Frontend tests | **177 passed** (18 new) |
| oxlint · build | clean |

Google is never called in tests. They drive the request shape, the SSE parsing
on both sides, and every refusal path — including a frame deliberately cut in
half mid-JSON.

No new dependency: the Gemini REST API is called with the `httpx` already in
`requirements.txt`, rather than adding an SDK.
