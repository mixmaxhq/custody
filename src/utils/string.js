/**
 * Returns the last index in `string` at which `regex` matches.
 *
 * Implementation from https://stackoverflow.com/a/274094/495611.
 *
 * @param {String} string - The string with which to match.
 * @param {RegExp} regex - The regular expression with which to match.
 * @param {Integer=} startpos - The position at which to start the match. Defaults to `string`'s
 *   length.
 *
 * @return {Integer} The last index in `string` at which `regex` matches, or -1 if no match is found.
 */
export function regexLastIndexOf(string, regex, startpos = string.length) {
  regex = (regex.global) ? regex : new RegExp(regex.source, 'g' + (regex.ignoreCase ? 'i' : '') + (regex.multiLine ? 'm' : ''));
  if (startpos < 0) startpos = 0;

  const stringToWorkWith = string.substring(0, startpos + 1);
  let lastIndexOf = -1;
  let nextStop = 0;
  let result;
  while ((result = regex.exec(stringToWorkWith)) != null) {
    lastIndexOf = result.index;
    regex.lastIndex = ++nextStop;
  }
  return lastIndexOf;
}
