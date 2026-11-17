# Transformers.js - Text-to-Speech Demo

Aplicación web en React y Vite para realizar síntesis de voz (**Text-to-Speech**) **100 % en el navegador**, sin servidor backend de inferencia. Utiliza [`@huggingface/transformers`](https://huggingface.co/docs/transformers.js) dentro de un Web Worker para descargar y ejecutar modelos neuronales directamente en el cliente.

## Stack tecnológico y modelos

- **Frontend**: React 18 (`react`, `react-dom`), Vite 5, Tailwind CSS 3
- **Inferencia en navegador**: `@huggingface/transformers` (v3, respaldado por ONNX Runtime Web)
- **Modelos y datos (descargados desde Hugging Face en el navegador)**:
  - **Modelo TTS y tokenizador**: `Xenova/speecht5_tts` (`AutoTokenizer` + `SpeechT5ForTextToSpeech`, `dtype: 'fp32'`)
  - **Vocoder**: `Xenova/speecht5_hifigan` (`SpeechT5HifiGan`, `dtype: 'fp32'`)
  - **Embeddings de hablantes (x-vectors)**: dataset `Xenova/cmu-arctic-xvectors-extracted` en Hugging Face (`https://huggingface.co/datasets/Xenova/cmu-arctic-xvectors-extracted/resolve/main/`)

## Características y funcionamiento interno

- **Web Worker dedicado (`src/worker.js`)**: La carga e inferencia se ejecutan fuera del hilo principal mediante un module worker (`MyTextToSpeechPipeline` con patrón Singleton y carga perezosa) para mantener la interfaz fluida.
- **Indicador de descarga (`src/components/Progress.jsx`)**: Durante la primera generación, muestra una pantalla superpuesta con el progreso por archivo de los modelos descargados desde Hugging Face.
- **7 voces preconfiguradas (`src/constants.js`)**:
  - `US female 1` (`cmu_us_slt_arctic-wav-arctic_a0001`, por defecto)
  - `US female 2` (`cmu_us_clb_arctic-wav-arctic_a0001`)
  - `US male 1` (`cmu_us_bdl_arctic-wav-arctic_a0003`)
  - `US male 2` (`cmu_us_rms_arctic-wav-arctic_a0003`)
  - `Canadian male` (`cmu_us_jmk_arctic-wav-arctic_a0002`)
  - `Scottish male` (`cmu_us_awb_arctic-wav-arctic_b0002`)
  - `Indian male` (`cmu_us_ksp_arctic-wav-arctic_a0007`)
  - Los embeddings descargados (`.bin` con tensor `float32` de forma `[1, 512]`) se cachean en memoria en un `Map` (`speaker_embeddings_cache`).
- **Codificación WAV y reproducción (`src/utils.js`, `src/components/AudioPlayer.jsx`)**: `encodeWAV` empaqueta las muestras generadas en formato WAV PCM/float (32-bit float, mono, 16 kHz) y crea un `Blob` (`audio/wav`) reproducido mediante un elemento HTML5 `<audio controls>`.

## Estructura del proyecto

```text
.
├── compose.yml              # Orquestación con Docker Compose (servicio tts-app)
├── Dockerfile               # Build multi-stage (Node 22 + pnpm -> Nginx Alpine)
├── .dockerignore            # Exclusiones del contexto de build Docker
├── nginx.conf               # Configuración Nginx (SPA fallback, gzip, caché, /health)
├── index.html               # Documento HTML de entrada
├── package.json             # Dependencias, scripts y packageManager (pnpm@9.7.0)
├── pnpm-lock.yaml           # Lockfile de dependencias
├── postcss.config.js        # Configuración de PostCSS
├── tailwind.config.js       # Configuración de Tailwind CSS
├── vite.config.js           # Configuración de Vite (build, server y preview)
└── src/
    ├── App.jsx              # Interfaz principal y comunicación con el Web Worker
    ├── constants.js         # Mapa de voces (SPEAKERS) y voz por defecto
    ├── index.css            # Estilos base con directivas de Tailwind CSS
    ├── main.jsx             # Punto de entrada React
    ├── utils.js             # Codificador encodeWAV (16 kHz, 32-bit float, mono)
    ├── worker.js            # Web Worker con pipeline SpeechT5 + HiFi-GAN
    └── components/
        ├── AudioPlayer.jsx  # Reproductor HTML5 para el audio WAV generado
        └── Progress.jsx     # Barra de progreso para descarga de modelos
```

## Desarrollo local

Requisitos: Node.js (`>= 18` o Node 22 recomendado) y `pnpm` (el proyecto fija `"packageManager": "pnpm@9.7.0"`).

```bash
# Instalar dependencias
pnpm install

# Servidor de desarrollo
pnpm run dev

# Comprobar linting (ESLint)
pnpm run lint

# Generar build de producción en dist/
pnpm run build

# Previsualizar el build de producción en http://0.0.0.0:3000
pnpm run preview
```

## Uso con Docker Compose

Para construir y levantar el contenedor localmente:

```bash
docker compose up -d --build
```

Por defecto, la aplicación quedará accesible en `http://localhost:8080` y expone el endpoint de salud en `http://localhost:8080/health`. Puedes cambiar el puerto en el host mediante la variable de entorno `PORT`:

```bash
PORT=9090 docker compose up -d --build
```

Para detener los contenedores:

```bash
docker compose down
```

## Despliegue en Dokploy

### Opción 1: Docker Compose (`compose.yml`)

1. En Dokploy, crea un nuevo servicio de tipo **Compose** conectado a este repositorio.
2. Configura **Compose Path** como `compose.yml`.
3. En **Domains**, asocia tu dominio apuntando al servicio `tts-app` y al **Container Port** `80`.
   - El servicio usa `${PORT:-8080}:80` para no entrar en conflicto con el puerto `80` del proxy Traefik de Dokploy y expone el puerto interno `80` (`expose: ["80"]`).
4. Haz clic en **Deploy**.

### Opción 2: Application con Dockerfile (recomendado para app única)

1. En Dokploy, crea un nuevo servicio de tipo **Application** conectado a este repositorio.
2. En **Build Type**, selecciona **Dockerfile**:
   - **Dockerfile Path**: `Dockerfile`
   - **Docker Context Path**: `.`
3. En **Domains**, configura el dominio con **Container Port** `80`.
4. (Opcional) La imagen incluye `HEALTHCHECK` y el endpoint `/health` en Nginx (`200 OK`).
5. Haz clic en **Deploy**.

> **Nota sobre CORS/COEP**: [nginx.conf](nginx.conf) no añade `Cross-Origin-Embedder-Policy: require-corp` de forma intencionada, ya que el navegador necesita descargar los modelos y embeddings directamente desde `https://huggingface.co/`.

### Opción 3: Application con Nixpacks / Static

Si prefieres desplegar sin contenedor Docker personalizado:

- **Static / Nixpacks (archivos estáticos)**:
  - **Build Command**: `pnpm install --no-frozen-lockfile && pnpm run build`
  - **Publish Directory**: `dist`
- **Nixpacks (Vite Preview)**:
  - **Build Command**: `pnpm install --no-frozen-lockfile && pnpm run build`
  - **Start Command**: `pnpm run preview`
  - **Container Port**: `3000`
