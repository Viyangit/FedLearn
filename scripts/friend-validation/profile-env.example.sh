# FedLearn friend-validation — copy and source ONE profile at a time.
# Usage: source scripts/friend-validation/profile-env.example.sh low|mid|high
# Requires: macOS, Node 20+, Cursor, project opened as workspace root.

set -euo pipefail

PROFILE="${1:-}"
BASE="${FEDLEARN_VALIDATION_HOME:-$HOME/.fedlearn-validation}"

case "$PROFILE" in
  low)
    export FEDLEARN_USER_ID="friend-low"
    export FEDLEARN_LOCAL_STORE="${BASE}/friend-low.json"
    unset FEDLEARN_MIDPOINT FEDLEARN_STEEPNESS
    ;;
  mid)
    export FEDLEARN_USER_ID="friend-mid"
    export FEDLEARN_LOCAL_STORE="${BASE}/friend-mid.json"
    # Optional: faster curve so ~60% is reachable with fewer Composer turns
    export FEDLEARN_MIDPOINT="${FEDLEARN_MIDPOINT:-5}"
    export FEDLEARN_STEEPNESS="${FEDLEARN_STEEPNESS:-40}"
    ;;
  high)
    export FEDLEARN_USER_ID="friend-high"
    export FEDLEARN_LOCAL_STORE="${BASE}/friend-high.json"
    export FEDLEARN_MIDPOINT="${FEDLEARN_MIDPOINT:-5}"
    export FEDLEARN_STEEPNESS="${FEDLEARN_STEEPNESS:-40}"
    ;;
  *)
    echo "Usage: source $0 low|mid|high" >&2
    return 1 2>/dev/null || exit 1
    ;;
esac

mkdir -p "$(dirname "$FEDLEARN_LOCAL_STORE")"
echo "FedLearn profile: $PROFILE"
echo "  FEDLEARN_USER_ID=$FEDLEARN_USER_ID"
echo "  FEDLEARN_LOCAL_STORE=$FEDLEARN_LOCAL_STORE"
[ -n "${FEDLEARN_MIDPOINT:-}" ] && echo "  FEDLEARN_MIDPOINT=$FEDLEARN_MIDPOINT"
[ -n "${FEDLEARN_STEEPNESS:-}" ] && echo "  FEDLEARN_STEEPNESS=$FEDLEARN_STEEPNESS"
