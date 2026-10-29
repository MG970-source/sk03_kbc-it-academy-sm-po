# 🧪 User Acceptance Tests — Finance Dashboard & Banking API

Manual test cases, run by a person, before anyone says the software is ready.

Automated tests answer "does it still do what it did yesterday". These answer a
different question: **is what it does the thing we asked for**. A machine cannot
tell you that an error message is useless, that a tax figure looks wrong to
somebody who knows tax, or that a screen is unusable one-handed on a phone in a
branch. That judgement is the part of testing automation does not take off your
plate, and it is why UAT is usually signed by the person who wanted the feature
rather than by the person who built it.

**Who runs this:** the Product Owner, or a business colleague who did not write
the code.
**When:** before a release goes to customers, and after any change to the two
API integrations.
**How long:** about an afternoon for a full pass; 30 minutes for the ⭐ cases.

---

## What automation already covers (so you do not repeat it)

| Already checked by a machine | Where |
|---|---|
| The tax arithmetic, on invented round numbers | `tests/e2e/dashboard.spec.js` |
| The bracket table renders one row per bracket | `tests/e2e/dashboard.spec.js` |
| The refresh button unlocks after a failed request | `tests/e2e/dashboard.spec.js` |
| The API's status codes, including 404 for an unknown account | `tests/java/api/BankingApiIT.java` |
| The JSON the API writes and reads | `tests/java/api/BankingApiJsonTest.java` |

Note the gap that leaves. The end-to-end test proves the estimator adds up
correctly using **made-up brackets** written into a fixture file. Nothing
automated checks that the brackets the real API returns are the brackets a tax
authority actually published. UAT-05 does.

---

## Setting up

**The dashboard.** Complete the four settings at the top of `frontend/app.js`
(see `frontend/README.md`), then open `frontend/index.html` in a browser. A free
API key from [api-ninjas.com](https://api-ninjas.com/register) is required.

**The API.** From the repository root:

```bash
javac -d out $(find src -name "*.java")
java -cp out api.BankingApi
```

It answers on `http://localhost:8080`. Use a browser for the GET cases and
`curl` for the rest — every command is written out below, ready to paste.

**Recording results.** Fill in the Result column as you go: **Pass**, **Fail**,
or **Blocked**. A failure needs three things written next to it — what you did,
what you expected, what happened instead. "Doesn't work" costs a developer an
hour of guessing.

---

## Part 1 — The dashboard

### ⭐ UAT-01 · A newly cloned dashboard explains what to do

*Why it matters: this is the first screen every new colleague sees. If it looks
broken rather than unfinished, they file a bug instead of doing the setup.*

| | |
|---|---|
| **Preconditions** | `frontend/app.js` with all four `YOUR_..._HERE` placeholders untouched |
| **Steps** | 1. Open `frontend/index.html` in a browser. |
| **Expected** | Both cards show a grey "Configuration needed" box naming the tasks to complete and pointing at `README.md`. No spinner runs forever. No red error. No blank page. |
| **Result** | |

### ⭐ UAT-02 · The exchange rate shown is the exchange rate published

*Why it matters: a wrong rate on a bank's screen is not a cosmetic defect.*

| | |
|---|---|
| **Preconditions** | Dashboard configured with a pair you can check elsewhere, e.g. `EUR_USD` |
| **Steps** | 1. Open the dashboard. 2. Note the rate and the "Last updated" time. 3. Look the same pair up on an independent source (your own bank's site, the ECB, a search engine). |
| **Expected** | The two agree to roughly two decimal places. The inverse rate shown is 1 divided by the rate. Both currency names and flags match the pair you configured. The timestamp is today. |
| **Result** | |

### UAT-03 · Refreshing repeatedly does not break the page

*Why it matters: the free tier is rate-limited. Real integrations are too, and
what the page does when the limit is hit is a product decision, not a technical
detail.*

| | |
|---|---|
| **Steps** | 1. Click **↻ Refresh Rate**. 2. While it says "Refreshing…", try to click it again. 3. Click it fifteen more times, slowly, until the free tier complains. |
| **Expected** | The button is disabled while a request is in flight and comes back afterwards, whether the request succeeded or failed. When the API eventually refuses, an error box appears with a message, and the page keeps working — the tax card is unaffected. |
| **Result** | |
| **Judgement call** | Is the message a customer could act on? Write down what you would rather it said. |

### ⭐ UAT-04 · Filing status changes the brackets

| | |
|---|---|
| **Preconditions** | `TAX_COUNTRY = "US"` |
| **Steps** | 1. Open the dashboard. 2. Read the bracket table. 3. Change **Filing Status** to another option. |
| **Expected** | The table redraws with different income boundaries. The rates run low to high down the table, the top band reads "No limit", and the coloured bars get longer as the rate rises. |
| **Result** | |

### ⭐ UAT-05 · The brackets match what the tax authority published

*Why it matters: no automated test in this repository checks this. They all use
invented numbers from a fixture file.*

| | |
|---|---|
| **Steps** | 1. Note every rate and boundary in the table. 2. Compare them against the published federal brackets for the year shown in the badge (IRS for `US`, CRA for `CA`). |
| **Expected** | Every rate and boundary matches, and the year on the badge is the year you compared against. |
| **Result** | |
| **If it fails** | This is a data problem, not a code problem. Record which bracket is wrong and what the published figure is — that is what the supplier will be asked. |

### UAT-06 · The tax estimate survives arithmetic by hand

| | |
|---|---|
| **Steps** | 1. Enter a round income — 50 000 is easiest. 2. Click **Calculate**. 3. Work the tax out on paper: each bracket's rate applied only to the part of the income inside that bracket. |
| **Expected** | The estimated tax matches your paper figure. The marginal rate is the rate of the band the income lands in, and the effective rate is lower than it — if those two are ever equal for a multi-band income, something is wrong. The disclaimer about professional advice is visible. |
| **Result** | |

### UAT-07 · Bad input is refused politely

| | |
|---|---|
| **Steps** | Try each in the income box, clicking **Calculate** after each: nothing at all; `0`; `-5000`; `abc`; `999999999999`. |
| **Expected** | Nothing crashes, nothing shows `NaN`, `undefined` or `Infinity`, and anything invalid gets a readable message. A very large number may be silly but must still add up. |
| **Result** | |

### UAT-08 · A wrong API key fails in a way somebody can act on

| | |
|---|---|
| **Steps** | 1. Change `API_KEY` in `app.js` to `not-a-real-key`. 2. Reload the page. 3. Open the browser console with F12 and look at the Network tab. |
| **Expected** | Both cards show an error box, not a spinner. The message says what went wrong. The status code visible in the Network tab is 401, and the page does not print the key anywhere on screen. |
| **Result** | |
| **Judgement call** | Would a colleague know from that message that the key is the problem? |

---

## Part 2 — The banking API

### ⭐ UAT-09 · A customer name containing a comma

*Why it matters: **this is a known open defect.** `BankingApiJsonTest` pins the
current behaviour, so the automated suite is green while the bug is present. Go
and see what it actually costs.*

| | |
|---|---|
| **Steps** | 1. Start the API. 2. Create an account with a name written surname-first: |

```bash
curl -X POST http://localhost:8080/accounts \
  -H "Content-Type: application/json" \
  -d '{"id": "9", "owner": "Dupont, Marie", "balance": "1500.00"}'

curl "http://localhost:8080/accounts?id=9"
```

| | |
|---|---|
| **Expected (what a bank needs)** | The account comes back with the owner `Dupont, Marie`. |
| **Actual (today)** | The owner is stored as `Dupont`. The given name is gone. There is no error, no warning and no log line — the request answers 201 Created and the balance is filed correctly next to the wrong name. |
| **Result** | Expected to fail. Record it, and decide as a product decision how urgent it is. |
| **Worth asking in the room** | Which is worse: a payment that fails loudly, or one that succeeds against a name nobody can match to a customer? |

### UAT-10 · An account that does not exist

| | |
|---|---|
| **Steps** | Run `curl -i "http://localhost:8080/accounts?id=999"` |
| **Expected** | `HTTP/1.1 404 Not Found` and a body saying `not found`. |
| **Result** | |
| **Background** | This used to answer `200 OK` with an error message inside the body, so every dashboard counting status codes read a failed lookup as a success. A service returning nothing but "not found" all day looked perfectly healthy. |

### UAT-11 · A malformed or empty request body

| | |
|---|---|
| **Steps** | Run `curl -i -X POST http://localhost:8080/accounts -d ''`, then `curl -i -X POST http://localhost:8080/accounts -d 'this is not json'`, then list the accounts. |
| **Expected (what a bank needs)** | The request is rejected with `400 Bad Request` and nothing is stored. |
| **Actual (today)** | Both are accepted with `201 Created`, and an empty or nonsense account joins the list. |
| **Result** | Expected to fail. This is the second known defect; note it next to UAT-09 and decide which is worth fixing first. |

### UAT-12 · An unsupported method

| | |
|---|---|
| **Steps** | Run `curl -i -X DELETE http://localhost:8080/accounts` |
| **Expected** | `HTTP/1.1 405 Method Not Allowed`, and no account is deleted. |
| **Result** | |

### UAT-13 · Restarting the service

*Why it matters: the store is in memory, on purpose, because this is a teaching
demo. Whether that is acceptable is a question for the people who would lose the
data, and it should be asked out loud rather than discovered in production.*

| | |
|---|---|
| **Steps** | 1. Create an account. 2. Confirm it is listed. 3. Stop the API with Ctrl-C and start it again. 4. List the accounts. |
| **Expected** | Only the two original demo accounts are there; everything created is gone. |
| **Result** | |

---

## Part 3 — Exploratory charters

Not scripts. Each is a time-boxed hunt: set a timer, follow what you find, and
write down anything surprising. Exploratory testing finds the defects nobody
thought to write a test for, which is most of the interesting ones.

**Charter A — 20 minutes, the dashboard on a phone.** Open it on an actual
phone, or narrow the browser window to about 375 px. Can you read the bracket
table? Can you reach the Calculate button without pinching? Does anything sit
under anything else?

**Charter B — 15 minutes, keyboard only.** Put the mouse down. Tab through the
whole page. Can you change the filing status, type an income and calculate?
Is it ever unclear which element has focus? In a bank this is not a nicety —
accessibility is a procurement requirement and increasingly a legal one.

**Charter C — 15 minutes, the network cut.** Open the dashboard, then turn off
your wi-fi and press refresh. Then turn it back on and press refresh again. Does
the page recover on its own, or does it need reloading? Would a customer know
which of the two had happened?

---

## Sign-off

| | |
|---|---|
| **Version / commit tested** | |
| **Tested by** | |
| **Date** | |
| **Environment** | Browser and version, operating system, Java version |
| **Cases passed** | of 13 |
| **Open defects accepted for this release** | UAT-09, UAT-11, and anything else found |
| **Decision** | ☐ Accept ☐ Accept with the defects above ☐ Reject |

Accepting a release with known defects is a normal decision and a legitimate
one. What is not legitimate is accepting one without knowing they are there,
which is the only thing this document is really for.
