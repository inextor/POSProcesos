#!/bin/bash
set -e

HOST="${1:-}"
if [ -z "$HOST" ]; then
	echo "Usage: npm run testthishit -- <host>"
	echo ""
	echo "  npm run testthishit 127.0.0.195"
	echo "  npm run testthishit 127.0.0.205"
	echo "  npm run testthishit test.integranet.xyz"
	exit 1
fi
shift

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

exec npx playwright test "$@"
