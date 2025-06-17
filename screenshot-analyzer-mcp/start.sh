#!/bin/bash
cd "$(dirname "$0")"
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..." >&2
    npm install >&2
fi

if [ ! -d "dist" ] || [ "src/index.ts" -nt "dist/index.js" ]; then
    echo "Building project..." >&2
    npm run build >&2
fi

node dist/index.js