# Tests

Everything automated in this repository lives here, in three tiers, plus a set of
manual cases in [`../UAT.MD`](../UAT.MD) that no tool runs for you.

| Tier | Where | How many | What a green run proves | Roughly |
|---|---|---|---|---|
| Unit | `tests/java/monolith`, `tests/java/api` | 7 | One method, called directly, returns the right answer | 2 seconds |
| Integration | `tests/java/api/BankingApiIT.java` | 5 | The API's parts fit together over real HTTP — routing, status codes, the store | 5 seconds |
| End-to-end | `tests/e2e/dashboard.spec.js` | 5 | A person opening the page in a browser gets what they came for | 20 seconds |
| Manual (UAT) | `../UAT.MD` | 13 cases | Somebody who wanted the feature agrees this is the feature | An afternoon |

The shape is deliberate and it is the same shape every healthy suite has: many
cheap tests, fewer expensive ones. Cost is not only machine time. A unit test
that fails names the method that broke; an end-to-end test that fails says
"the number on the screen was wrong" and somebody spends an hour finding out why.

## Running them

```bash
mvn test                    # unit tests only — what you run while writing code
mvn verify                  # unit, then integration, then the coverage gate
                            # (this is what the pipeline runs)

npm ci                      # once
npx playwright install chromium
npm test                    # the browser tests
npm run test:headed         # …with the browser visible, which is worth doing once
npx playwright show-report  # what failed, with a screenshot and a trace
```

`mvn` needs a JDK 21. `npm` needs Node 20 or newer. Neither needs the internet
once the dependencies are down: the end-to-end tests never call the two public
APIs the dashboard uses, they answer every request from `tests/e2e/fixtures`.

## Coverage

`mvn verify` writes a report to `target/site/jacoco/index.html` and **fails the
build below 35% line coverage**. That number is in `pom.xml`, it is deliberately
set under where the suite actually sits, and the only honest way to move it is
up, after the tests improve.

Coverage is a floor, not a score. It tells you which lines nobody has executed
outside production. It tells you nothing about whether the lines that did run
were checked, which is why two of the files here exist:

- **`tests/java/theatre/CoverageTheatreTest.java`** — calls four classes and
  asserts nothing at all. It is excluded from the normal build. Run
  `mvn verify -Pcoverage-theatre` and compare the coverage percentage to the
  ordinary run: it jumps, and not one additional thing is being verified. Any
  team told to hit a coverage target can produce that file in an afternoon.
- **The `database/**` exclusion in `pom.xml`** — the two demo scripts from
  Module 1 are left out of the measurement, which is defensible and which also
  raises the percentage. Deciding what the denominator contains is the quietest
  way a coverage number improves without a test being written. Every exclusion
  should have a reason somebody is willing to say out loud.

On GitHub, [Codecov](https://about.codecov.io/) posts the number back onto the
pull request as its own check. It is free for public repositories; install the
Codecov app on your fork if you want to see it. The step is set not to fail the
build when it is missing, because the gate that matters is the JaCoCo minimum
above — it runs on any machine, with no third party involved and nothing to sign
up for.

## The flaky test

`tests/e2e/dashboard.spec.js` ends with a test marked `test.skip` and labelled
*flaky by design*. Change `test.skip(` to `test(` and run:

```bash
npx playwright test --repeat-each=10
```

Six of those ten runs fail, four pass, and the application does not change once
in between. The fault is in the test: it waits a fixed 200 ms and then assumes
the answer has arrived, while the stubbed API takes anywhere from 0 to 600 ms.

Suites acquire this by accident — a fixed sleep instead of waiting for the thing
itself, a test that depends on the previous test's leftovers, a date that rolls
over at midnight. The direct cost is a re-run. The real cost arrives about a
fortnight later, when "just run it again" has become the standard response to
red, and the one failure that meant something goes through with the rest. Note
that `playwright.config.js` sets `retries: 0` for the same reason: automatic
retries make a flaky suite invisible rather than absent.

## Known defect on purpose

`BankingApiJsonTest` ends with a test named **KNOWN DEFECT**. The API's hand-rolled
JSON parser splits on every comma, so a customer filed as `Dupont, Marie` is
stored as `Dupont` and the rest is dropped without an error, a log line or a 400.
The test pins that behaviour rather than fixing it, which is called a
characterisation test.

It is green. The software is still wrong. That is worth sitting with for a
moment before anyone reports a green pipeline as evidence that a release is
safe — the pipeline is evidence that the software does what the tests say, and
somebody chose what the tests say. The defect is written up for a human in
[`../UAT.MD`](../UAT.MD) as **UAT-09**. Fixing the parser should turn that test
red, and whoever fixes it is expected to rewrite it.

## What the pipeline does with all this

`.github/workflows/ci.yml` runs four jobs on every pull request: the two original
build jobs, the backend tests with the coverage gate, and the browser tests.
Which of them are allowed to *block* a merge is a repository setting rather than
anything in that file — **Settings → Branches → Add rule → Require status checks
to pass**. A gate that reports but cannot block is a report.
