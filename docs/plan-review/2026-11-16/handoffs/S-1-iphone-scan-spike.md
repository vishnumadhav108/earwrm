# S-1: iPhone scan spike

> **Draft.** Lives in the plan-review packet until Vishnu authorizes it. D28 and ROADMAP item 1 already call for this spike; this file only makes it runnable.

**Branch:** none for the spike itself (it happens outside this repository). The write-up is one small docs PR on `docs/s-1-spike-findings`.
**Goal:** find out, on a real iPhone, what the system lets an app learn about what its owner played in Apple Music. The answer decides whether an on-device scan is ever built (D28; plan review Q9).
**Depends on:** nothing. It needs no backend and can run at any time.
**Read:** `docs/DECISIONS.md` D28; `docs/ROADMAP.md` item 1; `docs/EXTERNAL-SOURCES.md` § Apple MediaPlayer and § Last.fm (the Personal Team limits); Apple's current documentation for the MediaPlayer and MusicKit frameworks (check the exact names; don't write them from memory).

Writing this handoff did not authorize running it. Start in plan mode and show the plan first.

## Who does what
Vishnu runs the app and makes the observations: it needs the Mac, the iPhone and an Apple Music account. A session may write the throwaway app and the observation sheet, and later the docs PR.

## Canonical files
- **Reads:** the docs above.
- **Updates (docs PR only):** `docs/EXTERNAL-SOURCES.md` (the Apple play-history section).
- **Creates:** nothing in this repository. The Xcode project lives in a folder outside it and is never committed here.

## Starting-state checks
Stop and report if any of these is not true.
1. A Mac with a current Xcode, an iPhone with a cable, and an Apple Music subscription on that iPhone.
2. A free Personal Team is enough: no Apple Developer Program membership is bought for this (D40).
3. The spike folder is outside `C:\dev\earwrm` and outside any clone of it.

## Scope
**In:** a throwaway app that reads play dates and play counts on the device and shows them on screen; a fixed list of observations.
**Out (non-goals):** any network call from the app; any earwrm account, API or database; a design for the scan; background-refresh tuning beyond observing whether it runs; anything that would need the paid program (if a question can't be answered without it, record that as the finding).

## Privacy
- Nothing leaves the phone. The app has no network code.
- The write-up records behaviour ("a streamed track not in the library showed no play date"), never Vishnu's listening history: no track names, no dates of real listens. The repository is public.

## Tasks
1. **The throwaway app.** One screen. It asks for music-library permission, then lists items with their last-played date and play count, newest first, with a manual refresh button and the time of the last read. Read them two ways, and label which is which: through the MediaPlayer framework (`MPMediaItem.lastPlayedDate`, `playCount`), and through MusicKit's library request, if the free team allows that capability.
   - **Verify:** the app installs on the iPhone from Xcode with the Personal Team, and the list appears after permission is granted. If the build is refused for a capability, record which one.
2. **Observations.** For each case below, play the music as described, then refresh, and write down what the app showed and how long it took to change. Use one test album and one test single throughout.

   | # | Case (from ROADMAP item 1) | What to record |
   |---|---|---|
   | 1 | A track **in the library**, streamed | Does the play date update? Does the count go up? After how long? |
   | 2 | A track **not in the library**, streamed from the catalog | Does it appear at all? |
   | 3 | A **downloaded** track, played offline (airplane mode) | Does it update offline? After reconnecting? |
   | 4 | A track **skipped** after a few seconds | Does a skip count as a play? Does it change the date? |
   | 5 | The same track played **twice** | Does the earlier play date survive, or is it overwritten? |
   | 6 | A track played on **another device** on the same account | Does this phone learn of it? After how long? |
   | 7 | A whole album, start to finish | Is there evidence for every track, or only some? |
   | 8 | The app in the background for a day, with background refresh **on** | How many times did it get to run? |
   | 9 | The same, with background refresh **off** or Low Power Mode on | Does it ever run before the app is opened? |
   | 10 | Open the app after a replay of a track from case 7 | Is the first play's time still recoverable from anything? |

   Also answer in one line each: do the two frameworks disagree? Is there any history older than the last play? What does the permission prompt say to the user?
   - **Verify:** each row has an observed answer, or "could not observe" with the reason.
3. **The verdict.** One of three, with the rows that support it:
   - **Pass:** play dates are available for streamed tracks, at least those in the library, and a scan at app launch could collect release-day evidence conservatively (D28's rules).
   - **Partial:** it works only for a narrower case (say which), and what that would mean for the "Full Album, Day One" badge.
   - **Fail:** no usable play evidence.
4. **Docs PR.** Add the findings to `docs/EXTERNAL-SOURCES.md` under the Apple play-history section, dated, labelled "Observed on a real device" with the iOS version and the phone model. Replace the "Unverified" lines the spike settled. Change no decision and no handoff: Vishnu decides what the verdict means (register L7).
   - **Verify (proposed, not run):** `git diff --stat main` shows only `docs/EXTERNAL-SOURCES.md`. `npm run format:check` exits 0.
5. **Clean up.** Delete the app from the iPhone. Keep or delete the Xcode folder as Vishnu prefers. It never enters this repository.

## Stop and ask
- A question can only be answered with the paid developer program.
- The app would need to send anything off the phone to answer a question.
- The observations suggest a different approach (for example, a different framework). Record it. Don't build it.

## Rollback
Delete the app and the folder. Revert the docs PR if it merged.

## Acceptance criteria
- All ten cases and the three one-line questions have an observed answer or "could not observe".
- The verdict is one of Pass, Partial or Fail, with its supporting rows.
- `docs/EXTERNAL-SOURCES.md` records the findings with the date, the iOS version and the device.
- Negative: no listening history, account detail or track name from Vishnu's library appears in the repository, and the spike changed no decision.
