# Changesets

Add a changeset when you change something that should be released:

```bash
pnpm changeset
# or
mise run changeset
```

Fluxo:

1. Merge dos changesets em `main` → o [changesets/action](https://github.com/changesets/action) abre o PR **Version Packages**.
2. Merge do PR **Version Packages** → o action gera o **GitHub Release** (sem publicar em nenhum registry).
3. Ao ser criada a release → o workflow **Publish on Release** dispara dois jobs em ambientes separados:
   - **Ambiente `pnpm`**: publica o pacote no npm (registry do pnpm).
   - **Ambiente `cloudflare`**: deploy do worker com Wrangler.

Crie os environments no repositório (Settings → Environments): `pnpm` e `cloudflare`, e configure os secrets em cada um (`NPM_TOKEN` em pnpm, `CLOUDFLARE_API_TOKEN` e `CLOUDFLARE_ACCOUNT_ID` em cloudflare).
