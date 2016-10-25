export function modelFreeze(o) {
  Object.freeze(o);
  return Object.getOwnPropertyNames(o).forEach((key) => {
    const val = o[key];
    if (typeof val === 'object' && val !== null && !Object.isFrozen(val)) {
      modelFreeze(val);
    }
  });
}

export function generateTempId() {
  const s4 = () => Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
  return `local-${s4()}${s4()}-${s4()}`;
}

export function isTempId(id) {
  if (!id || typeof id !== 'string') { return false; }
  return id.slice(0, 6) === 'local-';
}

export function tableNameForJoin(primaryKlass, secondaryKlass) {
  return `${primaryKlass.name}${secondaryKlass.name}`;
}
