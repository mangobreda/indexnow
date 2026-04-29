# IndexNow Vercel App

Een kleine Next.js app om URL's via IndexNow te versturen. Inclusief CSV-upload en een Vercel API-route die CORS voorkomt.

## Lokaal draaien

```bash
npm install
npm run dev
```

Open daarna `http://localhost:3000`.

## Uploaden naar Vercel

1. Zet deze map in een GitHub repository.
2. Importeer de repository in Vercel.
3. Kies framework preset **Next.js**.
4. Deploy.
5. Test de proxy via `https://jouwdomein.vercel.app/api/indexnow`. Je zou een JSON-bericht moeten zien dat de proxy actief is.

## Belangrijk

De frontend stuurt naar `/api/indexnow`. Die API-route stuurt server-side door naar:

```txt
https://api.indexnow.org/IndexNow
```

Dit voorkomt CORS-problemen die ontstaan wanneer de browser direct naar IndexNow probeert te posten.

## IndexNow key

Maak een key aan en plaats deze als `.txt` bestand op je website, bijvoorbeeld:

```txt
https://www.example.com/indexnow.txt
```

De inhoud van dit bestand moet exact je key zijn.

## CSV formaat

Voorbeeld:

```csv
url,title
https://www.example.com/pagina-1,Pagina 1
https://www.example.com/blog/artikel,Blog artikel
```

De app detecteert automatisch kolommen met namen zoals `url`, `link`, `loc`, `pagina` of `page`.
