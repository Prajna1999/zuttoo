# FieldMate — the Diagnostician (v1)

> **What this is.** The scaffolding for the FieldMate AI assistant's agent pipeline. v1 has
> **exactly one working agent: the Diagnostician** — the agent that reads the product
> models for the asset a technician is standing in front of and returns a finding with
> evidence, confidence, and a recommended next check. Everything else in the original
> multi-agent vision is deliberately *not built yet*: a scaffold that pretended those
> agents worked would be fake. Diagnosis is the one job fully grounded in the real product
> data today.

---

## 1. What works today

```text
asset ID (ENG-034 · MT-183 · INV-02 · KWF-05)
   │
   ▼
asset registry ────► real record in lib/*-real.json
   │                   (the same files the dashboards import)
   ▼
normalized dossier ──► facts + alerts + evidence (context.ts)
   │
   ▼
the Diagnostician ───► finding + evidence + confidence (runtime.ts)
```

Run it:

```bash
npx tsx scripts/fieldmate-demo.ts
```

Five scenarios against real data — a critical turbofan (ENG-034, RUL 6.3), a stuck smart
meter (MT-183, 2,183 h / 90 d), a DAQ-faulted inverter (INV-02, 973 h zero-voltage), an
availability gap on a turbine (KWF-05, 85.9%), and an unresolvable asset (TX-999 — the
agent must refuse rather than guess). A grounding check at the end asserts the real digits
appear in every answer: `6.3`, `13.54`, `2183`, `voltage-channel`, `96.5`, `85.9`.

## 2. The agent

| Agent | Mission | Tools | Escalation |
|---|---|---|---|
| 🩺 **Diagnostician** | Read the RUL / conformance / string / anomaly output of the product that owns *this* asset and translate it into a finding with evidence, confidence, and a next check. Never invent numbers — cite the model output. | `resolve_asset`, `get_dossier`, `get_asset_state`, `run_diagnostics`, `get_alert_context` | No model output for this asset → say so plainly, offer the raw data instead |

All five tools are **grounded in real data** (`lib/fieldmate/tools.ts`): a tool must return
numbers that exist in `lib/*-real.json` or the notebook artifacts. The agent reads a
normalized dossier (`lib/fieldmate/context.ts`), never domain JSON directly, so swapping
the data plane (demo fs-reads ↔ app JSON imports ↔ live product backends) never changes
agent code.

**Grounding rules** (the same rules every future agent inherits):

- Every number in a finding traces to a real record; no invented readings, ever.
- Freshness is shown: "as of 2016-12-25", "Dec 2014 window", "fleet archive".
- The agent says *what it is not*: for a critical engine it issues a diagnostic
  recommendation ("schedule grounding") and explicitly notes that LOTO and approvals are
  outside its scope.
- Confidence is attached to every finding (0.9 grounded, 0.2 unresolved).

## 3. The planned roster (not built — by design)

The original vision listed six more agents. They are roadmapped, not faked:

| Agent | Would add | Blocked on |
|---|---|---|
| 🧭 Scout | context assembly as a separate agent | not needed in v1 — `resolveAsset` is the data plane |
| 📚 Archivist | documented procedures / SOPs / parts with citations | a knowledge corpus that doesn't exist yet |
| 🔧 Field Lead | multi-step conversational orchestration | an LLM composer (v2) |
| 🛡️ Safety Warden | verify-before-speak guardrail for proposed actions | a safety rule corpus + permit register; governance sign-off |
| 🛟 SME Escalator | human handoff with a context packet | SME routing + follow-up loop |
| 📝 Chronicler | audit log + outcome loop | a work-log store |

None of these can be honestly grounded today, so none of them are scaffolded as working
code. When each arrives, it plugs into the same tool catalog and the same
data plane — the Diagnostician's grounding rules above are the contract they inherit.

## 4. Honest limits

- The Diagnostician answers **"what's wrong?"** and nothing else. "What do I do?", "Is it
  safe to…?", "Draft a report", "Talk to an engineer" are out of scope in v1 — the demo
  does not fake them.
- The scaffold proves *grounding*, not *reasoning*: the finding templates are deterministic.
  An LLM can later compose richer findings, but it still reads only real records and still
  carries the same confidence/evidence contract.
- Live freshness: v1 reads dashboard snapshots; production needs the streaming asset-state
  API behind the same tool interface.

## 5. Next step

Turn the grounding check in the demo into a real evaluation harness: a golden set per
domain (the canned FieldMate threads in `lib/fieldmate-data.ts` are the seed), asserting
citations resolve to real records and confidence matches reality. Then add the next agent
only when its data plane exists — the Archivist's corpus is the natural second step.
