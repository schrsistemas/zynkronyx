# CI/CD Governance — 2026

## Canonical paths

The repository keeps one primary validation/deployment path per responsibility:

- `backend-ci.yml`: backend runtime tests and Docker smoke validation.
- `backend-image.yml`: production backend image publication to GHCR.
- `deploy-prod.yml`: production-image verification boundary.
- `deploy-cloudflare-worker.yml`: Cloudflare Worker deployment and gateway smoke tests.
- `deploy-frontend-live.yml`: canonical Control Center promotion pipeline. Pull requests run Contracts + Browser/Accessibility + Build; pushes to `main` deploy the validated static artifact to Cloudflare Pages and verify the production URL.
- `pipeline-3-env-final.yml`: final CI/STAGING/PROD-VERIFY validation chain. It does not perform persistent production deployment.

## Removed redundant workflows

The following push-based workflows were removed because they duplicated backend/Docker/CI checks or simulated production without adding a unique deployment boundary:

- `ci.yml`
- `ci-all.yml`
- `docker-ci.yml`
- `docker-ci-v2.yml`
- `full-ci.yml`
- `full-ci-v2.yml`
- `pipeline-3-env.yml`

Deletion is performed through a dedicated pull request so branch-protection requirements can be reviewed before promotion.

## Promotion policy

Do not promote a frontend or backend candidate unless the relevant contracts and runtime checks are green. For the Control Center, the validated static artifact must be the same artifact consumed by the deployment job.

Production data, database credentials, Cloudflare secrets, KV/D1/R2 state and persisted application data are outside GitHub Actions source changes and must not be modified by CI cleanup work.

## Vercel boundary

Cloudflare Pages is the maintained public Control Center deployment path.

The repository currently has an external Vercel Git integration that can report a failing `Vercel` status when the Vercel account/team is blocked by deployment/build limits. This status is independent of the successful Cloudflare Pages deployment.

Vercel configuration changes require access to the Vercel project/team. Do not create a replacement Vercel project or move the application to a new scope merely to clear a status check.

## Cost discipline

Prefer path-filtered workflows, shared artifacts, concurrency cancellation and deterministic local/container smoke tests. Avoid duplicate push-based builds. Keep the operational target at R$0 unless the project owner explicitly authorizes paid infrastructure.
