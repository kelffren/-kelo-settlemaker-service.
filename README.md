# Kelo Settlemaker Service

Servicio separado que genera ciudades con [Settlemaker](https://github.com/barrulus/settlemaker) y devuelve GeoJSON para Kelo World.

## Qué hace

Kelo World manda una petición a `POST /generate` con un seed y opciones de ciudad. Este servicio ejecuta Settlemaker y devuelve únicamente datos de geometría/estructura. Kelo World sigue siendo dueño de sus tiles, assets, renderer, cámara, PvP y gameplay.

## Ejecutar

```bash
npm install
npm start
```

Health:

```bash
curl http://localhost:3000/health
```

Generar ciudad:

```bash
curl -X POST http://localhost:3000/generate \
  -H 'content-type: application/json' \
  -d '{"seed":42,"population":12000,"walls":true,"plaza":true,"citadel":true,"temple":true,"capital":true,"port":false,"roadBearings":[0,90,180,270]}'
```

La respuesta contiene `geojson`, `kind`, `seed`, `degradedFlags` y `originShift`.

## Licencia

Este servicio utiliza `settlemaker@2.3.0`, que es GPL-3.0-only y deriva de TownGeneratorOS. El servicio se mantiene separado de Kelo World y se comunica con él por HTTP/JSON. Ver el código y licencia originales en https://github.com/barrulus/settlemaker.
