# External sources

These are the outside data sources earwrm depends on (plus the export formats users upload) and what each one allows, checked in November 2026.

- **Verified** means read in the primary source.
- **Unverified** means not confirmed yet. Code can't depend on an unverified claim until someone confirms it.

Update this file in the same PR as any code change that relies on it.

## MusicBrainz (catalog: artists, albums, songs, tracklists)
- **Verified:** core data is CC0, "effectively placing the data into the Public Domain". Supplementary data is CC BY-NC-SA 3.0. [data license](https://musicbrainz.org/doc/About/Data_License)
- **Verified:** the rate limit is about 1 request per second per IP on average, plus User-Agent checks and a global cap. Going over it gets every request rejected with 503 until you slow down. A User-Agent like `App/version ( contact )` is required. [rate limiting](https://musicbrainz.org/doc/MusicBrainz_API/Rate_Limiting)
- **Verified:** MetaBrainz asks pre-revenue startups that expect revenue to sign up for a commercial account. Bronze, starting at $100/month, is for "small to mid-size start-ups with public products". The page refers to datasets and the live data feed. It doesn't say whether the hosted API needs one. [account types](https://metabrainz.org/supporters/account-type)
- **What this means:** while earwrm is a free personal project, use the hosted API through the shared limiter (D9). Before earwrm makes any money, get a MetaBrainz commercial account, or run a mirror from their database dumps (see ROADMAP).
- **Verified:** there's a release-group → URL **Review** relationship: "Indicates a page that reviews the release (group) in question, whether it be in text, audio or video form." [relationship](https://musicbrainz.org/relationship/c3ac9c3b-f546-4d15-873f-b294d2c1b708)
- **Verified:** "When an entity is merged into another, its MBIDs redirect to the other entity." [MBID](https://musicbrainz.org/doc/MusicBrainz_Identifier)
- **Verified, and this matters for genres and recommendations:** supplementary data under CC BY-NC-SA (**non-commercial**) includes "tags (including genre associations) and ratings". Genre *names* are core CC0 data. MetaBrainz offers commercial licensing. [data license](https://musicbrainz.org/doc/About/Data_License)
- **Contact MetaBrainz during handoff 01**, not "before monetization", about the hosted API account type and a commercial license for tags and genres. A mirror is a capacity decision, made later based on measured numbers.

## Cover Art Archive (covers)
Already in use. No changes.

## Wikidata / Wikipedia (blurbs and critic scores)
- **Verified:** structured data on Wikidata is CC0. [licensing](https://www.wikidata.org/wiki/Wikidata:Licensing)
- **Verified (through a mirror of the property page):** property **P444 "review score"** is "review score received by a creative work". [mirror](https://citygraph.abudhabi.nyu.edu/wiki/Property:P444)
- **Reported, not checked by me:** P447 "review score by" names who gave the score. **Unverified:** how many albums people actually log have P444 data. Handoff 06d samples at least 100 albums and only ships scores if coverage is meaningful.
- **What this means:** critic scores like "Pitchfork 9.0" come from Wikidata P444 where it exists. earwrm shows the score, the publication name and a link out to the review. **It never copies review text.**
- Wikipedia lead sentences are already used for the release blurb. Wikipedia text is CC BY-SA, so add a "From Wikipedia" credit and link to the article.

## CritiqueBrainz (review links)
- **Verified:** `GET /review/?entity_id=&entity_type=release_group` returns reviews, with `source` and `source_url` and a **license per review** (the documented example is CC BY-NC-SA 3.0). [API](https://critiquebrainz.readthedocs.io/api/endpoints.html)
- **What this means:** use it for extra links. Label community reviews as community. Check each review's license before showing any text.

## Recommendation data (see RECOMMENDATIONS.md)
- **Verified:** Spotify Related Artists, Recommendations, Audio Features and Audio Analysis: "*new* Web API use cases will no longer be able to access or use" them (Nov 27, 2024). [Spotify blog](https://developer.spotify.com/blog/2024-11-27-changes-to-the-web-api)
- **Verified:** AcousticBrainz stopped collecting data in 2022. Its data is CC0, but MetaBrainz says it "isn't of high enough quality to be useful for much", and its own similarity results "didn't give good results". [blog](https://blog.metabrainz.org/2022/02/16/acousticbrainz-making-a-hard-decision-to-end-the-project/)
- **Verified:** ListenBrainz labs has a similar-artists dataset viewer (`labs.api.listenbrainz.org/similar-artists`). It isn't a documented API, and no license is stated. Don't use it until MetaBrainz confirms the terms.
- **Verified:** pgvector is supported on Supabase. [docs](https://supabase.com/docs/guides/database/extensions/pgvector)
- **Unverified:** how many albums have Wikidata P136 (genre) set. Measure it before relying on it as a CC0 genre source.

## Supabase (platform facts that affect the plan)
- **Verified:** "Database backups do not include objects you store via the Storage API." [backups](https://supabase.com/docs/guides/platform/backups)
- **Verified:** wrapping `auth.uid()` as `(select auth.uid())` lets Postgres cache the result once per statement. This works only when the result doesn't depend on row data. [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security)
- **Verified:** branching creates isolated per-PR environments with no production data by default. It's billed by usage (Micro compute from $0.01344/hour). [branching](https://supabase.com/docs/guides/deployment/branching)

## Platform behavior checked in round 3
- **Verified (Supabase Realtime, private channels: Broadcast and Presence):** "Client access policies are cached for the duration of the connection." When access is revoked, a connected client "keep[s] receiving messages until their JWT expires or a new one is sent". **Postgres Changes is different:** it "authorizes every event against each subscriber" through RLS, except DELETE events, where "RLS policies are not applied". [postgres changes](https://supabase.com/docs/guides/realtime/postgres-changes). See DECISIONS D24. [authorization](https://supabase.com/docs/guides/realtime/authorization)
- **Verified (Sentry):** `beforeSend` "applies to error and message events". Spans, transactions, logs and metrics have their own `beforeSendSpan`, `beforeSendTransaction`, `beforeSendLog` and `beforeSendMetric` hooks. Replay and attachment controls weren't on this page (unverified). [sensitive data](https://docs.sentry.io/platforms/javascript/data-management/sensitive-data/)
- **Verified (ListenBrainz), two endpoints:**
  - `GET /1/lb-radio/artist/{seed_artist_mbid}`: "Get recordings for use in LB radio with the given seed artist. The endpoint returns a dict of all the similar artists, including the seed artist". Parameters: `mode`, `max_similar_artists`, `max_recordings_per_artist`, `pop_begin`, `pop_end`. [core API](https://listenbrainz.readthedocs.io/en/latest/users/api/core.html)
  - `GET /1/explore/lb-radio`: takes a prompt and a mode and returns a JSPF playlist. [misc API](https://listenbrainz.readthedocs.io/en/latest/users/api/misc.html)
  - **Unverified:** commercial reuse and retention terms. The integration stays parked until MetaBrainz replies.
- **Verified (Discogs):** monthly Release, Artist, Label and Master dumps, "made available under the CC0 No Rights Reserved license". [data.discogs.com](https://data.discogs.com/)

## Last.fm (the optional badge bridge, handoff 13c)
- **Verified:** Spotify connects to Last.fm natively and scrobbles "from any Spotify app on any device or platform". [track my music](https://www.last.fm/about/trackmymusic)
- **Verified:** Last.fm does **not** auto-scrobble Apple Music on iPhone. Its iOS app offers only "Scan & submit scrobbles manually (works with Apple Music)". Third-party apps (Finale, QuietScrob, Marvis Pro) claim background scrobbling, but their reviews describe it as unreliable.
- **Verified:** web auth is one click, and the session key lasts until the user revokes it. `user.getRecentTracks` returns timestamped scrobbles. [webauth](https://www.last.fm/api/webauth), [getRecentTracks](https://www.last.fm/api/show/user.getRecentTracks)
- **Verified:** the terms are non-commercial only, with a 100 MB usage cap, and attribution is required. [ToS](https://www.last.fm/api/tos)
- **Verified:** `getRecentTracks` takes `from` and `to` ("UNIX timestamp format ... This must be in the UTC time zone"), with `limit` up to 200 and `page`. It needs only an API key, no user authentication. **Verified:** scrobbles happen only when a track is "longer than 30 seconds" and has played "for at least half its duration, or for 4 minutes". [scrobbling](https://www.last.fm/api/scrobbling)
- **Verified (Apple):** a free Personal Team in Xcode can install your app on your own iPhone. Up to 3 devices, and provisioning "will expire 7 days from issuance", so you rebuild weekly. Distribution needs the paid program. [developer account](https://developer.apple.com/help/account/basics/about-your-developer-account/)

## Apple MediaPlayer (iPhone app, D28)
- **Verified:** `MPMediaItem.lastPlayedDate` is "The most recent play date of the media item". `playCount` is "The number of times the user plays the media item". [lastPlayedDate](https://developer.apple.com/documentation/mediaplayer/mpmediaitem/lastplayeddate), [playCount](https://developer.apple.com/documentation/mediaplayer/mpmediaitem/playcount)
- **Unverified:** whether these cover streamed Apple Music songs that aren't in the user's library, and how reliable background refresh is. The iOS spike in ROADMAP item 1 answers both.

## Artist images (06e)
- **Verified (Spotify):** its design guidelines say any Spotify metadata or artwork "must always be accompanied by the Spotify brand", "Don't crop the artwork in any way", and content "must always link back to the Spotify Service". The artwork rules name album and podcast art, so whether they cover artist images isn't confirmed. **Not used**, given those rules plus the 5-user cap and policy limits. [design](https://developer.spotify.com/documentation/design)
- **Verified (Apple):** the Apple Music Identity Guidelines cover badges and lockups ("You must provide a link to Apple Music wherever a badge or lockup is used online"), not API artwork. [guidelines](https://marketing.services.apple/apple-music-identity-guidelines)
- **Unverified:** whether the Apple Music API's Artist resource includes artwork, and what the display terms are (the docs page failed to load). Confirm this in 06e.
- **Unverified:** the Wikidata P18 image property, and the attribution and license rules for Wikimedia Commons reuse (both pages failed to load). Confirm this in 06e.
- **Default:** Cover Art Archive release covers, already in use.

## Pitchfork, Metacritic and other critics
- No official public API was found. The libraries that do exist call themselves "unofficial" and parse HTML ([example](https://github.com/tejassharma96/pitchfork_api/)).
- **What this means:** don't scrape critic sites. Use Wikidata scores and MusicBrainz review links, and let users suggest review links (with moderation). Never show a Metacritic-style aggregate score, since that's their own product.

## Listening history exports (handoff 07)
- **Note:** the Spotify timestamp is when a stream **ended**, and ms played doesn't prove the stream was uninterrupted (see handoff 07's contract).
- **Verified:** Spotify's "Download your data" delivers JSON files. **Extended Streaming History** covers "the lifetime of your account". Per stream it includes:
  - when the stream ended (UTC) and milliseconds played
  - track, artist and album names, and the Spotify track URI
  - episode and show fields
  - why the track started and ended, and whether it was shuffled, skipped, played offline or in a private session
  - username, platform, country, IP address and user agent

  The plain Streaming History file covers only "the past year". Field names are documented in a "Read Me First - Extended Streaming History" file that comes inside the export. [Spotify: understanding your data](https://support.spotify.com/ca-en/account_payment_help/privacy/understanding-my-data/)
- **Unverified:** the exact JSON field names and how long Spotify takes to deliver the export. Handoff 07a checks both against a real export.
- **What this means:** never upload the username, platform, country, IP address or user agent. Parse in the browser and send only track, artist, album, time, ms played and the track URI.
- **Unverified:** Apple's privacy export (privacy.apple.com) has Apple Music play activity. The file names, the columns, whether it has per-play timestamps, and the delivery time are all unknown. Handoff 07a checks a real export.
- **Unverified:** whether Last.fm offers an official export. If not, users can bring a CSV from a third-party export tool through the generic CSV importer.
- **Legal note:** this is the user's own personal data, uploaded by them, not data taken from a service's API. See DECISIONS D16. That's our reading, not legal advice.
