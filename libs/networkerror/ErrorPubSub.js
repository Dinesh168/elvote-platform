class ErrorPubSub {
  static subscribers = {};

  static addSubscriber(key, func) {
    this.subscribers[key] = func;
  }

  static runError(errorStatusCode) {
    Object.values(this.subscribers).forEach(func => func(errorStatusCode));
  }

  static removeSubscriber(key) {
    delete this.subscribers[key];
  }
}

export default ErrorPubSub;
