import { createMemoryHistory } from 'history';

const history = createMemoryHistory({
  // Don't include any initial entry since we don't include the process table in the history.
  initialEntries: []
});

/* Navigation */

export function listen(listener) {
  return history.listen((location) => {
    listener(parsePath(location.pathname));
  });
}

export function push(path) {
  history.push(path);
}

// Note that this will still trigger listeners.
export function replace(path) {
  history.replace(path);
}

export function currentLocation() {
  // Will return `undefined` to start, since we initialize it with `initialEntries: []`.
  return history.location;
}

export function previousLocation() {
  return history.entries[history.index - 1];
}

export function canGoBack() {
  return history.canGo(-1);
}

export function goBack() {
  history.goBack();
}

export function nextLocation() {
  return history.entries[history.index + 1];
}

export function canGoForward() {
  return history.canGo(1);
}

export function goForward() {
  history.goForward();
}

/* Path formatting and parsing */

export function formatPath({ process }) {
  // One way to extend this function for additional sorts of locations: add keys to the arguments
  // object, with each key representing the type of path and expecting only one of the keys to
  // be defined for any call.
  //
  // Let's say we added a key "view", with the signature becoming `{ process, view }`. We would then
  // return `/process/${process}` if `process` was defined, otherwise return `/view/${view}`.
  return `/process/${process}`;
}

export function parsePath(path) {
  const components = path.match(/^\/(.+?)\/(.+?)$/);
  if (!components) throw new Error(`path was not formatted using formatPath: "${path}"`);

  return { [components[1]]: components[2] };
}
