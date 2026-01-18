#!/bin/bash
set -e

echo "Running patch-package to apply AlarmKit conditional compilation fix..."
npx patch-package

echo "Patch applied successfully"
