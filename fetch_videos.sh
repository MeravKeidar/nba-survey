#!/usr/bin/env bash
# Copies rendered videos from the remote server once the slurm jobs finish.
# Run from the survey/ directory:
#   bash fetch_videos.sh

set -e

REMOTE="merav.keidar@132.68.39.200"
SURVEY_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "Fetching MAS videos..."
rsync -avz --progress \
  "${REMOTE}:~/viz_mas/result_*.mp4" \
  "${SURVEY_DIR}/videos/mas/"

echo "Fetching VideoMDM videos..."
rsync -avz --progress \
  "${REMOTE}:~/viz_videomdm/result_*.mp4" \
  "${SURVEY_DIR}/videos/videomdm/"

echo ""
echo "Done. Videos are in:"
echo "  ${SURVEY_DIR}/videos/mas/"
echo "  ${SURVEY_DIR}/videos/videomdm/"
echo ""
echo "Next: start the server with:  python3 server.py"
