# 🧭 Platform & Environment Design — Homework

Welcome to the hands-on homework for **Module 2, Lesson 4 — Platform &
Environment Design**. This is the last homework of Module 2.

In Lesson 1 your pipeline produced an **artifact**. In Lesson 2 you rented
somewhere to run it. In Lesson 3 you packaged it into a **container** and watched
a platform keep it alive. This time you build the place all three of them end up:
the **environments** they move through, and the **gate** in between.

Two of the three tasks happen in the same GitHub fork you made for Lesson 1, so
there is nothing new to sign up for and nothing to install. The third task needs
no computer at all — only your own product and twenty quiet minutes.

Plan for **about 60 minutes**.

**Nothing here is collected and nothing is scored.** These are exercises, not
an assessment — do as much as your week allows. One task done properly is worth
more than three skimmed.

---

## What You Will Do

1. **Task 1 — Map your own environments.** No tools. Write down what your product
   actually has today, using the five parts of an environment from the lecture.
   This is the task that matters at work.
2. **Task 2 — Make the pipeline stop and ask.** Add a `test` environment, put a
   **required reviewer** on `production`, then watch your own deployment stop and
   wait for a human to approve it. That human is you.
3. **Task 3 — One setting, two values.** Give the same setting a different value
   in each environment. Run the pipeline again, and watch each job read its own
   value — and the secret arrive as `***`.

Every step gives you text to copy and paste. You are not expected to write any
YAML from memory, or to understand every line of it.

---

## How This Connects to the Lesson

| Lecture point | Where you will see it in this exercise |
|---|---|
| An environment is **five things**: code, configuration, data, infrastructure, access | Task 1: you fill in all five for your own product and find the gap |
| **Build once, then promote** — the same artifact moves right | Task 2: one workflow run, two jobs, the second waits for the first |
| A **gate** between environments is a decision with a name on it | Task 2: the run stops dead until a named person clicks Approve |
| **Segregation of duties** — the person who builds is not the only one who ships | Task 2: you meet the *Prevent self-review* switch that enforces exactly that |
| **Configuration lives outside the build** | Task 3: the same job definition reads a different address in each environment |
| **Secrets are handled differently from settings** | Task 3: the address prints, the key prints as `***` |
| **Access narrows as you move right** | Task 2: `test` lets anything through, `production` does not |

---

## Before You Start

**What you already have from Lesson 1:** a fork of this repository at
`github.com/YOUR-USERNAME/sk03_kbc-it-academy-sm-po`, with Actions enabled and a
`production` environment you created yourself. Everything below adds to that.

**Lost it, or skipped Lesson 1's homework?** No problem. Fork
[the repository](https://github.com/turbobobbytraykov/sk03_kbc-it-academy-sm-po)
again, open the **Actions** tab in your new copy, and click the green
*"I understand my workflows, go ahead and enable them"* button. That is the whole
catch-up.

**Two things to check before you start — both matter:**

- **Your fork has to be public.** Look next to the repository name at the top of
  the page: it should say **Public**. On a free GitHub account, environments and
  approval rules only work on public repositories. If yours says Private, go to
  **Settings → General → Danger Zone → Change repository visibility** and switch
  it. Nothing in the repository is confidential, so this is safe to do.
- **Use a personal GitHub account, not your UBB one.**

**Ground rules:**

- Nothing to install. Every step happens in your browser, on github.com.
- **No credit card, ever.** GitHub Actions is free on public repositories, and
  nothing in this homework touches a paid feature.
- **Never put a real password, key or customer detail into any of these boxes.**
  Every value below is made up, and yours should be too. This is a training
  repository sitting on the public internet.

---

## Task 1 — Map Your Own Environments *(~20 minutes)*

No browser and no GitHub for this one. Take your own product, the one you work on
at UBB, and fill the table in. Where you do not know the answer, **write "I don't
know"**. Those are the useful cells, and finding one means the task worked.

| | Development | Test | Staging / UAT | Production |
|---|---|---|---|---|
| **Does it exist?** | | | | |
| **Code** — how does a change get here? | | | | |
| **Configuration** — who can change a setting here? | | | | |
| **Data** — where does the data in it come from? | | | | |
| **Infrastructure** — is it the same shape as production? | | | | |
| **Access** — who can reach it, and who can change something? | | | | |

Then answer three questions underneath it, one line each:

1. Which environment do you **not trust** — the one where a green result still
   does not convince you? What exactly makes you distrust it?
2. How long does your team **wait** for an environment in a typical sprint? Is
   that wait written down anywhere?
3. Which single cell above would remove the most risk if you fixed it?

**You end up with:** the filled table plus the three answers. Half a page is
plenty. You will need this table again in Module 3 — keep it.

> If you are not currently attached to a product, use one you hear discussed in
> stand-ups, and mark it as an outside view.

---

## Task 2 — Make the Pipeline Stop and Ask *(~25 minutes)*

You are going to build a two-step promotion, test and then production, and put a
human gate in front of the second step.

### 2a. Create a `test` environment

1. In **your fork**, go to **Settings → Environments**.
2. You should already see **production** from Lesson 1. Click
   **New environment**.
3. Name it exactly `test` (lower case) and click **Configure environment**.
4. Change nothing else. Leave it wide open: that is what a test environment is
   for. Scroll down and leave the page.

### 2b. Put a required reviewer on `production`

1. Back on **Settings → Environments**, click **production**.
2. Tick **Required reviewers**.
3. In the box that appears, type your own GitHub username and select yourself.
4. ⚠️ **Do not tick "Prevent self-review".** Do read what it says, because it is
   segregation of duties written as a single checkbox, and it is exactly the one
   a bank would switch on. But if you tick it here you will not be able to
   approve your own run, and the homework stops working. Leave it alone.
5. Click **Save protection rules**.

You have just created the gate from the lecture. Nothing can reach `production`
in this repository without a named person saying yes.

### 2c. Add a workflow that uses both environments

1. In your fork, click **Add file → Create new file**.
2. In the filename box, type exactly:
   `.github/workflows/show-environments.yml`
   — typing the `/` characters creates the folders for you.
3. Paste this in:

```yaml
name: Show My Environments

on:
  workflow_dispatch:

jobs:
  deploy-to-test:
    name: Deploy to test
    runs-on: ubuntu-latest
    environment: test
    steps:
      - name: Show what this environment is configured with
        env:
          API_URL: ${{ vars.API_URL }}
          API_KEY: ${{ secrets.API_KEY }}
        run: |
          echo "Environment: test"
          echo "API address: $API_URL"
          echo "API key:     $API_KEY"

  deploy-to-production:
    name: Deploy to production
    needs: deploy-to-test
    runs-on: ubuntu-latest
    environment: production
    steps:
      - name: Show what this environment is configured with
        env:
          API_URL: ${{ vars.API_URL }}
          API_KEY: ${{ secrets.API_KEY }}
        run: |
          echo "Environment: production"
          echo "API address: $API_URL"
          echo "API key:     $API_KEY"
```

4. Scroll down and click **Commit changes**, then **Commit directly to the
   `main` branch**. This one has to go straight to `main`: a workflow only shows
   up in the Actions tab once it is on the default branch.

You do not need to understand every line. Three things are worth noticing:

- The two jobs are **identical apart from one word**: `environment:`. Same
  instructions, different place. That is "build once, then promote", in eleven
  lines.
- `needs: deploy-to-test` is what makes production wait for test. Take that line
  out and the order is no longer guaranteed.
- Not one value appears in the file. The values live in the environments.

### 2d. Run it and watch it stop

1. Go to the **Actions** tab and click **Show My Environments** in the left list.
2. Click **Run workflow → Run workflow**.
3. Refresh after a few seconds and open the run.

**Deploy to test** goes green in about twenty seconds. **Deploy to production**
does not start at all. The run just sits there with an orange marker and a line
that says *Deployment is waiting for approval*.

Nothing has failed. The pipeline is doing exactly what it was told: it will not
touch production until a person says so.

4. Click **Review deployments**, tick **production**, optionally type a comment,
   and click **Approve and deploy**.
5. Watch the second job start.

### 2e. What you should have

The run on screen **while it is waiting for approval** — screenshot it if you keep
notes. Then answer these three for yourself:

- How long did the run sit waiting, and what was it waiting for exactly?
- You approved your own deployment. In a bank, why is that usually not allowed —
  and what is the checkbox that would have stopped you?
- What would this gate be worth if the approver approved everything without
  looking?

---

## Task 3 — One Setting, Two Values *(~15 minutes)*

The workflow you just wrote asks each environment for two things: an address and
a key. Neither one exists yet, which is why the log printed two blank lines. Now
give them a different value in each place.

### 3a. Fill in the `test` environment

1. **Settings → Environments → test**.
2. Under **Environment variables**, click **Add variable**:
   - Name: `API_URL`
   - Value: `https://api.test.example-bank.local`
3. Under **Environment secrets**, click **Add secret**:
   - Name: `API_KEY`
   - Value: `test-key-4f9c2a7b`

### 3b. Fill in the `production` environment

1. **Settings → Environments → production**.
2. **Add variable** — same name, different value:
   - Name: `API_URL`
   - Value: `https://api.example-bank.local`
3. **Add secret** — same name, different value:
   - Name: `API_KEY`
   - Value: `prod-key-91d3ee5a`

Both values are made up. Never put a real one here.

### 3c. Run it again and read both logs

1. **Actions → Show My Environments → Run workflow**.
2. When the test job finishes, open it and click into the step to see the log.
3. Approve the production job when it asks, and read its log too.

Two things to look at, side by side:

| In the log | What you should see |
|---|---|
| `API address:` | A **different address in each job**. Same workflow file, same instructions — the environment supplied the difference. |
| `API key:` | `***` in **both** jobs. GitHub recognised the value as a secret and redacted it before it reached the log. |

That second row is the whole difference from the lecture. A setting is meant to
be readable: if a value is wrong, you want to see it rather than hunt for it. A
secret is never meant to be readable, not even by the person reading the log
afterwards.

### 3d. What you should have

Either log on screen showing `API key: ***`. Then answer these two for yourself:

- The two jobs ran the same three commands and produced different output. Where
  did the difference actually come from?
- Why is the address printed in full and the key not? What would go wrong if
  GitHub printed both?

---

## Reflection *(~10 minutes)*

Half a page, in your own words, for nobody but you. Don't recap the steps —
answer these:

1. In Task 1 you wrote "I don't know" in at least one cell. Which one? Who in
   your organisation *does* know, and have you asked them?
2. Adding a gate to a pipeline took you about four minutes in Task 2. If it is
   that cheap, why do you think production access at a real bank is still such a
   difficult, slow-moving subject?
3. Of the six takeaways from the lesson, which **cost** do you think your own
   product is paying today, without anyone having decided to pay it?

**For the next session I run with you — Module 3 Lesson 2, Deployment & Release
Strategies** — bring one sentence: *who is the named person who approves a
release to production for your product, and who covers for them when that person
is on holiday?* If you do not know, that is the answer, and it is worth finding
out before then.

---

## Bonus Challenge 🌟 — Make the gate cost something

Still in **Settings → Environments → production**, with time to spare?

1. Tick **Wait timer** and set it to `5` minutes. Save.
2. Run the workflow again and approve the production job.

It still does not start. You approved it, and the environment insists on five
minutes of nothing happening anyway. It is the crudest safety control there is,
and it really does get used before high-risk changes, so that somebody has a
window in which to shout stop.

Notice how it feels that you cannot make it go faster. That is what every control
in this lesson feels like from the inside, on a day when you are in a hurry.

Turn the wait timer off again when you have seen it.

**Worth writing down:** one sentence — name one change to your own product where
five forced minutes would have been worth having, and one where it would only
have caused harm.

---

## Troubleshooting

| Symptom | Most likely cause / fix |
|---|---|
| **Settings → Environments** is missing, or says environments are unavailable | Your fork is **private**. On a free account, environments only work on public repositories. Settings → General → Danger Zone → Change visibility → make it public. |
| **Show My Environments** doesn't appear in the Actions tab | The workflow file was committed to a branch instead of `main`, or the filename is wrong. It must be exactly `.github/workflows/show-environments.yml` on the `main` branch. |
| The Actions tab shows a message instead of workflows | Actions are still switched off on your fork. Click the green *"I understand my workflows, go ahead and enable them"* button. |
| **Run workflow** button is not there | You are looking at the original repository, not your fork. Check the username at the top of the page. |
| The production job never asks for approval, it just runs | The required reviewer was not saved. Settings → Environments → production → tick **Required reviewers**, add yourself, and click **Save protection rules**. |
| You cannot approve your own run — the button is greyed out | **Prevent self-review** got ticked. Settings → Environments → production, untick it, save, and re-run. |
| The `API address:` line is blank in the log | The variable was added as a *secret* instead of a *variable*, or added to the repository rather than to the environment. It must be an **Environment variable** on that specific environment. |
| Both jobs print the same address | Both values were added to the same environment. Check each environment separately. |
| The key prints in full instead of `***` | It was added as an **Environment variable**, not an **Environment secret**. Secrets are the ones that get redacted. |
| The whole run fails immediately with a YAML error | Something was lost in the copy-paste — indentation matters in YAML. Delete the file and paste it again in one go. |

---

## The Bigger Picture

- The four environments are not four servers. They are four different answers to
  the question "how sure are we?", and each one costs money to keep honest.
- A gate is easy to add and hard to mean. You built one in four minutes. The hard
  part is the organisation that has to live with it at 17:45 on a Friday.
- Configuration kept outside the build is what let two identical jobs behave
  differently. It is also why a wrong value reaches production faster than bad
  code does: nothing compiled it, and nothing tested it.
- A secret is not just a setting with a better name. It is handled by different
  machinery, in a different place, with different people allowed near it.
- Test data is the one part of the lecture this homework could not show you. That
  is no accident. It is the part nobody can demonstrate in fifteen minutes on a
  free platform, which is roughly why it stays unsolved in real organisations
  too.
- Next: **Module 3** — how a release actually reaches customers once it is in
  production, what a passing test is really worth, and what happens in the first
  ten minutes of an incident.

---

## Notes for the lecturer

*Not part of the participant handout — delete before sending, or keep on a
separate page.*

- **The homework review for this one lands two sessions later.** Module 3
  Lesson 1 is Daniel's Architecture Decision Lab, so Section 0 of **M3 L2,
  Deployment & Release Strategies**, reviews this. Say that out loud when you set
  it, or half the room will assume it has been dropped. The "who approves a
  release, and who covers them" question is deliberately the exact opening of
  M3 L2.
- **Verified 31 Aug 2026 against current GitHub Docs:** environments and required
  reviewers are available to **Free accounts on public repositories only** —
  this is the single thing most likely to bite, so the public-repo check is
  called out twice above. Actions minutes remain free for public repositories,
  explicitly preserved through the January and March 2026 pricing changes.
  *Prevent self-review* is opt-in and ships unticked, which is what makes a solo
  learner able to approve their own run. **Re-check all three about a week before
  sending.**
- **Builds directly on the Lesson 1 homework** — same fork, Actions already
  enabled, `production` environment already created. Anyone who skipped L1 has a
  two-minute catch-up path. Nobody needs a new account for this one.
- **Support burden:** Task 1 ≈ none, and it is the one with real work in it.
  Task 2 is where questions cluster — the private-fork problem and committing the
  workflow to a branch instead of `main`. Task 3 is where people confuse
  *variable* with *secret*, which is a productive mistake: it is the lesson.
- **What to demo live** (so the homework is recognition, not discovery): 90
  seconds adding a required reviewer and running the workflow until it stops on
  *Deployment is waiting for approval*. Do not show the approval — let them have
  it. Skip Task 3 entirely in the room.
- **Expected "aha" per task:** T1 — the empty cells. T2 — the run visibly
  stopping and waiting for you personally. T3 — `***`.
- **Nothing is collected or scored.** If someone does bring a reflection to you,
  question 3 is the one worth reading properly — it tells you whether the new
  takeaway form landed.
- **Ties back to:** M2 L1 (the fork, the artifact, the `production` environment
  they already made), M2 L2 (idle environments cost money), M2 L3 (the platform
  holding the desired state). **Ties forward to:** M3 L2 (approval, rollback,
  feature flags) and M3 L3 (quality gates in the pipeline).
- **Deliberately not covered:** test data. It cannot be demonstrated for free in
  a browser, and pretending otherwise would undercut the section that says it is
  the expensive one. The Bigger Picture says this out loud on purpose.

---

*Platform & Environment Design Homework · Module 2, Lesson 4 · KBC IT Academy*
