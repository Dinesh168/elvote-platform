const express = require('express');
const admin = require('firebase-admin');
const serviceAccount = require('../../../serviceAccountKey.json');
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
});

const { 
    USERS_ROUTE, 
    BASE_ROUTE, 
    LOCAL_INFO_KEY,
    PRIVATE_ROUTE,
    VOTERS_ROUTE,
    CONSTITUENCY_ROUTE,
    LOCAL_FILTER_HEADERS_KEY
} = require('./schemaConstants'); 

const router = express.Router();

let usersRoute = require('../controllers/users');
let privateRoute = require('../controllers/private');
let votersRoute = require('../controllers/voters');
let constituencyRoute = require('../controllers/constituency');

const { DB_TABLE } = require('../../models/libs/dbConstants');

const AuthenticationError = require('../../errorhandlers/AuthenticationError');
const UserManager = require('../../businesslogic/UserManager');
const UserNotExistError = require('../../errorhandlers/UserNotExistError');
const UserRequestPendingError = require('../../errorhandlers/UserRequestPendingError');
const UserRequestRejectedError = require('../../errorhandlers/UserRequestRejectedError');
const UserPermissionNullError = require('../../errorhandlers/UserPermissionNullError');


class RouteMap {

    static setupRoutesAndAuth(app) {
        app.use(
            BASE_ROUTE,
            RouteMap.setServerRespHeader,
            RouteMap.authenticate,
            router)

        router.use(USERS_ROUTE, usersRoute);
        router.use(PRIVATE_ROUTE, privateRoute);
        router.use(VOTERS_ROUTE, votersRoute);
        router.use(CONSTITUENCY_ROUTE, constituencyRoute);
        
    }

    static async setServerRespHeader(req, res, next) {
        console.log("setServerResp")
        res.set("X-Server-Start-Time", Date.now());
        next();
    }

    static async authenticate(req, res, next) {
        console.log(req.url);
        const token = req.headers['token'];

        if (!token || token.length === 0) {
            next(new AuthenticationError());
            return;
        }

        try {
            admin
            .auth()
            .verifyIdToken(token)
            .then(async (decodedToken) => {
                // Token is verified, and decodedToken contains the decoded payload
                // Extract user information
                const userId = decodedToken.uid;
                const email = decodedToken.email;
                
                // Use the extracted user information as needed
                console.log('User ID:', userId);
                console.log('Email:', email);
                
                res.locals[LOCAL_INFO_KEY] = { userId, email };
                
                if (req.url.indexOf('/users/mine') >= 0 && req.method !== "GET") {
                    next();
                    return;
                }

                const users = await UserManager.getUsersByFilter({ uniqueUserId: userId });

                if (!users || users.length === 0) {
                    next(new UserNotExistError())
                } else if (users[0][DB_TABLE.USERS.COLUMNS.ACCOUNT_APPROVED_STATUS.KEY] === DB_TABLE.USERS.COLUMNS.ACCOUNT_APPROVED_STATUS.VALUES.PENDING) {
                    next(new UserRequestPendingError())
                } else if (users[0][DB_TABLE.USERS.COLUMNS.ACCOUNT_APPROVED_STATUS.KEY] === DB_TABLE.USERS.COLUMNS.ACCOUNT_APPROVED_STATUS.VALUES.REJECTED) {
                    next(new UserRequestRejectedError())
                } else if (typeof users[0][DB_TABLE.USERS.COLUMNS.PERMISSIONS_LIST.KEY] !== "object" || Object.keys(users[0][DB_TABLE.USERS.COLUMNS.PERMISSIONS_LIST.KEY]).length === 0) {
                    next(new UserPermissionNullError())
                } else {
                    const constituency_number_id = req.headers['x-constituency'];
                    const filters = req.headers['x-filters'];
                    res.locals[LOCAL_INFO_KEY] = {
                        ...res.locals[LOCAL_INFO_KEY],
                        ...users[0],
                        constituency_number_id,
                        filters: filters ? JSON.parse(filters) : {}
                    }
                    
                    next();
                }
            })
            .catch((error) => {
                console.error('Error verifying Firebase JWT token:', error);
                next(new AuthenticationError());
            });
        } catch (e) {
            console.error('Error verifying Firebase JWT token:', error);
            next(new AuthenticationError());
        }
    }

}

module.exports = RouteMap;
