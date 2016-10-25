/**
This keeps track of constructors so we know how to inflate
serialized objects.

We map constructor string names with factory functions that will return
the actual constructor itself.

The reason we have an extra function call to return a constructor is so
we don't need to `require` all constructors at once on load. We are
wasting a very large amount of time on bootup requiring files that may
never be used or only used way down the line.

If 3rd party packages want to register new inflatable models, they can
use `register` and pass the constructor generator along with the name.

Note that there is one registry per window.

@private
*/
export default class ModelRegistry {
  constructor() {
    this._constructorFactories = {};

    const registry = this;

    this.JSONReviver = function JSONReviver(k, v) {
      const type = v ? v.__constructorName : null;
      if (!type) {
        return v;
      }

      if (registry.isInRegistry(type)) {
        return registry.deserialize(type, v);
      }

      return v;
    }

    this.JSONReplacer = function JSONReplacer(k, v) {
      if (v instanceof Object) {
        const type = this[k].constructor.name;
        if (registry.isInRegistry(type)) {
          v.__constructorName = type;
        }
      }
      return v;
    }
  }

  get(name) {
    return this._constructorFactories[name].call(null);
  }

  getAllConstructors() {
    const constructors = []
    for (const name of Object.keys(this._constructorFactories)) {
      constructors.push(this.get(name));
    }
    return constructors;
  }

  isInRegistry(name) {
    return !!this._constructorFactories[name];
  }

  deserialize(name, dataJSON) {
    let data = dataJSON;
    if (typeof data === "string") {
      data = JSON.parse(dataJSON);
    }

    const constructor = this.get(name);

    if (typeof constructor !== "function") {
      throw new Error(`Unsure of how to inflate ${JSON.stringify(data)}. Your constructor factory must return a class constructor.`);
    }

    const object = new constructor();
    object.fromJSON(data);

    return object;
  }

  register(klass) {
    this._constructorFactories[klass.constructor.name] = () => klass;
  }

  unregister(name) {
    delete this._constructorFactories[name];
  }
}
