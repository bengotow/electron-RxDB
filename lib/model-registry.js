import Model from './model';

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
    this._classMap = {};

    const registry = this;

    this.JSONReviver = function JSONReviver(k, v) {
      const type = v ? v.__constructorName : null;
      if (!type) {
        return v;
      }

      if (registry.has(type)) {
        return registry.deserialize(type, v);
      }

      return v;
    }

    this.JSONReplacer = function JSONReplacer(k, v) {
      if (v instanceof Object) {
        const type = this[k].constructor.name;
        if (registry.has(type)) {
          v.__constructorName = type;
        }
      }
      return v;
    }
  }

  /**
  @param {String} name - The name of the class
  @returns {Model} - The Model subclass with the given name.
  */
  get(name) {
    return this._classMap[name].call(null);
  }

  getAllConstructors() {
    return Object.keys(this._classMap).map((name) => this.get(name))
  }

  /**
  @param {String} name - The name of the class.
  @returns {Boolean} - True if a class with the given name has been registered.
  */
  has(name) {
    return !!this._classMap[name];
  }

  /**
  Add a Model class so that it can be used with an RxDB database.

  @param {Model} klass - The subclass of Model to register
  */
  register(klass) {
    this.registerDeferred({
      name: klass.constructor.name,
      resolver: () => klass,
    })
  }

  /**
  Add a Model class without requiring it immediately. Provide the name of
  the class and a resolver function that returns it upon request.

  The resolver will not be invoked until an instance of the class is needed
  for the first time, which can improve load time.

  @param {String} name - The class name
  @param {Function} resolver - A function that will return the class. Generally,
    this function calls `require`.
  */
  registerDeferred({name, resolver}) {
    this._classMap[name] = resolver;
  }

  /**
  Remove a Model class.
  */
  unregister(name) {
    delete this._classMap[name];
  }

  /**
  @private
  */
  deserialize(name, dataJSON) {
    let data = dataJSON;
    if (typeof data === "string") {
      data = JSON.parse(dataJSON);
    }

    const constructor = this.get(name);

    if (typeof constructor !== "function") {
      throw new Error(`ModelRegistry: Unsure of how to inflate ${JSON.stringify(data)}. Your constructor factory must return a class constructor.`);
    }

    const object = new constructor();
    if (!(object instanceof Model)) {
      throw new Error(`ModelRegistry: ${name} is not a subclass of RxDB.Model.`);
    }
    object.fromJSON(data);

    return object;
  }
}
