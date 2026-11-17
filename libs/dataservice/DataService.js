import axios from 'axios';
import { BASE_URL } from '../../constant';

class DataService {
  constructor() {
    this._baseUrl = `${BASE_URL}/api`;
    this._axiosInstance = axios.create();
    this._axiosInstance.defaults.withCredentials = true;
  }

  getAxiosInstance() {
    return this._axiosInstance;
  }

  get(relativeUrl, config = {}) {
    try {
      return this._axiosInstance.get(this._generateUrl(relativeUrl), config);
    } catch (error) {
      console.error(error);
      throw error;
    }
  }

  post(relativeUrl, data = null, config = {}) {
    try {
      return this._axiosInstance.post(this._generateUrl(relativeUrl), data, config);
    } catch (error) {
      console.error(error);
      throw error;
    }
  }

  put(relativeUrl, data = null, config = {}) {
    try {
      return this._axiosInstance.put(this._generateUrl(relativeUrl), data, config);
    } catch (error) {
      console.error(error);
      throw error;
    }
  }

  delete(relativeUrl, data = null, config = {}) {
    try {
      if (data) { return this._axiosInstance.delete(this._generateUrl(relativeUrl), { data }, config); }
      return this._axiosInstance.delete(this._generateUrl(relativeUrl), config);
    } catch (error) {
      console.error(error);
      throw error;
    }
  }

  setCommonHeader(key, value) {
    this._axiosInstance.defaults.headers.common[key] = value;
  }

  setBaseUrl(baseUrl) {
    this._baseUrl = baseUrl;
  }

  _generateUrl(relativeUrl) {
    return `${this._baseUrl}/${relativeUrl}`;
  }
}

export default DataService;
