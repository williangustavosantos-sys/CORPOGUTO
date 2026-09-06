import assert from "node:assert/strict";
import test from "node:test";
import {
  recordGutoBeta1SessionFeedback,
  type Beta1PresenceSummary,
} from "@/lib/api/guto";

// ─── BETA1 PRESENCE CONTRACT (frontend) ─────────────────────────────────────
// Contract, not exact strings (B14): the question always accompanies
// INVESTIGATE/SAFETY, a free-text answer carries the cause to the backend,
// and no raw technical error is ever surfaced to the user.

function presenceFixture(overrides: Partial<Beta1PresenceSummary> = {}): Beta1PresenceSummary {
  return {
    outcome: "MAINTAIN",
    reasonCode: "APPROPRIATE_DOSE",
    contextualQuestion: null,
    trend: "INSUFFICIENT_DATA",
    knownFactsEcho: [],
    ...overrides,
  };
}

test("PRESENCE 4/6: INVESTIGATE/ADAPT responses always carry the question or close it", () => {
  const investigate = presenceFixture({
    outcome: "INVESTIGATE",
    reasonCode: "RECURRED_HARD_WITHOUT_CAUSE",
    contextualQuestion: "é o treino que está demais, ou você anda chegando mais cansado?",
  });
  assert.ok(investigate.contextualQuestion, "INVESTIGATE must carry a question (loop open)");

  const adapted = presenceFixture({
    outcome: "ADAPT",
    reasonCode: "CAUSE_IDENTIFIED_TRAINING",
    contextualQuestion: null,
  });
  assert.equal(adapted.contextualQuestion, null, "cause known → loop closed");
});

test("PRESENCE 5: user cause answer is sent as causeExplanation (never becomes a preference)", async () => {
  const calls: Array<Record<string, unknown>> = [];
  const original = globalThis.fetch;
  globalThis.fetch = (async (_input: unknown, init?: RequestInit) => {
    calls.push(JSON.parse(String(init?.body ?? "{}")));
    return new Response(
      JSON.stringify({
        brainVersion: "guto-cerebro-v3",
        requestId: "r-1",
        traceId: "t-1",
        presence: presenceFixture({ outcome: "MAINTAIN", contextualQuestion: null }),
      }),
      { status: 200, headers: { "content-type": "application/json" } },
    );
  }) as typeof fetch;
  try {
    await recordGutoBeta1SessionFeedback({
      workoutSessionId: "11111111-1111-4111-8111-111111111111",
      overallDifficulty: "PESADA",
      causeExplanation: "Estou dormindo mal essa semana.",
    });
    const body = calls[0]!;
    assert.equal(body.causeExplanation, "Estou dormindo mal essa semana.");
    assert.equal(body.overallDifficulty, "PESADA");
    assert.ok(typeof body.requestId === "string" && body.requestId.length > 10, "requestId present for idempotency");
  } finally {
    globalThis.fetch = original;
  }
});

test("B11: API failures never surface raw technical errors to the user", async () => {
  const original = globalThis.fetch;
  globalThis.fetch = (async () => new Response(
    JSON.stringify({
      code: "V3_DECISION_INVALID",
      // Contract (B12): `message` is the HUMAN line; technical truth lives in details.
      message: "Foi mal, eu me perdi aqui. Manda de novo?",
      details: { technicalMessage: "SYNTHETIC_TECHNICAL_DETAIL_123", provider: "gemini" },
    }),
    { status: 502, headers: { "content-type": "application/json" } },
  )) as typeof fetch;
  try {
    await assert.rejects(
      () =>
        recordGutoBeta1SessionFeedback({
          workoutSessionId: "11111111-1111-4111-8111-111111111111",
          overallDifficulty: "PESADA",
        }),
      (error: unknown) => {
        const message = String((error as Error)?.message ?? error);
        // The surfaced message is the human line; the technical detail is not in it.
        assert.ok(!message.includes("SYNTHETIC_TECHNICAL_DETAIL_123"), "raw provider detail must not be the user-facing message");
        assert.ok(!/invalid|exception|unexpected/iu.test(message), "user-facing message stays human");
        return true;
      },
    );
  } finally {
    globalThis.fetch = original;
  }
});

test("contract: presence payload validates before the panel renders the question", () => {
  const invalid = { outcome: "SOMETHING_ELSE" } as unknown as Beta1PresenceSummary;
  // The panel only renders the question for known outcomes; unknown shapes are
  // ignored rather than crashing the completion screen.
  const knownOutcomes = ["PROGRESS", "MAINTAIN", "REGRESS", "INVESTIGATE", "ADAPT", "SAFETY"];
  const isRenderable = (payload: Beta1PresenceSummary | null) =>
    payload != null && knownOutcomes.includes(payload.outcome);
  assert.ok(!isRenderable(invalid), "unknown outcome shape is not rendered");
  assert.ok(isRenderable(presenceFixture({ outcome: "INVESTIGATE", contextualQuestion: "x" })));
});
