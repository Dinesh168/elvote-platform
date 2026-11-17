class RequestInterceptorPub {
  static headers = {};
  
  static addHeaders(key, value) {
    this.headers[key] = value;
  }

  static removeHeaders(key) {
    delete this.headers[key];
  }

}

export default RequestInterceptorPub;
