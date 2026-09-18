# Cloudflare Worker CI/CD

The Worker is deployed through GitHub Actions instead of Cloudflare Workers Builds.

## Target Worker

- Worker: `mute-grass-9428`
- Project directory: `cloudflare/zynkronyx-worker`
- Production branch: `main`

## Required GitHub Actions secrets

Create these repository secrets in:

**GitHub → Settings → Secrets and variables → Actions**

1. `CLOUDFLARE_API_TOKEN`
2. `CLOUDFLARE_ACCOUNT_ID`

The API token should be scoped to the Cloudflare account used by this Worker and have the permissions required to deploy Workers. Do not commit the token to the repository.

## Deployment

A push to `main` that changes the Worker or this workflow starts:

```text
GitHub push
  -> GitHub Actions
  -> cloudflare/wrangler-action@v4
  -> wrangler deploy
  -> mute-grass-9428
```

The workflow also supports **Run workflow** from the GitHub Actions interface for an explicit deployment.

## Why this path exists

Cloudflare Workers Builds currently has a GitHub-account connection issue in this environment: the Cloudflare dashboard continues to expose only the existing GitLab connection even though the Cloudflare GitHub App is installed and authorized for all repositories.

Using GitHub Actions avoids that Workers Builds connection while retaining Wrangler as the deployment mechanism.
