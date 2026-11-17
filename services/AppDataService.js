import { FEATURE_FLAG } from "../featureFlags";
import DataService from "../libs/dataservice/DataService";
import { getAuth, signOut } from 'firebase/auth';
import ErrorPubSub from "../libs/networkerror/ErrorPubSub";
import RequestInterceptorPub from "../libs/requestinterceptors/RequestInterceptorPub";
import AsyncStorage from "@react-native-async-storage/async-storage";

const auth = getAuth();

class _AppDataService extends DataService {
	constructor() {
		super();
		this._setupInterceptLogic();
	}

	async _setupInterceptLogic() {
		const self = this;
		const axiosInstance = self.getAxiosInstance();
		const user = auth.currentUser;

		axiosInstance.interceptors.request.use((request) => {
			Object.entries(RequestInterceptorPub.headers).forEach(([key,val]) => {
				request.headers[key] = val;
			})

			return request;
		})

		axiosInstance.interceptors.response.use((response) => {
			// console.log(response.data);
			ErrorPubSub.runError(null);
			if (FEATURE_FLAG.SHOW_SERVER_TIME) {
				if (response.headers?.['x-server-start-time'] && response.headers?.['x-server-end-time']) {
					console.log(`${response.config.url} - ${(parseInt(response.headers['x-server-end-time']) - parseInt(response.headers['x-server-start-time']))} ms`)
				}
			}
			return response
		}, async function (error) {
			console.log(error.response?.data);
			ErrorPubSub.runError(error.response?.data?.status);
			if (error.response?.data?.status === 401) {
				await signOut(auth);
				await AsyncStorage.clear();
			} else {
				throw error;
			}
		});
	}

}

const AppDataService = new _AppDataService();
export default AppDataService;
