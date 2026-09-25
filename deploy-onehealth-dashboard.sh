#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-$HOME/apps/onehealth_dashboard}"
REPO_URL="${REPO_URL:-https://github.com/yabainjump/onehealth_dashboard.git}"
WEB_DIR="${WEB_DIR:-$HOME/public_html/onehealthdashboard.yaba-in.com}"
BRANCH="${BRANCH:-main}"
NODE_BIN_DIR="${NODE_BIN_DIR:-/opt/cpanel/ea-nodejs20/bin}"
NPM_BIN="${NPM_BIN:-$NODE_BIN_DIR/npm}"
NODE_BIN="${NODE_BIN:-$NODE_BIN_DIR/node}"
DASHBOARD_API_BASE_URL="${DASHBOARD_API_BASE_URL:-https://backend.onehealthnetwork.yaba-in.com/api}"
ALLOW_DEMO_FALLBACK="${ALLOW_DEMO_FALLBACK:-true}"
MAP_TILE_PROVIDER="${MAP_TILE_PROVIDER:-openstreetmap}"
MAP_TILE_URL_TEMPLATE="${MAP_TILE_URL_TEMPLATE:-}"
MAP_TILE_ATTRIBUTION="${MAP_TILE_ATTRIBUTION:-}"
MAP_TILE_ATTRIBUTION_URL="${MAP_TILE_ATTRIBUTION_URL:-}"
MAP_TILE_MAX_ZOOM="${MAP_TILE_MAX_ZOOM:-19}"
PUBLIC_WEB_URL="${PUBLIC_WEB_URL:-https://onehealthdashboard.yaba-in.com}"
CLEAN_WEB_DIR="${CLEAN_WEB_DIR:-true}"
VERIFY_PUBLIC_URL="${VERIFY_PUBLIC_URL:-true}"

export PATH="$(dirname "$NODE_BIN"):$NODE_BIN_DIR:$PATH"

DASHBOARD_API_BASE_URL="${DASHBOARD_API_BASE_URL%/}"
PUBLIC_WEB_URL="${PUBLIC_WEB_URL%/}"

case "$PUBLIC_WEB_URL" in
  https://*) ;;
  *)
    echo "Error: PUBLIC_WEB_URL must use HTTPS."
    exit 1
    ;;
esac

case "$DASHBOARD_API_BASE_URL" in
  https://*) ;;
  *)
    echo "Error: DASHBOARD_API_BASE_URL must use HTTPS."
    exit 1
    ;;
esac

if [[ "$DASHBOARD_API_BASE_URL" == *"'"* ]] || \
   [[ "$DASHBOARD_API_BASE_URL" == *'\'* ]] || \
   [[ "$DASHBOARD_API_BASE_URL" =~ [[:space:]] ]]; then
  echo "Error: DASHBOARD_API_BASE_URL contains unsupported characters."
  exit 1
fi

case "$ALLOW_DEMO_FALLBACK" in
  true|false) ;;
  *)
    echo "Error: ALLOW_DEMO_FALLBACK must be true or false."
    exit 1
    ;;
esac

case "$MAP_TILE_PROVIDER" in
  openstreetmap|custom|none) ;;
  *)
    echo "Error: MAP_TILE_PROVIDER must be openstreetmap, custom or none."
    exit 1
    ;;
esac

if ! [[ "$MAP_TILE_MAX_ZOOM" =~ ^[0-9]+$ ]] || \
   (( MAP_TILE_MAX_ZOOM < 3 || MAP_TILE_MAX_ZOOM > 22 )); then
  echo "Error: MAP_TILE_MAX_ZOOM must be an integer between 3 and 22."
  exit 1
fi

if [ "$MAP_TILE_PROVIDER" = "custom" ]; then
  case "$MAP_TILE_URL_TEMPLATE" in
    https://*'{z}'*'{x}'*'{y}'*) ;;
    *)
      echo "Error: a custom MAP_TILE_URL_TEMPLATE must use HTTPS and contain {z}, {x} and {y}."
      exit 1
      ;;
  esac
  if [ -z "$MAP_TILE_ATTRIBUTION" ]; then
    echo "Error: MAP_TILE_ATTRIBUTION is required for a custom map provider."
    exit 1
  fi
fi

if [ -n "$MAP_TILE_ATTRIBUTION_URL" ]; then
  case "$MAP_TILE_ATTRIBUTION_URL" in
    https://*) ;;
    *)
      echo "Error: MAP_TILE_ATTRIBUTION_URL must use HTTPS."
      exit 1
      ;;
  esac
fi

for MAP_TILE_VALUE in \
  "$MAP_TILE_URL_TEMPLATE" \
  "$MAP_TILE_ATTRIBUTION" \
  "$MAP_TILE_ATTRIBUTION_URL"; do
  if [[ "$MAP_TILE_VALUE" == *"'"* ]] || [[ "$MAP_TILE_VALUE" == *'\'* ]] || \
     [[ "$MAP_TILE_VALUE" == *$'\n'* ]] || [[ "$MAP_TILE_VALUE" == *$'\r'* ]]; then
    echo "Error: map tile configuration contains unsupported characters."
    exit 1
  fi
done
unset MAP_TILE_VALUE

case "$CLEAN_WEB_DIR" in
  true|false) ;;
  *)
    echo "Error: CLEAN_WEB_DIR must be true or false."
    exit 1
    ;;
esac

case "$VERIFY_PUBLIC_URL" in
  true|false) ;;
  *)
    echo "Error: VERIFY_PUBLIC_URL must be true or false."
    exit 1
    ;;
esac

mkdir -p "$APP_DIR" "$HOME/public_html"

PUBLIC_HTML_DIR="$(realpath -m "$HOME/public_html")"
APP_DIR="$(realpath -m "$APP_DIR")"
WEB_DIR="$(realpath -m "$WEB_DIR")"
case "$WEB_DIR" in
  "$PUBLIC_HTML_DIR"/*) ;;
  *)
    echo "Error: WEB_DIR must be a subdirectory of $PUBLIC_HTML_DIR"
    exit 1
    ;;
esac

case "$WEB_DIR" in
  "$APP_DIR"|"$APP_DIR"/*)
    echo "Error: WEB_DIR cannot be the application repository or one of its subdirectories."
    exit 1
    ;;
esac

mkdir -p "$WEB_DIR"

cd "$APP_DIR"

if [ ! -d .git ]; then
  if [ -n "$(ls -A "$APP_DIR" 2>/dev/null)" ]; then
    echo "Error: $APP_DIR is not a git repository and is not empty."
    echo "Clean it or set APP_DIR to an empty directory, then rerun."
    exit 1
  fi
  echo "Git repository not found in $APP_DIR, cloning $REPO_URL"
  git clone "$REPO_URL" .
fi

if git remote get-url origin >/dev/null 2>&1; then
  CURRENT_ORIGIN="$(git remote get-url origin)"
  if [ "$CURRENT_ORIGIN" != "$REPO_URL" ]; then
    echo "Updating origin remote to $REPO_URL"
    git remote set-url origin "$REPO_URL"
  fi
else
  git remote add origin "$REPO_URL"
fi

# This directory is a deployment checkout only: it must exactly match the
# requested remote branch before every build.
git fetch origin "$BRANCH"
git checkout -f "$BRANCH"
git reset --hard "origin/$BRANCH"

# environment.ts remains ignored by Git. It is generated for the production
# build so that no local environment file needs to be committed.
mkdir -p src/environments
printf '%s\n' \
  'export const environment = {' \
  '  production: true,' \
  "  apiBaseUrl: '$DASHBOARD_API_BASE_URL'," \
  "  allowDemoFallback: $ALLOW_DEMO_FALLBACK," \
  '  mapTiles: {' \
  "    provider: '$MAP_TILE_PROVIDER' as const," \
  "    urlTemplate: '$MAP_TILE_URL_TEMPLATE'," \
  "    attribution: '$MAP_TILE_ATTRIBUTION'," \
  "    attributionUrl: '$MAP_TILE_ATTRIBUTION_URL'," \
  "    maxZoom: $MAP_TILE_MAX_ZOOM," \
  '  },' \
  '};' > src/environments/environment.ts

"$NODE_BIN" --version
"$NPM_BIN" --version

if [ -f package-lock.json ]; then
  "$NPM_BIN" ci
else
  "$NPM_BIN" install
fi

"$NPM_BIN" run build

BUILD_DIR="$APP_DIR/dist/onehealth_dashboard/browser"
if [ ! -f "$BUILD_DIR/index.html" ]; then
  echo "Error: Angular build did not produce $BUILD_DIR/index.html"
  exit 1
fi

if grep -Eqi '[[:space:]]on[a-z]+[[:space:]]*=' "$BUILD_DIR/index.html"; then
  echo "Error: index.html contains an inline event handler blocked by the dashboard CSP."
  exit 1
fi

if [ "$CLEAN_WEB_DIR" = "true" ]; then
  find "$WEB_DIR" -mindepth 1 \
    ! -name ".well-known" \
    ! -name ".htaccess" \
    -exec rm -rf -- {} +
fi

cp -a "$BUILD_DIR"/. "$WEB_DIR"/
install -m 0644 "$APP_DIR/src/.htaccess" "$WEB_DIR/.htaccess"

if ! cmp -s "$APP_DIR/src/.htaccess" "$WEB_DIR/.htaccess"; then
  echo "Error: deployed .htaccess differs from the versioned source."
  exit 1
fi

if ! grep -q '<app-root' "$WEB_DIR/index.html"; then
  echo "Error: deployed index.html is not the Angular dashboard entry point."
  exit 1
fi

if [ "$VERIFY_PUBLIC_URL" = "true" ]; then
  RESPONSE_BODY="$(mktemp)"
  RESPONSE_HEADERS="$(mktemp)"
  trap 'rm -f "$RESPONSE_BODY" "$RESPONSE_HEADERS" "${CORS_HEADERS:-}"' EXIT

  STATUS="$(curl -sS -L --connect-timeout 10 --max-time 30 \
    -D "$RESPONSE_HEADERS" -o "$RESPONSE_BODY" -w '%{http_code}' \
    "$PUBLIC_WEB_URL/")"
  if [ "$STATUS" != "200" ] || ! grep -q '<app-root' "$RESPONSE_BODY"; then
    echo "Error: $PUBLIC_WEB_URL returned HTTP $STATUS or an unexpected page."
    exit 1
  fi

  ROUTE_STATUS="$(curl -sS -L --connect-timeout 10 --max-time 30 \
    -o /dev/null -w '%{http_code}' "$PUBLIC_WEB_URL/connexion")"
  if [ "$ROUTE_STATUS" != "200" ]; then
    echo "Error: Angular deep link /connexion returned HTTP $ROUTE_STATUS."
    exit 1
  fi

  if ! grep -qi '^Content-Security-Policy:' "$RESPONSE_HEADERS"; then
    echo "Error: the deployed site is missing its Content-Security-Policy header."
    exit 1
  fi

  CORS_HEADERS="$(mktemp)"
  CORS_STATUS="$(curl -sS --connect-timeout 10 --max-time 30 \
    -X OPTIONS -D "$CORS_HEADERS" -o /dev/null -w '%{http_code}' \
    -H "Origin: $PUBLIC_WEB_URL" \
    -H 'Access-Control-Request-Method: POST' \
    -H 'Access-Control-Request-Headers: content-type,authorization' \
    "$DASHBOARD_API_BASE_URL/auth/login")"
  if [ "$CORS_STATUS" != "204" ] || \
     ! grep -Fqi "Access-Control-Allow-Origin: $PUBLIC_WEB_URL" "$CORS_HEADERS"; then
    rm -f "$CORS_HEADERS"
    echo "Error: the backend does not authorize $PUBLIC_WEB_URL in CORS_ORIGIN."
    echo "Update $HOME/apps/onehealth_backend/.env and restart the backend with --update-env."
    exit 1
  fi
  rm -f "$CORS_HEADERS"

  rm -f "$RESPONSE_BODY" "$RESPONSE_HEADERS"
  trap - EXIT
fi

echo "One Health Dashboard deployment completed: $PUBLIC_WEB_URL"
