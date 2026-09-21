#!/usr/bin/env bash
# Builds the psycopg2 Lambda layer for the runtime/architecture configured in
# infra/cloudformation/workout-analytics.yaml (python3.12, x86_64), so it
# needs no Docker and runs on any dev machine: pip downloads the prebuilt
# manylinux wheel for that exact target instead of compiling locally.
#
#   ./build-layer.sh            build build/psycopg2-layer.zip
#   ./build-layer.sh publish    build, then publish a new layer version and
#                               print its ARN (for the Psycopg2LayerArn
#                               stack parameter); needs AWS credentials
set -euo pipefail

SCRIPT_DIR="$(dirname "$(realpath "$0")")"
BUILD_DIR="$SCRIPT_DIR/build"
LAYER_ZIP="$BUILD_DIR/psycopg2-layer.zip"

rm -rf "$BUILD_DIR"
mkdir -p "$BUILD_DIR/layer/python"

python3 -m pip install \
  --requirement "$SCRIPT_DIR/layer-requirements.txt" \
  --target "$BUILD_DIR/layer/python" \
  --platform manylinux2014_x86_64 \
  --implementation cp \
  --python-version 3.12 \
  --abi cp312 \
  --only-binary=:all: \
  --quiet

python3 - "$BUILD_DIR/layer" "$LAYER_ZIP" <<'EOF'
import os, sys, zipfile
src, dest = sys.argv[1], sys.argv[2]
with zipfile.ZipFile(dest, 'w', zipfile.ZIP_DEFLATED) as zf:
  for root, _dirs, files in os.walk(src):
    for name in sorted(files):
      path = os.path.join(root, name)
      zf.write(path, os.path.relpath(path, src))
EOF

echo "built $LAYER_ZIP"

if [ "${1:-}" = "publish" ]; then
  aws lambda publish-layer-version \
    --layer-name blinkr-psycopg2 \
    --zip-file "fileb://$LAYER_ZIP" \
    --compatible-runtimes python3.12 \
    --compatible-architectures x86_64 \
    --query LayerVersionArn \
    --output text
fi
