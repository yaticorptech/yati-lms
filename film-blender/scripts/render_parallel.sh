#!/bin/zsh
# Renders the film's frames with N Blender processes at once (each takes its own range), then encodes the MP4.
#   scripts/render_parallel.sh <blender> [workers=5] [scale%=50] [name.mp4]
B=$1; N=${2:-5}; P=${3:-50}; NAME=${4:-the_stranger_who_changed_everything_preview_640x360.mp4}
cd "$(dirname $0)/.."
END=3673; STEP=$(( (END + N - 1) / N ))
for i in $(seq 0 $((N-1))); do
  S=$(( i * STEP + 1 )); E=$(( (i+1) * STEP )); (( E > END )) && E=$END
  $B -b stranger_film.blend --python-exit-code 1 --python scripts/render_film.py -- frames $P $S $E > renders/frames-$i.log 2>&1 &
done
wait
find renders/frames -size 0 -delete
echo "frames: $(ls renders/frames | wc -l) / $END"
$B -b --factory-startup --python-exit-code 1 --python scripts/render_film.py -- encode $NAME > renders/encode.log 2>&1
grep ENCODED renders/encode.log
