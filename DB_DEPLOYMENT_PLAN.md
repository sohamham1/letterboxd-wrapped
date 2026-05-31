# Private GitHub Releases DB Deployment (Vercel)

This plan documents how the app bootstraps `letterboxd_imdb.db` from a private GitHub Release asset stored in a separate private data repo.

## Summary
- App repo stays private and **does not** contain the `.db` file.
- A separate **private** data repo hosts a Release asset named `letterboxd_imdb.db`.
- Backend downloads the asset server-side using a fine-grained GitHub token.
- Frontend never touches GitHub, and cannot discover the asset URL.
- Vercel runtime uses `/tmp/letterboxd_imdb.db` per instance.

## Architecture
1. Private data repo: `GH_DB_OWNER/GH_DB_REPO`
2. Release tag: `GH_DB_TAG`
3. Release asset name: `GH_DB_ASSET_NAME` (default `letterboxd_imdb.db`)
4. Backend on startup or first request:
   - Fetch release metadata
   - Locate asset by name
   - Download via GitHub API
   - Save to `/tmp/letterboxd_imdb.db`
   - Validate schema tables exist

## Environment Variables
Set these in Vercel (or your host):
```
DB_SOURCE=github_release
DB_LOCAL_PATH=/tmp/letterboxd_imdb.db
GH_DB_OWNER=<private-data-repo-owner>
GH_DB_REPO=<private-data-repo-name>
GH_DB_TAG=<release-tag>
GH_DB_ASSET_NAME=letterboxd_imdb.db
GH_DB_TOKEN=<fine-grained-token>
```

Local development can still use:
```
DB_SOURCE=local
DB_LOCAL_PATH=./letterboxd_imdb.db
```

## GitHub Token (Fine-Grained)
Use a fine-grained PAT with:
- **Repository access**: only the private data repo
- **Permissions**: `Read` for Contents and Releases

Do not put the token in frontend code or in the app repo.

## Release Workflow
1. Create private data repo (separate from app repo).
2. Create a Release with tag `GH_DB_TAG`.
3. Upload `letterboxd_imdb.db` as the Release asset.
4. Set env vars in Vercel.

## Runtime Behavior
- On cold start, backend downloads the DB to `/tmp`.
- On warm invocations, `/tmp` is reused.
- If download fails, API degrades gracefully and logs the failure.

## Validation
Backend validates that:
- File exists and is larger than 1MB.
- Tables `movie_metadata` and `names` are readable.

If validation fails, it retries on next request after cooldown.

## Security Notes
- Release asset is private (not public).
- Frontend never requests GitHub.
- Asset URL and token remain server-side only.

