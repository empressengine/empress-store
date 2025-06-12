const d = class d {
  constructor(e, t = {}) {
    this._data = e, this._listeners = /* @__PURE__ */ new Set(), this._middleware = [], this._validators = [], this._middleware = t.middleware || [], this._validators = t.validators || [];
  }
  /**
   * Добавить новое middleware в хранилище
   * @param middleware Функция middleware для добавления
   * @returns Функция для удаления этого middleware
   */
  addMiddleware(e) {
    return this._middleware.push(e), () => {
      const t = this._middleware.indexOf(e);
      t !== -1 && this._middleware.splice(t, 1);
    };
  }
  /**
   * Добавить несколько middleware в хранилище
   * @param middleware Массив функций middleware
   * @returns Функция для удаления всех добавленных middleware
   */
  addMiddlewares(e) {
    const t = e.map((a) => this.addMiddleware(a));
    return () => t.forEach((a) => a());
  }
  /**
   * Добавить новый валидатор в хранилище
   * @param validator Функция валидатора для добавления
   * @returns Функция для удаления этого валидатора
   */
  addValidator(e) {
    return this._validators.push(e), () => {
      const t = this._validators.indexOf(e);
      t !== -1 && this._validators.splice(t, 1);
    };
  }
  /**
   * Добавить несколько валидаторов в хранилище
   * @param validators Массив функций валидаторов
   * @returns Функция для удаления всех добавленных валидаторов
   */
  addValidators(e) {
    const t = e.map((a) => this.addValidator(a));
    return () => t.forEach((a) => a());
  }
  /**
   * Получить текущий middleware
   */
  get middleware() {
    return [...this._middleware];
  }
  /**
   * Получить текущее состояние
   */
  get rawState() {
    return this._data;
  }
  /**
   * Получить текущее состояние, используя Proxy для предотвращения прямых мутаций
   */
  get state() {
    return new Proxy(this._data, {
      get: (e, t) => {
        const a = e[t];
        return a instanceof Object ? new Proxy(a, {}) : a;
      },
      set: () => (console.warn("Direct state mutation is not allowed. Use setState instead."), !1)
    });
  }
  /**
   * Подписаться на изменения состояния
   * @param listener Функция обратного вызова, вызываемая при изменении состояния
   * @returns Функция отписки
   */
  subscribe(e) {
    return this._listeners.add(e), () => this._listeners.delete(e);
  }
  /**
   * Проверить обновление без его применения
   * @param update Частичное обновление для проверки
   * @throws Error если проверка не пройдена
   */
  validateUpdate(e) {
    for (const t of this._validators) {
      const a = t(e);
      if (a !== !0)
        throw new Error(typeof a == "string" ? a : "Validation failed");
    }
  }
  /**
   * Обновить состояние, используя функцию обратного вызова
   * @param callback Функция, возвращающая частичное обновление
   * @throws Error если проверка не пройдена
   * @example
   * ```typescript
   * store.update(state => ({
   *   score: state.score + 10,
   *   level: state.level + 1
   * }));
   * ```
   */
  update(e) {
    const t = e(this.state);
    this.validateUpdate(t);
    const a = (u, c) => ({ ...u, ...c });
    let i = a(this._data, t);
    for (const u of this._middleware)
      i = u(i, t, a);
    this._data = i, this.notifyListeners();
  }
  /**
   * Выполнить транзакцию, которая может быть отменена
   * @param transaction Объект транзакции с функциями применения и отката
   */
  transaction(e) {
    const t = this.state;
    try {
      this._data = e.apply(this.state), this.notifyListeners();
    } catch (a) {
      throw this._data = e.rollback(t), this.notifyListeners(), a;
    }
  }
  /**
   * Вспомогательный метод для простых транзакций с автоматическим откатом
   * @param apply Функция, возвращающая новое состояние
   * @example
   * ```typescript
   * // Атомарное увеличение счета и уровня
   * store.simpleTransaction(state => ({
   *   score: state.score + 10,
   *   level: state.level + 1
   * }));
   * ```
   */
  simpleTransaction(e) {
    const t = e(this.state), a = {};
    Object.keys(t).forEach((i) => {
      a[i] = this.state[i];
    }), this.transaction({
      apply: (i) => ({ ...i, ...t }),
      rollback: (i) => ({ ...i, ...a })
    });
  }
  /**
   * Сбросить хранилище к начальному состоянию
   * @param initialData Начальные данные для сброса
   */
  reset(e = {}) {
    this._data = e, this.notifyListeners();
  }
  /**
   * Клонирует текущее состояние хранилища. Использует structuredClone для глубокого копирования.
   * 
   * @returns Глубокая копия текущего состояния
   */
  cloneState() {
    const e = (t) => {
      if (t === null || typeof t != "object")
        return t;
      if (Array.isArray(t))
        return t.map((i) => e(i));
      const a = {};
      for (const i in t)
        if (Object.prototype.hasOwnProperty.call(t, i))
          try {
            a[i] = e(t[i]);
          } catch (u) {
            console.warn(`Failed to clone property ${i}`, u), a[i] = t[i];
          }
      return a;
    };
    return e(this._data);
  }
  notifyListeners() {
    if (d._isNotifying) {
      d._pendingNotifications.add(this);
      return;
    }
    d._notificationScheduled || (d._notificationScheduled = !0, queueMicrotask(() => {
      d._isNotifying = !0;
      try {
        d._pendingNotifications.forEach((e) => {
          e._listeners.forEach((t) => t(e._data));
        });
      } finally {
        d._isNotifying = !1, d._notificationScheduled = !1, d._pendingNotifications.clear();
      }
    })), d._pendingNotifications.add(this);
  }
};
d._pendingNotifications = /* @__PURE__ */ new Set(), d._isNotifying = !1, d._notificationScheduled = !1;
let h = d;
const y = /* @__PURE__ */ new Set();
function m(l, e) {
  let t, a = !1;
  const i = Array.isArray(l) ? l : [l], u = () => {
    const s = i.map((n) => n.state);
    return Array.isArray(l) ? s : s[0];
  }, c = i.map(
    (s) => s.subscribe(() => {
      a || (t = void 0);
    })
  ), r = {
    get value() {
      if (a)
        throw new Error("Cannot access disposed computed value");
      if (y.has(r))
        throw new Error("Circular dependency detected in computed properties");
      if (t === void 0) {
        y.add(r);
        try {
          t = e(u());
        } finally {
          y.delete(r);
        }
      }
      return t;
    },
    dispose() {
      a || (a = !0, c.forEach((s) => s()), t = void 0);
    }
  };
  return typeof window < "u" && window.addEventListener("unload", () => r.dispose()), r;
}
function _(l, e = {}) {
  const t = l.reduce((c, r) => ({
    ...c,
    ...r.state
  }), {});
  class a extends h {
    cleanup() {
      u.forEach((r) => r());
    }
    update(r) {
      const s = r(this.state);
      this.validateUpdate(s), l.forEach((n) => {
        const f = {};
        let p = !1;
        for (const o in s)
          o in n.state && n.state[o] !== s[o] && (f[o] = s[o], p = !0);
        p && n.validateUpdate(f);
      }), super.update((n) => s), l.forEach((n) => {
        const f = {};
        let p = !1;
        for (const o in s)
          o in n.state && n.state[o] !== s[o] && (f[o] = s[o], p = !0);
        if (p) {
          const o = n.update;
          n.update = function(w) {
            h.prototype.update.call(this, w);
          }, n.update(() => f), n.update = o;
        }
      });
    }
  }
  const i = new a(t, {
    middleware: e.middleware || [],
    validators: e.validators || []
  }), u = l.map((c) => {
    const r = c.update;
    return c.update = function(s) {
      const n = this.state, f = s(n);
      this.validateUpdate(f), i.update((p) => f);
    }, () => {
      c.update = r;
    };
  });
  return i;
}
export {
  h as Store,
  m as computed,
  _ as mixStores
};
