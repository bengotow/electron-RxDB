import DatabaseObjectRegistry from './database-object-registry';

export function registeredObjectReviver(k, v) {
  const type = v ? v.__constructorName : null;
  if (!type) {
    return v;
  }

  if (DatabaseObjectRegistry.isInRegistry(type)) {
    return DatabaseObjectRegistry.deserialize(type, v);
  }

  return v;
}

export function registeredObjectReplacer(k, v) {
  if (v instanceof Object) {
    const type = this[k].constructor.name;
    if (DatabaseObjectRegistry.isInRegistry(type)) {
      v.__constructorName = type;
    }
  }
  return v;
}

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
