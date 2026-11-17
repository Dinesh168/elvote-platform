
const _FEATURE_FLAG = {
  SHOW_SERVER_TIME: 'SHOW_SERVER_TIME',
}

export const FEATURE_FLAG = (() => {
  Object.entries(_FEATURE_FLAG).forEach(([key, value]) => _FEATURE_FLAG[key] = true);
  return _FEATURE_FLAG;
})();
