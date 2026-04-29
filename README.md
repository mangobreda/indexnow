# Beveiligde IndexNow Submitter voor Vercel

Deze Next.js app stuurt URLs naar IndexNow via een server-side proxy en is beveiligd met een IP allowlist.

## Beveiliging

Standaard is alleen dit IP toegestaan:

```txt
92.65.51.76
```

De beveiliging zit op twee lagen:

1. `middleware.js` blokkeert de pagina `/` en `/api/indexnow` voor andere IP's.
2. `app/api/indexnow/route.js` controleert IP opnieuw voordat de payload wordt doorgestuurd naar IndexNow.

## Deploy op Vercel

1. Upload deze projectbestanden naar GitHub. Zorg dat `app/`, `package.json` en `middleware.js` direct in de repo-root staan.
2. Maak in Vercel een nieuw project vanaf de GitHub repo.
3. Deploy.

## IP's aanpassen

Ga in Vercel naar:

Project → Settings → Environment Variables

Voeg toe:

```txt
ALLOWED_IPS=92.65.51.76
```

Meerdere IP's kunnen met komma's:

```txt
ALLOWED_IPS=92.65.51.76,1.2.3.4
```

Deploy opnieuw na wijzigingen.

## Lokaal testen

```bash
npm install
npm run dev
```

Let op: lokaal kan je IP-header anders zijn dan op Vercel. Voor productie is Vercel leidend.
