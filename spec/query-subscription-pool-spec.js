import QuerySubscriptionPool from '../lib/query-subscription-pool';
import DatabaseStore from '../lib/database-store';
import Category from './fixtures/category';

describe("QuerySubscriptionPool", function QuerySubscriptionPoolSpecs() {
  beforeEach(() => {
    this.query = DatabaseStore.findAll(Category);
    this.queryKey = this.query.sql();
    QuerySubscriptionPool._subscriptions = {};
    QuerySubscriptionPool._cleanupChecks = [];
  });

  describe("add", () => {
    it("should add a new subscription with the callback", () => {
      const callback = jasmine.createSpy('callback');
      QuerySubscriptionPool.add(this.query, callback);
      expect(QuerySubscriptionPool._subscriptions[this.queryKey]).toBeDefined();

      const subscription = QuerySubscriptionPool._subscriptions[this.queryKey];
      expect(subscription.hasCallback(callback)).toBe(true);
    });

    it("should yield database changes to the subscription", () => {
      const callback = jasmine.createSpy('callback');
      QuerySubscriptionPool.add(this.query, callback);
      const subscription = QuerySubscriptionPool._subscriptions[this.queryKey];
      spyOn(subscription, 'applyChangeRecord');

      const record = {objectType: 'whateves'};
      QuerySubscriptionPool._onChange(record);
      expect(subscription.applyChangeRecord).toHaveBeenCalledWith(record);
    });

    describe("unsubscribe", () => {
      it("should return an unsubscribe method", () => {
        expect(QuerySubscriptionPool.add(this.query, () => {}) instanceof Function).toBe(true);
      });

      it("should remove the callback from the subscription", () => {
        const cb = () => {};

        const unsub = QuerySubscriptionPool.add(this.query, cb);
        const subscription = QuerySubscriptionPool._subscriptions[this.queryKey];

        expect(subscription.hasCallback(cb)).toBe(true);
        unsub();
        expect(subscription.hasCallback(cb)).toBe(false);
      });

      it("should wait before removing the subscription to make sure it's not reused", () => {
        jasmine.clock().install();

        const unsub = QuerySubscriptionPool.add(this.query, () => {});
        expect(QuerySubscriptionPool._subscriptions[this.queryKey]).toBeDefined();
        unsub();
        expect(QuerySubscriptionPool._subscriptions[this.queryKey]).toBeDefined();
        jasmine.clock().tick();
        expect(QuerySubscriptionPool._subscriptions[this.queryKey]).toBeUndefined();

        jasmine.clock().uninstall();
      });
    });
  });
});
