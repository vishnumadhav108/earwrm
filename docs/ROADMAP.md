# Roadmap after handoff 12

1. **iPhone app: the main platform** (Expo / React Native with a native module where needed, using the same typed backend). Home-screen widgets ("friend just reviewed…"), push notifications, and **on-device Apple Music scanning** (D28) for "Log this?" suggestions and Full Album Day One badges.
   - Scanning becomes the headline feature **only once the spike passes**.
   - **First, a 1–2 day spike** on a real iPhone (a free Personal Team is enough). Measure library vs non-library streams, downloaded vs streamed tracks, skips, repeat plays, offline playback and later sync, plays on another device, how fast timestamps and counts update, and behavior with background refresh unavailable. Also: what do `MPMediaItem.lastPlayedDate` and `playCount` cover (library vs streamed songs), how often does background refresh run, and how should a scan before a replay be handled? Record the findings in EXTERNAL-SOURCES.
   - The scan sends badge evidence to the badge engine from handoff 13 (`source = ios`).
2. **MetaBrainz commercial account or a MusicBrainz mirror.** One of these is required before earwrm makes any money (EXTERNAL-SOURCES).
3. **Videos on album and song pages** (music videos, reviews, reactions). Postponed in D17. What I found:
   - **Verified:** YouTube Data API gives 100 `search.list` calls a day by default. `videos.list` costs 1 unit. Apps can't cache or store YouTube video files, so use the embedded player only. [quota](https://developers.google.com/youtube/v3/determine_quota_cost), [policies](https://developers.google.com/youtube/terms/developer-policies)
   - **Unverified:** the 30-day limit on storing API data and the 7-day deletion rule. Those came from a summary of the policy, so read the live policy before building.
   - **Unverified:** MusicBrainz recording → music-video URL relationships.
   - **Plan when this comes back:**
     1. Start with music videos linked in MusicBrainz, which cost nothing.
     2. Add links users submit, with moderation.
     3. Add a small daily search for review and reaction videos, popular albums only.
     4. Apply for more quota through YouTube's compliance audit once there's traffic.
4. **More import sources:** ListenBrainz export, Last.fm (via CSV) and other diary apps, where their terms allow it.
5. **Optional live tracking (opt-in).** The research is in the git history of `docs/`. If it ever comes back, it fits into diary entries with `source != 'manual'` (D6) and builds on the import matching from handoff 07.
6. **Ideas from your notes, not scheduled:**
   - new music night
   - DMs
   - artist communities and community camps
   - the worm that grows the more you log
   - swipe-to-queue discovery (the "Rate your imports" flow from 07 is a first version of this)
   - Beepr-style new-release alerts
7. **Recommendations phase 3** (RECOMMENDATIONS §4 and §7): sequence-aware models, two-tower retrieval in pgvector, real-time updates, **context-aware calibration** (S3, contextual bandits) and **LLM-generated personal shelves** (S5). **Audio embeddings only after a legal review** of whichever audio source gets used: Spotify's audio endpoints are closed to new apps, and AcousticBrainz is frozen and low quality.
8. **Scale:** partition `diary_entries` and `interaction_events`, make stats updates incremental, and put public album and song pages behind a CDN or ISR.
