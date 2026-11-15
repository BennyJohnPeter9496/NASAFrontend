# SpaceTrace — Junior Explorer Lab (React + Three.js)

The existing interactive Sky Archive solar system is retained. A colorful, responsive **Junior Explorer** mission browser and **Ask Astro** assistant have been added on top and connected to the actual SpaceTrace ASP.NET Core backend (no fake answers).

## Start the frontend against the deployed Azure backend

The NASA API is already deployed. It is not necessary to run the backend locally to use the frontend.

```bash
npm ci
npm run dev
```

Open the Vite URL, usually **http://localhost:5173**. The app retrieves its mission data from the deployed Azure backend.

The live NASA catalog was confirmed at [https://nasaapi-anf6fpgacwb3ddgd.westus3-01.azurewebsites.net/api/components](https://nasaapi-anf6fpgacwb3ddgd.westus3-01.azurewebsites.net/api/components).

## API URL configuration

The frontend reads **`public/app-config.json`** at runtime:

```json
{
  "apiBaseUrl": "https://nasaapi-anf6fpgacwb3ddgd.westus3-01.azurewebsites.net"
}
```

**Use the base URL only**, not the `/api/components` endpoint. The frontend automatically appends the API paths:

- `GET /api/components`
- `GET /api/health`
- `POST /api/agent/explore`
- `POST /api/agent/ask`

`VITE_API_BASE_URL` in `.env.example` provides the same Azure URL as a build-time fallback. Runtime JSON takes precedence. If your backend URL changes, update the config file at the deployed site's root; the frontend fetches it with `cache: 'no-store'`.

### CORS

The **deployed Azure backend** must permit the browser frontend origin. If using local Vite, allow `http://localhost:5173`; if you deploy the frontend, also allow its HTTPS site origin. Set allowed origins on the deployed backend App Service, e.g. `Cors__AllowedOrigins__0=http://localhost:5173` and `Cors__AllowedOrigins__1=https://YOUR-FRONTEND.azurewebsites.net`. Backend source `appsettings.json` includes local origins, but those settings may differ on Azure. Do not include a trailing slash or any API path.

If CORS is not enabled on the deployed API, direct navigation to `/api/components` can still work while frontend `fetch` requests fail.

To **run a separate backend locally** instead, set `public/app-config.json` to your local API base URL (e.g. `http://localhost:5080`) and start the backend separately.

## Integration details

- `GET /api/components`: get the real 10-object NASA mission catalogue. Filtering by Moon/Mars happens in the frontend.
- `GET /api/health`: check if Azure OpenAI is configured; demo/evidence fallback is clearly labeled.
- `POST /api/agent/explore`: called as soon as a NASA mission is selected; includes `componentId`, `audience`, `includeImages:true`.
- `POST /api/agent/ask`: called when the child submits a typed or suggested question; includes the selected `componentId`, `question`, and `audience`.
- `student` / **Junior** mode uses `children ages 8 to 12`. Explorer mode uses `students ages 13 to 17`.
- 3D object ids and backend catalogue ids are not the same for every object. Three actual mappings are implemented: Apollo 11, Ingenuity, and Opportunity. Other 3D objects still use the original Sky Archive detail cards. All 10 backend artefacts can be opened in the NASA missions panel even when they do not have their own 3D model.
- The existing 3D scene, mission controls, passport, quizzes, treasure hunt, time slider and close-up views are preserved.

## Build and testing

```bash
npm run build
npm test
```

## Quick Azure publishing

The frontend can be hosted on **Azure Static Web Apps**; the existing API stays on its current Azure App Service.

1. In the [Azure portal](https://portal.azure.com), create a **Static Web App**. Select your subscription and resource group, choose the **Free** plan, and set the deployment source to **Other** so Azure does not generate a second workflow.
2. Open the new Static Web App and select **Manage deployment token**. Copy the token.
3. In this GitHub repository, open **Settings > Secrets and variables > Actions > New repository secret**. Name it `AZURE_STATIC_WEB_APPS_API_TOKEN` and paste the token as its value. If Azure already created `AZURE_STATIC_WEB_APPS_API_TOKEN_AMBITIOUS_COAST_081169D0F` for your target app, the publishing workflow can use that instead; the unsuffixed secret takes precedence when both exist. Never put the token in a source file.
4. Commit and push the [publishing workflow](.github/workflows/azure-static-web-apps.yml) to `main`. It installs locked dependencies, runs tests, builds the app, and uploads `dist`. Future pushes to `main` publish automatically; you can also run **Publish to Azure Static Web Apps** manually from GitHub's **Actions** tab.
5. Copy the frontend's `https://...azurestaticapps.net` URL from Azure. Add that exact origin to the deployed backend's CORS allowlist (for example, `Cors__AllowedOrigins__1=https://YOUR-FRONTEND.azurestaticapps.net`, keeping existing origins). Restart the backend if needed for the setting to take effect.
6. Open the published URL and verify the NASA missions panel loads and **Ask Astro** responds. If API requests fail, check backend CORS and the deployed `/app-config.json` URL.

The workflow publishes only the frontend, not the backend. The existing [runtime API configuration](public/app-config.json) is copied into the build unchanged. Creating the Azure resource, adding the GitHub secret, and allowing the frontend origin on the backend are required before the site is fully usable.

If Azure generates its own workflow, its `output_location` must be `dist`, not `build`, because this project uses Vite. The [Azure-generated workflow](.github/workflows/azure-static-web-apps-ambitious-coast-081169d0f.yml) uses Oryx to build and supports pull-request previews with its Azure-generated deployment secret. Both workflows deploy on pushes to `main`; disable one in GitHub Actions if they target the same Static Web App to avoid duplicate deployments.

## Safety and accuracy

The app presents generated narratives as drafts, with NASA reference links. NASA Image Library media is supporting imagery, **not** a live view or proof of current physical condition. Never put an Azure OpenAI key in the frontend config; configure it in the backend server environment.
