/* eslint quote-props: 0 */
import Model from '../lib/model';
import Attributes from '../lib/attributes';
import ModelRegistry from '../lib/model-registry';

class GoodTest extends Model {
  static attributes = Object.assign({}, Model.attributes, {
    "foo": Attributes.String({
      modelKey: 'foo',
      jsonKey: 'foo',
    }),
  });
}

describe('ModelRegistry', function ModelRegistrySpecs() {
  beforeEach(() => {
    this.registry = new ModelRegistry();
  });

  it("can register constructors", () => {
    const testFn = () => GoodTest;
    expect(() => this.registry.register("GoodTest", testFn)).not.toThrow();
    expect(this.registry.get("GoodTest")).toBe(GoodTest);
  });

  it("Tests if a constructor is in the registry", () => {
    this.registry.register("GoodTest", () => GoodTest);
    expect(this.registry.isInRegistry("GoodTest")).toBe(true);
  });

  it("deserializes the objects for a constructor", () => {
    this.registry.register("GoodTest", () => GoodTest);
    const obj = this.registry.deserialize("GoodTest", {foo: "bar"});
    expect(obj instanceof GoodTest).toBe(true);
    expect(obj.foo).toBe("bar");
  });

  it("throws an error if the object can't be deserialized", () =>
    expect(() => this.registry.deserialize("GoodTest", {foo: "bar"})).toThrow()
  );
});
