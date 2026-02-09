#!/bin/bash
# Generate PWA icons from SVG
# This script uses qlmanage (macOS built-in) to convert SVG to PNG

set -e

SVG_FILE="public/icons/icon.svg"
SIZES=(192 512)

if [ ! -f "$SVG_FILE" ]; then
  echo "Error: $SVG_FILE not found"
  exit 1
fi

echo "Generating PWA icons..."

for size in "${SIZES[@]}"; do
  output="public/icons/icon-${size}.png"

  # Use sips (macOS built-in image processor)
  # First create a temporary large PNG, then resize
  if command -v rsvg-convert &> /dev/null; then
    # If librsvg is installed (via homebrew), use it
    rsvg-convert -w $size -h $size "$SVG_FILE" -o "$output"
    echo "Generated $output using rsvg-convert"
  elif command -v convert &> /dev/null; then
    # If ImageMagick is installed
    convert -background none -resize ${size}x${size} "$SVG_FILE" "$output"
    echo "Generated $output using ImageMagick"
  else
    echo "Warning: Neither rsvg-convert nor ImageMagick found."
    echo "Please install one of them or use the web-based generator at:"
    echo "http://localhost:3000/generate-icons.html"
    echo ""
    echo "To install rsvg-convert: brew install librsvg"
    echo "To install ImageMagick: brew install imagemagick"
    exit 1
  fi
done

echo ""
echo "✓ PWA icons generated successfully!"
echo "  - public/icons/icon-192.png"
echo "  - public/icons/icon-512.png"
