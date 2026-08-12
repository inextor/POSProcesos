#!/bin/bash
set -e

DEFAULT_HOST="127.0.0.195"
HOST="${1:-}"

if [ -z "$HOST" ]; then
	read -rp "Host de prueba [$DEFAULT_HOST]: " HOST
	HOST="${HOST:-$DEFAULT_HOST}"
fi

case "$HOST" in
	*integranet.xyz*)
		export E2E_API_URL="https://$HOST"
		export E2E_API_BASE="https://$HOST/api"
		;;
	*)
		export E2E_API_URL="http://$HOST"
		export E2E_API_BASE="http://$HOST/PointOfSale"
		;;
esac

export E2E_APP_URL="${E2E_APP_URL:-http://127.0.0.205:4001}"
export E2E_HEADLESS="${E2E_HEADLESS:-1}"

echo ""
echo ">>> Probando contra: $E2E_API_URL"
echo ""

npx playwright test e2e/*-walkthrough.spec.ts

echo ""
echo ">>> Generando documentos HTML..."
echo ""

node e2e/generate-docs-html.mjs
