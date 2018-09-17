import _ from 'underscore';
import kexec from 'kexec';
import v8 from 'v8';

const OOM_CHECK_DELAY = 30 * 1000;

let oomCheckInterval;

/**
 * As of 09.13.2018, custody eventually runs out of memory:
 * https://github.com/mixmaxhq/custody/issues/48 As a workaround (and perhaps a good practice for a
 * process that runs indefinitely?), we restart the process when it approaches OOM. Calling this
 * function starts monitoring for that event.
 *
 * @return {Function} A function that can be called to stop monitoring for OOM.
 */
export default function restartApproachingOOM() {
  stopOOMCheck();

  oomCheckInterval = setInterval(restartIfWithinOOMThreshold, OOM_CHECK_DELAY);

  return stopOOMCheck;
}

// 80% of the heap size limit (--max_old_space_size)
// https://stackoverflow.com/a/47768386
const OOM_THRESHOLD = 0.8;

function restartIfWithinOOMThreshold() {
  const { used_heap_size: memoryInUse, heap_size_limit: oom } = v8.getHeapStatistics();

  if (memoryInUse >= OOM_THRESHOLD * oom) {
    // This replaces the current custody process with another custody process, keeping
    // the same process ID: https://github.com/nodejs/node/issues/21664
    // POSIX-only, but no one's using this on Windows yet.
    kexec(_.first(process.argv), _.rest(process.argv));
  }
}

function stopOOMCheck() {
  clearInterval(oomCheckInterval);
}


