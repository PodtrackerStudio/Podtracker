# Creator photographs

Drop a creator's photo in this folder named after their slug in
`src/lib/creators.ts`, then point that creator's `avatarUrl` at it:

```
public/creators/joe-rogan.jpg   ->   avatarUrl: "/creators/joe-rogan.jpg"
```

Square images work best. The same file serves both the 56px circle in the
Creators strip on a podcast page and the large photo on `/person/[slug]`, so
something around 460×460 or larger is right.

Any creator without a file here falls back to `/default-avatar.webp`, the
neutral silhouette. That fallback is deliberate. These entries previously used
random placeholder photographs, which is worse than showing nothing: it puts an
unrelated stranger's face under a named, real, living person's name, and it is
convincing enough that nobody notices it is wrong.

## Before you add a file

**These are photographs of real people, and almost all of them are somebody
else's copyright.** A press photo, a podcast thumbnail, or an image found
through a search engine is not usable just because it is public. Use one of:

- a photo the creator or their team supplied for this purpose;
- a stock image the project holds a licence for;
- an image under a licence that permits this use — and then honour whatever
  that licence requires, which usually means crediting the photographer.

Wikipedia is not a shortcut here. Article text and article images are licensed
separately, images on Wikipedia are licensed individually and some are non-free,
and the API this project would use returns no licence or author information for
them at all — so there is no way to comply using it.

Record where each image came from and under what terms, so the next person does
not have to guess.

## Currently supplied

| File | Creator | Source |
| --- | --- | --- |
| _(none yet)_ | — | — |

`chris-williamson` is the one creator with a real photo, but it lives at
`public/explore/trending-chris-williamson.jpg` — Sasha added it for the Trending
users strip on Explore, and the registry reuses that file rather than shipping a
second copy.
