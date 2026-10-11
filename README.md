# OfertaRadar – Web de afiliados con panel de administración

Sin tocar código: entras a `/admin`, pegas tus enlaces de Amazon y los productos aparecen en la web.

## Estructura

```
tienda-netlify/
├── netlify.toml                  ← configuración de Netlify
├── package.json                  ← dependencias (@netlify/database + Drizzle)
├── db/schema.ts                  ← tabla de productos
├── netlify/
│   ├── functions/products.mts    ← API  /api/products
│   ├── lib/core.mts              ← lógica y validaciones
│   └── database/migrations/      ← se aplican solas en cada deploy
└── public/                       ← lo que ve el público
    ├── index.html · styles.css · script.js
    └── admin/                    ← panel  /admin
```

## Cómo publicarlo (recomendado: GitHub)

> Este proyecto tiene una función de servidor, así que **no basta con arrastrar la carpeta `public`**.
> Hay que desplegar el proyecto completo para que Netlify instale las dependencias.

1. Crea un repositorio en GitHub y sube **todo el contenido** de esta carpeta.
2. En Netlify: **Add new site → Import an existing project → GitHub** y elige el repositorio.
   Netlify detecta `netlify.toml` solo (no hace falta comando de build).
3. Ve a **Site configuration → Environment variables → Add a variable**:
   - Clave: `ADMIN_PASSWORD`
   - Valor: una contraseña larga y única (esta es la llave de tu panel).
4. Vuelve a **Deploys → Trigger deploy → Deploy site** para que tome la variable.
5. Abre `https://TU-SITIO.netlify.app/admin`, entra con tu contraseña y listo.

Si el sitio ya existe en Netlify sin repositorio, también puedes usar Netlify CLI:
`npm i -g netlify-cli && netlify deploy --prod` desde esta carpeta.

## Uso diario

- **+ Nuevo producto**: pega el enlace de afiliado, título, imagen y categorías → Guardar.
- **Editar / Ocultar / Eliminar**: cada fila tiene sus botones.
- **↑ ↓**: cambian el orden en que aparecen en la web.
- Los 8 productos de ejemplo están como **borrador** (no se ven). Edítalos, añade tu enlace y marca *Publicado*, o elimínalos.

## Notas importantes

- **Enlaces**: solo se aceptan URLs `https://` de Amazon (`amazon.*`, `amzn.to`, `a.co`…).
- **Precios**: Amazon Associates solo permite mostrar precios actualizados. Los campos de precio son opcionales; si los dejas vacíos la tarjeta muestra «Consulta el precio actual en Amazon».
- **Moneda**: cambia `CURRENCY` al inicio de `public/script.js` (por defecto `USD`).
- **Imágenes**: usa las oficiales de Amazon (SiteStripe/PA-API) o fotos propias; las de Unsplash son solo de ejemplo.
- **Seguridad**: usa una contraseña larga. El panel está marcado `noindex` y la API rechaza cualquier cambio sin contraseña.
- Los datos viven en Netlify Database (Postgres gestionado): sobreviven a cada nuevo deploy.
